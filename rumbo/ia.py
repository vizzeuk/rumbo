"""Proveedores de IA intercambiables.

- claude-cli (por defecto): usa la CLI de Claude Code con tu sesión iniciada. Sin API key.
- anthropic: API de Anthropic (variable ANTHROPIC_API_KEY o la que indiques).
- openai: cualquier API compatible con OpenAI (OpenAI, OpenRouter, Groq, LM Studio...).
- ollama: modelos gratis en tu propio PC (http://localhost:11434).
"""
import json
import os
import shutil
import signal
import subprocess
import tempfile
import urllib.request

from rumbo import config


class ErrorIA(RuntimeError):
    pass


def _claude_bin(cfg):
    if cfg.get("claude_bin"):
        return cfg["claude_bin"]
    candidatos = [shutil.which("claude"), os.path.expanduser("~/.local/bin/claude"),
                  os.path.expanduser("~/.claude/local/claude")]
    for c in candidatos:
        if c and os.path.exists(c):
            return c
    raise ErrorIA("No encontré la CLI de Claude. Instálala (claude.com/claude-code) o cambia de proveedor en Ajustes.")


def _claude_cli(prompt, sistema, cfg, herramientas, timeout):
    cmd = [_claude_bin(cfg), "-p", prompt, "--model", cfg.get("modelo") or "sonnet",
           "--output-format", "json", "--strict-mcp-config", "--setting-sources", "",
           "--system-prompt", sistema, "--no-session-persistence", "--tools", herramientas]
    if herramientas:
        cmd += ["--allowedTools", herramientas]
    # stdin cerrado y grupo de procesos propio: si la CLI se cuelga, se mata entera al vencer el plazo
    proc = subprocess.Popen(cmd, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            text=True, cwd=tempfile.gettempdir(), start_new_session=True)
    try:
        out, err = proc.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        os.killpg(proc.pid, signal.SIGKILL) if hasattr(os, "killpg") else proc.kill()
        proc.communicate()
        raise ErrorIA(f"La CLI de Claude no respondió en {timeout} s")
    if proc.returncode != 0:
        raise ErrorIA((err or out or "la CLI de Claude falló")[:400])
    salida = json.loads(out)
    if salida.get("is_error"):
        raise ErrorIA(str(salida.get("result"))[:400])
    return salida.get("result", "")


def _post(url, cuerpo, headers, timeout):
    req = urllib.request.Request(url, data=json.dumps(cuerpo).encode(), headers={
        "Content-Type": "application/json", **headers})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def _anthropic(prompt, sistema, cfg, timeout):
    clave = os.environ.get(cfg.get("variable_clave") or "ANTHROPIC_API_KEY", "")
    if not clave:
        raise ErrorIA("Falta la API key de Anthropic en la variable de entorno.")
    r = _post("https://api.anthropic.com/v1/messages", {
        "model": cfg.get("modelo") or "claude-sonnet-5-5", "max_tokens": 2000, "system": sistema,
        "messages": [{"role": "user", "content": prompt}]},
        {"x-api-key": clave, "anthropic-version": "2023-06-01"}, timeout)
    return "".join(b.get("text", "") for b in r.get("content", []))


def _openai(prompt, sistema, cfg, timeout, ollama=False):
    base = (cfg.get("base_url") or ("http://localhost:11434/v1" if ollama else "https://api.openai.com/v1")).rstrip("/")
    clave = os.environ.get(cfg.get("variable_clave") or "OPENAI_API_KEY", "ollama" if ollama else "")
    r = _post(base + "/chat/completions", {
        "model": cfg.get("modelo") or ("llama3.1" if ollama else "gpt-4o-mini"),
        "messages": [{"role": "system", "content": sistema}, {"role": "user", "content": prompt}],
        "temperature": 0.4}, {"Authorization": f"Bearer {clave}"}, timeout)
    return r["choices"][0]["message"]["content"]


def preguntar(prompt, sistema, herramientas="", timeout=180):
    """Texto de respuesta del modelo. 'herramientas' (WebSearch,WebFetch) solo aplica a claude-cli."""
    cfg = config.cargar()["ia"]
    proveedor = cfg.get("proveedor", "claude-cli")
    try:
        if proveedor == "claude-cli":
            return _claude_cli(prompt, sistema, cfg, herramientas, timeout)
        if proveedor == "anthropic":
            return _anthropic(prompt, sistema, cfg, timeout)
        if proveedor in ("openai", "ollama"):
            return _openai(prompt, sistema, cfg, timeout, ollama=proveedor == "ollama")
    except ErrorIA:
        raise
    except Exception as e:
        raise ErrorIA(f"{proveedor}: {e}") from e
    raise ErrorIA(f"Proveedor desconocido: {proveedor}")


def puede_buscar_en_web():
    return config.cargar()["ia"].get("proveedor", "claude-cli") == "claude-cli"
