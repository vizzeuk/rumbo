"""LinkedIn "Solicitud sencilla" (Easy Apply): buscar y postular con tu propia sesión.

OPCIONAL Y APAGADO POR DEFECTO. Solo corre si config envio.linkedin_auto es True.
RIESGO ALTO: las condiciones de uso de LinkedIn prohíben las herramientas automatizadas y LinkedIn
puede restringir o cerrar la cuenta. Por eso: topes diarios (envio.limite_portal_dia), pausas
aleatorias largas (30 a 90 s entre postulaciones), tecleo con pausas, nunca se marca "seguir a la
empresa", nunca se adivina una respuesta (si la IA no sabe, la postulación se detiene) y con
"revisar antes de enviar" el último clic es tuyo.

Cómo funciona:
1. `rumbo login LinkedIn` abre el navegador con el perfil de Rumbo; inicias sesión a mano una vez.
   Rumbo nunca pide ni guarda tu contraseña.
2. `buscar_easy_apply` abre la búsqueda de empleos filtrada por Solicitud sencilla (f_AL=true) y
   devuelve las ofertas; la descripción se lee de la página pública de la oferta.
3. `postular_linkedin` abre la oferta, aprieta "Solicitud sencilla", recorre el formulario paso a
   paso (Siguiente, Revisar, Enviar), sube tu CV si hace falta y pide a la IA las respuestas.

Selectores y textos reunidos en noviembre de 2026 a partir de proyectos MIT (ver NOTICE):
GodsScion/Auto_job_applier_linkedIn, leopu00/job-hunter-team, galiprandi/job-seeker y
beatwad/LinkedIn-AI-Job-Applier-Ultimate. La implementación es propia.
"""
import hashlib
import re
import time
import urllib.parse
from pathlib import Path

from rumbo import config, redactor
from rumbo.postular.navegador import _campos, _rellenar, _texto, pausa
from rumbo.postular.portales import PORTALES
from rumbo.util import get, limpiar, log

FUENTE = "LinkedIn"
BUSQUEDA = "https://www.linkedin.com/jobs/search/"
DETALLE_PUBLICO = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{}"
SESION = PORTALES[FUENTE]["sesion_selector"]
RUTAS_SIN_SESION = ("/login", "/authwall", "/uas/login", "/signup", "/checkpoint/")
DESAFIO = ("security verification", "quick security check", "verify you are human",
           "verificación de seguridad", "comprobación de seguridad", "demuestra que eres una persona")

# El botón de la oferta. Su id y clase son estables pero también visten el "Solicitar" que lleva al
# sitio de la empresa, así que además se exige el texto "Solicitud sencilla" / "Easy Apply" al inicio
# de su nombre, o el enlace al flujo de postulación dentro de LinkedIn (diseño 2026).
BOTON_ESTRUCTURA = ("#jobs-apply-button-id, button.jobs-apply-button, a.jobs-apply-button, "
                    "[data-live-test-job-apply-button], a[href*='openSDUIApplyFlow=true']")
ETIQUETA_EASY = re.compile(r"^\s*(solicitud sencilla|easy apply|candidatura simplificada)", re.I)
OTRAS_OFERTAS = ("[id^='JobDetailsSimilarJobsSlot'], [data-view-name*='similar-jobs'], "
                 ".job-card-container, li[data-occludable-job-id]")
ICONO_EXTERNO = "[data-test-icon*='link-external'], use[href*='link-external']"

# El formulario: un <dialog> nativo en el diseño 2026, el modal clásico en el resto.
MODAL = ("dialog[open]:has([data-sdui-screen*='easyapply' i]), "
         "dialog[open][data-testid='dialog']:has([data-testid='dialog-content']), "
         ".jobs-easy-apply-modal")
# Botones del pie: se buscan SOLO dentro del modal (afuera, "Siguiente" también es la paginación).
SIGUIENTE = re.compile(r"^\s*(continue to next step|ir al siguiente paso|continuar al siguiente paso|"
                       r"next|siguiente|continue|continuar)\b", re.I)
