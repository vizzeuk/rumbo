"""Yapo empleos (yapo.cl): avisos clasificados de trabajo, muchos con contacto directo."""
import re
import urllib.parse

from rumbo.util import get, limpiar, log

CLAVE = "yapo"
NOMBRE = "Yapo"
DESCRIPCION = "Avisos clasificados de empleo de todo Chile (yapo.cl)."
POSTULA = False
REGIONES = {"rm": "region-metropolitana", "valparaiso": "valparaiso"}


def buscar(con):
    from rumbo.fuentes import desde_portal, filtros
    f = filtros()
    region = f"/{REGIONES[f['region']]}" if f["region"] in REGIONES and not f["solo_remoto"] else ""
    nuevas = pedidas = 0
    for q in f["consultas"]:
        try:
            pagina = get(f"https://www.yapo.cl/empleos-ofertas-de-trabajos{region}?" + urllib.parse.urlencode({"keyword": q}))
        except Exception as e:
            log(f"Yapo '{q}': {e}")
            continue
        vistos = set()
        for ruta in re.findall(r'href="(/empleos-ofertas-de-trabajos/[^"/]+/\d+)"', pagina):
            if ruta in vistos:
                continue
            vistos.add(ruta)
            if pedidas >= f["max"]:
                return nuevas
            slug, oid = ruta.split("/")[-2:]
            n, pidio = desde_portal(con, {"id": f"yp-{oid}", "fuente": NOMBRE, "titulo": limpiar(slug.replace("-", " ")).capitalize(),
                                          "url": "https://www.yapo.cl" + ruta}, exigir_remoto=f["solo_remoto"])
            nuevas += n
            pedidas += pidio
        con.commit()
    return nuevas
