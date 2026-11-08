"""Asistente de bienvenida: convierte las respuestas del primer uso en perfil, datos y búsqueda."""
import json

from rumbo import catalogo, config, ia

SISTEMA = """Ordenas el perfil profesional de una persona para que una IA escriba sus postulaciones.
Usa SOLO lo que la persona escribió. No inventes experiencia, cifras, títulos ni idiomas. Español neutro,
sin voseo, sin guion largo. Devuelve SOLO el texto en markdown, sin explicaciones."""

PRESETS_TECNOLOGIA = ["desarrollador", "programador", "software", "frontend", "backend", "full stack",
                      "devops", "datos", "data", "ingeniero de software", "qa", "ux", "ui"]


def _lista(v):
    if isinstance(v, list):
        return [x.strip() for x in v if str(x).strip()]
    return [x.strip() for x in str(v or "").replace("\n", ",").split(",") if x.strip()]


def perfil_basico(d):
    datos, b = d.get("datos", {}), d.get("busqueda", {})
    nombre = f"{datos.get('nombre', '')} {datos.get('apellido', '')}".strip()
    lineas = [
        f"# Perfil de {nombre or 'mi perfil'}", "",
        "## Quién soy",
        f"- {nombre}, {datos.get('ciudad', '')}, {datos.get('pais', '')}.".replace(" ,", ","),
        f"- {d.get('titular', '')}" if d.get("titular") else "",
        f"- Estudios: {d.get('estudios')}" if d.get("estudios") else "",
        f"- Idiomas: {d.get('idiomas')}" if d.get("idiomas") else "",
        "", "## Experiencia", d.get("experiencia", "").strip() or "- (completa tu experiencia aquí)",
        "", "## Habilidades", "- " + ", ".join(_lista(d.get("habilidades"))) if d.get("habilidades") else "",
        "", "## Qué busco",
        f"- Área o cargo: {b.get('area', '')}",
        f"- Modalidad: {', '.join(b.get('modalidades', [])) or 'cualquiera'}",
        f"- Jornada: {', '.join(b.get('jornadas', [])) or 'cualquiera'}",
        f"- Ubicación: {b.get('region', '') or 'cualquiera'}, {b.get('pais', 'Chile')}",
        f"- Horario o disponibilidad: {datos.get('disponibilidad', '')}" if datos.get("disponibilidad") else "",
        f"- No me interesa: {', '.join(_lista(b.get('excluir')))}" if b.get("excluir") else "",
        f"- Prioridades: {d.get('prioridades')}" if d.get("prioridades") else "",
    ]
    if d.get("ofrezco"):
        lineas += ["", "## Cómo presentarme", f"- Lo que ofrezco a empresas: {d['ofrezco']}"]
    return "\n".join(x for x in lineas if x is not None) + "\n"


def aplicar(d):
    """Guarda datos, búsqueda y perfil. d viene de la interfaz (ver web: Bienvenida)."""
    datos = dict(config.datos_personales(), **{k: v for k, v in d.get("datos", {}).items() if v})
    config.DATOS.write_text(json.dumps(datos, indent=2, ensure_ascii=False), encoding="utf-8")

    fuentes_sugeridas = {}
    if d.get("eleccion"):                 # onboarding por clics: situación + rubro + cargos
        r = catalogo.busqueda_desde(d["eleccion"])
        d.setdefault("busqueda", {}).update(r["busqueda"])
        fuentes_sugeridas = r["fuentes"]
    b = dict(d.get("busqueda", {}))
    b["consultas"] = _lista(b.get("consultas")) or _lista(b.get("area"))
    b["palabras_clave"] = _lista(b.get("palabras_clave"))
    b["excluir"] = _lista(b.get("excluir"))
    b["solo_remoto"] = b.get("modalidades") == ["remoto"]
    if not b.get("preset"):
        texto = f"{b.get('area', '')} {' '.join(b['consultas'])}".lower()
        b["preset"] = "tecnologia" if any(p in texto for p in PRESETS_TECNOLOGIA) else "general"
    cambios = {"busqueda": b, "general": {"onboarding_hecho": True}}
    if fuentes_sugeridas:
        cambios["fuentes"] = fuentes_sugeridas
    modo = d.get("automatizacion")      # buscar | preparar | piloto
    if modo:
        cambios["envio"] = {"modo_automatico": modo == "piloto", "revisar_antes_de_enviar": modo != "piloto"}
    if d.get("ia"):
        cambios["ia"] = d["ia"]
    if datos.get("email"):
        cambios.setdefault("envio", {}).update(
            correo=datos["email"], nombre=f"{datos.get('nombre', '')} {datos.get('apellido', '')}".strip())
    config.guardar(cambios)

    if d.get("perfil_importado"):        # ya lo guardó perfil_prompt.importar
        return {"preset": b["preset"], "consultas": b["consultas"]}
    perfil = perfil_basico(d)
    if d.get("usar_ia") and d.get("experiencia"):
        try:
            perfil = ia.preguntar(
                "Ordena este perfil en las secciones: Quién soy, Experiencia, Habilidades, Qué busco, Cómo "
                "presentarme. Mantén todos los datos de 'Qué busco' tal cual.\n\n" + perfil, SISTEMA, timeout=180)
        except Exception:
            pass
    config.PERFIL.write_text(perfil, encoding="utf-8")
    return {"preset": b["preset"], "consultas": b["consultas"]}
