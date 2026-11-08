"""Empleos Públicos (empleospublicos.cl): convocatorias del Estado de Chile, API JSON pública."""
import urllib.parse

from rumbo.util import get_json, limpiar, log

CLAVE = "empleospublicos"
NOMBRE = "Empleos Públicos"
DESCRIPCION = "Cargos en ministerios, servicios y municipios (empleospublicos.cl)."
POSTULA = False
REGIONES = {"rm": "Región Metropolitana de Santiago", "valparaiso": "Región de Valparaíso",
            "biobio": "Región del Biobío"}


def buscar(con):
    from rumbo.fuentes import filtros, guardar
    f = filtros()
    nuevas = 0
    for q in f["consultas"]:
        params = {"page": 1, "pageSize": 30, "q": q}
        if f["region"] in REGIONES:
            params["region"] = REGIONES[f["region"]]
        try:
            datos = get_json("https://www.empleospublicos.cl/apiConvocatorias.ashx?" + urllib.parse.urlencode(params),
                             headers={"accept": "application/json", "referer": "https://www.empleospublicos.cl/"})
        except Exception as e:
            log(f"Empleos Públicos '{q}': {e}")
            continue
        filas = datos if isinstance(datos, list) else datos.get("data") or datos.get("items") or datos.get("convocatorias") or []
        for a in filas:
            url = a.get("url", "")
            if not url:
                continue
            if url.startswith("/"):
                url = "https://www.empleospublicos.cl" + url
            oid = urllib.parse.parse_qs(urllib.parse.urlparse(url).query).get("i", [url[-40:]])[0]
            institucion = a.get("Institución / Entidad") or a.get("Ministerio", "")
            texto = " · ".join(str(a.get(k, "")) for k in ("Área de Trabajo", "Tipo de Vacante", "Fecha Cierre Convocatoria", "Nº de Vacantes"))
            nuevas += guardar(con, {
                "id": f"ep-{oid}", "fuente": NOMBRE, "titulo": a.get("Cargo", ""), "empresa": institucion,
                "url": url, "descripcion": limpiar(texto), "presupuesto": str(a.get("Renta Bruta", "")),
                "ubicacion": f"{a.get('Ciudad', '')}, {a.get('Región', '')}"})
        con.commit()
    return nuevas
