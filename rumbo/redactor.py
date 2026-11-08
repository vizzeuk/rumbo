"""Evalúa oportunidades, redacta postulaciones y responde formularios usando tu perfil."""
import json

from rumbo import config, ia
from rumbo.util import json_de

REGLAS_ESTILO = """- Usa SOLO hechos del perfil. Nunca inventes experiencia, clientes, cifras, títulos ni idiomas.
- Respeta las indicaciones de marca o confidencialidad que aparezcan en el perfil.
- Español neutro, trato de usted hacia la empresa. Sin voseo. Sin guion largo. Sin frases de relleno."""

SISTEMA_EVALUAR = f"""Eres el asistente de postulaciones del dueño del perfil. Evalúas si una oportunidad le
sirve según lo que busca y redactas su postulación.
{REGLAS_ESTILO}
- Evalúa el fit (0 a 100) contra la sección "Qué busco" del perfil: área, modalidad (remoto, híbrido,
  presencial), jornada, horario, ubicación y prioridades. Si choca con algo excluyente (idioma, horario,
  ubicación o tipo de trabajo que no busca), fit menor a 35. Si la oferta no dice algo, no la castigues,
  pero dilo en el motivo.
- Si el tipo es "oferta", "manual" o "solo_ver": la postulación tiene 110 a 170 palabras, es directa,
  muestra que se leyó la oferta, conecta 1 o 2 experiencias reales del perfil, dice cómo abordaría el
  trabajo y menciona su disponibilidad con naturalidad. Si es un proyecto, propone hitos.
- Si el tipo es "agencia" es un correo en frío a una empresa. Escríbelo como lo escribiría una persona a
  mano, para esa empresa en particular, no como un correo de marketing:
  * 60 a 110 palabras. Párrafos cortos. Sin listas, sin negritas, sin emojis, sin signos de exclamación.
  * Asunto de 3 a 6 palabras, natural y específico, en minúsculas salvo nombres propios. Nada de
    "Propuesta para...", "Oportunidad" ni "Colaboración".
  * Primera línea: "Hola," o "Hola, equipo de <empresa>:". Luego una observación concreta y verdadera de
    la empresa (algo que se ve en su sitio o redes). No abras con "Les escribo para", "Espero que estén
    bien", "Estimados" ni "Me llamó la atención".
  * Una sola frase de quién es, siguiendo la sección "Cómo presentarme" del perfil si existe.
  * Una idea concreta de lo que haría por ellos, en el lenguaje de quien lee: simple y sin tecnicismos
    para negocios pequeños; puede ser más técnico con empresas técnicas.
  * No nombres proyectos propios como si fueran conocidos: descríbelos si aportan.
  * Cierra con una pregunta fácil de responder (por ejemplo "¿les sirve que conversemos 15 minutos?") y en
    otra línea: "Si no es el momento, me dicen y no insisto."
  * Prohibido: "llave en mano", "potenciar", "soluciones", "sinergia", "transformación digital",
    "escalable", "de punta a punta", "nos especializamos". No pongas precios.
- Firma con "Saludos," y debajo el nombre del perfil; si el perfil o los datos traen LinkedIn, agrégalo.
Responde SOLO un JSON válido."""

SISTEMA_FORMULARIO = f"""Completas formularios de postulación en nombre del dueño del perfil.
{REGLAS_ESTILO}
- Responde cada campo con el dato real del perfil o de los datos personales.
- Si una pregunta pide algo que no está en el perfil, responde con la opción más honesta y neutral; si
  no hay forma honesta de responder, devuelve null para ese campo.
- En listas de opciones, elige exactamente una de las opciones entregadas.
Responde SOLO un JSON válido."""


def evaluar(oferta):
    """Devuelve dict con fit, motivo, asunto, propuesta, hitos, precio."""
    datos = config.datos_personales()
    prompt = f"""PERFIL:
{config.perfil()}

DATOS PARA FIRMAR: {datos.get("nombre", "")} {datos.get("apellido", "")} · {datos.get("linkedin", "")}

OPORTUNIDAD ({oferta['fuente']}, {oferta['modalidad'] or 'modalidad no indicada'}, {oferta['presupuesto'] or 'sin monto'}):
Tipo: {oferta['tipo']}
Título: {oferta['titulo']}
Empresa: {oferta['empresa'] or 'no indicada'}
Descripción: {(oferta['descripcion'] or '')[:4500]}

Devuelve: {{"fit": 0-100, "motivo": "una frase", "asunto": "asunto o título de la propuesta",
"propuesta": "texto listo para enviar, con saludo y firma", "hitos": ["..."], "precio": "estimación breve si es proyecto o vacío"}}"""
    r = json_de(ia.preguntar(prompt, SISTEMA_EVALUAR))
    r["fit"] = int(r.get("fit", 0))
    return r


def responder_formulario(oferta, campos):
    """campos: [{"id": "...", "etiqueta": "...", "tipo": "text|textarea|select|radio|checkbox", "opciones": [...]}]
    Devuelve {id: valor}."""
    prompt = f"""PERFIL:
{config.perfil()}

DATOS PERSONALES:
{json.dumps(config.datos_personales(), ensure_ascii=False)}

OFERTA: {oferta['titulo']} en {oferta['empresa'] or oferta['fuente']}
CARTA YA REDACTADA (úsala si hay un campo de carta de presentación o mensaje):
{oferta['propuesta'] or ''}

CAMPOS DEL FORMULARIO:
{json.dumps(campos, ensure_ascii=False)}

Devuelve un JSON {{"id_del_campo": "valor"}} con todos los campos."""
    return json_de(ia.preguntar(prompt, SISTEMA_FORMULARIO))
