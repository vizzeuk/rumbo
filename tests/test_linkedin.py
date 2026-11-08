"""LinkedIn Solicitud sencilla: pruebas sin cuenta.

Las pruebas con navegador sirven páginas falsas con page.route (no tocan LinkedIn). Las que sí van a
linkedin.com (sin sesión) corren solo con RUMBO_PRUEBAS_RED=1.
"""
import json
import os
import sqlite3
import tempfile

os.environ.setdefault("RUMBO_HOME", tempfile.mkdtemp())

import pytest  # noqa: E402

from rumbo import config  # noqa: E402
from rumbo.postular import linkedin as li  # noqa: E402
from rumbo.postular import navegador  # noqa: E402
from rumbo.postular.portales import PORTALES  # noqa: E402

pw = pytest.importorskip("playwright.sync_api")
RED = os.environ.get("RUMBO_PRUEBAS_RED") == "1"

NAV = '<nav id="global-nav"><a href="/feed/">Inicio</a><a href="/mynetwork/">Mi red</a></nav>'

OFERTA_HTML = NAV + """
<main>
  <h1>Analista contable</h1>
  <button id="jobs-apply-button-id" class="jobs-apply-button"
          aria-label="Solicitud sencilla para Analista contable en Acme">Solicitud sencilla</button>
  <section data-view-name="similar-jobs">
    <a href="/jobs/view/999999999/" aria-label="Solicitud sencilla para otra oferta">Otra</a>
  </section>
</main>
<script>
const pasos = [
  `<h3>Información de contacto</h3>
   <label for="tel">Número de teléfono móvil</label><input id="tel" type="text" value="+56911111111">`,
  `<h3>Currículum</h3><div class="jobs-document-upload"><label>Sube tu currículum</label>
   <input type="file" name="file" id="cv" style="display:none"></div>`,
  `<h3>Preguntas adicionales</h3>
   <label for="q1"><span aria-hidden="true">¿Cuántos años de experiencia tienes en contabilidad?</span>
   <span class="visually-hidden">¿Cuántos años de experiencia tienes en contabilidad?</span></label>
   <input id="q1" type="text" required>
   <label for="q2">Nivel de inglés</label>
   <select id="q2" required><option>Selecciona una opción</option><option>Básico</option><option>Intermedio</option></select>
   <fieldset><legend>¿Puedes trabajar de forma presencial?</legend>
     <input type="radio" name="r1" id="r1a" value="si"><label for="r1a">Sí</label>
     <input type="radio" name="r1" id="r1b" value="no"><label for="r1b">No</label></fieldset>`,
  `<h3>Revisa tu solicitud</h3>
   <input type="checkbox" id="follow-company-checkbox" checked><label for="follow-company-checkbox">Seguir a Acme</label>`,
];
let i = 0, datos = {};
function guardar() {
  document.querySelectorAll('#cuerpo input, #cuerpo select').forEach(el => {
    if (el.type === 'radio') { if (el.checked) datos[el.name] = el.value; }
    else if (el.type === 'checkbox') datos[el.id] = el.checked;
    else if (el.type === 'file') datos.cv = el.files.length ? el.files[0].name : (datos.cv || '');
    else if (el.tagName === 'SELECT') datos[el.id] = el.selectedIndex > 0 ? el.value : '';
    else datos[el.id] = el.value;
  });
}
function valido() {
  const faltan = [...document.querySelectorAll('#cuerpo [required]')].filter(el =>
    el.tagName === 'SELECT' ? el.selectedIndex <= 0 : !el.value.trim());
  if (i === 2 && !document.querySelector('input[name=r1]:checked')) faltan.push('r1');
  document.getElementById('error').innerText = faltan.length ? 'Ingresa una respuesta válida' : '';
  return !faltan.length;
}
function pintar() {
  const ultimo = i === pasos.length - 1;
  document.getElementById('modal').innerHTML = `
    <button data-test-modal-close-btn aria-label="Descartar" onclick="cerrar()">x</button>
    <div id="cuerpo">${pasos[i]}</div><div id="error" class="artdeco-inline-feedback--error"></div>
    ${ultimo ? '<button aria-label="Enviar solicitud" onclick="enviar()">Enviar solicitud</button>'
             : i === pasos.length - 2 ? '<button aria-label="Revisar tu solicitud" onclick="avanzar()">Revisar</button>'
             : '<button aria-label="Ir al siguiente paso" onclick="avanzar()">Siguiente</button>'}`;
}
function avanzar() { if (!valido()) return; guardar(); i++; pintar(); }
function cerrar() {
  document.getElementById('modal').innerHTML = '<button onclick="descartar()">Descartar</button><button>Guardar</button>';
}
function descartar() { document.getElementById('modal').remove(); fetch('/registro', {method: 'POST', body: '{"descartada": true}'}); }
function enviar() {
  guardar();
  fetch('/registro', {method: 'POST', body: JSON.stringify(datos)});
  document.getElementById('modal').outerHTML = '<div role="dialog"><h2>Se envió tu solicitud a Acme</h2></div>';
}
document.getElementById('jobs-apply-button-id').onclick = () => {
  const m = document.createElement('div');
  m.id = 'modal'; m.setAttribute('role', 'dialog'); m.className = 'artdeco-modal jobs-easy-apply-modal';
  document.body.appendChild(m); pintar();
};
</script>"""

