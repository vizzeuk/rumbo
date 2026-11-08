"""Prospección por correo: la IA busca empresas que podrían contratarte y les escribe.

Tres segmentos:
- agencias:  consultoras y software factories que subcontratan (marca blanca, por entregables).
- startups:  startups en etapa temprana que necesitan desarrollo por entregables o part time.
- pymes:     empresas pequeñas a las que les sirve un proyecto concreto (web, CRM, automatización, IA).

Solo guarda correos publicados en el sitio de cada empresa. Nunca inventa ni deduce correos.
Requiere el proveedor claude-cli (búsqueda web). No corre en cada ciclo: se lanza desde la interfaz.
"""
import re

from rumbo import config, ia
from rumbo.util import json_de, log

CLAVE = "agencias"
NOMBRE = "Prospección por correo"
DESCRIPCION = "La IA busca agencias, startups y pymes que podrían contratarte, con su correo publicado."
POSTULA = True
EN_CICLO = False

SEGMENTOS = {
    "agencias": {
        "fuente": "Agencias",
        "pedido": "agencias, consultoras o estudios del mismo rubro que el perfil que, por tamaño, probablemente "
                  "subcontraten profesionales externos cuando tienen más trabajo",
        "objetivo": "ofrecerse como profesional externo de respaldo, por proyecto o por entregables",
        "titulo": "Colaboración externa con {empresa}",
    },
    "startups": {
        "fuente": "Startups",
        "pedido": "startups en etapa temprana (por ejemplo de Start-Up Chile, Platanus, CORFO, Wayra o incubadoras "
                  "universitarias) que probablemente necesiten lo que ofrece el perfil y tengan un equipo chico",
        "objetivo": "ofrecerse para trabajar por entregables o part time en lo que ofrece el perfil",
        "titulo": "Apoyo por entregables para {empresa}",
    },
    "pymes": {
        "fuente": "Pymes",
        "pedido": "pymes ({rubro}) con señales concretas de que les serviría lo que ofrece el perfil (por ejemplo "
                  "procesos manuales, poca presencia digital, ventas o agenda solo por WhatsApp o teléfono). "
                  "Prefiere negocios pequeños y medianos. Indica la oportunidad concreta que viste",
        "objetivo": "proponer un trabajo concreto que les resuelva el problema que se ve desde afuera",
        "titulo": "Propuesta para {empresa}",
    },
}

SISTEMA = """Investigas empresas que podrían contratar al dueño del perfil. Usa búsqueda web. Incluye solo
correos que la propia empresa haya publicado: en su sitio, su perfil de Google, su Instagram o Facebook, o
un directorio comercial; indica la página exacta donde aparece. Nunca inventes ni deduzcas correos (nada de
adivinar contacto@dominio). Evita empresas grandes con área de TI propia. Responde SOLO un JSON válido."""


def buscar(con, n=8, segmento="agencias", rubro=""):
    from rumbo.fuentes import guardar
    if not ia.puede_buscar_en_web():
        raise ia.ErrorIA("La prospección necesita el proveedor claude-cli (usa búsqueda web).")
    seg = SEGMENTOS[segmento]
    ya = [r["empresa"] for r in con.execute("SELECT empresa FROM ofertas WHERE tipo='agencia'")]
    pais = config.cargar()["busqueda"].get("pais", "Chile")
    pedido = seg["pedido"].format(rubro=rubro or "de cualquier rubro donde la tecnología ayude a vender o a ordenarse")
    prompt = f"""PERFIL:
{config.perfil()[:3500]}

Encuentra {n} {pedido}, de {pais} u otros países hispanohablantes.
Excluye estas, ya contactadas: {', '.join(ya[-150:]) or 'ninguna'}.
Devuelve: [{{"empresa": "...", "web": "https://...", "email": "correo publicado", "pagina_email": "url",
"pais": "...", "servicios": "qué hacen", "oportunidad": "qué les ofrecería el perfil y por qué"}}]"""
    lista = json_de(ia.preguntar(prompt, SISTEMA, herramientas="WebSearch,WebFetch", timeout=1200))
    nuevas = 0
    for a in lista if isinstance(lista, list) else []:
        if "@" not in (a.get("email") or ""):
            continue
        nuevas += guardar(con, {
            "id": f"{segmento[:2]}-" + re.sub(r"\W+", "-", a["empresa"].lower()).strip("-"), "tipo": "agencia",
            "fuente": seg["fuente"], "titulo": seg["titulo"].format(empresa=a["empresa"]), "empresa": a["empresa"],
            "url": a.get("web", ""), "email": a["email"].strip(), "modalidad": "proyecto", "ubicacion": a.get("pais", ""),
            "descripcion": f"Segmento: {segmento}. {a.get('servicios', '')}. País: {a.get('pais', '')}. "
                           f"Correo publicado en: {a.get('pagina_email', '')}. Oportunidad: {a.get('oportunidad', '')}. "
                           f"Objetivo del correo: {seg['objetivo']}."})
    con.commit()
    log(f"Prospección ({segmento}): {nuevas} nuevas")
    return nuevas
