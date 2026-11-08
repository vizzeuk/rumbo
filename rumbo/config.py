"""Rutas, configuración y perfil del usuario.

Todo lo personal vive fuera del repositorio, en la carpeta de datos:
  ~/.rumbo  (o la que indique la variable RUMBO_HOME)
"""
import json
import os
import shutil
from pathlib import Path

HOME = Path(os.environ.get("RUMBO_HOME", Path.home() / ".rumbo"))
DB = HOME / "rumbo.db"
CONFIG = HOME / "config.json"
PERFIL = HOME / "perfil.md"
DATOS = HOME / "datos.json"
LOG = HOME / "rumbo.log"
NAVEGADOR = HOME / "navegador"        # perfil persistente de Playwright (tus sesiones)
CAPTURAS = HOME / "capturas"          # una captura por postulación automática
PLANTILLAS = Path(__file__).parent / "plantillas"
PUERTO = int(os.environ.get("RUMBO_PUERTO", "8765"))

BASE = {
    "general": {"onboarding_hecho": False},
    # Inteligencia artificial
    "ia": {
        "proveedor": "claude-cli",       # claude-cli | anthropic | openai | ollama
        "modelo": "sonnet",              # claude-cli: sonnet | haiku ; otros: nombre del modelo
        "claude_bin": "",                # vacío = se busca solo
        "base_url": "",                  # openai-compatible u ollama (http://localhost:11434/v1)
        "variable_clave": "",            # nombre de la variable de entorno con la API key
        "evaluar_por_ciclo": 6,
    },
    # Qué buscar (cualquier profesión: lo define el asistente de bienvenida o Ajustes)
    "busqueda": {
        "preset": "general",             # general | tecnologia (agrega el diccionario técnico)
        "area": "",                      # ej. "contabilidad", "atención de público", "desarrollo web"
        "consultas": [],                 # lo que se escribe en el buscador de cada portal
        "palabras_clave": [],            # suman puntos si aparecen en la oferta
        "excluir": [],                   # descartan la oferta si aparecen en el título
        "modalidades": ["remoto", "hibrido", "presencial"],
        "jornadas": [],                  # full time | part time | por proyecto | práctica (vacío = todas)
        "region": "",                    # ej. "Región Metropolitana"
        "pais": "Chile",
        "solo_remoto": False,
        "excluir_ingles": True,
        "puntaje_minimo": 20,
        "detalles_por_fuente": 15,
    },
    "fuentes": {
        "getonbrd": True, "freelancer": True, "computrabajo": True, "chiletrabajos": True,
        "luk": True, "linkedin": True, "jobspy": False, "agencias": True,
        "laborum": True, "trabajando": True, "bne": True, "empleospublicos": False, "firstjob": False, "yapo": False,
    },
    # Envío
    "envio": {
        "modo_automatico": False,
        "umbral": 80,                    # fit mínimo para enviar o postular sin preguntar
        "limite_correos_dia": 10,
        "limite_portal_dia": 10,         # postulaciones automáticas por portal y día
        "revisar_antes_de_enviar": True, # postulador: abre el navegador y espera tu clic final
        "dias_seguimiento": 5,
        "correo": "",
        "nombre": "",
    },
    "ciclo": {"horas": 2, "desde": 8, "hasta": 23},
}

DATOS_BASE = {
    "nombre": "", "apellido": "", "email": "", "telefono": "", "ciudad": "", "pais": "Chile",
    "linkedin": "", "github": "", "portafolio": "", "cv": "", "renta_esperada": "",
    "disponibilidad": "Inmediata, part time flexible o por entregables", "anios_experiencia": "",
}


def _mezclar(base, extra):
    salida = dict(base)
    for k, v in (extra or {}).items():
        salida[k] = _mezclar(base[k], v) if isinstance(base.get(k), dict) and isinstance(v, dict) else v
    return salida


def asegurar_carpetas():
    for carpeta in (HOME, NAVEGADOR, CAPTURAS):
        carpeta.mkdir(parents=True, exist_ok=True)
    if not PERFIL.exists():
        shutil.copy(PLANTILLAS / "perfil.ejemplo.md", PERFIL)
    if not DATOS.exists():
        DATOS.write_text(json.dumps(DATOS_BASE, indent=2, ensure_ascii=False))


def cargar():
    asegurar_carpetas()
    datos = json.loads(CONFIG.read_text()) if CONFIG.exists() else {}
    return _mezclar(BASE, datos)


def guardar(cambios):
    actual = json.loads(CONFIG.read_text()) if CONFIG.exists() else {}
    CONFIG.write_text(json.dumps(_mezclar(_mezclar(BASE, actual), cambios), indent=2, ensure_ascii=False))


def perfil():
    asegurar_carpetas()
    return PERFIL.read_text(encoding="utf-8")


def datos_personales():
    asegurar_carpetas()
    return _mezclar(DATOS_BASE, json.loads(DATOS.read_text(encoding="utf-8")))
