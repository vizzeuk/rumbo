"""Deja Rumbo corriendo solo al encender el computador (macOS, Windows o Linux)."""
import platform
import subprocess
import sys
from pathlib import Path

ETIQUETA = "com.rumbo.servicio"


def instalar():
    sistema = platform.system()
    cmd = [sys.executable, "-m", "rumbo", "servicio"]
    if sistema == "Darwin":
        plist = Path.home() / "Library/LaunchAgents" / f"{ETIQUETA}.plist"
        args = "".join(f"<string>{a}</string>" for a in cmd)
        plist.write_text(f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>{ETIQUETA}</string>
<key>ProgramArguments</key><array>{args}</array>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
</dict></plist>""")
        subprocess.run(["launchctl", "unload", str(plist)], capture_output=True)
        subprocess.run(["launchctl", "load", str(plist)], check=True)
        return f"Listo: Rumbo arranca solo (launchd). Archivo: {plist}"
    if sistema == "Linux":
        unidad = Path.home() / ".config/systemd/user/rumbo.service"
        unidad.parent.mkdir(parents=True, exist_ok=True)
        unidad.write_text(f"""[Unit]
Description=Rumbo
[Service]
ExecStart={' '.join(cmd)}
Restart=always
[Install]
WantedBy=default.target
""")
        subprocess.run(["systemctl", "--user", "daemon-reload"], check=True)
        subprocess.run(["systemctl", "--user", "enable", "--now", "rumbo.service"], check=True)
        return "Listo: Rumbo arranca solo (systemd --user)."
    if sistema == "Windows":
        pyw = Path(sys.executable).with_name("pythonw.exe")
        ejecutable = str(pyw if pyw.exists() else sys.executable)
        subprocess.run(["schtasks", "/Create", "/F", "/SC", "ONLOGON", "/TN", "Rumbo",
                        "/TR", f'"{ejecutable}" -m rumbo servicio'], check=True)
        return "Listo: Rumbo arranca al iniciar sesión (Programador de tareas)."
    return f"Sistema no soportado: {sistema}"


def desinstalar():
    sistema = platform.system()
    if sistema == "Darwin":
        plist = Path.home() / "Library/LaunchAgents" / f"{ETIQUETA}.plist"
        subprocess.run(["launchctl", "unload", str(plist)], capture_output=True)
        plist.unlink(missing_ok=True)
    elif sistema == "Linux":
        subprocess.run(["systemctl", "--user", "disable", "--now", "rumbo.service"], capture_output=True)
    elif sistema == "Windows":
        subprocess.run(["schtasks", "/Delete", "/F", "/TN", "Rumbo"], capture_output=True)
    return "Arranque automático desactivado."