PUBLICA_HTML = """<main><h1>Analista contable</h1>
<a data-tracking-control-name="public_jobs_apply-link-onsite" href="#">Solicitud sencilla</a>
<a href="/login">Iniciar sesión</a></main>"""

BUSQUEDA_HTML = NAV + """<ul>
<li data-occludable-job-id="4100000001"><div class="job-card-container">
  <a href="/jobs/view/4100000001/"><span class="artdeco-entity-lockup__title">Analista contable</span></a>
  <div class="artdeco-entity-lockup__subtitle">Acme</div><div class="artdeco-entity-lockup__caption">Santiago (remoto)</div>
  <ul><li class="job-card-container__footer-job-state">Visto</li></ul></div></li>
<li data-occludable-job-id="4100000002"><div class="job-card-container">
  <a href="/jobs/view/4100000002/"><span class="artdeco-entity-lockup__title">Contador general</span></a>
  <div class="artdeco-entity-lockup__subtitle">Beta</div>
  <ul><li class="job-card-container__footer-job-state">Solicitado</li></ul></div></li>
</ul>"""


def _pagina(html):
    return f"<!doctype html><html><head><meta charset='utf-8'></head><body>{html}</body></html>"


@pytest.fixture
def navegador_falso(monkeypatch):
    """Contexto headless que responde con páginas falsas; registra lo que la página envía."""
    monkeypatch.setattr(li, "pausa", lambda *a, **k: None)
    monkeypatch.setattr(navegador, "pausa", lambda *a, **k: None)
    registro, pedidas = [], []
    p = pw.sync_playwright().start()
    navegador_ = p.chromium.launch(headless=True)
    ctx = navegador_.new_context(locale="es-CL")
    paginas = {}

    def responder(route):
        url = route.request.url
        pedidas.append(url)
        if url.endswith("/registro"):
            registro.append(json.loads(route.request.post_data or "{}"))
            return route.fulfill(status=204, body="")
        for clave, html in paginas.items():
            if clave in url:
                return route.fulfill(status=200, content_type="text/html; charset=utf-8", body=_pagina(html))
        return route.fulfill(status=404, body="")

    ctx.route("**/*", responder)
    yield ctx, paginas, registro, pedidas
    ctx.close()
    navegador_.close()
    p.stop()


@pytest.fixture
def con():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("CREATE TABLE ofertas (id TEXT, captura TEXT)")
    return c


