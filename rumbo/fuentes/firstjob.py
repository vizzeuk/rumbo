"""Firstjob (firstjob.me): prácticas y primeros empleos para estudiantes y recién egresados."""
import re
import urllib.parse

from rumbo.util import get, limpiar, log

CLAVE = "firstjob"
NOMBRE = "Firstjob"
DESCRIPCION = "Prácticas y primeros trabajos para estudiantes y recién egresados (firstjob.me)."
POSTULA = True


def buscar(con):
    from rumbo.fuentes import desde_portal, filtros
    f = filtros()
    nuevas = pedidas = 0
    for q in f["consultas"]:
        params = [("title", q)]
        if f["solo_remoto"]:
            params.append(("place_job[]", "4"))
        try:
            pagina = get("https://firstjob.me/ofertas?" + urllib.parse.urlencode(params))
        except Exception as e:
            log(f"Firstjob '{q}': {e}")
            continue
        for ruta, titulo in re.findall(r'href="(/oferta/\d+/[^"]+)"[^>]*>\s*(?:<[^>]+>\s*)*([^<]{4,140})<', pagina):
            if pedidas >= f["max"]:
                return nuevas
            oid = ruta.split("/")[2]
            n, pidio = desde_portal(con, {"id": f"fj-{oid}", "fuente": NOMBRE, "titulo": limpiar(titulo),
                                          "url": "https://firstjob.me" + ruta}, exigir_remoto=False)
            nuevas += n
            pedidas += pidio
        con.commit()
    return nuevas
