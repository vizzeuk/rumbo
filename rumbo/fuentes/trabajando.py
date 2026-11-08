"""Trabajando.com (trabajando.cl): API JSON pública del buscador."""
import urllib.parse

from rumbo.util import get_json, limpiar, log

CLAVE = "trabajando"
NOMBRE = "Trabajando.com"
DESCRIPCION = "Portal chileno con miles de ofertas de todas las áreas (trabajando.cl)."
POSTULA = True
REGIONES = {"rm": 1, "valparaiso": 6, "biobio": 9, "antofagasta": 3}
# jornadas: 1 completa, 3 part time, 9 teletrabajo, 11 mixta, 8 freelance


def buscar(con):
    from rumbo.fuentes import filtros, guardar
    f = filtros()
    params = {}
    if f["solo_remoto"]:
        params["jornadas"] = 9
    elif f["part_time"]:
        params["jornadas"] = 3
    if f["region"] in REGIONES and not f["solo_remoto"]:
        params["region"] = REGIONES[f["region"]]
    nuevas = 0
    for q in f["consultas"]:
        for pagina in (1, 2):
            try:
                datos = get_json("https://www.trabajando.cl/api/searchjob?"
                                 + urllib.parse.urlencode({"palabraClave": q, "pagina": pagina, **params}))
            except Exception as e:
                log(f"Trabajando '{q}': {e}")
                break
            ofertas = datos.get("ofertas") or datos.get("listaOfertas") or []
            for a in ofertas:
                oid = a.get("idOferta")
                if not oid:
                    continue
                slug = f"{oid}-" + "-".join(limpiar(a.get("nombreCargo", "")).lower().split())
                nuevas += guardar(con, {
                    "id": f"tr-{oid}", "fuente": NOMBRE, "titulo": a.get("nombreCargo", ""),
                    "empresa": a.get("nombreEmpresa", ""), "url": f"https://www.trabajando.cl/trabajo/{urllib.parse.quote(slug)}",
                    "descripcion": limpiar(a.get("descripcionOferta")),
                    "modalidad": (a.get("nombreJornada") or "").lower(), "ubicacion": a.get("ubicacion", "")})
            if pagina >= (datos.get("cantidadPaginas") or 1):
                break
        con.commit()
    return nuevas
