# Contribuir a Rumbo

¡Gracias por querer ayudar! Rumbo nació para que buscar trabajo canse menos. Toda ayuda suma: portales
nuevos, arreglos cuando un sitio cambia, traducciones o mejoras de la interfaz.

## Preparar el entorno
```bash
git clone https://github.com/vizzeuk/rumbo && cd rumbo
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[todo]" pytest && playwright install chromium
cd ui && npm install && cd ..
```

Para trabajar con datos de prueba sin tocar los tuyos:
```bash
RUMBO_HOME=/tmp/rumbo-dev RUMBO_PUERTO=8799 rumbo servicio
cd ui && npm run dev        # interfaz con recarga en vivo; usa la API del puerto 8765 (edita vite.config.ts si usas otro)
```

## Antes de abrir un Pull Request
- `pytest` debe pasar.
- Si tocaste la interfaz: `cd ui && npm run build` (el resultado en `rumbo/web` se versiona, para que la
  instalación con pip no necesite Node).
- Nada de datos personales en el código, los tests ni las capturas.
- Textos de la interfaz en español neutro, cercanos y sin jerga.

## Ideas por donde empezar
- Portales de otros países (Perú, Colombia, México, Argentina).
- Mejorar el postulador en portales experimentales (Laborum, Trabajando.com, Firstjob).
- Traducción de la interfaz al inglés y al portugués.
- Más pruebas automáticas para las fuentes.

## Componentes de React Bits
Los componentes de `ui/src/rb` vienen de [React Bits](https://reactbits.dev) bajo MIT + Commons Clause:
se pueden usar y modificar dentro de esta aplicación, pero no vender ni redistribuir por separado.
Mantén el comentario de autoría al inicio de cada archivo.

## Bloques de Bencho
Los archivos de `ui/src/bencho` son bloques **gratuitos** de [Bencho](https://bencho.dev), bajo licencia MIT
(ver `NOTICE`). No agregues bloques Pro de Bencho al repositorio: su licencia no permite publicarlos.
