"""Utilidades compartidas: HTTP, texto, registro y notificaciones del sistema."""
import html
import json
import platform
import re
import subprocess
import urllib.request
from datetime import datetime

from rumbo import config

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36")


def log(msg):
    linea = f"{datetime.now():%Y-%m-%d %H:%M:%S} {msg}"
    print(linea, flush=True)
    config.HOME.mkdir(parents=True, exist_ok=True)
    with open(config.LOG, "a", encoding="utf-8") as f:
        f.write(linea + "\n")


def get(url, data=None, headers=None, timeout=40):
    h = {"User-Agent": UA, "Accept-Language": "es-CL,es;q=0.9,en;q=0.5"}
    h.update(headers or {})
    req = urllib.request.Request(url, data=data, headers=h)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


def get_json(url, **kw):
    return json.loads(get(url, **kw))


def limpiar(texto):
    sin_tags = re.sub(r"<[^>]+>", " ", html.unescape(texto or ""))
    return re.sub(r"\s+", " ", sin_tags).strip()


def hay(texto, palabras):
    """Palabras completas presentes en el texto (no subcadenas: 'app' no calza con 'aplicar')."""
    return [p for p in palabras
            if re.search(r"(?<![\wáéíóúñ])" + re.escape(p.strip()) + r"(?![\wáéíóúñ])", texto)]


def json_de(texto):
    """Extrae el primer objeto o lista JSON de una respuesta de modelo (tolera texto antes y después)."""
    texto = texto or ""
    dec = json.JSONDecoder()
    for i, c in enumerate(texto):
        if c in "[{":
            try:
                return dec.raw_decode(texto[i:])[0]
            except json.JSONDecodeError:
                continue
    raise ValueError("La respuesta no trae JSON")


def notificar(titulo, texto):
    texto = texto.replace('"', "'")[:180]
    try:
        sistema = platform.system()
        if sistema == "Darwin":
            subprocess.run(["osascript", "-e", f'display notification "{texto}" with title "{titulo}"'],
                           capture_output=True, timeout=10)
        elif sistema == "Linux":
            subprocess.run(["notify-send", titulo, texto], capture_output=True, timeout=10)
        elif sistema == "Windows":
            ps = ("[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] > $null;"
                  "$t=[Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent(1);"
                  f"$t.GetElementsByTagName('text')[0].AppendChild($t.CreateTextNode('{titulo}: {texto}')) > $null;"
                  "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Rumbo').Show("
                  "[Windows.UI.Notifications.ToastNotification]::new($t))")
            subprocess.run(["powershell", "-NoProfile", "-Command", ps], capture_output=True, timeout=15)
    except Exception:
        pass