REVISAR = re.compile(r"^\s*(review your application|revisar tu solicitud|revisa tu solicitud|review|revisar)\b", re.I)
ENVIAR = re.compile(r"^\s*(submit application|enviar solicitud|presentar solicitud|submit|enviar)\b", re.I)
DESCARTAR = re.compile(r"^\s*(discard|descartar)\b", re.I)
CERRAR = ("button[data-test-modal-close-btn], button[aria-label='Dismiss'], "
          "button[aria-label='Descartar'], button[aria-label='Cerrar']")
ERRORES = ".artdeco-inline-feedback--error, [role=alert], [aria-invalid=true]"

EXITO = ("se envió tu solicitud", "se ha enviado tu solicitud", "tu solicitud se ha enviado",
         "tu solicitud fue enviada", "solicitud enviada", "your application was sent", "application sent")
YA_POSTULADO = re.compile(r"(solicitud enviada|se envió tu solicitud|application submitted|application sent)", re.I)
YA_POSTULADO_SELECTOR = ".jobs-s-apply__application-link"
TOPE = re.compile(r"(easy apply limit|daily application limit|l[ií]mite diario de solicitudes|"
                  r"l[ií]mite de solicitud(es)? sencilla)", re.I)
ERROR_TOPE = "error: tope diario de LinkedIn para Solicitud sencilla; se reintenta mañana"
MAX_PASOS = 12
CV_FORMATOS = (".pdf", ".doc", ".docx")
CV_MAX_BYTES = 2 * 1024 * 1024   # LinkedIn no acepta CV de más de 2 MB


class SinSesion(RuntimeError):
    """No hay sesión de LinkedIn en el perfil de Rumbo: `rumbo login LinkedIn`."""


# ── utilidades ───────────────────────────────────────────────────────────────

def _con_sesion(pagina):
    url = (pagina.url or "").lower()
    if any(r in url for r in RUTAS_SIN_SESION):
        return False
    try:
        return pagina.locator(SESION).count() > 0
    except Exception:
        return False


def _desafio(pagina):
    return "/checkpoint/" in (pagina.url or "") or any(s in _texto(pagina) for s in DESAFIO)


def _visibles(loc):
    salida = []
    for i in range(loc.count()):
        el = loc.nth(i)
        try:
            if el.is_visible() and el.is_enabled():
                salida.append(el)
        except Exception:
            continue
    return salida


def _nombre(el):
    try:
        return " ".join(f"{el.get_attribute('aria-label') or ''} {el.inner_text() or ''}".split())
    except Exception:
        return ""


def _jid(oferta):
    for texto in (oferta["id"], oferta["url_postular"] or "", oferta["url"] or ""):
        m = re.search(r"(?:li-|/jobs/view/(?:[^/?#]*-)?|currentJobId=)(\d{6,})", texto or "")
        if m:
            return m.group(1)
    return ""


def _otra_oferta(href, jid):
    m = re.search(r"/jobs/view/(?:[^/?#]*-)?(\d{6,})", href or "")
    return bool(m and jid and m.group(1) != jid)


def _exito(pagina):
    texto = _texto(pagina)
    return any(s in texto for s in EXITO)


def _ya_postulado(pagina):
    try:
        if pagina.locator(YA_POSTULADO_SELECTOR).count():
            return True
    except Exception:
        pass
    return bool(YA_POSTULADO.search(_texto(pagina)))


def _ruta_cv():
    ruta = (config.datos_personales().get("cv") or "").strip()
    if not ruta:
        return None
    p = Path(ruta).expanduser()
    if not p.is_file():
        log(f"LinkedIn: el CV configurado no existe ({p}); se usa el que ya tengas en LinkedIn")
        return None
    if p.suffix.lower() not in CV_FORMATOS or p.stat().st_size > CV_MAX_BYTES:
        log("LinkedIn: el CV debe ser PDF, DOC o DOCX de menos de 2 MB; se usa el que ya tengas en LinkedIn")
        return None
    return p


