"""Postulación automática en portales con un navegador real (Playwright).

Cómo funciona:
1. `rumbo login <portal>` abre un navegador con un perfil propio de Rumbo. Inicias sesión una vez y la
   sesión queda guardada en ~/.rumbo/navegador.
2. En cada ciclo, para las ofertas 'listas' con fit sobre el umbral, Rumbo abre la oferta, aprieta
   Postular, completa el formulario con tu perfil (la IA responde las preguntas) y envía.
3. Con "revisar antes de enviar" activo, el navegador queda visible y Rumbo se detiene antes del clic
   final para que confirmes tú.

Ideas de flujo tomadas de chambaflow (MIT). LinkedIn queda fuera salvo que actives envio.linkedin_auto
(opcional, riesgo alto de restricción de cuenta): su flujo propio de "Solicitud sencilla" está en linkedin.py.
"""
from rumbo.postular.portales import PORTALES  # noqa: F401
