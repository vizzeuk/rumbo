"""Línea de comandos de Rumbo."""
import argparse
import getpass
import sys
import threading
import time
import urllib.request

from rumbo import __version__, config

AYUDA = """Rumbo: tu búsqueda de trabajo en piloto automático.

Comandos:
  rumbo                      abre la interfaz (y levanta el servicio si no está corriendo)
  rumbo servicio             servidor + búsqueda automática cada N horas (para dejarlo corriendo)
  rumbo buscar               un ciclo ahora: buscar, evaluar, postular, enviar
  rumbo login <portal>       inicia sesión en un portal para la postulación automática
                             (Computrabajo, Chiletrabajos, "Get on Board", Luk)
  rumbo correo               conecta tu correo (contraseña de aplicación)
  rumbo autoarranque         que Rumbo arranque solo al encender el computador
  rumbo autoarranque --quitar
  rumbo importar <ruta.db>   importa la base del buscador anterior
"""


def _activo():
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{config.PUERTO}/api/estado", timeout=2)
        return True
    except Exception:
        return False


def main(argv=None):
    p = argparse.ArgumentParser(prog="rumbo", description=AYUDA, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("comando", nargs="?", default="ui")
    p.add_argument("extra", nargs="*")
    p.add_argument("--quitar", action="store_true")
    p.add_argument("--version", action="version", version=f"rumbo {__version__}")
    a = p.parse_args(argv)
    config.asegurar_carpetas()

    if a.comando == "ui":
        if _activo():
            import webbrowser
            webbrowser.open(f"http://localhost:{config.PUERTO}")
            return
        from rumbo import motor, servidor
        threading.Thread(target=motor.bucle, daemon=True).start()
        print(f"Rumbo corriendo en http://localhost:{config.PUERTO} (Ctrl+C para cerrar)")
        servidor.servir(abrir_navegador=True)
    elif a.comando == "servicio":
        from rumbo import motor, servidor
        from rumbo.util import log
        threading.Thread(target=motor.bucle, daemon=True).start()
        log(f"Servicio iniciado en http://localhost:{config.PUERTO}")
        servidor.servir()
    elif a.comando == "buscar":
        from rumbo import motor
        print(motor.ciclo(forzar=True))
    elif a.comando == "login":
        from rumbo.postular.navegador import login
        from rumbo.postular.portales import PORTALES
        portal = " ".join(a.extra)
        if portal not in PORTALES:
            sys.exit(f"Portales disponibles: {', '.join(PORTALES)}")
        print("Sesión guardada." if login(portal) else "No pude confirmar la sesión. Intenta de nuevo.")
    elif a.comando == "correo":
        from rumbo import correo
        if not correo.cuenta():
            config.guardar({"envio": {"correo": input("Tu correo: ").strip()}})
        print(f"Cuenta: {correo.cuenta()}\nCrea una contraseña de aplicación (Gmail: myaccount.google.com/apppasswords) y pégala.")
        correo.guardar_clave(getpass.getpass("Contraseña de aplicación: "))
        try:
            correo.probar()
            print("Correo conectado.")
        except Exception as e:
            print(f"Se guardó, pero el servidor la rechazó: {e}")
    elif a.comando == "autoarranque":
        from rumbo import autoarranque
        print(autoarranque.desinstalar() if a.quitar else autoarranque.instalar())
    elif a.comando == "importar":
        from rumbo.importar import importar
        print(importar(a.extra[0]))
    else:
        print(AYUDA)


if __name__ == "__main__":
    main()
    time.sleep(0)
