"""Lo que Rumbo está haciendo en este momento, como una lista de eventos que la interfaz va mostrando.

Vive en memoria (se pierde al reiniciar, a propósito: es la "transmisión en vivo", el historial
permanente está en la tabla eventos). La interfaz pregunta GET /api/vivo?desde=N cada segundo y
recibe solo lo nuevo.

Tipos de evento:
  ciclo      {fase: inicio|fin, resumen}
  fase       {fase: buscar|evaluar|respuestas|correos|postular, texto}
  fuente     {clave, nombre, estado: buscando|lista|error, nuevas, sitio, error}
  hallazgo   {id, titulo, empresa, fuente, url, ubicacion, modalidad, guardada: bool, nota}
  evaluada   {id, titulo, fit, motivo}
  postulada  {id, titulo, fuente, resultado}
  correo     {id, titulo, empresa, email}
  respuesta  {id, titulo}
  rebote     {id, titulo}
"""
import threading
import time
from collections import deque
from urllib.parse import urlparse

_candado = threading.Lock()
_eventos = deque(maxlen=800)
_n = 0


def emitir(tipo, **datos):
    global _n
    with _candado:
        _n += 1
        _eventos.append({"n": _n, "t": time.time(), "tipo": tipo, **datos})


def desde(n=0, limite=300):
    with _candado:
        nuevos = [e for e in _eventos if e["n"] > n]
        return {"ultimo": _n, "eventos": nuevos[-limite:]}


def sitio(url):
    try:
        return urlparse(url).netloc.removeprefix("www.")
    except Exception:
        return ""


# Traduce los eventos que ya se guardan en la base (db.evento) a eventos en vivo.
_TIPOS_DB = {"postulacion": "postulada", "correo": "correo", "seguimiento": "correo",
             "respuesta": "respuesta", "rebote": "rebote"}


def desde_db(con, oid, tipo, detalle):
    destino = _TIPOS_DB.get(tipo)
    if not destino:
        return
    try:
        o = con.execute("SELECT titulo, empresa, fuente, url FROM ofertas WHERE id=?", (oid,)).fetchone()
    except Exception:
        o = None
    datos = {"id": oid, "titulo": o["titulo"] if o else "", "empresa": (o["empresa"] if o else "") or "",
             "fuente": o["fuente"] if o else "", "url": o["url"] if o else ""}
    if destino == "correo":
        datos.update(email=detalle, seguimiento=tipo == "seguimiento")
    if destino == "postulada":
        datos.update(resultado="enviada")
    emitir(destino, **datos)