# ── búsqueda ─────────────────────────────────────────────────────────────────

_TARJETAS_JS = r"""() => {
  const unico = t => [...new Set((t || '').split('\n').map(s => s.trim()).filter(Boolean))];
  const idDe = h => { const m = (h || '').match(/\/jobs\/view\/(?:[^\/?#]*-)?(\d{6,})/) || (h || '').match(/currentJobId=(\d{6,})/); return m ? m[1] : ''; };
  const salida = new Map();
  document.querySelectorAll('li[data-occludable-job-id], div[data-job-id], .job-card-container').forEach(c => {
    const enlace = c.querySelector('a[href*="/jobs/view/"], a[href*="currentJobId="]');
    const jid = c.getAttribute('data-occludable-job-id') || c.getAttribute('data-job-id') || idDe(enlace && enlace.href);
    if (!jid || salida.has(jid)) return;
    const q = s => (c.querySelector(s)?.innerText || '');
    const titulo = unico(q('.artdeco-entity-lockup__title, .job-card-list__title, .job-card-list__title--link'))[0]
                || unico(enlace?.getAttribute('aria-label') || enlace?.innerText)[0] || '';
    const empresa = unico(q('.artdeco-entity-lockup__subtitle, .job-card-container__primary-description, .job-card-container__company-name'))[0] || '';
    const ubicacion = unico(q('.artdeco-entity-lockup__caption, .job-card-container__metadata-wrapper'))[0] || '';
    const estado = q('.job-card-container__footer-job-state').trim().toLowerCase();
    salida.set(jid, {jid, titulo, empresa, ubicacion, postulado: /^(applied|solicitado|postulado)/.test(estado)});
  });
  if (!salida.size) document.querySelectorAll('a[href*="/jobs/view/"]').forEach(a => {
    const jid = idDe(a.href);
    if (jid && !salida.has(jid)) salida.set(jid, {jid, titulo: unico(a.getAttribute('aria-label') || a.innerText)[0] || '', empresa: '', ubicacion: '', postulado: false});
  });
  return [...salida.values()];
}"""

_DESPLAZAR_JS = r"""() => {
  const c = document.querySelector('li[data-occludable-job-id], div[data-job-id], a[href*="/jobs/view/"]');
  let el = c;
  while (el && el !== document.body) {
    const s = getComputedStyle(el);
    if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight) break;
    el = el.parentElement;
  }
  (el && el !== document.body ? el : document.scrollingElement).scrollBy(0, 500 + Math.random() * 500);
}"""


def _detalle_publico(jid):
    """(descripción, título, empresa) desde la página pública de la oferta, sin usar tu sesión."""
    try:
        d = get(DETALLE_PUBLICO.format(jid))
    except Exception as e:
        log(f"LinkedIn detalle {jid}: {e}")
        return "", "", ""
    desc = re.search(r'show-more-less-html__markup[^>]*>(.*?)</div>', d, re.S)
    titulo = re.search(r'top-card-layout__title[^>]*>(.*?)</h', d, re.S)
    empresa = re.search(r'topcard__org-name-link[^>]*>(.*?)</a>', d, re.S)
    return (limpiar(desc.group(1)) if desc else "", limpiar(titulo.group(1)) if titulo else "",
            limpiar(empresa.group(1)) if empresa else "")


