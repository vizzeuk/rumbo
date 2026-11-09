"""Fuentes de ofertas. Cada módulo expone buscar(con) -> cantidad de ofertas nuevas.

Para agregar un portal: crea un módulo con NOMBRE, DESCRIPCION, buscar(con) y regístralo en FUENTES.
"""
import json
import re
import time

from rumbo import db, reglas, vivo
from rumbo.util import get, limpiar, log


def guardar(con, o):
    """Inserta una oportunidad aplicando las reglas. Devuelve True si quedó como 'nueva'."""
    if db.existe(con, o["id"]):
        return False
    p, nota = reglas.puntuar(o["titulo"], o.get("descripcion", ""), o.get("modalidad", ""))
    if reglas.empresa_bloqueada(o.get("empresa", "")):
        p, nota = -1, "empresa bloqueada"
    if o.get("tipo") in ("agencia", "manual"):
        p, nota = max(p, 50), ""
    estado = "descartada" if p < 0 else "nueva"
    con.execute("""INSERT INTO ofertas (id,tipo,fuente,titulo,empresa,url,url_postular,descripcion,modalidad,
        ubicacion,presupuesto,email,publicada,encontrada,puntaje,nota,estado)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (o["id"], o.get("tipo", "oferta"), o["fuente"], o["titulo"], o.get("empresa", ""),
                 o.get("url", ""), o.get("url_postular", ""), (o.get("descripcion") or "")[:8000],
                 o.get("modalidad", ""), o.get("ubicacion", ""), o.get("presupuesto", ""), o.get("email", ""),
                 o.get("publicada") or time.time(), time.time(), max(p, 0), nota, estado))
    _avisar(o, estado == "nueva", nota)
    return estado == "nueva"


def _avisar(o, guardada, nota=""):
    vivo.emitir("hallazgo", id=o["id"], titulo=o["titulo"], empresa=o.get("empresa", "") or "",
                fuente=o["fuente"], url=o.get("url", ""), sitio=vivo.sitio(o.get("url", "")),
                ubicacion=o.get("ubicacion", "") or "", modalidad=o.get("modalidad", "") or "",
                guardada=guardada, nota=nota or "")


def descartar(con, o, nota):
    con.execute("""INSERT OR IGNORE INTO ofertas (id,tipo,fuente,titulo,empresa,url,descripcion,encontrada,estado,nota)
        VALUES (?,?,?,?,?,?,?,?,?,?)""", (o["id"], o.get("tipo", "oferta"), o["fuente"], o["titulo"],
                                           o.get("empresa", ""), o.get("url", ""), (o.get("descripcion") or "")[:8000],
                                           time.time(), "descartada", nota))
    _avisar(o, False, nota)


REGIONES = {  # clave interna -> nombres que la gente escribe
    "rm": ["metropolitana", "santiago", "rm"], "valparaiso": ["valparaíso", "valparaiso", "viña"],
    "biobio": ["biobío", "biobio", "concepción", "concepcion"], "antofagasta": ["antofagasta"],
    "coquimbo": ["coquimbo", "la serena"], "maule": ["maule", "talca"], "araucania": ["araucanía", "araucania", "temuco"],
    "ohiggins": ["o'higgins", "ohiggins", "rancagua"], "loslagos": ["los lagos", "puerto montt"],
}


def filtros():
    """Lo que el usuario busca, normalizado para traducirlo a los filtros de cada portal."""
    from rumbo import config
    b = config.cargar()["busqueda"]
    modos = set(b.get("modalidades") or ["remoto", "hibrido", "presencial"])
    jornadas = set(b.get("jornadas") or [])
    region_txt = (b.get("region") or "").lower()
    region = next((k for k, nombres in REGIONES.items() if any(n in region_txt for n in nombres)), None)
    return {"consultas": b.get("consultas") or ([b["area"]] if b.get("area") else []),
            "solo_remoto": modos == {"remoto"}, "modos": modos,
            "part_time": bool(jornadas) and jornadas <= {"part time", "por proyecto", "práctica"},
            "region": region, "excluir_ingles": b.get("excluir_ingles", True),
            "max": b.get("detalles_por_fuente", 15)}


def detalle(url):
    """(descripción, empresa) de una página de oferta: JSON-LD JobPosting o texto visible."""
    pagina = get(url)
    for bloque in re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', pagina, re.S):
        try:
            datos = json.loads(bloque)
        except Exception:
            continue
        for d in datos if isinstance(datos, list) else [datos]:
            if isinstance(d, dict) and d.get("@type") == "JobPosting":
                extra = " ".join(str(d.get(k, "")) for k in ("jobLocationType", "employmentType"))
                org = d.get("hiringOrganization") or {}
                return (limpiar(d.get("description")) + " " + extra)[:8000], org.get("name", "") if isinstance(org, dict) else ""
    cuerpo = re.sub(r"<(script|style|nav|footer|header)[^>]*>.*?</\1>", " ", pagina, flags=re.S)
    return limpiar(cuerpo)[:8000], ""


def desde_portal(con, o, exigir_remoto=True, pausa=1.0):
    """Para portales sin API: filtra por título, abre el detalle y exige que diga remoto.
    Devuelve (nueva, pidió_detalle)."""
    if db.existe(con, o["id"]) or not reglas.titulo_prometedor(o["titulo"]):
        return 0, False
    try:
        o["descripcion"], empresa = detalle(o["url"])
        o["empresa"] = o.get("empresa") or empresa
    except Exception as e:
        log(f"{o['fuente']}: no pude abrir {o['url']}: {e}")
        return 0, True
    time.sleep(pausa)
    if exigir_remoto and not reglas.es_remoto(o["descripcion"] + " " + o["titulo"]):
        descartar(con, o, "no dice remoto")
        return 0, True
    return int(guardar(con, o)), True


from rumbo.fuentes import (agencias, bne, chiletrabajos, computrabajo, empleospublicos,  # noqa: E402
                           firstjob, freelancer, getonbrd, jobspy_fuente, laborum, linkedin, luk,
                           trabajando, yapo)

FUENTES = {m.CLAVE: m for m in (laborum, trabajando, computrabajo, chiletrabajos, bne, luk, empleospublicos,
                                 firstjob, yapo, getonbrd, freelancer, linkedin, jobspy_fuente, agencias)}

# Sitio de cada portal, para mostrar en la interfaz "dónde se encontró".
SITIOS = {"laborum": "laborum.cl", "trabajando": "trabajando.cl", "computrabajo": "cl.computrabajo.com",
          "chiletrabajos": "chiletrabajos.cl", "bne": "bne.cl", "luk": "takealuk.com", "empleospublicos": "empleospublicos.cl",
          "firstjob": "firstjob.me", "yapo": "yapo.cl", "getonbrd": "getonbrd.com", "freelancer": "freelancer.com",
          "linkedin": "linkedin.com", "jobspy": "indeed.com", "agencias": "Google y sitios web"}
