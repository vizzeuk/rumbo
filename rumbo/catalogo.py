"""Opciones rápidas para armar la búsqueda con clics: en qué momento estás, tu rubro y cargos sugeridos.

De aquí salen las consultas que Rumbo escribe en cada portal. Para sumar un rubro o un cargo basta con
agregarlo a estas listas (y abrir un Pull Request si le sirve a más gente).
"""

SITUACIONES = [
    {"id": "practica", "nombre": "Busco mi práctica", "detalle": "Práctica profesional o laboral",
     "prefijos": ["práctica", "practicante"], "jornadas": ["práctica"], "fuentes": ["firstjob"]},
    {"id": "primer", "nombre": "Mi primer trabajo", "detalle": "Recién egresado o sin experiencia",
     "prefijos": ["", "junior", "trainee"], "jornadas": [], "fuentes": ["firstjob"]},
    {"id": "estudio", "nombre": "Trabajar mientras estudio", "detalle": "Part time o turnos que calcen",
     "prefijos": ["", "part time"], "jornadas": ["part time"], "fuentes": ["firstjob"]},
    {"id": "secundario", "nombre": "Un ingreso extra", "detalle": "Algo aparte de mi trabajo actual",
     "prefijos": ["", "part time", "freelance"], "jornadas": ["part time", "por proyecto"], "fuentes": ["freelancer"]},
    {"id": "freelance", "nombre": "Freelance o por proyecto", "detalle": "Trabajo por entregables",
     "prefijos": ["", "freelance"], "jornadas": ["por proyecto"], "fuentes": ["freelancer", "agencias"]},
    {"id": "cambio", "nombre": "Cambiarme de trabajo", "detalle": "Ya trabajo y busco algo mejor",
     "prefijos": [""], "jornadas": ["full time"], "fuentes": []},
    {"id": "volver", "nombre": "Volver a trabajar", "detalle": "Después de una pausa",
     "prefijos": [""], "jornadas": [], "fuentes": []},
]

RUBROS = [
    {"id": "tecnologia", "nombre": "Tecnología", "preset": "tecnologia",
     "cargos": ["desarrollador full stack", "desarrollador frontend", "desarrollador backend", "analista de datos",
                "QA tester", "soporte TI", "diseñador UX UI", "ingeniero de software", "DevOps"]},
    {"id": "diseno", "nombre": "Diseño y creatividad",
     "cargos": ["diseñador gráfico", "diseñador UX UI", "editor de video", "ilustrador", "fotógrafo",
                "motion designer", "diseñador de producto"]},
    {"id": "marketing", "nombre": "Marketing y comunicación",
     "cargos": ["marketing digital", "community manager", "content creator", "periodista", "SEO",
                "publicista", "relacionador público", "analista de marketing"]},
    {"id": "ventas", "nombre": "Ventas y comercial",
     "cargos": ["ejecutivo de ventas", "vendedor", "ejecutivo comercial", "key account manager",
                "promotor", "televenta", "SDR"]},
    {"id": "atencion", "nombre": "Atención al cliente",
     "cargos": ["atención al cliente", "ejecutivo de atención", "recepcionista", "cajero", "call center",
                "customer success"]},
    {"id": "administracion", "nombre": "Administración",
     "cargos": ["asistente administrativo", "secretaria", "analista administrativo", "administrativo",
                "asistente de gerencia", "back office"]},
    {"id": "finanzas", "nombre": "Contabilidad y finanzas",
     "cargos": ["asistente contable", "contador", "analista financiero", "analista contable", "tesorero",
                "auditor", "analista de cobranza"]},
    {"id": "rrhh", "nombre": "Personas y RRHH",
     "cargos": ["asistente de recursos humanos", "analista de remuneraciones", "reclutador",
                "analista de personas", "psicólogo laboral"]},
    {"id": "logistica", "nombre": "Logística y operaciones",
     "cargos": ["bodeguero", "operario de bodega", "analista de logística", "conductor", "despachador",
                "coordinador de operaciones", "jefe de bodega"]},
    {"id": "salud", "nombre": "Salud",
     "cargos": ["técnico en enfermería", "enfermera", "kinesiólogo", "químico farmacéutico",
                "auxiliar de farmacia", "tecnólogo médico", "nutricionista"]},
    {"id": "educacion", "nombre": "Educación",
     "cargos": ["profesor", "educadora de párvulos", "asistente de la educación", "tutor", "profesor particular",
                "psicopedagogo"]},
    {"id": "ingenieria", "nombre": "Ingeniería y construcción",
     "cargos": ["ingeniero civil", "ingeniero industrial", "prevencionista de riesgos", "dibujante proyectista",
                "técnico en construcción", "jefe de obra", "ingeniero en minas"]},
    {"id": "legal", "nombre": "Legal",
     "cargos": ["abogado", "asistente legal", "procurador", "analista legal", "paralegal"]},
    {"id": "gastronomia", "nombre": "Gastronomía y turismo",
     "cargos": ["garzón", "ayudante de cocina", "cocinero", "barista", "recepcionista de hotel", "bartender"]},
    {"id": "retail", "nombre": "Retail y tiendas",
     "cargos": ["vendedor de tienda", "reponedor", "cajero", "jefe de tienda", "visual merchandiser"]},
    {"id": "otro", "nombre": "Otro", "cargos": []},
]

