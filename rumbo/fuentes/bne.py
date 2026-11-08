"""Bolsa Nacional de Empleo (bne.cl), del Estado de Chile: API JSON pública."""
import json

from rumbo.util import get_json, limpiar, log

CLAVE = "bne"
NOMBRE = "Bolsa Nacional de Empleo"
DESCRIPCION = "El portal público de empleo de Chile (bne.cl). Todas las áreas y regiones."
POSTULA = False
REGIONES = {"rm": 378, "valparaiso": 375, "biobio": 384}


def buscar(con):
    from rumbo import reglas
    from rumbo.fuentes import filtros, guardar
    f = filtros()
    cuerpo_base = {}
    if f["region"] in REGIONES and not f["solo_remoto"]:
        cuerpo_base["idsRegion"] = [REGIONES[f["region"]]]
    if f["part_time"]:
        cuerpo_base["idsTipoJornada"] = [10]
    nuevas = 0
    for q in f["consultas"]:
        cuerpo = json.dumps({"textoBusqueda": q, **cuerpo_base}).encode()
        try:
            datos = get_json("https://www.bne.cl/api/ofertas/busqueda?page=0&size=40", data=cuerpo,
                             headers={"content-type": "application/json", "accept": "application/json"})
        except Exception as e:
            log(f"BNE '{q}': {e}")
            continue
        for a in datos.get("content", []):
            desc = limpiar(a.get("descripcion"))
            if f["solo_remoto"] and not reglas.es_remoto(f"{a.get('nombrePuesto', '')} {desc}"):
                continue
            region = (a.get("region") or {}).get("nombre", "")
            comuna = (a.get("comuna") or {}).get("nombre", "")
            nuevas += guardar(con, {
                "id": f"bne-{a['id']}", "fuente": NOMBRE, "titulo": a.get("nombrePuesto", ""),
                "empresa": (a.get("empresario") or {}).get("nombreComercial", ""),
                "url": f"https://www.bne.cl/ofertas/{a['id']}", "descripcion": desc,
                "modalidad": ((a.get("jornadaLaboral") or {}).get("nombre") or "").lower(),
                "presupuesto": (a.get("rangoSalarial") or {}).get("nombre", ""), "ubicacion": f"{comuna}, {region}"})
        con.commit()
    return nuevas
