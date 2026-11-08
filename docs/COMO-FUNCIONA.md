# Cómo funciona

## El ciclo
Cada N horas (por defecto 2, entre las 8:00 y las 23:00), el servicio corre un ciclo:

```
buscar en las fuentes activas → filtrar sin IA → evaluar con IA → revisar respuestas en el correo
        → (modo automático) enviar correos · postular en portales · recordatorios
```

1. **Buscar:** cada fuente (`rumbo/fuentes/*.py`) traduce lo que buscas a los filtros del portal
   (palabra clave, modalidad, jornada, región) y guarda las ofertas nuevas en SQLite.
2. **Filtrar sin IA** (`rumbo/reglas.py`): descarta engaños (multinivel, inversión inicial), idiomas que
   no hablas y palabras que excluiste; puntúa por tus palabras clave. Así la IA solo ve lo que vale la pena.
3. **Evaluar con IA** (`rumbo/redactor.py`): la IA lee tu perfil y la oferta y devuelve fit, motivo,
   asunto, postulación, hitos y precio sugerido. Las reglas de estilo le prohíben inventar.
4. **Enviar y postular:** correo por SMTP (`rumbo/correo.py`) o navegador con Playwright
   (`rumbo/postular/`), que completa formularios pidiéndole a la IA las respuestas de cada campo.
5. **Respuestas:** por IMAP, busca correos de las empresas a las que escribiste y te avisa.

## Fuentes
| Fuente | Cómo se lee | Postula |
|---|---|---|
| Laborum | API JSON pública | Sí (experimental) |
| Trabajando.com | API JSON pública | Sí (experimental) |
| Bolsa Nacional de Empleo | API JSON pública | No |
| Empleos Públicos | API JSON pública | No |
| Computrabajo | HTML + JSON-LD | Sí |
| Chiletrabajos | HTML | Sí |
| Luk (Buk) | HTML + JSON-LD | Sí |
| Firstjob | HTML | Sí (experimental) |
| Yapo | HTML + JSON-LD | No |
| Get on Board | API pública | Sí |
| Freelancer | API pública | No |
| LinkedIn | Búsqueda pública; con tu sesión si activas Solicitud sencilla | No por defecto. Opcional: Solicitud sencilla (riesgo alto) |
| Indeed | JobSpy (opcional) | Nunca |
| Clientes por correo | La IA busca en la web | Por correo |

**LinkedIn "Solicitud sencilla" (Easy Apply): opcional, apagado por defecto y con riesgo alto.** Si
activas `envio.linkedin_auto` en `~/.rumbo/config.json` e inicias sesión con `rumbo login LinkedIn`
(a mano, Rumbo nunca ve tu contraseña), Rumbo además busca con tu sesión las ofertas filtradas por
Solicitud sencilla (`f_AL=true`), las guarda como ofertas postulables y, en modo automático, postula:
aprieta "Solicitud sencilla", recorre el formulario paso a paso (Siguiente, Revisar, Enviar), sube tu CV
si `datos.json` → `cv` apunta a un PDF, DOC o DOCX de menos de 2 MB y pide a la IA las respuestas. Si la
IA no tiene una respuesta honesta para una pregunta obligatoria, no adivina: descarta el borrador y
deja el error para que postules a mano. Nunca marca "seguir a la empresa". El código está en
`rumbo/postular/linkedin.py`.

## Arquitectura
- **Python** (stdlib + `keyring`; `playwright` y `python-jobspy` opcionales). Servidor HTTP propio en
  `127.0.0.1`, base SQLite, sin servicios externos.
- **Interfaz** en React + Vite (`ui/`), compilada dentro del paquete (`rumbo/web/`), así quien instala
  con pip no necesita Node.
- **IA intercambiable** (`rumbo/ia.py`): Claude Code CLI, Anthropic, compatible con OpenAI u Ollama.

## Uso responsable
- **Términos de los portales:** varios prohíben herramientas automatizadas. El riesgo es la suspensión
  de tu cuenta. Rumbo pone topes diarios, pausas aleatorias y un modo "revisar antes de enviar".
- **LinkedIn tiene el riesgo más alto.** Sus condiciones de uso prohíben expresamente los bots y las
  extensiones que automatizan la actividad, y LinkedIn detecta y restringe cuentas (desde avisos y
  verificaciones hasta el cierre). Por eso la postulación con Solicitud sencilla viene **apagada**
  (`envio.linkedin_auto: false`) y solo la actives si aceptas ese riesgo con tu cuenta. Con ella
  activa, Rumbo respeta `limite_portal_dia` (te recomendamos bajarlo a 3 a 5 para LinkedIn), espera
  entre 30 y 90 segundos al azar entre postulaciones, escribe con pausas, se detiene en todo el ciclo
  si LinkedIn pide verificación, si no hay sesión o si avisa que llegaste a su tope diario, y con
  "revisar antes de enviar" el último clic sigue siendo tuyo. Nada de esto garantiza que tu cuenta no
  sea restringida.
- **Correos en frío:** Rumbo solo usa correos publicados por las propias empresas, escribe uno por uno,
  incluye una línea para no volver a escribir y respeta un tope diario.
- **Honestidad:** la IA solo afirma lo que está en tu perfil. Revisa tus primeras postulaciones.
- **Datos:** todo queda en tu computador.

## Agregar un portal
- **Para encontrar:** crea `rumbo/fuentes/<portal>.py` con `CLAVE`, `NOMBRE`, `DESCRIPCION`, `POSTULA` y
  `buscar(con)`; usa `filtros()` para leer lo que busca el usuario y `guardar()` o `desde_portal()` para
  guardar. Regístralo en `rumbo/fuentes/__init__.py` y agrega su clave en `config.BASE["fuentes"]`.
- **Para postular:** agrega una entrada en `rumbo/postular/portales.py` con la URL de login, señales de
  sesión iniciada, el botón de postular y los textos de éxito. Opcionales: `sesion_selector` (selector
  CSS que solo existe con sesión), `opcion` (opción de `envio` que debe estar en `true` para usarlo) y
  `pausa_entre` (segundos de pausa entre postulaciones).
