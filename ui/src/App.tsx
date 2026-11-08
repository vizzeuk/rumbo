import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Activity01Icon, Building03Icon, Database01Icon, Home01Icon, Settings01Icon, Task01Icon, UserCircleIcon,
} from '@hugeicons/core-free-icons'
import ClickSpark from './rb/ClickSpark'
import StatusMark from './rb/StatusMark'
import Logo from './Logo'
import { enviar, hace, leer, type EstadoGeneral, type Oferta } from './api'
import { Icono, useAviso } from './comunes'
import Inicio from './paginas/Inicio'
import Oportunidades from './paginas/Oportunidades'
import Clientes from './paginas/Clientes'
import Actividad from './paginas/Actividad'
import Fuentes from './paginas/Fuentes'
import Perfil from './paginas/Perfil'
import Ajustes from './paginas/Ajustes'
import Bienvenida from './paginas/Bienvenida'
import Detalle from './paginas/Detalle'

const VISTAS = [
  { id: 'inicio', nombre: 'Inicio', icono: Home01Icon },
  { id: 'oportunidades', nombre: 'Oportunidades', icono: Task01Icon },
  { id: 'clientes', nombre: 'Clientes por correo', icono: Building03Icon },
  { id: 'actividad', nombre: 'Actividad', icono: Activity01Icon },
  { id: 'fuentes', nombre: 'Fuentes', icono: Database01Icon },
  { id: 'perfil', nombre: 'Mi perfil', icono: UserCircleIcon },
  { id: 'ajustes', nombre: 'Ajustes', icono: Settings01Icon },
] as const
type Vista = (typeof VISTAS)[number]['id']

export type Ctx = {
  estado: EstadoGeneral; ofertas: Oferta[]; recargar: () => Promise<void>
  abrir: (id: string) => void; ir: (v: Vista) => void
}

export default function App() {
  const aviso = useAviso()
  const [estado, setEstado] = useState<EstadoGeneral | null>(null)
  const [ofertas, setOfertas] = useState<Oferta[]>([])
  const [vista, setVista] = useState<Vista>((location.hash.slice(1) as Vista) || 'inicio')
  const [sel, setSel] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    const [e, o] = await Promise.all([leer<EstadoGeneral>('/api/estado'), leer<Oferta[]>('/api/ofertas')])
    setEstado(e); setOfertas(o)
  }, [])

  useEffect(() => {
    recargar()
    const t = window.setInterval(recargar, 15000)
    const h = () => setVista((location.hash.slice(1) as Vista) || 'inicio')
    window.addEventListener('hashchange', h)
    return () => { window.clearInterval(t); window.removeEventListener('hashchange', h) }
  }, [recargar])

  const ir = (v: Vista) => { location.hash = v; setVista(v) }
  const buscar = async () => { const r = await enviar('/api/buscar', {}); aviso(r.error || r.ok || ''); window.setTimeout(recargar, 1500) }

  if (!estado) return <div className="bienvenida"><Logo tamano={72} /></div>
  if (estado.bienvenida_pendiente) return <Bienvenida alTerminar={recargar} />

  const ctx: Ctx = { estado, ofertas, recargar, abrir: setSel, ir }
  const m = estado.motor
  const Pagina = { inicio: Inicio, oportunidades: Oportunidades, clientes: Clientes, actividad: Actividad,
    fuentes: Fuentes, perfil: Perfil, ajustes: Ajustes }[vista] ?? Inicio

  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca"><Logo tamano={38} /><b>rumbo</b></div>
        <nav className="nav">
          {VISTAS.map(v => (
            <a key={v.id} className={vista === v.id ? 'on' : ''} onClick={() => ir(v.id)}>
              {vista === v.id && <motion.span layoutId="nav-fondo" className="fondo" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <Icono icono={v.icono} />{v.nombre}
              {v.id === 'oportunidades' && estado.resumen.lista > 0 && <span className="cuenta">{estado.resumen.lista}</span>}
            </a>
          ))}
        </nav>
        <div className="motor">
          <StatusMark status={m.corriendo ? 'running' : 'done'} size={18} color={m.corriendo ? '#8B5E3C' : '#7FAE8A'} />
          <div>
            <b>{m.corriendo ? 'Trabajando' : 'En piloto automático'}</b>
            {m.corriendo ? m.paso || '...' : m.ultimo ? `Última búsqueda ${hace(m.ultimo)}` : `Busca cada ${estado.config.ciclo.horas} h`}
          </div>
        </div>
        <ClickSpark sparkColor={['#E8B98F', '#8B5E3C']} sparkCount={10} sparkRadius={26}>
          <button className="btn primario ancho" onClick={buscar} disabled={m.corriendo}>Buscar ahora</button>
        </ClickSpark>
      </aside>
      <main>
        <AnimatePresence mode="wait">
          <motion.div key={vista} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
            <Pagina {...ctx} />
          </motion.div>
        </AnimatePresence>
      </main>
      <AnimatePresence>
        {sel && <Detalle key={sel} id={sel} {...ctx} cerrar={() => setSel(null)} />}
      </AnimatePresence>
    </div>
  )
}
