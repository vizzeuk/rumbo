"""Filtro rápido sin IA: decide qué vale la pena mostrarle al modelo.

Las listas se pueden ampliar desde config.json (busqueda.stack_extra, busqueda.excluir_extra).
"""
import re

from rumbo import config
from rumbo.util import hay  # noqa: F401  (se reexporta para pruebas)

STACK = {
    "next.js": 12, "nextjs": 12, "react": 10, "typescript": 8, "javascript": 5, "node": 6, "node.js": 6,
    "python": 7, "fastapi": 8, "django": 5, "supabase": 12, "postgres": 6, "postgresql": 6, "sql": 3,
    "n8n": 14, "make": 4, "zapier": 6, "automatización": 10, "automatizacion": 10, "automatizar": 8,
    "integración": 6, "integracion": 6, "integraciones": 6, "api": 4, "apis": 4, "crm": 8, "erp": 5,
    "dashboard": 6, "inteligencia artificial": 10, "ia": 6, "llm": 10, "agente": 8, "agentes": 8,
    "rag": 10, "openai": 8, "chatgpt": 6, "claude": 8, "gemini": 6, "chatbot": 8, "aws": 6,
    "full stack": 10, "fullstack": 10, "frontend": 5, "backend": 5, "mvp": 8, "saas": 6, "tailwind": 4,
    "docker": 6, "cdk": 6, "lambda": 4, "tdd": 6, "sdd": 6, "spec-driven": 6,
    "part time": 15, "part-time": 15, "medio tiempo": 15, "media jornada": 15, "jornada parcial": 15,
    "freelance": 15, "por proyecto": 10, "por entregables": 12, "startup": 8, "consultora": 6,
}
# Siempre fuera, para cualquier perfil: ofertas engañosas
FUERA_SIEMPRE = ["multinivel", "venta por catálogo", "inversión inicial", "invierte", "gana dinero desde casa",
                 "sin experiencia gana", "trading", "criptomonedas", "apuestas", "contenido para adultos"]
# Preset tecnología: palabras que en el TÍTULO descartan la oferta
FUERA_TITULO = [
    "ciberseguridad", "seguridad informática", "pentest", "soc analyst", "wordpress", "woocommerce",
    "shopify", "sap", "salesforce", ".net", "c#", "java", "php", "laravel", "android", "ios", "qa",
    "tester", "soporte", "mesa de ayuda", "help desk", "ventas", "vendedor", "vendedora", "comercial",
    "call center", "telemercadeo", "telemarketing", "seguros", "closer", "setter", "prospección",
    "editor", "social media", "community manager", "diseñador", "diseñadora", "audiovisual", "seo",
    "asistente", "atención al cliente", "redactor", "copywriter", "data entry", "unity", "videojuegos",
]
# En la DESCRIPCIÓN solo cuentan tecnologías ajenas (2 o más descartan)
FUERA_DESC = ["wordpress", "woocommerce", "shopify", "sap", "salesforce", ".net", "c#", "java ", "php",
              "laravel", "liferay", "angular", "cobol", "oracle forms", "kotlin"]
INGLES = ["inglés avanzado", "ingles avanzado", "inglés fluido", "ingles fluido", "inglés intermedio",
          "ingles intermedio", "inglés hablado", "english", "fluent", "c1", "b2+", "bilingüe", "bilingue"]
REMOTO = ["remoto", "teletrabajo", "home office", "trabajo a distancia", "100% remoto", "full remote",
          "remote", "desde casa"]
PALABRAS_CARGO = ["desarrollador", "desarrolladora", "programador", "programadora", "developer",
                  "ingeniero de software", "software", "engineer"]
BONO_MODALIDAD = {"freelance": 25, "proyecto": 25, "part time": 20, "plazo fijo": 10, "full time": 0}


def _listas():
    """(pesos de palabras clave, exclusiones de título, config de búsqueda) según el perfil."""
    b = config.cargar()["busqueda"]
    propias = {k.lower().strip(): 12 for k in b.get("palabras_clave", []) + b.get("stack_extra", []) if k.strip()}
    if b.get("preset") != "tecnologia":   # lo que escribiste en el buscador y tu área también cuentan
        vacias = {"para", "con", "sin", "por", "los", "las", "del", "de", "en", "y", "o"}
        for w in " ".join(b.get("consultas", []) + [b.get("area", "")]).lower().split():
            if len(w) > 3 and w not in vacias:
                propias.setdefault(w, 8)
    fuera = FUERA_SIEMPRE + [x.lower() for x in b.get("excluir", []) + b.get("excluir_extra", [])]
    if b.get("preset") == "tecnologia":
        return dict(STACK, **propias), fuera + FUERA_TITULO, b
    return propias, fuera, b


def solo_remoto():
    b = config.cargar()["busqueda"]
    return b.get("solo_remoto") or b.get("modalidades") == ["remoto"]


def titulo_prometedor(titulo):
    """Antes de abrir el detalle de una oferta: ¿el título sugiere algo de lo que buscas?"""
    claves, fuera, b = _listas()
    t = titulo.lower()
    if hay(t, fuera):
        return False
    if b.get("preset") == "tecnologia":
        return bool(hay(t, list(claves) + PALABRAS_CARGO))
    palabras = list(claves) + [w for q in b.get("consultas", []) for w in q.lower().split() if len(w) > 3]
    return not palabras or bool(hay(t, palabras))


def es_remoto(texto):
    return bool(hay(texto.lower(), REMOTO))


def puntuar(titulo, descripcion, modalidad=""):
    """Devuelve (puntaje 0-100, nota). Puntaje negativo = descartada."""
    claves, fuera, b = _listas()
    t = f"{titulo} {descripcion}".lower()
    if b.get("excluir_ingles", True) and hay(t, INGLES):
        return -1, "pide inglés"
    if hay(titulo.lower(), fuera) or (b.get("preset") == "tecnologia" and len(hay(t, FUERA_DESC)) >= 2):
        return -1, "fuera de lo que buscas"
    if not claves:                       # sin palabras clave: que decida la IA
        return 40 + BONO_MODALIDAD.get(modalidad, 0) // 2, ""
    p = sum(claves[k] for k in hay(t, list(claves)))
    if p < 12 and not hay(titulo.lower(), list(claves)):
        return -1, "poco relacionado con lo que buscas"
    p += BONO_MODALIDAD.get(modalidad, 0)
    if re.search(r"\b(senior|sr\.?|lead|líder técnico|head|principal|staff|gerente)\b", titulo.lower()):
        p -= 10
    if p < b.get("puntaje_minimo", 20):
        return -1, "puntaje bajo"
    return min(p, 100), ""
