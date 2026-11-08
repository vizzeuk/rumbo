# Instalación

## 1. Requisitos
- **Python 3.10 o superior.** Revisa con `python3 --version` (en Windows, `py --version`).
  - macOS: `brew install python` o desde [python.org](https://www.python.org/downloads/).
  - Windows: instálalo desde [python.org](https://www.python.org/downloads/) y marca "Add Python to PATH".
  - Linux: viene en casi todas las distribuciones (`sudo apt install python3 python3-venv`).
- **Una IA** (elige una, se configura después en Ajustes):
  - [Claude Code](https://claude.com/claude-code) con tu cuenta: Rumbo usa tu sesión, sin API key. Es lo recomendado.
  - Una API key de Anthropic u OpenAI (o compatible).
  - [Ollama](https://ollama.com) para correr un modelo gratis en tu PC.

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
1. Activa la verificación en dos pasos de tu cuenta.
2. Crea una **contraseña de aplicación** (Gmail: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
3. Pégala en **Ajustes → Correo**, o en la terminal con `rumbo correo`.

La contraseña se guarda en el llavero del sistema (Llavero de macOS, Administrador de credenciales de
Windows o Secret Service en Linux), nunca en un archivo.

## 6. Iniciar sesión en los portales (para postular solo)
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
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | Si usas una API en vez de Claude Code |

## Problemas frecuentes
- **"No encontré la CLI de Claude":** instala Claude Code e inicia sesión, o cambia de proveedor en Ajustes.
- **El correo no conecta:** necesitas una contraseña de aplicación, no tu contraseña normal.
- **Un portal no postula:** revisa la pestaña Actividad. Si dice "Inicia sesión", corre `rumbo login <portal>`.
- **No aparecen ofertas:** revisa en Ajustes qué escribes en los buscadores y si la modalidad o la región
  son demasiado estrechas.
