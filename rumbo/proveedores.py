"""Proveedores de IA para conectar desde la interfaz, con sus modelos y su clave.

La clave (API key) se guarda en el llavero del sistema (servicio "rumbo-ia"), nunca en un archivo.
Los modelos se leen en vivo de cada proveedor cuando se puede, para elegirlos de una lista en vez de
escribirlos a mano.
"""
import json
import shutil
import time
import urllib.error
import urllib.request

import keyring

from rumbo import config

SERVICIO = "rumbo-ia"

PROVEEDORES = [
    {"id": "claude-cli", "nombre": "Claude Code", "tipo": "cli", "costo": "Incluido en tu plan de Claude",
     "detalle": "Usa tu sesión de Claude Code. No necesitas clave.",
     "instalar": "https://claude.com/claude-code",
     "modelos": [{"id": "sonnet", "nombre": "Sonnet (recomendado)"}, {"id": "haiku", "nombre": "Haiku (más rápido)"},
                 {"id": "opus", "nombre": "Opus (más potente, más lento)"}]},
    {"id": "opencode", "nombre": "OpenCode Zen", "tipo": "openai", "costo": "Modelos gratis",
     "detalle": "Modelos gratis por tiempo limitado y otros de pago. Necesitas una clave gratuita.",
     "base_url": "https://opencode.ai/zen/v1", "clave_url": "https://opencode.ai/auth", "lista": True},
    {"id": "openrouter", "nombre": "OpenRouter", "tipo": "openai", "costo": "Modelos gratis con límites",
     "detalle": "Cientos de modelos de muchas empresas; los que dicen gratis no cobran.",
     "base_url": "https://openrouter.ai/api/v1", "clave_url": "https://openrouter.ai/keys", "lista": True},
    {"id": "ollama", "nombre": "Ollama", "tipo": "openai", "costo": "Gratis y privado",
     "detalle": "Modelos que corren en tu computador. Nada sale de tu equipo; necesitas un PC con buena memoria.",
     "base_url": "http://localhost:11434/v1", "instalar": "https://ollama.com/download", "sin_clave": True,
     "sugeridos": ["qwen3:8b", "llama3.1:8b", "gemma3:12b"]},
    {"id": "gemini", "nombre": "Google Gemini", "tipo": "openai", "costo": "Capa gratis",
     "detalle": "Clave gratis desde Google AI Studio, con límites diarios.",
     "base_url": "https://generativelanguage.googleapis.com/v1beta/openai", "clave_url": "https://aistudio.google.com/apikey",
     "lista": True},
    {"id": "groq", "nombre": "Groq", "tipo": "openai", "costo": "Capa gratis",
     "detalle": "Muy rápido, con capa gratis para empezar.",
     "base_url": "https://api.groq.com/openai/v1", "clave_url": "https://console.groq.com/keys", "lista": True},
    {"id": "anthropic", "nombre": "API de Anthropic", "tipo": "anthropic", "costo": "De pago por uso",
     "detalle": "Los modelos Claude por API, pagando lo que uses.", "clave_url": "https://console.anthropic.com/settings/keys",
     "modelos": [{"id": "claude-haiku-5-5", "nombre": "Claude Haiku 5.5 (económico)"},
                 {"id": "claude-sonnet-5-5", "nombre": "Claude Sonnet 5.5 (recomendado)"},
                 {"id": "claude-opus-5-5", "nombre": "Claude Opus 5.5"}]},
    {"id": "openai", "nombre": "OpenAI", "tipo": "openai", "costo": "De pago por uso",
     "detalle": "Modelos GPT por API.", "base_url": "https://api.openai.com/v1",
     "clave_url": "https://platform.openai.com/api-keys", "lista": True},
    {"id": "otro", "nombre": "Otro compatible con OpenAI", "tipo": "openai", "costo": "",
     "detalle": "LM Studio, un servidor propio o cualquier API compatible con OpenAI.", "editable": True},
]
POR_ID = {p["id"]: p for p in PROVEEDORES}


def clave(proveedor):
    try:
        return keyring.get_password(SERVICIO, proveedor) or ""
    except Exception:
        return ""


def guardar_clave(proveedor, valor):
    keyring.set_password(SERVICIO, proveedor, valor.strip())


def base_url(proveedor, cfg=None):
    p = POR_ID.get(proveedor, {})
    propia = (cfg or config.cargar()["ia"]).get("base_url", "")
    if p.get("editable") or not p.get("base_url") or (proveedor == "openai" and propia):
        return propia   # "openai" con URL propia: configuraciones antiguas (LM Studio, Groq, etc.)
    return p["base_url"]