MODALIDADES = [{"id": "remoto", "nombre": "Remoto"}, {"id": "hibrido", "nombre": "Híbrido"},
               {"id": "presencial", "nombre": "Presencial"}]

REGIONES = ["Región Metropolitana", "Valparaíso", "Biobío", "Antofagasta", "Coquimbo", "Maule", "Araucanía",
            "O'Higgins", "Los Lagos", "Todo Chile"]


def _por_id(lista, i):
    return next((x for x in lista if x["id"] == i), None)


def consultas_para(situacion, cargos, maximo=14):
    """Lo que se escribe en los buscadores: cada cargo combinado con el prefijo de tu momento."""
    s = _por_id(SITUACIONES, situacion) or {"prefijos": [""]}
    salida = []
    for prefijo in s["prefijos"]:
        for c in cargos:
            q = f"{prefijo} {c}".strip() if prefijo and prefijo not in c.lower() else c
            if q.lower() not in (x.lower() for x in salida):
                salida.append(q)
    return salida[:maximo]


def busqueda_desde(eleccion):
    """eleccion = {situacion, rubro, cargos[], modalidades[], region, excluir_ingles}
    Devuelve los cambios de config: búsqueda y fuentes sugeridas."""
    s = _por_id(SITUACIONES, eleccion.get("situacion")) or {}
    r = _por_id(RUBROS, eleccion.get("rubro")) or {}
    cargos = [c for c in eleccion.get("cargos") or [] if c.strip()] or r.get("cargos", [])[:3]
    modalidades = eleccion.get("modalidades") or ["remoto", "hibrido", "presencial"]
    region = eleccion.get("region", "")
    busqueda = {
        "preset": r.get("preset", "general"), "area": r.get("nombre", ""),
        "situacion": s.get("id", ""), "rubro": r.get("id", ""), "cargos": cargos,
        "consultas": consultas_para(s.get("id"), cargos),
        "modalidades": modalidades, "solo_remoto": modalidades == ["remoto"],
        "jornadas": list(eleccion.get("jornadas") or s.get("jornadas", [])),
        "region": "" if region == "Todo Chile" else region,
        "excluir_ingles": eleccion.get("excluir_ingles", True),
    }
    fuentes = {f: True for f in s.get("fuentes", [])}
    if r.get("preset") == "tecnologia":
        fuentes["getonbrd"] = True
    return {"busqueda": busqueda, "fuentes": fuentes}


def todo():
    return {"situaciones": SITUACIONES, "rubros": RUBROS, "modalidades": MODALIDADES, "regiones": REGIONES}
