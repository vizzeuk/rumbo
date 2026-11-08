import json
import os
import tempfile



from rumbo import catalogo, config, perfil_prompt, vivo  # noqa: E402


def test_consultas_practica():
    qs = catalogo.consultas_para("practica", ["marketing digital", "community manager"])
    assert "práctica marketing digital" in qs and "practicante community manager" in qs


def test_busqueda_desde_tecnologia():
    r = catalogo.busqueda_desde({"situacion": "secundario", "rubro": "tecnologia", "modalidades": ["remoto"]})
    assert r["busqueda"]["preset"] == "tecnologia" and r["busqueda"]["solo_remoto"]
    assert r["busqueda"]["consultas"] and r["fuentes"].get("getonbrd")


def test_importar_perfil():
    texto = """Aquí va:
```json
{"datos": {"nombre": "Ana", "apellido": "Pérez", "email": "ana@example.com"},
 "busqueda": {"situacion": "practica", "rubro": "finanzas", "cargos": ["asistente contable"], "modalidades": ["hibrido"]}}
```

# Perfil
## Quién soy
Estudiante de contabilidad en último año, ordenada y con ganas de aprender.
"""
    r = perfil_prompt.importar(texto)
    assert r["nombre"] == "Ana" and "práctica asistente contable" in r["consultas"]
    assert "## Quién soy" in config.PERFIL.read_text(encoding="utf-8")
    assert json.loads(config.DATOS.read_text())["email"] == "ana@example.com"


def test_vivo_desde():
    vivo.emitir("hallazgo", titulo="x")
    r = vivo.desde(0)
    assert r["eventos"] and r["eventos"][-1]["tipo"] == "hallazgo"
    assert vivo.desde(r["ultimo"])["eventos"] == []
