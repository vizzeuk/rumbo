"""Base de datos local (SQLite). Una fila por oportunidad, más el historial de envíos."""
import sqlite3
import time

from rumbo import config

ESQUEMA = """
CREATE TABLE IF NOT EXISTS ofertas (
  id TEXT PRIMARY KEY,
  tipo TEXT DEFAULT 'oferta',          -- oferta | agencia | manual | solo_ver
  fuente TEXT, titulo TEXT, empresa TEXT, url TEXT, url_postular TEXT,
  descripcion TEXT, modalidad TEXT, ubicacion TEXT, presupuesto TEXT, email TEXT,
  publicada REAL, encontrada REAL,
  puntaje INTEGER DEFAULT 0, nota TEXT,
  fit INTEGER, motivo TEXT, asunto TEXT, propuesta TEXT, hitos TEXT, precio TEXT,
  estado TEXT DEFAULT 'nueva',         -- nueva | lista | enviada | respondio | entrevista | descartada
  enviada REAL, canal TEXT, seguimiento REAL, respuesta REAL, notas TEXT, error TEXT, captura TEXT
);
CREATE TABLE IF NOT EXISTS eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  oferta TEXT, tipo TEXT, detalle TEXT, fecha REAL
);
CREATE INDEX IF NOT EXISTS idx_estado ON ofertas(estado);
"""

ESTADOS = ("nueva", "lista", "enviada", "respondio", "entrevista", "descartada")


def conectar():
    config.asegurar_carpetas()
    con = sqlite3.connect(config.DB, timeout=30)
    con.row_factory = sqlite3.Row
    con.executescript(ESQUEMA)
    return con


def existe(con, oid):
    return con.execute("SELECT 1 FROM ofertas WHERE id=?", (oid,)).fetchone() is not None


def evento(con, oid, tipo, detalle=""):
    con.execute("INSERT INTO eventos (oferta,tipo,detalle,fecha) VALUES (?,?,?,?)",
                (oid, tipo, detalle, time.time()))


def contar_eventos_hoy(con, tipo, fuente=None):
    inicio = time.mktime(time.localtime()[:3] + (0, 0, 0, 0, 0, -1))
    if fuente:
        return con.execute("""SELECT COUNT(*) FROM eventos e JOIN ofertas o ON o.id=e.oferta
            WHERE e.tipo=? AND e.fecha>=? AND o.fuente=?""", (tipo, inicio, fuente)).fetchone()[0]
    return con.execute("SELECT COUNT(*) FROM eventos WHERE tipo=? AND fecha>=?", (tipo, inicio)).fetchone()[0]
