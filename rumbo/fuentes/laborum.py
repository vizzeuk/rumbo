"""Laborum (laborum.cl, antes Bumeran Chile): API JSON pública del buscador."""
import json

from rumbo.util import get_json, limpiar, log

CLAVE = "laborum"
NOMBRE = "Laborum"
DESCRIPCION = "Uno de los portales más grandes de Chile (laborum.cl). Todas las áreas."
POSTULA = True
API = "https://www.laborum.cl/api/avisos/searchV2?pageSize=50&page=0&sort=RECIENTES"
CABECERAS = {"x-site-id": "BMCL", "content-type": "application/json", "accept": "application/json",
             "referer": "https://www.laborum.cl/"}
PROVINCIAS = {"rm": "region-metropolitana", "valparaiso": "region-v", "biobio": "region-viii",
              "antofagasta": "region-ii", "coquimbo": "region-iv", "maule": "region-vii",
              "araucania": "region-ix", "ohiggins": "region-vi", "loslagos": "region-x"}


def buscar(con):
    from rumbo.fuentes import filtros, guardar
    f = filtros()
    base = []
    if f["solo_remoto"]:
        base.append({"id": "modalidad_trabajo", "value": "remoto"})
    if f["part_time"]:
        base.append({"id": "tipo_trabajo", "value": "part-time"})
    if f["region"] in PROVINCIAS and not f["solo_remoto"]:
        base.append({"id": "provincia", "value": "chile|" + PROVINCIAS[f["region"]]})
    nuevas = 0
    for q in f["consultas"]:
        cuerpo = json.dumps({"filtros": base, "query": q, "internacional": False}).encode()
        try:
            datos = get_json(API, data=cuerpo, headers=CABECERAS)
        except Exception as e:
            log(f"Laborum '{q}': {e}")
            continue
        for a in datos.get("content", []):
            nuevas += guardar(con, {
                "id": f"lab-{a['id']}", "fuente": NOMBRE, "titulo": a.get("titulo", ""),
                "empresa": "" if a.get("confidencial") else a.get("empresa", ""),
                "url": f"https://www.laborum.cl/empleos/{a['id']}.html", "descripcion": limpiar(a.get("detalle")),
                "modalidad": (a.get("tipoTrabajo") or "").lower().replace("-", " "),
                "ubicacion": f"{a.get('localizacion', '')} · {a.get('modalidadTrabajo', '')}"})
        con.commit()
    return nuevas
