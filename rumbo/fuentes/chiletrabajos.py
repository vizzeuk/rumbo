"""Chiletrabajos.cl."""
import re
import urllib.parse

from rumbo import config, reglas
from rumbo.util import get, limpiar, log

CLAVE = "chiletrabajos"
NOMBRE = "Chiletrabajos"
DESCRIPCION = "Portal chileno tradicional (chiletrabajos.cl)."
POSTULA = True


def buscar(con):
    from rumbo.fuentes import desde_portal, filtros
    f = filtros()
    b = config.cargar()["busqueda"]
    nuevas = pedidas = 0
    for q in f["consultas"]:
        try:
            params = {"2": q, "fecha": 5}
            if f["part_time"]:
                params["14"] = 21
            pagina = get("https://www.chiletrabajos.cl/encuentra-un-empleo?" + urllib.parse.urlencode(params))
        except Exception as e:
            log(f"Chiletrabajos '{q}': {e}")
            continue
        for url, titulo in re.findall(r'<h2 class="title[^"]*">\s*<a href="([^"]+)"[^>]*>(.*?)</a>', pagina, re.S):
            if pedidas >= b["detalles_por_fuente"]:
                return nuevas
            num = url.rstrip("/").rsplit("-", 1)[-1]
            n, pidio = desde_portal(con, {"id": "cht-" + num, "fuente": NOMBRE, "titulo": limpiar(titulo), "url": url,
                                          "url_postular": f"https://www.chiletrabajos.cl/trabajo/postular/{num}"},
                                    exigir_remoto=reglas.solo_remoto())
            nuevas += n
            pedidas += pidio
        con.commit()
    return nuevas