def _oferta(jid="4100000001"):
    return {"id": f"li-{jid}", "fuente": "LinkedIn", "tipo": "oferta", "titulo": "Analista contable",
            "empresa": "Acme", "url": f"https://www.linkedin.com/jobs/view/{jid}/",
            "url_postular": f"https://www.linkedin.com/jobs/view/{jid}/", "propuesta": "", "descripcion": ""}


def _config(**envio):
    config.CONFIG.unlink(missing_ok=True)
    config.guardar({"envio": envio})


# ── sin navegador ────────────────────────────────────────────────────────────

def test_apagado_por_defecto():
    assert config.BASE["envio"]["linkedin_auto"] is False
    assert PORTALES["LinkedIn"]["login"] == "https://www.linkedin.com/login"
    assert not navegador.habilitado("LinkedIn", {"linkedin_auto": False})
    assert navegador.habilitado("LinkedIn", {"linkedin_auto": True})
    assert navegador.habilitado("Computrabajo", {})


def test_postular_rechaza_linkedin_si_esta_apagado(con):
    _config(linkedin_auto=False)
    r = navegador.postular(None, con, _oferta())
    assert r.startswith("error:") and "linkedin_auto" in r


def test_login_linkedin_por_cli(monkeypatch, capsys):
    from rumbo import cli
    llamadas = []
    monkeypatch.setattr(navegador, "login", lambda portal: llamadas.append(portal) or False)
    cli.main(["login", "LinkedIn"])
    assert llamadas == ["LinkedIn"]
    assert "No pude confirmar" in capsys.readouterr().out


def test_jid():
    assert li._jid({"id": "li-4100000001", "url_postular": "", "url": ""}) == "4100000001"
    assert li._jid({"id": "x", "url_postular": "https://www.linkedin.com/jobs/view/analista-4100000003/", "url": ""}) == "4100000003"


# ── con navegador headless y páginas falsas ─────────────────────────────────

def test_sin_sesion_devuelve_sesion(navegador_falso, con):
    ctx, paginas, registro, _ = navegador_falso
    _config(linkedin_auto=True)
    paginas["/jobs/view/"] = PUBLICA_HTML
    assert li.postular_linkedin(ctx, con, _oferta()) == "sesion"
    assert navegador.postular(ctx, con, _oferta()) == "sesion"


def test_sesion_activa_por_selector(navegador_falso):
    ctx, paginas, _, _ = navegador_falso
    pagina = ctx.new_page()
    paginas["/feed/"] = PUBLICA_HTML
    assert navegador.sesion_activa(pagina, "LinkedIn") is False
    paginas["/feed/"] = NAV
    assert navegador.sesion_activa(pagina, "LinkedIn") is True


def test_postula_paso_a_paso(navegador_falso, con, monkeypatch, tmp_path):
    ctx, paginas, registro, _ = navegador_falso
    cv = tmp_path / "mi-cv.pdf"
    cv.write_bytes(b"%PDF-1.4 prueba")
    datos = config.datos_personales()
    config.DATOS.write_text(json.dumps({**datos, "cv": str(cv)}))
    _config(linkedin_auto=True, revisar_antes_de_enviar=False)
    paginas["/jobs/view/4100000001"] = OFERTA_HTML
    vistos = []

    def responder(oferta, campos):
        vistos.extend(campos)
        r = {}
        for c in campos:
            if "años" in c["etiqueta"]:
                r[c["id"]] = "4"
            elif c["tipo"] == "select":
                r[c["id"]] = "Intermedio"
            elif c["tipo"] == "radio":
                r[c["id"]] = "No"
        return r

    monkeypatch.setattr(li.redactor, "responder_formulario", responder)
    assert li.postular_linkedin(ctx, con, _oferta()) == "enviada"
    assert registro == [{"tel": "+56911111111", "cv": "mi-cv.pdf", "q1": "4", "q2": "Intermedio", "r1": "no",
                         "follow-company-checkbox": False}]
    etiquetas = [c["etiqueta"] for c in vistos]
    assert "¿Cuántos años de experiencia tienes en contabilidad?" in etiquetas   # sin texto repetido
    select = next(c for c in vistos if c["tipo"] == "select")
    assert select["opciones"] == ["Básico", "Intermedio"]                         # sin "Selecciona una opción"
    assert not any("seguir" in e.lower() for e in etiquetas)


