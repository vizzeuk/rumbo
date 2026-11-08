import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// La interfaz se compila dentro del paquete de Python (rumbo/web), así quien instala Rumbo con pip
// no necesita Node. En desarrollo, `npm run dev` usa el servidor de Rumbo en el puerto 8765.
export default defineConfig({
  plugins: [react()],
  build: { outDir: '../rumbo/web', emptyOutDir: true, chunkSizeWarningLimit: 900 },
  server: { proxy: { '/api': 'http://127.0.0.1:8765' } },
})
