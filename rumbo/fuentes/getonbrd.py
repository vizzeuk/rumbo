"""Get on Board: portal tech de Latinoamérica con API pública."""
import time
import urllib.parse

from rumbo import config, reglas
from rumbo.util import get_json, limpiar, log

CLAVE = "getonbrd"
NOMBRE = "Get on Board"
DESCRIPCION = "Empleos tech en Latinoamérica (API oficial). Remotos y en español."
POSTULA = True
MODALIDADES = {1: "full time", 2: "part time", 3: "freelance", 4: "práctica"}
EXTRA = ["fullstack", "node", "typescript", "frontend", "backend", "n8n", "llm", "supabase", "freelance", "part time"]


def buscar(con):
    from rumbo.fuentes import guardar
    b = config.cargar()["busqueda"]
    nuevas, ahora = 0, time.time()
    for q in dict.fromkeys(b["consultas"] + (EXTRA if b.get("preset") == "tecnologia" else [])):
        try:
            datos = get_json("https://www.getonbrd.com/api/v0/search/jobs?"
                             + urllib.parse.urlencode({"query": q, "per_page": 100}))["data"]
        except Exception as e:
            log(f"Get on Board '{q}': {e}")
            continue
        for j in datos:
            a = j["attributes"]
            if b.get("excluir_ingles", True) and a.get("lang") == "en":
                continue
            if reglas.solo_remoto() and a.get("remote_modality") not in ("fully_remote", "remote_local"):
                continue
            mod = int(((a.get("modality") or {}).get("data") or {}).get("id") or 1)
            if mod == 4 or ahora - (a.get("published_at") or ahora) > 21 * 86400:
                continue
            desc = " ".join(limpiar(a.get(k)) for k in ("description", "projects", "functions", "desirable"))
            sueldo = ""
            if a.get("min_salary") or a.get("max_salary"):
                sueldo = f'US${a.get("min_salary") or "?"} a {a.get("max_salary") or "?"} al mes'
            url = (j.get("links") or {}).get("public_url", "")
            nuevas += guardar(con, {"id": "gob-" + j["id"], "fuente": NOMBRE, "titulo": a["title"], "url": url,
                                    "url_postular": url, "descripcion": desc, "modalidad": MODALIDADES.get(mod, ""),
                                    "presupuesto": sueldo, "publicada": a.get("published_at"),
                                    "ubicacion": "Remoto"})
    return nuevas
