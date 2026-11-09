import os
import tempfile

os.environ["RUMBO_HOME"] = tempfile.mkdtemp()

from rumbo import config, reglas  # noqa: E402


def usar(**busqueda):
    config.CONFIG.unlink(missing_ok=True)
    config.guardar({"busqueda": busqueda})


def test_descarta_ingles():
    usar(preset="general")
    assert reglas.puntuar("Contador", "Se requiere inglés avanzado")[0] < 0


def test_descarta_engaños_siempre():
    usar(preset="general")
    assert reglas.puntuar("Ejecutivo multinivel", "gana dinero desde casa")[0] < 0


def test_general_sin_palabras_deja_decidir_a_la_ia():
    usar(preset="general")
    assert reglas.puntuar("Asistente contable", "Jornada completa en Santiago")[0] > 0


def test_general_con_palabras_clave():
    usar(preset="general", palabras_clave=["contabilidad", "remuneraciones"])
    assert reglas.puntuar("Analista contable", "Contabilidad y remuneraciones de pymes")[0] >= 20
    assert reglas.puntuar("Chef", "Cocina caliente")[0] < 0


def test_excluir_del_usuario():
    usar(preset="general", excluir=["turno noche"])
    assert reglas.puntuar("Guardia turno noche", "")[0] < 0


def test_preset_tecnologia():
    usar(preset="tecnologia")
    p, _ = reglas.puntuar("Desarrollador Full Stack", "Next.js, React, Supabase y n8n, 100% remoto", "freelance")
    assert p >= 60
    assert reglas.puntuar("Ejecutivo de ventas", "React y Node")[0] < 0
    assert reglas.titulo_prometedor("Desarrollador Python")
    assert not reglas.titulo_prometedor("Vendedor de seguros")


def test_palabras_completas():
    assert not reglas.hay("hay que aplicar", ["app"])


def test_solo_remoto():
    usar(modalidades=["remoto"])
    assert reglas.solo_remoto()
    usar(modalidades=["remoto", "presencial"])
    assert not reglas.solo_remoto()


def test_titulo_igual_a_lo_buscado_no_se_descarta():
    usar(preset="general", consultas=["tesorero"], cargos=["tesorero"])
    assert reglas.puntuar("Tesorero", "Cargo en tienda de retail")[0] >= 20
