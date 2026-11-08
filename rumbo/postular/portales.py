"""Cómo entrar y postular en cada portal. Agregar un portal = agregar una entrada aquí."""

PORTALES = {
    "Computrabajo": {
        "login": "https://candidato.cl.computrabajo.com/",
        "inicio": "https://cl.computrabajo.com/",
        "sesion_ok": ["mis postulaciones", "cerrar sesión", "mi perfil", "mi cv"],
        "boton_postular": ["[data-apply-link]", "text=Postularme", "text=Postular"],
        "exito": ["postulación enviada", "ya aplicaste", "te has postulado", "has aplicado", "postulado"],
    },
    "Chiletrabajos": {
        "login": "https://www.chiletrabajos.cl/chtlogin",
        "inicio": "https://www.chiletrabajos.cl/",
        "sesion_ok": ["mi cuenta", "cerrar sesión", "mis postulaciones", "salir"],
        "boton_postular": ["a.postular", "text=Postular"],
        "exito": ["postulación enviada", "has postulado", "ya postulaste", "postulación exitosa", "gracias por postular"],
    },
    "Get on Board": {
        "login": "https://www.getonbrd.com/webpros/login",
        "inicio": "https://www.getonbrd.com/",
        "sesion_ok": ["mis postulaciones", "cerrar sesión", "mi perfil", "my applications"],
        "boton_postular": ["text=Postular", "text=Aplicar", "text=Apply"],
        "exito": ["postulación enviada", "ya postulaste", "application sent", "postulaste"],
    },
    "Luk": {
        "login": "https://www.takealuk.com/users/sign_in",
        "inicio": "https://www.takealuk.com/",
        "sesion_ok": ["mis postulaciones", "cerrar sesión", "mi perfil"],
        "boton_postular": ["text=Postular", "text=Postularme", "text=Aplicar"],
        "exito": ["postulación enviada", "ya postulaste", "postulaste", "¡listo!"],
    },
    # Experimentales: probados hasta la pantalla de inicio de sesión, no con una cuenta real.
    "Laborum": {
        "login": "https://www.laborum.cl/login",
        "inicio": "https://www.laborum.cl/",
        "sesion_ok": ["mis postulaciones", "cerrar sesión", "mi cv", "mi perfil"],
        "boton_postular": ["text=Postularme", "text=Postulación rápida", "text=Postular"],
        "exito": ["postulación enviada", "ya te postulaste", "te postulaste", "postulación exitosa"],
    },
    "Trabajando.com": {
        "login": "https://www.trabajando.cl/login",
        "inicio": "https://www.trabajando.cl/",
        "sesion_ok": ["mis postulaciones", "cerrar sesión", "mi cv", "mi perfil"],
        "boton_postular": ["text=Postular", "text=Postularme"],
        "exito": ["postulación enviada", "ya postulaste", "postulación exitosa", "te has postulado"],
    },
    "Firstjob": {
        "login": "https://firstjob.me/usuarios/ingresar",
        "inicio": "https://firstjob.me/",
        "sesion_ok": ["mis postulaciones", "cerrar sesión", "mi perfil"],
        "boton_postular": ["text=Postular", "text=Postularme"],
        "exito": ["postulación enviada", "ya postulaste", "postulaste"],
    },
    # RIESGO ALTO: las condiciones de LinkedIn prohíben la automatización y pueden restringir tu cuenta.
    # Solo se usa si config envio.linkedin_auto es True. El flujo propio está en postular/linkedin.py
    # ("Solicitud sencilla"); boton_postular y exito quedan como referencia para el flujo genérico.
    "LinkedIn": {
        "login": "https://www.linkedin.com/login",
        "inicio": "https://www.linkedin.com/feed/",
        "sesion_ok": ["mi red", "mensajes", "notificaciones", "my network", "messaging", "notifications"],
        # Con sesión, la barra superior enlaza a tu red y a tus mensajes; la página pública nunca.
        "sesion_selector": "#global-nav, nav.global-nav, a[href*='/mynetwork/'], a[href*='/messaging/']",
        "boton_postular": ["#jobs-apply-button-id", "text=Solicitud sencilla", "text=Easy Apply"],
        "exito": ["se envió tu solicitud", "solicitud enviada", "your application was sent", "application sent"],
        "opcion": "linkedin_auto",        # opción de config.envio que debe estar en True para postular aquí
        "pausa_entre": (30, 90),          # segundos de pausa aleatoria después de cada postulación
    },
}

BOTONES_AVANZAR = ["Continuar", "Siguiente", "Guardar y continuar", "Next", "Continue"]
BOTONES_ENVIAR = ["Enviar postulación", "Enviar mi CV", "Postularme", "Postular", "Enviar", "Confirmar",
                  "Finalizar", "Submit", "Apply"]
SEÑALES_LOGIN = ["iniciar sesión", "inicia sesión", "ingresa a tu cuenta", "regístrate", "crear cuenta", "log in"]
