"""Armar el perfil con la IA que ya usas (ChatGPT, Claude, Gemini…).

La persona copia PROMPT, lo pega en su chat de IA, conversa un poco y pega en Rumbo lo que la IA le
devuelve. importar() separa el bloque JSON (datos y búsqueda) del perfil en markdown y lo guarda.
"""
import json
import re

from rumbo import catalogo, config

PROMPT = """Hola. Voy a usar una app que busca trabajo por mí y escribe mis postulaciones. Necesito que me ayudes a armar mi perfil.

1. Si ya sabes cosas de mí por conversaciones anteriores, úsalas. Lo que no sepas, pregúntamelo de a una o dos preguntas por vez, en lenguaje simple: quién soy, qué estudié, dónde he trabajado (aunque sean pegas cortas, prácticas o proyectos propios), qué sé hacer, qué busco ahora (cargo, rubro, jornada, modalidad, comuna o región, horario), qué NO quiero, y mis datos de contacto.
2. No inventes nada: ni experiencia, ni cifras, ni títulos, ni idiomas. Si algo no lo sé, déjalo fuera.
3. Cuando tengas suficiente, respóndeme SOLO con estas dos partes, sin nada más:

```json
{
  "datos": {"nombre": "", "apellido": "", "email": "", "telefono": "", "ciudad": "", "pais": "Chile",
            "linkedin": "", "portafolio": "", "disponibilidad": "", "renta_esperada": ""},
  "busqueda": {"situacion": "UNA DE: SITUACIONES", "rubro": "UNO DE: RUBROS",
               "cargos": ["3 a 6 cargos tal como aparecerían en un portal de empleo de mi país"],
               "modalidades": ["remoto", "hibrido", "presencial"], "region": "",
               "excluir": ["palabras que si aparecen en el título la oferta no me interesa"],
               "excluir_ingles": true}
}
```

# Perfil
## Quién soy
(3 a 5 líneas, en primera persona)
## Experiencia
(cada experiencia: cargo, lugar, fechas aproximadas y 1 o 2 logros concretos)
## Habilidades
(lista corta, de lo más fuerte a lo menos)
## Qué busco
(cargo, rubro, jornada, modalidad, horario, ubicación)
## Cómo presentarme
(cómo quiero que la app me presente según a quién le escribe: empresas grandes, pymes, startups; qué destacar y qué evitar)

Escribe en español neutro, cercano y sin exagerar.
"""


def prompt():
    situaciones = " | ".join(s["id"] for s in catalogo.SITUACIONES)
    rubros = " | ".join(r["id"] for r in catalogo.RUBROS)
    return PROMPT.replace("SITUACIONES", situaciones).replace("RUBROS", rubros)


def _json(texto):
    bloque = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", texto, re.S)
    crudo = bloque.group(1) if bloque else None
    if not crudo:
        inicio = texto.find("{")
        if inicio < 0:
            return {}, texto
        try:
            obj, fin = json.JSONDecoder().raw_decode(texto[inicio:])
            return obj, texto[:inicio] + texto[inicio + fin:]
        except Exception:
            return {}, texto
    try:
        return json.loads(crudo), texto.replace(bloque.group(0), "")
    except Exception:
        return {}, texto


def importar(texto):
    """Guarda perfil, datos y búsqueda desde la respuesta de la IA. Devuelve un resumen para mostrar."""
    obj, resto = _json(texto or "")
    perfil = resto.strip()
    if perfil.startswith("# Perfil"):
        perfil = perfil.split("\n", 1)[1].strip() if "\n" in perfil else ""
    if len(perfil) < 40 and not obj:
        raise ValueError("No encontré el perfil en lo que pegaste. Pega la respuesta completa de la IA.")

    datos = {k: v for k, v in (obj.get("datos") or {}).items() if isinstance(v, str) and v.strip()}
    if datos:
        actuales = config.datos_personales()
        config.DATOS.write_text(json.dumps({**actuales, **datos}, indent=2, ensure_ascii=False), encoding="utf-8")

    b = obj.get("busqueda") or {}
    cambios = {"general": {"onboarding_hecho": True}}
    resumen = {}
    if b:
        r = catalogo.busqueda_desde(b)
        r["busqueda"]["excluir"] = [x for x in b.get("excluir") or [] if isinstance(x, str)]
        cambios.update(busqueda=r["busqueda"])
        if r["fuentes"]:
            cambios["fuentes"] = r["fuentes"]
        resumen = {"cargos": r["busqueda"]["cargos"], "consultas": r["busqueda"]["consultas"]}
    if datos.get("email"):
        cambios["envio"] = {"correo": datos["email"],
                            "nombre": f"{datos.get('nombre', '')} {datos.get('apellido', '')}".strip()}
    config.guardar(cambios)
    if perfil:
        nombre = f"{datos.get('nombre', '')} {datos.get('apellido', '')}".strip()
        config.PERFIL.write_text(f"# Perfil de {nombre or 'mi perfil'}\n\n{perfil}\n", encoding="utf-8")
    return {"nombre": datos.get("nombre", ""), **resumen, "perfil": bool(perfil)}