def buscar_easy_apply(ctx, consultas, ubicacion, remoto, limite):
    """Ofertas con Solicitud sencilla para guardar como fuente "LinkedIn", tipo "oferta".

    Requiere la sesión iniciada (lanza SinSesion si no). Devuelve una lista de dicts con id, tipo,
    fuente, titulo, empresa, ubicacion, modalidad, url, url_postular y descripcion."""
    ofertas, vistos = [], set()
    pagina = ctx.new_page()
    try:
        for q in consultas:
            if len(ofertas) >= limite:
                break
            params = {"keywords": q, "location": ubicacion or "", "f_AL": "true", "f_TPR": "r604800", "sortBy": "DD"}
            if remoto:
                params["f_WT"] = "2"
            pagina.goto(BUSQUEDA + "?" + urllib.parse.urlencode(params), wait_until="domcontentloaded", timeout=45000)
            pausa(3, 6)
            if not _con_sesion(pagina) or _desafio(pagina):
                raise SinSesion("Inicia sesión: rumbo login LinkedIn")
            for _ in range(5):   # la lista carga las tarjetas a medida que se desplaza
                try:
                    pagina.evaluate(_DESPLAZAR_JS)
                except Exception:
                    break
                pausa(0.8, 1.8)
            for t in pagina.evaluate(_TARJETAS_JS):
                if len(ofertas) >= limite:
                    break
                if t["jid"] in vistos or t["postulado"]:
                    continue
                vistos.add(t["jid"])
                desc, titulo, empresa = _detalle_publico(t["jid"])
                url = f"https://www.linkedin.com/jobs/view/{t['jid']}/"
                ofertas.append({"id": "li-" + t["jid"], "tipo": "oferta", "fuente": FUENTE,
                                "titulo": limpiar(t["titulo"] or titulo), "empresa": limpiar(t["empresa"] or empresa),
                                "ubicacion": limpiar(t["ubicacion"]), "modalidad": "remoto" if remoto else "",
                                "url": url, "url_postular": url, "descripcion": desc})
                pausa(1.5, 3)
            pausa(4, 9)   # entre consultas
    finally:
        try:
            pagina.close()
        except Exception:
            pass
    return [o for o in ofertas if o["titulo"]]


# ── postulación ──────────────────────────────────────────────────────────────

def _boton_easy_apply(pagina, jid):
    union = (pagina.locator(BOTON_ESTRUCTURA)
             .or_(pagina.get_by_role("button", name=ETIQUETA_EASY))
             .or_(pagina.get_by_role("link", name=ETIQUETA_EASY)))
    for el in _visibles(union):
        try:
            href = el.get_attribute("href") or ""
            if _otra_oferta(href, jid) or el.evaluate("(e, s) => !!e.closest(s)", OTRAS_OFERTAS):
                continue   # una oferta similar, no esta
            if el.locator(ICONO_EXTERNO).count():
                continue   # "Solicitar" en el sitio de la empresa
            aria, texto = el.get_attribute("aria-label") or "", el.inner_text() or ""
            if "openSDUIApplyFlow=true" in href or ETIQUETA_EASY.search(aria) or ETIQUETA_EASY.search(texto):
                return el
        except Exception:
            continue
    return None


def _modal(pagina):
    try:
        visibles = [m for m in (pagina.locator(MODAL).nth(i) for i in range(pagina.locator(MODAL).count()))
                    if m.is_visible()]
    except Exception:
        return None
    return visibles[-1] if visibles else None


def _esperar_modal(pagina, segundos=12):
    fin = time.time() + segundos
    while time.time() < fin:
        m = _modal(pagina)
        if m is not None:
            return m
        pagina.wait_for_timeout(500)
    return None


def _boton_modal(modal, patron):
    """El único botón visible y habilitado del modal cuyo nombre empieza con el patrón."""
    candidatos = [b for b in _visibles(modal.get_by_role("button", name=patron))
                  if patron.search(_nombre(b))]
    return candidatos[0] if len(candidatos) == 1 else None


def _errores(modal):
    salida = []
    for el in _visibles(modal.locator(ERRORES)):
        try:
            t = " ".join((el.inner_text() or el.get_attribute("aria-label") or "").split())
        except Exception:
            continue
        if t and t not in salida:
            salida.append(t)
    return salida


def _huella(modal):
    try:
        return hashlib.sha1((modal.inner_text() or "").encode()).hexdigest()
    except Exception:
        return ""


