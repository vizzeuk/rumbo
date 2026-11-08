import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { HugeiconsIcon } from '@hugeicons/react'
import SpotlightCard from './rb/SpotlightCard'
import BlurText from './rb/BlurText'
import CountUp from './rb/CountUp'
import AnimatedContent from './rb/AnimatedContent'
import type { Oferta } from './api'

// ---------- avisos
type Aviso = { texto: string; mal?: boolean } | null
const CtxAviso = createContext<(t: string, mal?: boolean) => void>(() => {})
export const useAviso = () => useContext(CtxAviso)

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso>(null)
  const mostrar = useCallback((texto: string, mal?: boolean) => {
    setAviso({ texto, mal })
    window.setTimeout(() => setAviso(null), 3600)
  }, [])
  return (
    <CtxAviso.Provider value={mostrar}>
      {children}
      <AnimatePresence>
        {aviso && (
          <motion.div className={'toast' + (aviso.mal ? ' mal' : '')} initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 20, x: '-50%' }}>
            {aviso.texto}
          </motion.div>
        )}
      </AnimatePresence>
    </CtxAviso.Provider>
  )
}

// ---------- piezas visuales
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <SpotlightCard className={'panel ' + className} spotlightColor="rgba(232, 185, 143, 0.22)">
      {children}
    </SpotlightCard>
  )
}

export function Titulo({ texto, sub }: { texto: string; sub?: string }) {
  return (
    <div>
      <h1><BlurText key={texto} text={texto} animateBy="words" delay={60} direction="bottom" /></h1>
      {sub && <p className="sub">{sub}</p>}
    </div>
  )
}

export function Kpi({ valor, etiqueta, destacado, sufijo }: { valor: number; etiqueta: string; destacado?: boolean; sufijo?: string }) {
  return (
    <Panel className={'kpi' + (destacado ? ' destacado' : '')}>
      <b><CountUp to={valor} duration={1.2} suffix={sufijo} /></b>
      <span className="kpi-etq">{etiqueta}</span>
    </Panel>
  )
}

export function Entrada({ children, retraso = 0 }: { children: ReactNode; retraso?: number }) {
  return <AnimatedContent distance={24} duration={0.6} delay={retraso} ease="power3.out">{children}</AnimatedContent>
}

export function Icono({ icono, tamano = 18 }: { icono: Parameters<typeof HugeiconsIcon>[0]['icon']; tamano?: number }) {
  return <HugeiconsIcon icon={icono} size={tamano} strokeWidth={1.8} />
}

export const Fit = ({ o }: { o: Pick<Oferta, 'fit'> }) =>
  o.fit == null ? <span className="fit">por evaluar</span>
    : <span className={'fit ' + (o.fit >= 80 ? 'a' : o.fit >= 60 ? 'b' : '')}>fit {o.fit}</span>

export function Canal({ o, portales }: { o: Oferta; portales: string[] }) {
  if (o.tipo === 'solo_ver') return <span className="chip">solo ver</span>
  if (o.email) return <span className="chip">correo</span>
  if (portales.includes(o.fuente)) return <span className="chip ok">postula solo</span>
  return null
}
