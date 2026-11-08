"""Navegador persistente y formulario genérico de postulación."""
import random
import time

from rumbo import config, db, redactor
from rumbo.postular.portales import BOTONES_AVANZAR, BOTONES_ENVIAR, PORTALES, SEÑALES_LOGIN
from rumbo.util import UA, log


class FaltaPlaywright(RuntimeError):
    pass


def _playwright():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as e:
        raise FaltaPlaywright('Instala el postulador: pip install "rumbo[postular]" y luego: playwright install chromium') from e
    return sync_playwright


def abrir(visible=True):
    """Devuelve (playwright, contexto) con el perfil persistente de Rumbo."""
    p = _playwright()().start()
    ctx = p.chromium.launch_persistent_context(
        str(config.NAVEGADOR), headless=not visible, locale="es-CL", viewport={"width": 1280, "height": 860},
        user_agent=UA, args=["--disable-blink-features=AutomationControlled"])
    return p, ctx


def pausa(a=1.2, b=3.0):
    time.sleep(random.uniform(a, b))


def login(portal):
    """Abre el portal para que inicies sesión a mano. La sesión queda guardada."""
    datos = PORTALES[portal]
    p, ctx = abrir(visible=True)
    pagina = ctx.pages[0] if ctx.pages else ctx.new_page()
    pagina.goto(datos["login"])
    print(f"\nInicia sesión en {portal} en la ventana que se abrió.\nCuando termines, vuelve aquí y presiona Enter.")
    input()
    ok = sesion_activa(pagina, portal)
    ctx.close()
    p.stop()
    return ok


def sesion_activa(pagina, portal):
    try:
        pagina.goto(PORTALES[portal]["inicio"], wait_until="domcontentloaded")
        pausa(1, 2)
        texto = pagina.inner_text("body").lower()
        return any(s in texto for s in PORTALES[portal]["sesion_ok"])
    except Exception:
        return False


def _texto(pagina):
    try:
        return pagina.inner_text("body").lower()
    except Exception:
        return ""


def _clic_texto(pagina, textos):
    for t in textos:
        for selector in (f"button:has-text('{t}')", f"a:has-text('{t}')", f"input[type=submit][value*='{t}']"):
            loc = pagina.locator(selector).first
            try:
                if loc.count() and loc.is_visible() and loc.is_enabled():
                    loc.click()
                    return t
            except Exception:
                continue
    return None


def _campos(pagina):
    """Campos visibles del formulario que están vacíos, con su etiqueta."""
    return pagina.evaluate("""() => {
      const visibles = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      const etiqueta = el => {
        if (el.id) { const l = document.querySelector(`label[for="${el.id}"]`); if (l) return l.innerText.trim(); }
        const p = el.closest('label'); if (p) return p.innerText.trim();
        return (el.getAttribute('aria-label') || el.placeholder || el.name || '').trim();
      };
      const campos = []; let i = 0;
      document.querySelectorAll('input, textarea, select').forEach(el => {
        const tipo = (el.type || el.tagName).toLowerCase();
        if (!visibles(el) || ['hidden','submit','button','file','password','search'].includes(tipo)) return;
        if (tipo === 'radio' || tipo === 'checkbox') {
          if (document.querySelector(`input[name="${el.name}"]:checked`)) return;
          if (campos.find(c => c.nombre === el.name)) { campos.find(c => c.nombre === el.name).opciones.push(etiqueta(el)); return; }
          el.setAttribute('data-rumbo', 'c' + i);
          campos.push({id: 'c' + (i++), nombre: el.name, tipo, etiqueta: (el.closest('fieldset')?.querySelector('legend')?.innerText || el.name || '').trim(), opciones: [etiqueta(el)]});
          return;
        }
        if (el.value && el.value.trim()) return;
        el.setAttribute('data-rumbo', 'c' + i);
        campos.push({id: 'c' + (i++), tipo: tipo === 'select-one' ? 'select' : tipo, etiqueta: etiqueta(el),
                     requerido: el.required, opciones: tipo === 'select-one' ? [...el.options].map(o => o.text) : []});
      });
      return campos;
    }""")


