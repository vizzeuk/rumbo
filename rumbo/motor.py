"""El ciclo: buscar → evaluar con IA → postular / enviar → revisar respuestas → recordatorios."""
import json
import threading
import time
from datetime import datetime

from rumbo import config, correo, db, redactor, vivo
from rumbo.fuentes import FUENTES, SITIOS
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
    vivo.emitir("evaluada", id=oid, titulo=o["titulo"], empresa=o["empresa"] or "", fuente=o["fuente"],
                url=o["url"] or "", fit=r["fit"], motivo=r.get("motivo", ""), lista=estado == "lista")
    return r


def fuentes_activas(cfg=None):
    cfg = cfg or config.cargar()
    return [(c, m) for c, m in FUENTES.items() if cfg["fuentes"].get(c) and getattr(m, "EN_CICLO", True)]


def buscar(con):
    cfg = config.cargar()
    vivo.emitir("fase", fase="buscar", texto="Buscando ofertas",
                fuentes=[{"clave": c, "nombre": m.NOMBRE, "sitio": SITIOS.get(c, "")}
                         for c, m in fuentes_activas(cfg)])
    nuevas = 0
    for clave, modulo in FUENTES.items():
        if not cfg["fuentes"].get(clave) or not getattr(modulo, "EN_CICLO", True):
            continue
        ESTADO["paso"] = f"Buscando en {modulo.NOMBRE}"
        base = {"clave": clave, "nombre": modulo.NOMBRE, "sitio": SITIOS.get(clave, "")}
        vivo.emitir("fuente", estado="buscando", **base)
        try:
            n = modulo.buscar(con)
            con.commit()
            nuevas += n
            vivo.emitir("fuente", estado="lista", nuevas=n, **base)
        except Exception as e:
            log(f"{modulo.NOMBRE}: {e}")
            vivo.emitir("fuente", estado="error", nuevas=0, error=str(e)[:160], **base)
    return nuevas


def ciclo(forzar=False):
    if not _candado.acquire(blocking=False):
        return "Ya hay una búsqueda en curso."
    ESTADO["corriendo"] = True
    try:
        cfg = config.cargar()
        if not forzar and not (cfg["ciclo"]["desde"] <= datetime.now().hour < cfg["ciclo"]["hasta"]):
            return "Fuera de horario."
        vivo.emitir("ciclo", fase="inicio")
        con = db.conectar()
        nuevas = buscar(con)

        ESTADO["paso"] = "Evaluando con IA"
        listas = 0
        por_evaluar = con.execute("""SELECT id FROM ofertas WHERE estado='nueva' ORDER BY puntaje DESC, encontrada DESC
                LIMIT ?""", (cfg["ia"]["evaluar_por_ciclo"],)).fetchall()
        vivo.emitir("fase", fase="evaluar", texto="Leyendo cada oferta con IA", total=len(por_evaluar))
        for row in por_evaluar:
            try:
                listas += evaluar(con, row["id"])["fit"] >= 40
            except Exception as e:
                log(f"Evaluar {row['id']}: {e}")
                con.execute("UPDATE ofertas SET error=? WHERE id=?", (str(e)[:300], row["id"]))
                con.commit()
                break   # si la IA falla, no insistir en este ciclo

        ESTADO["paso"] = "Revisando respuestas"
        vivo.emitir("fase", fase="respuestas", texto="Revisando si alguien respondió")
        respuestas = correo.detectar_respuestas(con)

        enviados = postulados = 0
        if cfg["envio"]["modo_automatico"]:
            ESTADO["paso"] = "Enviando correos"
            vivo.emitir("fase", fase="correos", texto="Escribiendo a empresas")
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
            vivo.emitir("fase", fase="postular", texto="Postulando en los portales")
            try:
                from rumbo.postular.navegador import postular_pendientes
                postulados = postular_pendientes(con)
            except Exception as e:
                log(f"Postulador: {e}")

        resumen = (f"{nuevas} nuevas · {listas} listas · {postulados} postuladas · {enviados} correos · "
                   f"{respuestas} respuestas")
        log(f"Ciclo: {resumen}")
        ESTADO["ultimo"], ESTADO["resumen"] = time.time(), resumen
        vivo.emitir("ciclo", fase="fin", resumen=resumen, nuevas=nuevas, listas=listas, postuladas=postulados,
                    correos=enviados, respuestas=respuestas)
        if listas or postulados or enviados or respuestas:
            notificar("Rumbo", resumen)
        return resumen
    finally:
        ESTADO["corriendo"], ESTADO["paso"] = False, ""
        _candado.release()


def masivo(evaluar_hasta=200):
    """Postular a todo lo que calce: evalúa en tanda lo pendiente y luego postula en los portales.
    Respeta los topes diarios de Ajustes (limite_portal_dia, limite_correos_dia)."""
    if not _candado.acquire(blocking=False):
        return "Ya hay una búsqueda en curso."
    ESTADO["corriendo"] = True
    try:
        con = db.conectar()
        cfg = config.cargar()
        vivo.emitir("ciclo", fase="inicio", masivo=True)
        pendientes = con.execute("""SELECT id FROM ofertas WHERE estado='nueva' AND tipo IN ('oferta','agencia')
            ORDER BY puntaje DESC LIMIT ?""", (evaluar_hasta,)).fetchall()
        ESTADO["paso"] = "Evaluando en tanda"
        vivo.emitir("fase", fase="evaluar", texto="Leyendo cada oferta con IA", total=len(pendientes))
        listas = 0
        for row in pendientes:
            try:
                listas += evaluar(con, row["id"])["fit"] >= 40
            except Exception as e:
                log(f"Evaluar {row['id']}: {e}")
                break
        enviados = postulados = 0
        ESTADO["paso"] = "Escribiendo a empresas"
        vivo.emitir("fase", fase="correos", texto="Escribiendo a empresas")
        for row in con.execute("""SELECT id FROM ofertas WHERE estado='lista' AND email!='' AND fit>=?
                ORDER BY fit DESC""", (cfg["envio"]["umbral"],)).fetchall():
            try:
                correo.enviar(con, row["id"])
                enviados += 1
            except Exception as e:
                log(f"Correo {row['id']}: {e}")
                break
        ESTADO["paso"] = "Postulando en portales"
        vivo.emitir("fase", fase="postular", texto="Postulando en los portales")
        try:
            from rumbo.postular.navegador import postular_pendientes
            postulados = postular_pendientes(con)
        except Exception as e:
            log(f"Postulador: {e}")
        resumen = f"{listas} listas · {postulados} postuladas · {enviados} correos"
        vivo.emitir("ciclo", fase="fin", resumen=resumen, nuevas=0, listas=listas, postuladas=postulados,
                    correos=enviados, respuestas=0, masivo=True)
        ESTADO["ultimo"], ESTADO["resumen"] = time.time(), resumen
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
