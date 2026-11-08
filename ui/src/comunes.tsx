import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import BlurText from './rb/BlurText'
import { ToastStack, type Toast } from './bencho/ToastStack'
import './bencho/ToastStack.css'
import { sitio, type Oferta } from './api'

export const EASE = [0.22, 1, 0.36, 1] as const
export const RESORTE = { type: 'spring', stiffness: 380, damping: 32 } as const

// ---------- avisos (pila de bencho)
const CtxAviso = createContext<(t: string, mal?: boolean, cuerpo?: string) => void>(() => {})
export const useAviso = () => useContext(CtxAviso)

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Toast[]>([])
  const n = useRef(1)
  const quitar = useCallback((id: number) => setLista(l => l.filter(t => t.id !== id)), [])
  const mostrar = useCallback((texto: string, mal?: boolean, cuerpo?: string) => {
    if (!texto) return
    const id = n.current++
    setLista(l => [{ id, kind: (mal ? 'error' : 'success') as Toast['kind'], title: texto, body: cuerpo || (mal ? 'Revisa e intenta de nuevo.' : 'Hecho.') }, ...l].slice(0, 6))
    window.setTimeout(() => quitar(id), 5200)
  }, [quitar])
  return (
    <CtxAviso.Provider value={mostrar}>
      {children}
      <div className="avisos">{lista.length > 0 && <ToastStack toasts={lista} onDismiss={quitar} corner={18} />}</div>
    </CtxAviso.Provider>
  )
}

// ---------- texto
export function Titulo({ texto, sub, grande }: { texto: string; sub?: ReactNode; grande?: boolean }) {
  return (
    <div className={'titulo' + (grande ? ' grande' : '')}>
      <h1><BlurText key={texto} text={texto} animateBy="words" delay={55} direction="bottom" /></h1>
      {sub && <p className="sub">{sub}</p>}
    </div>
  )
}

// ---------- calce como anillo que se llena
export function Anillo({ valor, tamano = 38 }: { valor: number | null | undefined; tamano?: number }) {
  const r = (tamano - 6) / 2
  const largo = 2 * Math.PI * r
  const v = valor ?? 0
  const tono = valor == null ? 'var(--borde)' : v >= 75 ? 'var(--accion)' : v >= 55 ? 'var(--acento)' : 'var(--apagado)'
  return (
    <span className="anillo" style={{ width: tamano, height: tamano }} title={valor == null ? 'Por evaluar' : `Calce ${v} de 100`}>
      <svg width={tamano} height={tamano}>
        <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke="var(--suave)" strokeWidth="4" />
        {valor != null && (
          <motion.circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke={tono} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={largo} initial={{ strokeDashoffset: largo }} animate={{ strokeDashoffset: largo * (1 - v / 100) }}
            transition={{ duration: 1, ease: EASE }} transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`} />
        )}
      </svg>
      <b>{valor == null ? '·' : v}</b>
    </span>
  )
}

// ---------- enlace al sitio donde se encontró
export function EnSitio({ url, fuente }: { url?: string | null; fuente?: string }) {
  const s = sitio(url)
  if (!url) return <span className="ensitio">{fuente}</span>
  return (
    <a className="ensitio" href={url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} title={`Abrir en ${s}`}>
      {fuente && fuente.toLowerCase() !== s.split('.')[0] ? `${fuente} · ` : ''}{s}<ArrowUpRight size={13} strokeWidth={2.2} />
    </a>
  )
}

export function Canal({ o, portales }: { o: Oferta; portales: string[] }) {
  if (o.tipo === 'solo_ver') return <span className="chip">solo para ver</span>
  if (o.email) return <span className="chip">por correo</span>
  if (portales.includes(o.fuente)) return <span className="chip ok">postula solo</span>
  return <span className="chip">tú postulas</span>
}

// ---------- menú flotante para elegir opciones
export function Desplegable({ abierto, cerrar, children, ancho = 360 }: { abierto: boolean; cerrar: () => void; children: ReactNode; ancho?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cerrar() }
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && cerrar()
    window.setTimeout(() => window.addEventListener('pointerdown', fuera), 0)
    window.addEventListener('keydown', tecla)
    return () => { window.removeEventListener('pointerdown', fuera); window.removeEventListener('keydown', tecla) }
  }, [abierto, cerrar])
  return (
    <AnimatePresence>
      {abierto && (
        <motion.div ref={ref} className="desplegable" style={{ width: ancho }}
          initial={{ opacity: 0, y: -6, scale: 0.97, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -4, scale: 0.98, filter: 'blur(4px)' }} transition={{ duration: 0.22, ease: EASE }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Fichas para elegir una o varias opciones, con un leve efecto de resorte al tocarlas. */
export function Fichas<T extends string>({ opciones, valor, cambiar, multiple }: {
  opciones: { id: T; nombre: string; detalle?: string }[]; valor: T[]; cambiar: (v: T[]) => void; multiple?: boolean
}) {
  return (
    <div className="fichas">
      {opciones.map((o, i) => {
        const on = valor.includes(o.id)
        return (
          <motion.button key={o.id} type="button" className={'ficha' + (on ? ' on' : '')} layout
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.025, 0.4), ...RESORTE }}
            whileTap={{ scale: 0.94 }}
            onClick={() => cambiar(multiple ? (on ? valor.filter(x => x !== o.id) : [...valor, o.id]) : [o.id])}>
            {o.nombre}{o.detalle && <small>{o.detalle}</small>}
          </motion.button>
        )
      })}
    </div>
  )
}

export const lista = (t: string) => t.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