def _get(url, headers=None, timeout=12):
    req = urllib.request.Request(url, headers={"User-Agent": "rumbo", **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def _cli_listo():
    from rumbo import ia
    try:
        ia._claude_bin(config.cargar()["ia"])
        return True
    except Exception:
        return False


def _ollama_vivo():
    try:
        _get("http://localhost:11434/api/tags", timeout=2)
        return True
    except Exception:
        return False


def estado():
    """Lista de proveedores para la interfaz, con si están listos para usar."""
    actual = config.cargar()["ia"]
    salida = []
    for p in PROVEEDORES:
        if p["tipo"] == "cli":
            listo = _cli_listo()
        elif p.get("sin_clave"):
            listo = _ollama_vivo()
        else:
            listo = bool(clave(p["id"]))
        salida.append({**{k: v for k, v in p.items() if k != "sugeridos"}, "listo": listo,
                       "actual": actual.get("proveedor") == p["id"]})
    return {"proveedores": salida, "actual": {"proveedor": actual.get("proveedor"), "modelo": actual.get("modelo"),
                                               "base_url": actual.get("base_url", "")}}


_cache = {}


def _es_gratis(m):
    i = str(m.get("id", ""))
    precio = m.get("pricing") or {}
    return i.endswith(":free") or i.endswith("-free") or (precio and all(str(v) in ("0", "0.0") for v in precio.values()))


def modelos(proveedor, clave_temporal=""):
    """[{id, nombre, gratis}] ordenados: gratis primero. Lanza ValueError con un mensaje claro."""
    p = POR_ID.get(proveedor)
    if not p:
        raise ValueError("Proveedor desconocido.")
    if p.get("modelos"):
        return p["modelos"]
    llave = (proveedor, bool(clave_temporal))
    if llave in _cache and time.time() - _cache[llave][0] < 600:
        return _cache[llave][1]
    if proveedor == "ollama":
        try:
            datos = _get("http://localhost:11434/api/tags", timeout=3)
        except Exception:
            raise ValueError("Ollama no está abierto. Instálalo desde ollama.com, ábrelo y vuelve a intentar.")
        lista = [{"id": m["name"], "nombre": m["name"], "gratis": True} for m in datos.get("models", [])]
        if not lista:
            raise ValueError("Ollama está abierto pero no tiene modelos. En una terminal escribe: ollama pull qwen3:8b")
        return lista
    base = base_url(proveedor)
    if not base:
        raise ValueError("Escribe la dirección (URL base) del servidor.")
    k = clave_temporal or clave(proveedor)
    try:
        datos = _get(base.rstrip("/") + "/models", {"Authorization": f"Bearer {k}"} if k else {})
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            raise ValueError("Para ver los modelos necesito tu clave. Pégala primero.")
        raise ValueError(f"El proveedor respondió con un error ({e.code}).")
    except Exception:
        raise ValueError("No pude conectarme con el proveedor. Revisa tu internet.")
    lista = []
    for m in datos.get("data", []):
        i = str(m.get("id", "")).removeprefix("models/")
        if any(x in i for x in ("embed", "whisper", "tts", "image", "audio", "moderation", "dall-e", "transcribe")):
            continue
        lista.append({"id": i, "nombre": m.get("name") or i, "gratis": _es_gratis(m)})
    lista.sort(key=lambda m: (not m["gratis"], m["nombre"].lower()))
    _cache[llave] = (time.time(), lista)
    return lista


def conectar(proveedor, modelo, clave_nueva="", url=""):
    """Guarda la elección, prueba con una pregunta corta y devuelve un mensaje para la persona."""
    p = POR_ID.get(proveedor)
    if not p:
        raise ValueError("Proveedor desconocido.")
    if clave_nueva:
        guardar_clave(proveedor, clave_nueva)
    tipo = {"cli": "claude-cli", "anthropic": "anthropic"}.get(p["tipo"], "openai")
    cambios = {"proveedor": proveedor, "modelo": modelo, "tipo": tipo}
    if p.get("editable"):
        cambios["base_url"] = url.strip()
    config.guardar({"ia": cambios})
    return probar()


def probar():
    from rumbo import ia
    inicio = time.time()
    try:
        r = ia.preguntar("Responde solo con la palabra: listo", "Eres un asistente breve.", timeout=90)
    except Exception as e:
        raise ValueError(explicar(str(e)))
    if not r.strip():
        raise ValueError("El modelo respondió vacío. Prueba con otro modelo.")
    return {"ok": "Conectado. La IA respondió.", "segundos": round(time.time() - inicio, 1)}


def explicar(error):
    e = error.lower()
    if "401" in e or "unauthorized" in e or "invalid api key" in e or "incorrect api key" in e:
        return "La clave no es válida. Cópiala de nuevo desde el sitio del proveedor."
    if "402" in e or "credit" in e or "insufficient" in e or "quota" in e:
        return "Tu cuenta no tiene saldo o se acabó la cuota. Elige un modelo gratis o carga saldo."
    if "429" in e or "rate" in e:
        return "Llegaste al límite de uso por ahora. Espera unos minutos o usa otro modelo."
    if "404" in e or "not found" in e or "does not exist" in e:
        return "Ese modelo no existe en este proveedor. Elige otro de la lista."
    if "connection refused" in e or "11434" in e:
        return "Ollama no está abierto. Ábrelo y vuelve a intentar."
    if "no encontré la cli" in e:
        return "No encontré Claude Code en este computador. Instálalo o elige otro proveedor."
    if "timed out" in e or "no respondió" in e:
        return "La IA tardó demasiado en responder. Prueba de nuevo o elige un modelo más rápido."
    return error[:240]


def hay_cli_opencode():
    return bool(shutil.which("opencode"))