def _rellenar(pagina, campos, respuestas):
    for c in campos:
        valor = respuestas.get(c["id"])
        if valor in (None, ""):
            continue
        sel = f"[data-rumbo='{c['id']}']"
        try:
            if c["tipo"] == "select":
                pagina.select_option(sel, label=str(valor))
            elif c["tipo"] in ("radio", "checkbox"):
                pagina.evaluate("""([nombre, valor]) => {
                  const etiqueta = el => (el.id && document.querySelector(`label[for="${el.id}"]`)?.innerText)
                                       || el.closest('label')?.innerText || el.value || '';
                  const v = String(valor).toLowerCase().trim();
                  for (const el of document.querySelectorAll(`input[name="${nombre}"]`)) {
                    if (etiqueta(el).toLowerCase().trim().startsWith(v) || v.startsWith(etiqueta(el).toLowerCase().trim())) { el.click(); return; }
                  }
                }""", [c["nombre"], valor])
            else:
                pagina.fill(sel, str(valor))
            pausa(0.3, 0.9)
        except Exception as e:
            log(f"Campo '{c['etiqueta'][:40]}': {e}")


def postular(ctx, con, oferta):
    """Postula a una oferta. Devuelve 'enviada' | 'revision' | 'sesion' | 'error: ...'."""
    env = config.cargar()["envio"]
    portal = PORTALES.get(oferta["fuente"])
    if not portal:
        return "error: portal sin postulación automática"
    pagina = ctx.new_page()
    try:
        pagina.goto(oferta["url_postular"] or oferta["url"], wait_until="domcontentloaded")
        pausa()
        texto = _texto(pagina)
        if any(s in texto for s in portal["exito"]):
            return "enviada"
        for selector in portal["boton_postular"]:
            loc = pagina.locator(selector).first
            if loc.count() and loc.is_visible():
                loc.click()
                pausa(2, 4)
                break
        for paso in range(8):
            texto = _texto(pagina)
            if any(s in texto for s in portal["exito"]):
                break
            if any(s in texto for s in SEÑALES_LOGIN) and "contraseña" in texto:
                return "sesion"
            campos = _campos(pagina)
            if campos:
                respuestas = redactor.responder_formulario(oferta, campos)
                _rellenar(pagina, campos, respuestas)
            if _clic_texto(pagina, BOTONES_AVANZAR):
                pausa(2, 3.5)
                continue
            if env.get("revisar_antes_de_enviar", True):
                log(f"Revisión: {oferta['titulo'][:60]} quedó lista para tu clic final")
                try:   # el usuario revisa, envía y cierra la pestaña (máximo 15 minutos)
                    pagina.wait_for_event("close", timeout=15 * 60 * 1000)
                    return "revision"
                except Exception:
                    return "error: no confirmaste el envío en 15 minutos"
            if _clic_texto(pagina, BOTONES_ENVIAR):
                pausa(3, 5)
                continue
            break
        captura = config.CAPTURAS / f"{oferta['id']}.png"
        pagina.screenshot(path=str(captura), full_page=True)
        con.execute("UPDATE ofertas SET captura=? WHERE id=?", (str(captura), oferta["id"]))
        return "enviada" if any(s in _texto(pagina) for s in portal["exito"]) else "error: no vi la confirmación (revisa la captura)"
    except Exception as e:
        return f"error: {e}"
    finally:
        try:
            pagina.close()
        except Exception:
            pass


def postular_pendientes(con):
    """Postula a las ofertas listas de portales con postulación automática, respetando los topes."""
    env = config.cargar()["envio"]
    candidatas = con.execute("""SELECT * FROM ofertas WHERE estado='lista' AND tipo='oferta' AND email='' AND fit>=?
        ORDER BY fit DESC""", (env["umbral"],)).fetchall()
    candidatas = [o for o in candidatas if o["fuente"] in PORTALES]
    if not candidatas:
        return 0
    p, ctx = abrir(visible=env.get("revisar_antes_de_enviar", True))
    hechas = 0
    try:
        for o in candidatas:
            if db.contar_eventos_hoy(con, "postulacion", o["fuente"]) >= env["limite_portal_dia"]:
                continue
            resultado = postular(ctx, con, o)
            if resultado in ("enviada", "revision"):
                con.execute("UPDATE ofertas SET estado='enviada', enviada=?, canal=?, error=NULL WHERE id=?",
                            (time.time(), "portal" if resultado == "enviada" else "portal (revisada)", o["id"]))
                db.evento(con, o["id"], "postulacion", o["fuente"])
                hechas += 1
            elif resultado == "sesion":
                con.execute("UPDATE ofertas SET error=? WHERE id=?", (f"Inicia sesión: rumbo login \"{o['fuente']}\"", o["id"]))
            else:
                con.execute("UPDATE ofertas SET error=? WHERE id=?", (resultado[:300], o["id"]))
            con.commit()
            log(f"Postulación {o['fuente']}: {o['titulo'][:60]} → {resultado}")
            pausa(20, 60)   # ritmo humano entre postulaciones
    finally:
        ctx.close()
        p.stop()
    return hechas
