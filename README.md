<p align="center"><img src="ui/public/logo.svg" width="84" alt="Rumbo"></p>
<h1 align="center">rumbo</h1>
<p align="center"><b>Tu búsqueda de trabajo en piloto automático.</b><br>
Busca en los portales de empleo de Chile y Latinoamérica, evalúa cada oferta con IA según tu perfil,
redacta tus postulaciones y postula por ti. Para cualquier profesión.</p>

<p align="center">
  <a href="docs/INSTALACION.md">Instalación</a> ·
  <a href="docs/GUIA.md">Guía de uso</a> ·
  <a href="docs/COMO-FUNCIONA.md">Cómo funciona</a> ·
  <a href="CONTRIBUIR.md">Contribuir</a>
</p>

![Inicio de Rumbo](docs/img/inicio.png)

## Qué hace

- **Busca por ti** cada pocas horas en **Laborum, Trabajando.com, Computrabajo, Chiletrabajos, la Bolsa
  Nacional de Empleo, Luk (Buk), Empleos Públicos, Firstjob, Yapo, Get on Board, Freelancer y LinkedIn**
  (opcional: Indeed vía JobSpy).
- **Sirve para cualquier trabajo:** vendedor, contadora, enfermero, diseñadora o desarrollador. Le dices
  qué buscas, en qué modalidad (remoto, híbrido o presencial), qué jornada y en qué región.
- **Filtra lo que no te sirve** antes de gastar IA: ofertas engañosas, idiomas que no hablas o palabras
  que tú excluyes.
- **Evalúa con IA cada oferta contra tu perfil:** le pone un *fit* de 0 a 100, explica por qué y redacta
  una postulación con tu experiencia real. Nunca inventa nada que no esté en tu perfil.
- **Postula solo** en los portales que lo permiten, con un navegador real y tu sesión. Puede dejarte el
  clic final a ti.
- **Consigue clientes por correo** si trabajas por tu cuenta: la IA busca pymes, startups o agencias con
  su correo publicado y les escribe un correo humano, uno por uno.
- **Hace el seguimiento:** recordatorio a los N días y aviso cuando alguien te responde.
- **Todo queda ordenado** en un tablero: Nuevas → Listas → Enviadas → Respondieron → Entrevistas.

LinkedIn, Indeed y Yapo son **solo para encontrar**: Rumbo nunca postula ni escribe ahí.

| | |
|---|---|
| ![Bienvenida](docs/img/bienvenida.png) | ![Tablero](docs/img/oportunidades.png) |
| ![Detalle de una oferta](docs/img/detalle.png) | ![Clientes por correo](docs/img/clientes.png) |

## Instalación rápida

Requiere **Python 3.10 o superior**. Funciona en macOS, Windows y Linux.

```bash
pipx install "rumbo[todo] @ git+https://github.com/vizzeuk/rumbo"   # o: pip install ...
playwright install chromium        # solo para postular en portales
rumbo                               # abre http://localhost:8765
```

La primera vez aparece un asistente de bienvenida: contestas quién eres y qué buscas, y Rumbo empieza
a buscar. Guía completa, incluida la instalación desde el código: [docs/INSTALACION.md](docs/INSTALACION.md).

## La IA: sin API key si tienes Claude Code

Por defecto Rumbo usa la **CLI de Claude Code con tu sesión** (no necesitas API key). También funciona
con la **API de Anthropic**, cualquier **API compatible con OpenAI** (OpenAI, OpenRouter, Groq...) u
**Ollama gratis en tu propio PC**. Se cambia en Ajustes.

## Tus datos son tuyos

Todo vive en tu computador, en `~/.rumbo` (o en la carpeta de la variable `RUMBO_HOME`): la base de
datos, tu perfil, las sesiones del navegador y las capturas de cada postulación. La contraseña del
correo se guarda en el llavero del sistema. Rumbo no tiene servidor propio ni recolecta nada.

## Uso responsable

La postulación automática usa un navegador con **tu** cuenta. Algunos portales prohíben herramientas
automatizadas en sus términos y pueden suspender cuentas. Rumbo trae topes diarios, pausas entre
postulaciones y un modo que deja el clic final para ti. Postular a todo no sirve; postular bien, sí.
Más detalle en [docs/COMO-FUNCIONA.md](docs/COMO-FUNCIONA.md#uso-responsable).

## Créditos

- [React Bits](https://reactbits.dev) (MIT + Commons Clause) para las animaciones de la interfaz.
- [chambaflow](https://github.com/IsrraDex36/chambaflow) (MIT): flujo de postulación en Computrabajo.
- [JobSpy](https://github.com/speedyapply/JobSpy) (MIT): búsqueda opcional en Indeed.

Ver [NOTICE](NOTICE). Código bajo licencia [MIT](LICENSE). Diseño: [docs/BRAND.md](docs/BRAND.md).
