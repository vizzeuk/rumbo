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


def login_ui(portal, avisar=None, limite=900):
    """Como login(), pero para la interfaz: abre el portal y espera a que cierres la ventana (o 15 min).
    Después revisa en segundo plano si la sesión quedó iniciada. Devuelve True/False."""
    datos = PORTALES[portal]
    p, ctx = abrir(visible=True)
    try:
        pagina = ctx.pages[0] if ctx.pages else ctx.new_page()
        pagina.goto(datos["login"])
        fin = time.time() + limite
        while time.time() < fin and any(not pg.is_closed() for pg in ctx.pages):
            time.sleep(1.5)
    finally:
        try:
            ctx.close()
        except Exception:
            pass
        p.stop()
    p, ctx = abrir(visible=False)
    try:
        return sesion_activa(ctx.pages[0] if ctx.pages else ctx.new_page(), portal)
    finally:
        ctx.close()
        p.stop()


def sesion_activa(pagina, portal):
    datos = PORTALES[portal]
    try:
        pagina.goto(datos["inicio"], wait_until="domcontentloaded")
        pausa(1, 2)
        if datos.get("sesion_selector"):   # más fiable que el texto cuando el portal lo permite
            return pagina.locator(datos["sesion_selector"]).count() > 0
        texto = pagina.inner_text("body").lower()
        return any(s in texto for s in datos["sesion_ok"])
    except Exception:
        return False


def habilitado(portal, env=None):
    """Un portal con "opcion" (por ejemplo LinkedIn) solo se usa si esa opción de envío está en True."""
    opcion = PORTALES.get(portal, {}).get("opcion")
    return not opcion or bool((env or config.cargar()["envio"]).get(opcion))


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


def _campos(pagina, raiz=None):
    """Campos visibles del formulario que están vacíos, con su etiqueta.

    raiz: selector CSS opcional para mirar solo dentro de un contenedor (por ejemplo el modal de
    LinkedIn), así no se cuelan el buscador u otros formularios de la página."""
    return pagina.evaluate("""(raiz) => {
      const base = (raiz && document.querySelector(raiz)) || document;
      const visibles = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      // Algunos portales repiten el texto de la etiqueta (una copia visible y otra para lectores de pantalla).
      const unico = t => {
        const u = [...new Set((t || '').split('\\n').map(s => s.trim()).filter(Boolean))].join(' ').replace(/\\s+/g, ' ');
        const m = (u.length - 1) / 2;   // "Pregunta Pregunta" -> "Pregunta"
        return Number.isInteger(m) && m > 0 && u.slice(0, m) === u.slice(m + 1) ? u.slice(0, m) : u;
      };
      const etiqueta = el => {
        if (el.id) { const l = base.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) return unico(l.innerText); }
        const p = el.closest('label'); if (p) return unico(p.innerText);
        return (el.getAttribute('aria-label') || el.placeholder || el.name || '').trim();
      };
      // "Selecciona una opción" y similares no cuentan como respuesta.
      const marcador = t => /^(select|selecciona|seleccione|seleccionar|elige|escoge|choose)\\b/i.test((t || '').trim());
      const sinElegir = el => el.selectedIndex <= 0 && marcador(el.options[0]?.text);
      const campos = []; let i = 0;
      base.querySelectorAll('input, textarea, select').forEach(el => {
        const tipo = (el.type || el.tagName).toLowerCase();
        if (!visibles(el) || ['hidden','submit','button','file','password','search'].includes(tipo)) return;
        if ((el.id || '').includes('follow-company')) return;   // "seguir a la empresa" no es una pregunta
        if (tipo === 'radio' || tipo === 'checkbox') {
          if (base.querySelector(`input[name="${CSS.escape(el.name)}"]:checked`)) return;
          if (campos.find(c => c.nombre === el.name)) { campos.find(c => c.nombre === el.name).opciones.push(etiqueta(el)); return; }
          el.setAttribute('data-rumbo', 'c' + i);
          campos.push({id: 'c' + (i++), nombre: el.name, tipo, etiqueta: unico(el.closest('fieldset')?.querySelector('legend')?.innerText || el.name || ''), opciones: [etiqueta(el)]});
          return;
        }
        if (tipo === 'select-one' ? !sinElegir(el) && el.value : el.value && el.value.trim()) return;
        el.setAttribute('data-rumbo', 'c' + i);
        const campo = {id: 'c' + (i++), tipo: tipo === 'select-one' ? 'select' : tipo, etiqueta: etiqueta(el),
                       requerido: el.required || el.getAttribute('aria-required') === 'true',
                       opciones: tipo === 'select-one' ? [...el.options].map(o => o.text.trim()).filter(t => t && !marcador(t)) : []};
        if (el.getAttribute('role') === 'combobox' || el.getAttribute('aria-autocomplete') === 'list') campo.autocompletar = true;
        campos.push(campo);
      });
      return campos;
    }""", raiz)


def _rellenar(pagina, campos, respuestas, tecleo=False):
    """tecleo=True escribe los textos cortos tecla por tecla con pausas, como una persona."""
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
            elif tecleo and len(str(valor)) <= 120:
                pagina.locator(sel).click()
                pagina.locator(sel).press_sequentially(str(valor), delay=random.randint(60, 160))
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
    if not habilitado(oferta["fuente"], env):
        return f"error: la postulación en {oferta['fuente']} está apagada (opción envio.{portal['opcion']})"
    if oferta["fuente"] == "LinkedIn":
        from rumbo.postular.linkedin import postular_linkedin
        return postular_linkedin(ctx, con, oferta)
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
    candidatas = [o for o in candidatas if o["fuente"] in PORTALES and habilitado(o["fuente"], env)]
    if not candidatas:
        return 0
    p, ctx = abrir(visible=env.get("revisar_antes_de_enviar", True))
    hechas = 0
    detenidos = set()   # portales sin sesión o con tope del propio portal: no se insiste en este ciclo
    try:
        for o in candidatas:
            if o["fuente"] in detenidos:
                continue
            if db.contar_eventos_hoy(con, "postulacion", o["fuente"]) >= env["limite_portal_dia"]:
                continue
            resultado = postular(ctx, con, o)
            if resultado == "sesion" or resultado.startswith("error: tope diario"):
                detenidos.add(o["fuente"])
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
            pausa(*PORTALES[o["fuente"]].get("pausa_entre", (20, 60)))   # ritmo humano entre postulaciones
    finally:
        ctx.close()
        p.stop()
    return hechas
