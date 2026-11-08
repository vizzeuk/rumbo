# Interfaz de Rumbo

React + Vite + TypeScript. Se compila dentro del paquete de Python (`../rumbo/web`).

```bash
npm install
npm run dev     # desarrollo, usa la API de Rumbo en http://127.0.0.1:8765
npm run build   # compila a ../rumbo/web (versionado)
```

- `src/rb/`: componentes de [React Bits](https://reactbits.dev) (MIT + Commons Clause).
- `src/paginas/`: una página por sección. `src/comunes.tsx`: piezas compartidas. `src/estilos.css`: tokens del brand kit.
