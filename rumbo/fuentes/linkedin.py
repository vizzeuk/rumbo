"""LinkedIn, SOLO PARA ENCONTRAR. Rumbo nunca postula ni envía mensajes en LinkedIn.

Usa la búsqueda pública de empleos (sin iniciar sesión): remotos, del país configurado, última semana.
"""
import re
import time
import urllib.parse

from rumbo import config, db
from rumbo.util import get, hay, limpiar, log

CLAVE = "linkedin"
NOMBRE = "LinkedIn"
DESCRIPCION = "Solo para encontrar: muestra ofertas, nunca postula ni escribe por ti."
POSTULA = False


def buscar(con):
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
