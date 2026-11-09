"""Servidor local de la interfaz (solo escucha en 127.0.0.1)."""
import json
import mimetypes
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from rumbo import __version__, catalogo, config, correo, db, motor, perfil_prompt, proveedores, vivo
from rumbo.fuentes import FUENTES

WEB = Path(__file__).parent / "web"
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("font/woff2", ".woff2")


def en_hilo(fn, *args):
    threading.Thread(target=fn, args=args, daemon=True).start()


def _estado_general(con):
    cfg = config.cargar()
    resumen = {e: con.execute("SELECT COUNT(*) FROM ofertas WHERE estado=?", (e,)).fetchone()[0] for e in db.ESTADOS}
    por_fuente = {r[0]: r[1] for r in con.execute("SELECT fuente, COUNT(*) FROM ofertas GROUP BY fuente")}
    try:
        from rumbo.postular.portales import PORTALES
        portales = list(PORTALES)
    except Exception:
        portales = []
    try:
        import playwright  # noqa: F401
        tiene_pw = True
    except ImportError:
        tiene_pw = False
    return {
        "version": __version__, "config": cfg, "resumen": resumen, "motor": motor.ESTADO,
        "bienvenida_pendiente": not cfg.get("general", {}).get("onboarding_hecho", False),
        "correo_conectado": bool(correo.clave()), "correo_cuenta": correo.cuenta(),
        "correos_hoy": db.contar_eventos_hoy(con, "correo") + db.contar_eventos_hoy(con, "seguimiento"),
        "postulaciones_hoy": db.contar_eventos_hoy(con, "postulacion"),
        "fuentes": [{"clave": k, "nombre": m.NOMBRE, "descripcion": m.DESCRIPCION, "postula": m.POSTULA,
                     "activa": cfg["fuentes"].get(k, False), "total": por_fuente.get(m.NOMBRE, 0)}
                    for k, m in FUENTES.items()],
        "portales_postulacion": portales, "postulador_instalado": tiene_pw,
        "sesiones": cfg.get("general", {}).get("sesiones", {}),
        "cv": bool(config.datos_personales().get("cv")),
        "ia_lista": any(x["actual"] and x["listo"] for x in proveedores.estado()["proveedores"]),
        "ia_nombre": proveedores.POR_ID.get(cfg["ia"].get("proveedor"), {}).get("nombre", cfg["ia"].get("proveedor")),
    }


def _resumen(con):
    """Lo que alimenta la pantalla Buscar: la semana día a día, lo que necesita atención y la actividad."""
    hoy = time.mktime(time.localtime()[:3] + (0, 0, 0, 0, 0, -1))
    dias = []
    for k in range(6, -1, -1):
        ini, fin = hoy - k * 86400, hoy - (k - 1) * 86400
        uno = lambda sql: con.execute(sql, (ini, fin)).fetchone()[0]  # noqa: E731
        dias.append({
            "dia": time.strftime("%a", time.localtime(ini)), "inicio": ini,
            "encontradas": uno("SELECT COUNT(*) FROM ofertas WHERE estado!='descartada' AND encontrada>=? AND encontrada<?"),
            "enviadas": uno("SELECT COUNT(*) FROM eventos WHERE tipo IN ('correo','postulacion') AND fecha>=? AND fecha<?"),
            "respuestas": uno("SELECT COUNT(*) FROM eventos WHERE tipo='respuesta' AND fecha>=? AND fecha<?"),
        })
    atencion = [dict(r) for r in con.execute("""SELECT id, titulo, empresa, fuente, error FROM ofertas
        WHERE error IS NOT NULL AND error!='' AND estado IN ('lista','nueva') ORDER BY encontrada DESC LIMIT 6""")]
    respondieron = [dict(r) for r in con.execute("""SELECT id, titulo, empresa, fuente, respuesta FROM ofertas
        WHERE estado IN ('respondio','entrevista') ORDER BY respuesta DESC LIMIT 5""")]
    actividad = [dict(r) for r in con.execute("""SELECT e.tipo, e.detalle, e.fecha, o.id, o.titulo, o.empresa, o.fuente
        FROM eventos e LEFT JOIN ofertas o ON o.id=e.oferta WHERE e.tipo IN ('correo','postulacion','respuesta',
        'seguimiento','rebote') ORDER BY e.fecha DESC LIMIT 8""")]
    portales = [{"fuente": r[0], "total": r[1], "listas": r[2]} for r in con.execute("""SELECT fuente, COUNT(*),
        SUM(estado='lista') FROM ofertas WHERE encontrada>=? AND estado!='descartada' GROUP BY fuente
        ORDER BY 2 DESC LIMIT 8""", (hoy - 6 * 86400,))]
    cfg = config.cargar()
    ultimo = motor.ESTADO.get("ultimo")
    return {"dias": dias, "atencion": atencion, "respondieron": respondieron, "actividad": actividad,
            "portales": portales, "proxima": (ultimo + cfg["ciclo"]["horas"] * 3600) if ultimo else None}


