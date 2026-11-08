"""Freelancer.com: proyectos por entregable (API pública de proyectos activos, en español)."""
import time
import urllib.parse

from rumbo.util import get_json, limpiar, log

CLAVE = "freelancer"
NOMBRE = "Freelancer"
DESCRIPCION = "Proyectos por entregable en español (API pública)."
POSTULA = False
CONSULTAS = ["next.js", "react", "supabase", "n8n", "automatizacion", "automatización", "crm", "dashboard",
             "chatbot", "agente ia", "inteligencia artificial", "integracion api", "aplicacion web",
             "plataforma web", "saas", "mvp", "python", "fastapi", "landing page"]


def buscar(con):
    from rumbo.fuentes import guardar
    nuevas, ahora = 0, time.time()
    for q in CONSULTAS:
        params = {"query": q, "limit": 50, "compact": "true", "job_details": "true", "full_description": "true",
                  "sort_field": "time_updated", "languages[]": "es"}
        try:
            proyectos = get_json("https://www.freelancer.com/api/projects/0.1/projects/active/?"
                                 + urllib.parse.urlencode(params))["result"]["projects"]
        except Exception as e:
            log(f"Freelancer '{q}': {e}")
            continue
        for p in proyectos:
            ofertas = (p.get("bid_stats") or {}).get("bid_count", 0)
            if ahora - p.get("time_submitted", ahora) > 3 * 86400 or ofertas > 60:
                continue
            b = p.get("budget") or {}
            moneda = (p.get("currency") or {}).get("code", "USD")
            url = "https://www.freelancer.com/projects/" + p.get("seo_url", "")
            nuevas += guardar(con, {"id": f"fl-{p['id']}", "fuente": NOMBRE, "titulo": p["title"], "url": url,
                                    "descripcion": limpiar(p.get("description")), "modalidad": "proyecto",
                                    "presupuesto": f'{b.get("minimum") or "?"} a {b.get("maximum") or "?"} {moneda} ({ofertas} ofertas)',
                                    "publicada": p.get("time_submitted"), "ubicacion": "Remoto"})
    return nuevas
