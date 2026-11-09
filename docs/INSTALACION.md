# Instalación

## 1. Requisitos
- **Python 3.10 o superior.** Revisa con `python3 --version` (en Windows, `py --version`).
  - macOS: `brew install python` o desde [python.org](https://www.python.org/downloads/).
  - Windows: instálalo desde [python.org](https://www.python.org/downloads/) y marca "Add Python to PATH".
  - Linux: viene en casi todas las distribuciones (`sudo apt install python3 python3-venv`).
- **Una IA** (elige una; se conecta después en **Ajustes → Inteligencia artificial**, con una lista de modelos
  para elegir y un botón que prueba la conexión):
  - [Claude Code](https://claude.com/claude-code) con tu cuenta: usa tu sesión, sin clave. Lo recomendado.
  - **Gratis:** [OpenCode Zen](https://opencode.ai/auth) u [OpenRouter](https://openrouter.ai/keys) (modelos que dicen
    "gratis"), [Google Gemini](https://aistudio.google.com/apikey) o [Groq](https://console.groq.com/keys) (capa gratis),
    u [Ollama](https://ollama.com/download) para correr un modelo en tu propio PC.
  - **De pago:** API de Anthropic u OpenAI, o cualquier API compatible con OpenAI.

  La clave que pegues se guarda en el llavero del sistema, no en un archivo.

## 2. Instalar

### Opción A: con pipx (recomendada)
```bash
pipx install "rumbo[todo] @ git+https://github.com/vizzeuk/rumbo"
playwright install chromium
```
`rumbo[todo]` trae el postulador automático (Playwright) y la búsqueda en Indeed (JobSpy). Si solo
quieres buscar y redactar, instala `rumbo` a secas.

### Opción B: desde el código
```bash
git clone https://github.com/vizzeuk/rumbo && cd rumbo
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -e ".[todo]"
playwright install chromium
```

## 3. Abrir Rumbo
```bash
rumbo
```
Se abre `http://localhost:8765` en tu navegador. La primera vez verás el asistente de bienvenida.

## 4. Dejarlo corriendo solo
```bash
rumbo autoarranque          # macOS (launchd), Linux (systemd --user) o Windows (Programador de tareas)
rumbo autoarranque --quitar
```
Rumbo busca cada 2 horas en el horario que definas. Si el computador se suspende, la búsqueda espera a
que lo vuelvas a abrir.

## 5. Conectar tu correo (para enviar correos y detectar respuestas)
En **Ajustes → Tu correo** hay una (i) con el paso a paso. En resumen:
1. Activa la verificación en dos pasos de tu cuenta.
2. Crea una **contraseña de aplicación** (Gmail: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords);
   Outlook: [account.microsoft.com/security](https://account.microsoft.com/security)).
3. Pega las 16 letras en **Ajustes → Tu correo**, o en la terminal con `rumbo correo`.

La contraseña se guarda en el llavero del sistema (Llavero de macOS, Administrador de credenciales de
Windows o Secret Service en Linux), nunca en un archivo.

## 6. Iniciar sesión en los portales (para postular solo)
Desde la app: **Ajustes → Portales → Iniciar sesión para postular**. Se abre el portal, entras con tu cuenta y
cierras la ventana; Rumbo te avisa si la sesión quedó lista. También desde la terminal:
```bash
rumbo login Computrabajo
rumbo login Chiletrabajos
rumbo login Laborum
```
Se abre un navegador; inicias sesión una vez y la sesión queda guardada en `~/.rumbo/navegador`.
Portales disponibles: Computrabajo, Chiletrabajos, Get on Board, Luk, Laborum, Trabajando.com y Firstjob.

## Comandos
| Comando | Qué hace |
|---|---|
| `rumbo` | Abre la interfaz (y levanta el servicio si no está corriendo) |
| `rumbo servicio` | Servidor + búsqueda automática (lo usa el arranque automático) |
| `rumbo buscar` | Un ciclo completo ahora |
| `rumbo login <portal>` | Inicia sesión en un portal |
| `rumbo correo` | Conecta tu correo |
| `rumbo autoarranque [--quitar]` | Arranque automático |
| `rumbo importar <ruta.db>` | Importa la base de otra instalación |

## Variables de entorno
| Variable | Para qué |
|---|---|
| `RUMBO_HOME` | Carpeta de datos (por defecto `~/.rumbo`) |
| `RUMBO_PUERTO` | Puerto de la interfaz (por defecto `8765`) |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | Alternativa a pegar la clave en Ajustes (la del llavero tiene prioridad) |

## Problemas frecuentes
- **"No encontré la CLI de Claude":** instala Claude Code e inicia sesión, o cambia de proveedor en Ajustes.
- **El correo no conecta:** necesitas una contraseña de aplicación, no tu contraseña normal.
- **La IA no conecta:** en Ajustes → Inteligencia artificial, "Conectar y probar" te dice qué pasa (clave no
  válida, sin saldo, modelo que no existe, Ollama cerrado).
- **Un portal no postula:** en Buscar, "Necesita tu atención" lo muestra. Si dice "Inicia sesión", entra desde
  Ajustes → Portales o con `rumbo login <portal>`.
- **No aparecen ofertas:** revisa en Ajustes qué escribes en los buscadores y si la modalidad o la región
  son demasiado estrechas.
