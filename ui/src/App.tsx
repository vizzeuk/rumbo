import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Compass, Inbox, Settings2, UserRound } from 'lucide-react'
import StatusMark from './rb/StatusMark'
import Logo, { Palabra } from './Logo'
import { enviar, hace, leer, type EstadoGeneral, type Oferta } from './api'
import { EASE, RESORTE, useAviso } from './comunes'
import { useVivo } from './vivo'
import Buscar from './paginas/Buscar'
import Postulaciones from './paginas/Postulaciones'
import Perfil from './paginas/Perfil'
import Ajustes from './paginas/Ajustes'
import Bienvenida from './paginas/Bienvenida'
import Detalle from './paginas/Detalle'

const VISTAS = [
  { id: 'buscar', nombre: 'Buscar', icono: Compass },
  { id: 'postulaciones', nombre: 'Postulaciones', icono: Inbox },
  { id: 'perfil', nombre: 'Perfil', icono: UserRound },
  { id: 'ajustes', nombre: 'Ajustes', icono: Settings2 },
] as const
type Vista = (typeof VISTAS)[number]['id']
const vistaDeHash = (): Vista => (VISTAS.some(v => v.id === location.hash.slice(1)) ? location.hash.slice(1) as Vista : 'buscar')

export type Ctx = {
  estado: EstadoGeneral; ofertas: Oferta[]; recargar: () => Promise<void>
  abrir: (id: string) => void; ir: (v: Vista) => void
}

/** Isla de estado: se estira cuando estoy trabajando y muestra qué hago. */
function Isla({ estado, alClic }: { estado: EstadoGeneral; alClic: () => void }) {
  const m = estado.motor
  const auto = estado.config.envio.modo_automatico
  return (
    <motion.button className={'isla' + (m.corriendo ? ' activa' : '')} layout onClick={alClic} transition={RESORTE}>
      <StatusMark status={m.corriendo ? 'running' : 'done'} size={16} color="var(--acento)" doneColor="var(--exito)" />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={m.corriendo ? m.paso : 'quieto'} initial={{ y: 12, opacity: 0, filter: 'blur(4px)' }} animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: -12, opacity: 0, filter: 'blur(4px)' }} transition={{ duration: 0.3, ease: EASE }}>
          {m.corriendo ? m.paso || 'Trabajando' : auto ? `Piloto automático${m.ultimo ? ` · ${hace(m.ultimo)}` : ''}` : 'En espera'}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}

export default function App() {
  const aviso = useAviso()
  const [estado, setEstado] = useState<EstadoGeneral | null>(null)
  const [ofertas, setOfertas] = useState<Oferta[]>([])
  const [vista, setVista] = useState<Vista>(vistaDeHash)
  const [sel, setSel] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    const [e, o] = await Promise.all([leer<EstadoGeneral>('/api/estado'), leer<Oferta[]>('/api/ofertas')])
    setEstado(e); setOfertas(o)
  }, [])
  const { corrida } = useVivo(recargar, e => {
    if (e.tipo === 'sesion') aviso(e.ok ? `Sesión lista en ${e.portal}` : `No quedó la sesión en ${e.portal}`, !e.ok, e.ok ? 'Ya puedo postular ahí por ti.' : String(e.error || 'Vuelve a intentarlo y cierra la ventana cuando hayas entrado.'))
    if (e.tipo === 'respuesta') aviso('Te respondieron', false, String(e.empresa || e.titulo || ''))
  })

  useEffect(() => {
    recargar()
    const t = window.setInterval(recargar, 20000)
    const h = () => setVista(vistaDeHash())
    window.addEventListener('hashchange', h)
    return () => { window.clearInterval(t); window.removeEventListener('hashchange', h) }
  }, [recargar])

  const ir = (v: Vista) => { location.hash = v; setVista(v) }
  const buscar = async (consulta?: string) => {
    const r = await enviar('/api/buscar', consulta ? { consulta } : {})
    if (r.error) aviso(r.error, true)
    ir('buscar'); window.setTimeout(recargar, 800)
  }

  if (!estado) return <div className="cargando"><Logo tamano={72} /></div>
  if (estado.bienvenida_pendiente) return <Bienvenida alTerminar={async () => { await recargar(); ir('buscar') }} />

  const ctx: Ctx = { estado, ofertas, recargar, abrir: setSel, ir }
  const listas = estado.resumen.lista || 0

  return (
    <div className="app">
      <header className="barra">
        <a className="marca" onClick={() => ir('buscar')} aria-label="Rumbo"><Palabra alto={30} /></a>
        <nav className="pestanas">
          {VISTAS.map(v => (
            <button key={v.id} className={vista === v.id ? 'on' : ''} onClick={() => ir(v.id)}>
              {vista === v.id && <motion.span layoutId="pestana" className="pestana-fondo" transition={RESORTE} />}
              <v.icono size={17} strokeWidth={2.1} /><span>{v.nombre}</span>
              {v.id === 'postulaciones' && listas > 0 && <motion.em key={listas} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={RESORTE}>{listas}</motion.em>}
            </button>
          ))}
        </nav>
        <Isla estado={estado} alClic={() => ir('buscar')} />
      </header>
      <main className={'vista-' + vista}>
        <AnimatePresence mode="wait">
          <motion.div key={vista} initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }} transition={{ duration: 0.3, ease: EASE }}>
            {vista === 'buscar' && <Buscar {...ctx} corrida={corrida} buscar={buscar} />}
            {vista === 'postulaciones' && <Postulaciones {...ctx} />}
            {vista === 'perfil' && <Perfil {...ctx} />}
            {vista === 'ajustes' && <Ajustes {...ctx} />}
          </motion.div>
        </AnimatePresence>
      </main>
      <AnimatePresence>{sel && <Detalle key={sel} id={sel} {...ctx} cerrar={() => setSel(null)} />}</AnimatePresence>
    </div>
  )
}
