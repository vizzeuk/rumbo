"""Computrabajo Chile. Estructura del listado documentada por chambaflow (MIT)."""
import re

from rumbo import config, reglas
from rumbo.util import get, limpiar, log

CLAVE = "computrabajo"
NOMBRE = "Computrabajo"
DESCRIPCION = "El portal de empleo más grande de Latinoamérica (cl.computrabajo.com)."
POSTULA = True
DOMINIO = "https://cl.computrabajo.com"


def buscar(con):
    from rumbo.fuentes import desde_portal, filtros
    f = filtros()
    b = config.cargar()["busqueda"]
    nuevas = pedidas = 0
    for q in f["consultas"]:
        slug = re.sub(r"[^a-z0-9-]", "", q.lower().replace(" ", "-").replace("ó", "o").replace("í", "i"))
        try:
            sufijo = ("-jornada-part-time" if f["part_time"] else "") + ("-en-remoto" if f["solo_remoto"] else "")
            pagina = get(f"{DOMINIO}/trabajo-de-{slug}{sufijo}?by=publicationtime")
        except Exception as e:
            log(f"Computrabajo '{q}': {e}")
            continue
        for href, titulo in re.findall(r'class="js-o-link[^"]*"\s+href="(/ofertas-de-trabajo/[^"#]+)[^"]*">\s*(.*?)\s*</a>', pagina, re.S):
            if pedidas >= b["detalles_por_fuente"]:
                return nuevas
            n, pidio = desde_portal(con, {"id": "ct-" + href.rsplit("-", 1)[-1], "fuente": NOMBRE,
                                          "titulo": limpiar(titulo), "url": DOMINIO + href},
                                    exigir_remoto=reglas.solo_remoto())
            nuevas += n
            pedidas += pidio
        con.commit()
    return nuevas