class Manejador(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _json(self, datos, codigo=200):
        cuerpo = json.dumps(datos, ensure_ascii=False, default=str).encode()
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(cuerpo)

    def do_GET(self):
        ruta, _, query = self.path.partition("?")
        if ruta == "/api/vivo":
            from urllib.parse import parse_qs
            n = int((parse_qs(query).get("desde") or ["0"])[0] or 0)
            return self._json({**vivo.desde(n), "motor": motor.ESTADO})
        if ruta == "/api/ia/proveedores":
            return self._json(proveedores.estado())
        if ruta == "/api/exportar.csv":
            return self._csv()
        if ruta == "/api/catalogo":
            return self._json(catalogo.todo())
        if ruta == "/api/perfil/prompt":
            return self._json({"prompt": perfil_prompt.prompt()})
        if ruta.startswith("/api/"):
            con = db.conectar()
            if ruta == "/api/estado":
                return self._json(_estado_general(con))
            if ruta == "/api/ofertas":
                filas = [dict(r) for r in con.execute(
                    "SELECT * FROM ofertas ORDER BY COALESCE(fit,-1) DESC, puntaje DESC, encontrada DESC LIMIT 1500")]
                return self._json(filas)
            if ruta == "/api/actividad":
                filas = [dict(r) for r in con.execute("""SELECT e.*, o.titulo, o.fuente FROM eventos e
                    LEFT JOIN ofertas o ON o.id=e.oferta ORDER BY e.fecha DESC LIMIT 200""")]
                return self._json(filas)
            if ruta == "/api/perfil":
                return self._json({"perfil": config.perfil(), "datos": config.datos_personales()})
            if ruta == "/api/resumen":
                return self._json(_resumen(con))
            if ruta == "/api/log":
                lineas = config.LOG.read_text(encoding="utf-8").splitlines()[-80:] if config.LOG.exists() else []
                return self._json(lineas)
            return self._json({"error": "no existe"}, 404)
        archivo = WEB / ("index.html" if ruta in ("/", "") else ruta.lstrip("/"))
        if not archivo.resolve().is_relative_to(WEB.resolve()) or not archivo.is_file():
            archivo = WEB / "index.html"
        tipo = mimetypes.guess_type(archivo.name)[0] or "application/octet-stream"
        if tipo.startswith("text/") or tipo in ("application/javascript", "image/svg+xml", "application/json"):
            tipo += "; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", tipo)
        if "/assets/" in ruta:
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        self.end_headers()
        self.wfile.write(archivo.read_bytes())

    def do_POST(self):
        largo = int(self.headers.get("Content-Length", 0))
        d = json.loads(self.rfile.read(largo) or b"{}")
        con = db.conectar()
        ruta = self.path
        try:
            if ruta == "/api/oferta":
                oid, accion = d["id"], d["accion"]
                campos = {k: d[k] for k in ("propuesta", "asunto", "email", "notas") if k in d}
                if campos:
                    con.execute(f"UPDATE ofertas SET {', '.join(k + '=?' for k in campos)} WHERE id=?",
                                [*campos.values(), oid])
                if accion == "evaluar":
                    con.commit()
                    en_hilo(lambda: motor.evaluar(db.conectar(), oid))
                    return self._json({"ok": "La IA está evaluando. Se actualiza solo en unos segundos."})
                if accion == "enviar_correo":
                    con.commit()
                    correo.enviar(con, oid)
                    return self._json({"ok": "Correo enviado."})
                if accion == "postular":
                    con.commit()
                    en_hilo(self._postular_una, oid)
                    return self._json({"ok": "Abriendo el navegador para postular."})
                if accion in db.ESTADOS:
                    extra = ", enviada=?, canal='manual'" if accion == "enviada" else ""
                    valores = [accion] + ([time.time()] if accion == "enviada" else []) + [oid]
                    con.execute(f"UPDATE ofertas SET estado=?{extra} WHERE id=?", valores)
                    db.evento(con, oid, f"estado:{accion}")
                con.commit()
                return self._json({"ok": "Guardado."})
            if ruta == "/api/manual":
                from rumbo.fuentes import guardar
                oid = f"man-{int(time.time())}"
                guardar(con, {"id": oid, "tipo": "manual", "fuente": d.get("fuente") or "Pegada a mano",
                              "titulo": d.get("titulo") or "Oferta pegada a mano", "url": d.get("url", ""),
                              "email": d.get("email", ""), "descripcion": d.get("texto", "")})
                con.commit()
                en_hilo(lambda: motor.evaluar(db.conectar(), oid))
                return self._json({"ok": "Agregada. La IA la está evaluando."})
            if ruta == "/api/buscar":
                en_hilo(motor.ciclo, True, (d.get("consulta") or "").strip()[:80] or None)
                return self._json({"ok": "Búsqueda iniciada."})
            if ruta == "/api/ia/modelos":
                try:
                    return self._json({"modelos": proveedores.modelos(d.get("proveedor", ""), d.get("clave", ""))})
                except ValueError as e:
                    return self._json({"error": str(e), "modelos": []})
            if ruta == "/api/ia/conectar":
                r = proveedores.conectar(d["proveedor"], d.get("modelo", ""), d.get("clave", ""), d.get("base_url", ""))
                return self._json(r)
            if ruta == "/api/portal/login":
                if motor.ESTADO["corriendo"]:
                    raise ValueError("Espera a que termine la búsqueda en curso y vuelve a intentar.")
                en_hilo(self._login_portal, d["portal"])
                return self._json({"ok": f"Abrí {d['portal']}. Inicia sesión y cierra la ventana cuando termines."})
            if ruta == "/api/empresa/bloquear":
                empresa = (d.get("empresa") or "").strip()
                if not empresa:
                    raise ValueError("Esta oferta no tiene empresa.")
                b = config.cargar()["busqueda"]
                lista = sorted(set(b.get("empresas_bloqueadas", []) + [empresa]))
                config.guardar({"busqueda": {"empresas_bloqueadas": lista}})
                n = con.execute("""UPDATE ofertas SET estado='descartada', nota='empresa bloqueada'
                    WHERE lower(empresa)=lower(?) AND estado IN ('nueva','lista')""", (empresa,)).rowcount
                con.commit()
                return self._json({"ok": f"No vuelvo a mostrarte ofertas de {empresa}.", "descartadas": n})
            if ruta == "/api/empresa/desbloquear":
                b = config.cargar()["busqueda"]
                config.guardar({"busqueda": {"empresas_bloqueadas": [x for x in b.get("empresas_bloqueadas", []) if x != d.get("empresa")]}})
                return self._json({"ok": "Listo."})
            if ruta == "/api/postular_todo":
                en_hilo(motor.masivo, int(d.get("evaluar_hasta", 200)))
                return self._json({"ok": "Postulando a todo lo que calce. Puedes seguir en lo tuyo."})
            if ruta == "/api/perfil/importar":
                r = perfil_prompt.importar(d.get("texto", ""))
                return self._json({"ok": "Perfil listo.", **r})
            if ruta == "/api/busqueda":
                r = catalogo.busqueda_desde(d)
                config.guardar({"busqueda": r["busqueda"], "fuentes": r["fuentes"]} if r["fuentes"] else {"busqueda": r["busqueda"]})
                return self._json({"ok": "Búsqueda actualizada.", **r})
            if ruta == "/api/cv":
                import base64
                nombre = Path(d.get("nombre") or "cv.pdf").name
                if Path(nombre).suffix.lower() not in (".pdf", ".doc", ".docx"):
                    raise ValueError("Sube tu CV en PDF o Word.")
                destino = config.HOME / "cv" / nombre
                destino.parent.mkdir(parents=True, exist_ok=True)
                destino.write_bytes(base64.b64decode(d["b64"]))
                datos = config.datos_personales()
                datos["cv"] = str(destino)
                config.DATOS.write_text(json.dumps(datos, indent=2, ensure_ascii=False), encoding="utf-8")
                return self._json({"ok": "CV guardado. Lo voy a adjuntar cuando un portal lo pida.", "cv": str(destino)})
            if ruta == "/api/agencias":
                seg = d.get("segmento", "agencias")
                en_hilo(lambda: FUENTES["agencias"].buscar(db.conectar(), int(d.get("n", 8)), seg, d.get("rubro", "")))
                nombres = {"agencias": "agencias", "startups": "startups", "pymes": "pymes"}
                return self._json({"ok": f"La IA está buscando {nombres.get(seg, seg)} (toma unos minutos)."})
            if ruta == "/api/config":
                config.guardar(d)
                return self._json({"ok": "Ajustes guardados."})
            if ruta == "/api/perfil":
                if "perfil" in d:
                    config.PERFIL.write_text(d["perfil"], encoding="utf-8")
                if "datos" in d:
                    config.DATOS.write_text(json.dumps(d["datos"], indent=2, ensure_ascii=False), encoding="utf-8")
                return self._json({"ok": "Perfil guardado."})
            if ruta == "/api/bienvenida":
                from rumbo import bienvenida
                r = bienvenida.aplicar(d)
                en_hilo(motor.ciclo, True)
                return self._json({"ok": "Listo. Rumbo empezó tu primera búsqueda.", **r})
            if ruta == "/api/correo":
                if d.get("cuenta"):
                    config.guardar({"envio": {"correo": d["cuenta"]}})
                correo.guardar_clave(d["clave"])
                correo.probar()
                return self._json({"ok": "Correo conectado."})
        except Exception as e:
            return self._json({"error": str(e)}, 400)
        return self._json({"error": "no existe"}, 404)

    def _csv(self):
        import csv
        import io
        con = db.conectar()
        salida = io.StringIO()
        w = csv.writer(salida)
        w.writerow(["Cargo", "Empresa", "Portal", "Estado", "Calce", "Encontrada", "Enviada", "Canal", "Respondió", "Enlace", "Notas"])
        f = lambda t: time.strftime("%Y-%m-%d %H:%M", time.localtime(t)) if t else ""  # noqa: E731
        for o in con.execute("SELECT * FROM ofertas WHERE estado!='descartada' ORDER BY COALESCE(enviada, encontrada) DESC"):
            w.writerow([o["titulo"], o["empresa"], o["fuente"], o["estado"], o["fit"] if o["fit"] is not None else "",
                        f(o["encontrada"]), f(o["enviada"]), o["canal"] or "", f(o["respuesta"]), o["url"], o["notas"] or ""])
        cuerpo = ("\ufeff" + salida.getvalue()).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/csv; charset=utf-8")
        self.send_header("Content-Disposition", f'attachment; filename="rumbo-postulaciones-{time.strftime("%Y-%m-%d")}.csv"')
        self.end_headers()
        self.wfile.write(cuerpo)

    @staticmethod
    def _login_portal(portal):
        from rumbo.postular.navegador import login_ui
        try:
            ok = login_ui(portal)
        except Exception as e:
            vivo.emitir("sesion", portal=portal, ok=False, error=str(e)[:160])
            return
        if ok:
            sesiones = dict(config.cargar().get("general", {}).get("sesiones", {}), **{portal: time.time()})
            config.guardar({"general": {"sesiones": sesiones}})
        vivo.emitir("sesion", portal=portal, ok=ok)

    @staticmethod
    def _postular_una(oid):
        from rumbo.postular.navegador import abrir, postular
        con = db.conectar()
        o = con.execute("SELECT * FROM ofertas WHERE id=?", (oid,)).fetchone()
        p, ctx = abrir(visible=True)
        try:
            r = postular(ctx, con, o)
            if r in ("enviada", "revision"):
                con.execute("UPDATE ofertas SET estado='enviada', enviada=?, canal='portal', error=NULL WHERE id=?",
                            (time.time(), oid))
                db.evento(con, oid, "postulacion", o["fuente"])
            else:
                con.execute("UPDATE ofertas SET error=? WHERE id=?", (r[:300], oid))
            con.commit()
        finally:
            ctx.close()
            p.stop()


def servir(abrir_navegador=False):
    db.conectar().close()
    servidor = ThreadingHTTPServer(("127.0.0.1", config.PUERTO), Manejador)
    if abrir_navegador:
        import webbrowser
        webbrowser.open(f"http://localhost:{config.PUERTO}")
    servidor.serve_forever()