def _subir_cv(pagina, modal, ruta):
    """Sube el CV en el paso que lo pide. Si LinkedIn ya lo muestra (subido antes), no lo duplica."""
    try:
        if modal.get_by_text(ruta.name, exact=False).count():
            return True
    except Exception:
        pass
    entradas = modal.locator("input[type=file]")
    if entradas.count():
        elegida = None
        for i in range(entradas.count()):
            e = entradas.nth(i)
            contexto = e.evaluate("""el => [el.id, el.name, el.getAttribute('aria-label') || '',
                (el.closest('section, fieldset, .jobs-document-upload, [class*=upload]') || el.parentElement)?.innerText || '']
                .join(' ')""")
            if re.search(r"curr[ií]cul|resume|\bcv\b", contexto, re.I) and not re.search(r"cover|carta", contexto, re.I):
                elegida = e
                break
        if elegida is None and entradas.count() == 1:
            elegida = entradas.first
        if elegida is None:
            return False
        elegida.set_input_files(str(ruta))
        pausa(2, 4)
        return True
    # Diseño 2026: no hay <input type=file> hasta que se aprieta "Subir currículum".
    boton = modal.get_by_role("button", name=re.compile(r"(upload|cargar|subir)\s+(resume|curr[ií]culum|cv)", re.I))
    if boton.count():
        with pagina.expect_file_chooser(timeout=8000) as selector:
            boton.first.click()
        selector.value.set_files(str(ruta))
        pausa(2, 4)
        return True
    return False


def _confirmar_autocompletados(pagina, campos, respuestas):
    """Campos con sugerencias (ciudad, por ejemplo): se elige la primera sugerencia."""
    for c in campos:
        if not c.get("autocompletar") or respuestas.get(c["id"]) in (None, ""):
            continue
        try:
            pausa(1.2, 2.2)
            if pagina.locator("[role=listbox] [role=option], .basic-typeahead__selectable").count():
                campo = pagina.locator(f"[data-rumbo='{c['id']}']")
                campo.press("ArrowDown")
                campo.press("Enter")
        except Exception as e:
            log(f"LinkedIn autocompletar '{c['etiqueta'][:40]}': {e}")


def _no_seguir_empresa(pagina):
    """LinkedIn deja marcado "Seguir a la empresa": se desmarca (seguir en masa parece bot)."""
    try:
        pagina.evaluate("""(raiz) => {
          const m = document.querySelector(raiz); if (!m) return;
          m.querySelectorAll('input[type=checkbox]').forEach(c => {
            const l = (c.id && m.querySelector(`label[for="${CSS.escape(c.id)}"]`)?.innerText) || c.getAttribute('aria-label') || '';
            if (c.checked && ((c.id || '').includes('follow-company') || /^\\s*(follow|seguir)\\b/i.test(l))) c.click();
          });
        }""", MODAL)
    except Exception:
        pass


def _descartar(pagina):
    """Cierra el formulario y descarta el borrador para no dejar postulaciones a medias."""
    try:
        if pagina.is_closed() or _modal(pagina) is None:
            return
        cerrar = _visibles(pagina.locator(CERRAR))
        if cerrar:
            cerrar[0].click()
        else:
            pagina.keyboard.press("Escape")
        pausa(1.5, 2.5)
        confirmar = (pagina.locator("button[data-control-name='discard_application_confirm_btn']")
                     .or_(pagina.get_by_role("button", name=DESCARTAR)))
        for b in _visibles(confirmar):
            if b.get_attribute("data-test-modal-close-btn") is None:
                b.click()
                break
    except Exception:
        pass


def _esperar_usuario(pagina, minutos=15):
    """Modo revisar: el usuario revisa y aprieta Enviar. Termina al ver el envío o al cerrar la pestaña."""
    fin, sin_modal = time.time() + minutos * 60, 0
    while time.time() < fin:
        try:
            pagina.wait_for_timeout(2000)
            if _exito(pagina):
                return "revision"
            sin_modal = sin_modal + 1 if _modal(pagina) is None else 0
            if sin_modal >= 3:
                return "error: cerraste el formulario sin enviar"
        except Exception:
            return "revision"   # cerró la pestaña después de enviar
    return f"error: no confirmaste el envío en {minutos} minutos"