def test_no_adivina_y_descarta(navegador_falso, con, monkeypatch):
    ctx, paginas, registro, _ = navegador_falso
    config.DATOS.write_text(json.dumps({**config.datos_personales(), "cv": ""}))
    _config(linkedin_auto=True, revisar_antes_de_enviar=False)
    paginas["/jobs/view/4100000001"] = OFERTA_HTML
    monkeypatch.setattr(li.redactor, "responder_formulario", lambda oferta, campos: {})
    r = li.postular_linkedin(ctx, con, _oferta())
    assert r.startswith("error: LinkedIn no aceptó el paso")
    assert registro == [{"descartada": True}]


def test_ya_postulado(navegador_falso, con):
    ctx, paginas, _, _ = navegador_falso
    _config(linkedin_auto=True)
    paginas["/jobs/view/"] = NAV + "<main><h1>Analista</h1><span>Solicitud enviada hace 2 días</span></main>"
    assert li.postular_linkedin(ctx, con, _oferta()) == "enviada"


def test_sin_solicitud_sencilla(navegador_falso, con):
    ctx, paginas, _, _ = navegador_falso
    _config(linkedin_auto=True)
    paginas["/jobs/view/"] = NAV + """<main><button id="jobs-apply-button-id" aria-label="Solicitar en el sitio web de la empresa">
        Solicitar <svg data-test-icon="link-external-small"></svg></button></main>"""
    assert li.postular_linkedin(ctx, con, _oferta()).startswith("error: la oferta no tiene Solicitud sencilla")


def test_buscar_easy_apply(navegador_falso, monkeypatch):
    ctx, paginas, _, pedidas = navegador_falso
    paginas["/jobs/search/"] = BUSQUEDA_HTML
    monkeypatch.setattr(li, "get", lambda url: '<div class="show-more-less-html__markup">Llevar la contabilidad</div>')
    ofertas = li.buscar_easy_apply(ctx, ["contador"], "Chile", True, 10)
    assert any("f_AL=true" in u and "f_WT=2" in u for u in pedidas)
    assert [o["id"] for o in ofertas] == ["li-4100000001"]   # la ya solicitada se salta
    o = ofertas[0]
    assert (o["tipo"], o["fuente"], o["titulo"], o["empresa"]) == ("oferta", "LinkedIn", "Analista contable", "Acme")
    assert o["url_postular"] == "https://www.linkedin.com/jobs/view/4100000001/"
    assert o["descripcion"] == "Llevar la contabilidad"


def test_buscar_sin_sesion(navegador_falso):
    ctx, paginas, _, _ = navegador_falso
    paginas["/jobs/search/"] = PUBLICA_HTML
    with pytest.raises(li.SinSesion):
        li.buscar_easy_apply(ctx, ["contador"], "Chile", False, 5)


# ── contra linkedin.com real, sin sesión (opcional) ─────────────────────────

@pytest.mark.skipif(not RED, reason="define RUMBO_PRUEBAS_RED=1 para probar contra linkedin.com")
def test_red_sin_sesion(con, monkeypatch):
    monkeypatch.setattr(li, "pausa", lambda *a, **k: None)
    _config(linkedin_auto=True)
    p, ctx = navegador.abrir(visible=False)   # perfil vacío en un RUMBO_HOME temporal
    try:
        pagina = ctx.new_page()
        assert navegador.sesion_activa(pagina, "LinkedIn") is False
        assert li.postular_linkedin(ctx, con, _oferta("4300000000")) == "sesion"
        with pytest.raises(li.SinSesion):
            li.buscar_easy_apply(ctx, ["contador"], "Chile", False, 3)
    finally:
        ctx.close()
        p.stop()
