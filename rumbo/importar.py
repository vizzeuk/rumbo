"""Importa oportunidades desde la base del buscador anterior (o de otra instalación de Rumbo)."""
import sqlite3

from rumbo import db

COLUMNAS = ["id", "tipo", "fuente", "titulo", "empresa", "url", "descripcion", "modalidad", "presupuesto",
            "email", "publicada", "encontrada", "puntaje", "fit", "motivo", "asunto", "propuesta", "hitos",
            "precio", "estado", "enviada", "seguimiento", "notas", "respuesta"]
TIPOS = {"linkedin": "solo_ver"}


def importar(ruta):
    origen = sqlite3.connect(ruta)
    origen.row_factory = sqlite3.Row
    disponibles = {r[1] for r in origen.execute("PRAGMA table_info(ofertas)")}
    cols = [c for c in COLUMNAS if c in disponibles]
    destino = db.conectar()
    n = 0
    for fila in origen.execute(f"SELECT {', '.join(cols)} FROM ofertas"):
        datos = dict(fila)
        datos["tipo"] = TIPOS.get(datos.get("tipo"), datos.get("tipo") or "oferta")
        cur = destino.execute(f"INSERT OR IGNORE INTO ofertas ({', '.join(datos)}) VALUES ({', '.join('?' * len(datos))})",
                              list(datos.values()))
        n += cur.rowcount
    destino.commit()
    return f"{n} oportunidades importadas."