def postular_linkedin(ctx, con, oferta):
    """Postula con Solicitud sencilla. Devuelve 'enviada' | 'revision' | 'sesion' | 'error: ...'."""
    env = config.cargar()["envio"]
    revisar = env.get("revisar_antes_de_enviar", True)
    jid = _jid(oferta)
    url = oferta["url_postular"] or oferta["url"] or (f"https://www.linkedin.com/jobs/view/{jid}/" if jid else "")
    if not url:
        return "error: la oferta no tiene dirección"
    pagina = ctx.new_page()
    descartar = False
    try:
        pagina.goto(url, wait_until="domcontentloaded", timeout=45000)
        pausa(3, 6)
        if not _con_sesion(pagina) or _desafio(pagina):
            return "sesion"
        if TOPE.search(_texto(pagina)):
            return ERROR_TOPE
        if _ya_postulado(pagina):
            return "enviada"
        boton = _boton_easy_apply(pagina, jid)
        if boton is None:
            return "error: la oferta no tiene Solicitud sencilla (cerró o se postula en el sitio de la empresa)"
        boton.scroll_into_view_if_needed()
        pausa(0.8, 2)
        boton.click()
        if _esperar_modal(pagina) is None:
            if TOPE.search(_texto(pagina)):
                return ERROR_TOPE
            return "sesion" if not _con_sesion(pagina) else "error: no se abrió el formulario de Solicitud sencilla"
        descartar = True
        cv, cv_listo = _ruta_cv(), False
        huella_anterior, envios = None, 0
        for _ in range(MAX_PASOS):
            pausa(1.5, 3)
            if _exito(pagina):
                break
            if _desafio(pagina):
                return "sesion"
            modal = _modal(pagina)
            if modal is None:
                break   # se cerró: abajo se comprueba si quedó enviada
            if cv and not cv_listo:
                cv_listo = _subir_cv(pagina, modal, cv)
            campos = _campos(pagina, raiz=MODAL)
            if campos:
                respuestas = redactor.responder_formulario(oferta, campos)
                _rellenar(pagina, campos, respuestas, tecleo=True)
                _confirmar_autocompletados(pagina, campos, respuestas)
            enviar = _boton_modal(modal, ENVIAR)
            if enviar is not None:
                _no_seguir_empresa(pagina)
                if revisar:
                    descartar = False
                    log(f"Revisión: {oferta['titulo'][:60]} (LinkedIn) quedó lista para tu clic final")
                    return _esperar_usuario(pagina)
                envios += 1
                if envios > 2:
                    return "error: apreté Enviar y LinkedIn no confirmó; revisa la oferta a mano"
                pausa(1, 2.5)
                enviar.click()
                pausa(3, 5)
                continue
            avanzar = _boton_modal(modal, REVISAR) or _boton_modal(modal, SIGUIENTE)
            if avanzar is None:
                return "error: no encontré Siguiente, Revisar ni Enviar en el formulario"
            huella = _huella(modal)
            if huella and huella == huella_anterior:
                # El paso no avanzó dos veces seguidas: hay preguntas que la IA no supo responder.
                faltan = "; ".join(_errores(modal)) or "preguntas obligatorias sin responder"
                return f"error: LinkedIn no aceptó el paso ({faltan[:200]}). Postula a mano."
            huella_anterior = huella
            avanzar.click()
        else:
            return "error: el formulario tiene demasiados pasos"
        enviada = _exito(pagina) or _ya_postulado(pagina)
        if enviada:
            descartar = False
        captura = config.CAPTURAS / f"{oferta['id']}.png"
        pagina.screenshot(path=str(captura), full_page=False)
        con.execute("UPDATE ofertas SET captura=? WHERE id=?", (str(captura), oferta["id"]))
        return "enviada" if enviada else "error: no vi la confirmación (revisa la captura)"
    except Exception as e:
        return f"error: {e}"
    finally:
        if descartar:
            _descartar(pagina)
        try:
            pagina.close()
        except Exception:
            pass
