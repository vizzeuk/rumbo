"""Luk (takealuk.com), el portal de empleo de Buk. Área tecnología, modalidad remota."""
import re
import urllib.parse

from rumbo import config, reglas
from rumbo.util import get, limpiar, log

CLAVE = "luk"
NOMBRE = "Luk"
DESCRIPCION = "El portal de empleo gratuito de Buk (takealuk.com). Todas las áreas."
POSTULA = True


def buscar(con):
    from rumbo.fuentes import desde_portal, filtros
    f = filtros()
    b = config.cargar()["busqueda"]
    extra = ""
    if f["solo_remoto"]:
        extra += "&work_arrangements%5B%5D=remote"
    if f["part_time"]:
        extra += "&job_types%5B%5D=part_time"
    if b.get("preset") == "tecnologia":
        extra += "&job_areas%5B%5D=technology"
    nuevas = pedidas = 0
    for q in f["consultas"] or [""]:
        for pag in range(1, 4):
            try:
                pagina = get("https://www.takealuk.com/job_offers?" + urllib.parse.urlencode({"job_positions": q, "page": pag}) + extra)
            except Exception as e:
                log(f"Luk '{q}' página {pag}: {e}")
                break
            slugs = sorted(set(re.findall(r'href="/job_offers/([a-z0-9-]+)"', pagina)))
            if not slugs:
                break
            for slug in slugs:
                if pedidas >= f["max"]:
                    return nuevas
                i = pagina.find(f'href="/job_offers/{slug}"')
                m = re.search(r'job-offer-card__title[^>]*>\s*([^<]{3,140})<', pagina[i:i + 4000]) if i >= 0 else None
                titulo = limpiar(m.group(1)) if m else re.sub(r"-\d+$", "", slug).replace("-", " ").capitalize()
                url = f"https://www.takealuk.com/job_offers/{slug}"
                n, pidio = desde_portal(con, {"id": "luk-" + slug, "fuente": NOMBRE, "titulo": titulo, "url": url,
                                              "url_postular": url + "?tab=apply"}, exigir_remoto=False, pausa=0.5)
                nuevas += n
                pedidas += pidio
            con.commit()
    return nuevas
