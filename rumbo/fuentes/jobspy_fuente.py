"""Indeed, Glassdoor y Google Jobs a través de JobSpy (MIT, github.com/speedyapply/JobSpy).

Opcional: pip install "rumbo[jobspy]". Solo para encontrar.
"""
from rumbo import config
from rumbo.util import log

CLAVE = "jobspy"
NOMBRE = "Indeed"
DESCRIPCION = "Indeed Chile vía JobSpy (opcional, solo para encontrar)."
POSTULA = False


def buscar(con):
    try:
        from jobspy import scrape_jobs
    except ImportError:
        log("JobSpy no está instalado: pip install \"rumbo[jobspy]\"")
        return 0
    from rumbo.fuentes import guardar
    b = config.cargar()["busqueda"]
    nuevas = 0
    from rumbo import reglas
    for q in b["consultas"][:5]:
        termino = f"{q} remoto" if reglas.solo_remoto() else q
        try:
            df = scrape_jobs(site_name=["indeed"], search_term=termino, location=b.get("pais", "Chile"),
                             results_wanted=20, hours_old=168, country_indeed=b.get("pais", "Chile"))
        except Exception as e:
            log(f"JobSpy '{q}': {e}")
            continue
        for _, r in df.iterrows():
            o = {"id": f"js-{r.get('site')}-{r.get('id')}", "tipo": "solo_ver", "fuente": NOMBRE,
                 "titulo": str(r.get("title", "")), "empresa": str(r.get("company", "") or ""),
                 "url": str(r.get("job_url", "")), "descripcion": str(r.get("description", "") or ""),
                 "ubicacion": str(r.get("location", "") or "")}
            if reglas.solo_remoto() and not reglas.es_remoto(o["titulo"] + " " + o["descripcion"] + " " + o["ubicacion"]):
                continue
            nuevas += guardar(con, o)
        con.commit()
    return nuevas
