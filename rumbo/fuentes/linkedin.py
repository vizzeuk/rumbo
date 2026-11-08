"""LinkedIn: por defecto SOLO PARA ENCONTRAR. Rumbo no postula ni envía mensajes en LinkedIn.

Usa la búsqueda pública de empleos (sin iniciar sesión): remotos, del país configurado, última semana.
Esas ofertas quedan como "solo_ver".

Opcional y apagado por defecto (RIESGO ALTO de restricción de cuenta): con config envio.linkedin_auto
en True y la sesión iniciada (`rumbo login LinkedIn`), además busca ofertas con "Solicitud sencilla"
y las guarda como tipo "oferta" para que el postulador (rumbo/postular/linkedin.py) postule.
"""
import re
import time
import urllib.parse

from rumbo import config, db
from rumbo.util import get, hay, limpiar, log

CLAVE = "linkedin"
NOMBRE = "LinkedIn"
DESCRIPCION = ("Para encontrar: muestra ofertas, no postula ni escribe por ti. Opcional y riesgoso: "
               "postular con Solicitud sencilla (envio.linkedin_auto).")
POSTULA = False   # por defecto; la postulación con Solicitud sencilla es opcional y aparte


def buscar(con):
    nuevas = 0
    if config.cargar()["envio"].get("linkedin_auto"):
        nuevas += _buscar_easy_apply(con)
    return nuevas + _buscar_publico(con)


def _buscar_easy_apply(con):
    """Búsqueda con tu sesión, filtrada por Solicitud sencilla. Si algo falla, sigue la pública."""
    from rumbo import reglas
    from rumbo.fuentes import guardar
    try:
        from rumbo.postular import linkedin as li
        from rumbo.postular.navegador import abrir
    except ImportError as e:
        log(f"LinkedIn Solicitud sencilla: {e}")
        return 0
    b = config.cargar()["busqueda"]
    consultas = (b.get("consultas") or ([b["area"]] if b.get("area") else []))[:3]
    if not consultas:
        return 0
    try:
        p, ctx = abrir(visible=False)
    except Exception as e:   # sin Playwright o con el perfil ocupado por otra ventana
        log(f"LinkedIn Solicitud sencilla: no pude abrir el navegador ({e})")
        return 0
    try:
        ofertas = li.buscar_easy_apply(ctx, consultas, b.get("pais", "Chile"), reglas.solo_remoto(),
                                       b["detalles_por_fuente"])
    except li.SinSesion:
        log('LinkedIn Solicitud sencilla: no hay sesión. Inicia sesión con: rumbo login LinkedIn')
        return 0
    except Exception as e:
        log(f"LinkedIn Solicitud sencilla: {e}")
        return 0
    finally:
        ctx.close()
        p.stop()
    nuevas = 0
    for o in ofertas:
        if hay(o["titulo"].lower(), reglas.FUERA_TITULO):
            continue
        if db.existe(con, o["id"]):   # ya estaba como "solo_ver": ahora se puede postular
            con.execute("""UPDATE ofertas SET tipo='oferta', url_postular=? WHERE id=? AND tipo='solo_ver'
                AND estado IN ('nueva', 'lista')""", (o["url_postular"], o["id"]))
            continue
        nuevas += guardar(con, o)
    con.commit()
    return nuevas


def _buscar_publico(con):
    from rumbo import reglas
    from rumbo.fuentes import guardar
    b = config.cargar()["busqueda"]
    nuevas = pedidas = 0
    for q in b["consultas"][:7]:
        params = {"keywords": q, "location": b.get("pais", "Chile"), "f_TPR": "r604800", "start": 0}
        if reglas.solo_remoto():
            params["f_WT"] = 2
        try:
            pagina = get("https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?" + urllib.parse.urlencode(params))
        except Exception as e:
            log(f"LinkedIn '{q}': {e}")
            continue
        tarjetas = re.findall(r'jobPosting:(\d+)".*?base-search-card__title">\s*(.*?)\s*</h3>'
                              r'.*?base-search-card__subtitle">.*?>\s*(.*?)\s*</a>', pagina, re.S)
        for jid, titulo, empresa in tarjetas:
            if pedidas >= b["detalles_por_fuente"]:
                return nuevas
            oid, titulo = "li-" + jid, limpiar(titulo)
            if db.existe(con, oid) or hay(titulo.lower(), reglas.FUERA_TITULO):
                continue
            try:
                d = get(f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{jid}")
                m = re.search(r'show-more-less-html__markup[^>]*>(.*?)</div>', d, re.S)
                desc = limpiar(m.group(1) if m else d)
            except Exception as e:
                log(f"LinkedIn detalle: {e}")
                desc = ""
            pedidas += 1
            nuevas += guardar(con, {"id": oid, "tipo": "solo_ver", "fuente": NOMBRE, "titulo": titulo,
                                    "empresa": limpiar(empresa), "descripcion": desc,
                                    "url": f"https://www.linkedin.com/jobs/view/{jid}"})
            time.sleep(2)
        con.commit()
    return nuevas
