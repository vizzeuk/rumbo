"""Correo: envío por SMTP, recordatorios y detección de respuestas por IMAP.

La contraseña de aplicación se guarda en el llavero del sistema (keyring): Llavero en Mac,
Administrador de credenciales en Windows, Secret Service en Linux. Nunca en un archivo.
"""
import imaplib
import smtplib
import time
from datetime import datetime
from email.mime.text import MIMEText
from email.utils import formataddr, make_msgid

import keyring

from rumbo import config, db
from rumbo.util import log, notificar

SERVICIO = "rumbo-correo"
SERVIDORES = {"gmail.com": ("smtp.gmail.com", "imap.gmail.com"),
              "outlook.com": ("smtp.office365.com", "outlook.office365.com"),
              "hotmail.com": ("smtp.office365.com", "outlook.office365.com")}


def _servidores(correo):
    dominio = correo.split("@")[-1].lower()
    return SERVIDORES.get(dominio, (f"smtp.{dominio}", f"imap.{dominio}"))


def cuenta():
    return config.cargar()["envio"].get("correo") or config.datos_personales().get("email", "")


def clave():
    c = cuenta()
    return (keyring.get_password(SERVICIO, c) or "") if c else ""


def guardar_clave(valor):
    keyring.set_password(SERVICIO, cuenta(), valor.replace(" ", ""))


def probar():
    smtp, _ = _servidores(cuenta())
    with smtplib.SMTP_SSL(smtp, 465, timeout=30) as s:
        s.login(cuenta(), clave())


def enviar(con, oid, texto=None, asunto=None, tipo_evento="correo"):
    env = config.cargar()["envio"]
    o = con.execute("SELECT * FROM ofertas WHERE id=?", (oid,)).fetchone()
    if not o["email"]:
        raise RuntimeError("Esta oportunidad no tiene correo de contacto.")
    if not clave():
        raise RuntimeError("Conecta tu correo primero (Ajustes → Correo).")
    if db.contar_eventos_hoy(con, "correo") + db.contar_eventos_hoy(con, "seguimiento") >= env["limite_correos_dia"]:
        raise RuntimeError("Llegaste al límite diario de correos.")
    nombre = env.get("nombre") or " ".join(filter(None, [config.datos_personales().get("nombre"),
                                                        config.datos_personales().get("apellido")]))
    msg = MIMEText(texto or o["propuesta"], "plain", "utf-8")
    msg["Subject"] = asunto or o["asunto"] or o["titulo"]
    msg["From"] = formataddr((nombre, cuenta()))
    msg["To"] = o["email"]
    msg["Message-ID"] = make_msgid()
    smtp, _ = _servidores(cuenta())
    with smtplib.SMTP_SSL(smtp, 465, timeout=30) as s:
        s.login(cuenta(), clave())
        s.send_message(msg)
    ahora = time.time()
    if tipo_evento == "correo":
        con.execute("UPDATE ofertas SET estado='enviada', enviada=?, canal='correo', error=NULL WHERE id=?", (ahora, oid))
    else:
        con.execute("UPDATE ofertas SET seguimiento=? WHERE id=?", (ahora, oid))
    db.evento(con, oid, tipo_evento, o["email"])
    con.commit()
    log(f"Correo ({tipo_evento}) enviado a {o['email']}: {o['titulo'][:60]}")


def seguimientos(con):
    env = config.cargar()["envio"]
    limite = time.time() - env["dias_seguimiento"] * 86400
    hechos = 0
    for o in con.execute("""SELECT * FROM ofertas WHERE estado='enviada' AND canal='correo' AND email!=''
            AND seguimiento IS NULL AND enviada<?""", (limite,)).fetchall():
        texto = ("Hola, les escribo de nuevo por si mi correo anterior quedó entre otros. Sigo disponible y "
                 "con gusto coordinamos una llamada corta si les sirve.\n\nSaludos,\n"
                 + (env.get("nombre") or config.datos_personales().get("nombre", "")))
        try:
            enviar(con, o["id"], texto=texto, asunto="Re: " + (o["asunto"] or o["titulo"]), tipo_evento="seguimiento")
            hechos += 1
        except Exception as e:
            log(f"Seguimiento {o['id']}: {e}")
            break
    return hechos


def _marcar_rebotes(con, m, pendientes):
    """Si un correo rebotó (la dirección no existe), la oportunidad se descarta y no recibe recordatorio."""
    import re
    if not pendientes:
        return
    desde = datetime.fromtimestamp(min(o["enviada"] or time.time() for o in pendientes)).strftime("%d-%b-%Y")
    _, datos = m.search(None, f'(FROM "mailer-daemon" SINCE {desde})')
    rebotados = set()
    for i in (datos[0].split() if datos and datos[0] else []):
        _, cuerpo = m.fetch(i, "(BODY.PEEK[TEXT]<0.4000>)")
        texto = cuerpo[0][1].decode("utf-8", "ignore").lower() if cuerpo and cuerpo[0] else ""
        rebotados |= set(re.findall(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", texto))
    for o in pendientes:
        if o["email"].lower() in rebotados:
            con.execute("UPDATE ofertas SET estado='descartada', error='El correo rebotó: la dirección no existe' WHERE id=?",
                        (o["id"],))
            db.evento(con, o["id"], "rebote", o["email"])
            log(f"Rebote: {o['email']}")
    con.commit()


def detectar_respuestas(con):
    pendientes = con.execute("SELECT id, email, titulo, enviada FROM ofertas WHERE estado='enviada' AND email!=''").fetchall()
    if not clave() or not pendientes:
        return 0
    nuevas = 0
    _, imap = _servidores(cuenta())
    try:
        m = imaplib.IMAP4_SSL(imap, timeout=30)
        m.login(cuenta(), clave())
        m.select("INBOX", readonly=True)
        _marcar_rebotes(con, m, pendientes)
        for o in pendientes:
            desde = datetime.fromtimestamp(o["enviada"] or time.time()).strftime("%d-%b-%Y")
            _, datos = m.search(None, f'(FROM "{o["email"]}" SINCE {desde})')
            if datos and datos[0].split():
                con.execute("UPDATE ofertas SET estado='respondio', respuesta=? WHERE id=?", (time.time(), o["id"]))
                db.evento(con, o["id"], "respuesta", o["email"])
                nuevas += 1
                notificar("Rumbo: te respondieron", o["titulo"][:120])
        con.commit()
        m.logout()
    except Exception as e:
        log(f"Revisar respuestas: {e}")
    return nuevas
