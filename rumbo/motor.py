"""El ciclo: buscar → evaluar con IA → postular / enviar → revisar respuestas → recordatorios."""
import json
import threading
import time
from datetime import datetime

from rumbo import config, correo, db, redactor
from rumbo.fuentes import FUENTES
from rumbo.util import log, notificar

_candado = threading.Lock()
ESTADO = {"corriendo": False, "paso": "", "ultimo": None, "resumen": ""}


def evaluar(con, oid):
    o = con.execute("SELECT * FROM ofertas WHERE id=?", (oid,)).fetchone()
    r = redactor.evaluar(o)
    estado = "descartada" if r["fit"] < 40 else "lista"
    con.execute("""UPDATE ofertas SET fit=?, motivo=?, asunto=?, propuesta=?, hitos=?, precio=?, estado=?
        WHERE id=?""", (r["fit"], r.get("motivo", ""), r.get("asunto", ""), r.get("propuesta", ""),
                        json.dumps(r.get("hitos") or [], ensure_ascii=False), r.get("precio", ""), estado, oid))
    db.evento(con, oid, "evaluada", str(r["fit"]))
    con.commit()
    return r


def buscar(con):
    cfg = config.cargar()
    nuevas = 0
    for clave, modulo in FUENTES.items():
        if not cfg["fuentes"].get(clave) or not getattr(modulo, "EN_CICLO", True):
            continue
        ESTADO["paso"] = f"Buscando en {modulo.NOMBRE}"
        try:
            n = modulo.buscar(con)
            con.commit()
            nuevas += n
        except Exception as e:
            log(f"{modulo.NOMBRE}: {e}")
    return nuevas


def ciclo(forzar=False):
    if not _candado.acquire(blocking=False):
        return "Ya hay una búsqueda en curso."
    ESTADO["corriendo"] = True
    try:
        cfg = config.cargar()
        if not forzar and not (cfg["ciclo"]["desde"] <= datetime.now().hour < cfg["ciclo"]["hasta"]):
            return "Fuera de horario."
        con = db.conectar()
        nuevas = buscar(con)

        ESTADO["paso"] = "Evaluando con IA"
        listas = 0
        for row in con.execute("""SELECT id FROM ofertas WHERE estado='nueva' ORDER BY puntaje DESC, encontrada DESC
                LIMIT ?""", (cfg["ia"]["evaluar_por_ciclo"],)).fetchall():
            try:
                listas += evaluar(con, row["id"])["fit"] >= 40
            except Exception as e:
                log(f"Evaluar {row['id']}: {e}")
                con.execute("UPDATE ofertas SET error=? WHERE id=?", (str(e)[:300], row["id"]))
                con.commit()
                break   # si la IA falla, no insistir en este ciclo

        ESTADO["paso"] = "Revisando respuestas"
        respuestas = correo.detectar_respuestas(con)

        enviados = postulados = 0
        if cfg["envio"]["modo_automatico"]:
            ESTADO["paso"] = "Enviando correos"
            for row in con.execute("""SELECT id FROM ofertas WHERE estado='lista' AND email!='' AND fit>=?
                    ORDER BY fit DESC""", (cfg["envio"]["umbral"],)).fetchall():
                try:
                    correo.enviar(con, row["id"])
                    enviados += 1
                except Exception as e:
                    log(f"Correo {row['id']}: {e}")
                    break
            enviados += correo.seguimientos(con)
            ESTADO["paso"] = "Postulando en portales"
            try:
                from rumbo.postular.navegador import postular_pendientes
                postulados = postular_pendientes(con)
            except Exception as e:
                log(f"Postulador: {e}")

        resumen = (f"{nuevas} nuevas · {listas} listas · {postulados} postuladas · {enviados} correos · "
                   f"{respuestas} respuestas")
        log(f"Ciclo: {resumen}")
        ESTADO["ultimo"], ESTADO["resumen"] = time.time(), resumen
        if listas or postulados or enviados or respuestas:
            notificar("Rumbo", resumen)
        return resumen
    finally:
        ESTADO["corriendo"], ESTADO["paso"] = False, ""
        _candado.release()


def bucle():
    while True:
        try:
            ciclo()
        except Exception as e:
            log(f"Ciclo con error: {e}")
        time.sleep(config.cargar()["ciclo"]["horas"] * 3600)
