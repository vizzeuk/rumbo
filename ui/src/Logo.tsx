import { motion } from 'motion/react'

/**
 * Marca de Rumbo (brand kit v2, elegida en nov-2026):
 *  - Palabra: el logotipo "rumbo" con el asta de la "b" que termina en una flecha hacia arriba (Ascenso).
 *  - Logo (por defecto): la estampilla, para el ícono de la app, el favicon y los lugares chicos.
 * Colores planos tomados de las variables CSS (paleta Salvia). Sin degradados.
 */
const EASE = [0.22, 1, 0.36, 1] as const
const C = { tinta: 'var(--titulo)', acento: 'var(--acento)', fondo: 'var(--fondo)' }

const trazo = (color: string) => ({ fill: 'none', stroke: color, strokeWidth: 8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const })
const dibujo = (anim: boolean, delay = 0, duration = 0.8) => anim
  ? { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { pathLength: { duration, delay, ease: EASE }, opacity: { duration: 0.01, delay } } }
  : {}

/** Logotipo "rumbo" (Ascenso, ajustado: el asta queda entera y solo la punta va en color). */
export function Palabra({ alto = 28, animado = true, tinta = C.tinta, acento = C.acento }: { alto?: number; animado?: boolean; tinta?: string; acento?: string }) {
  return (
    <svg width={alto * (194 / 58)} height={alto} viewBox="-3 -2 194 58" role="img" aria-label="rumbo" style={{ display: 'block', overflow: 'visible' }}>
      <motion.path d="M4 50 V26 M4 38 C4 30 10 26 19 26" {...trazo(tinta)} {...dibujo(animado, 0, 0.6)} />
      <motion.path d="M33 26 V40 A10 10 0 0 0 53 40 V26 M53 40 V50" {...trazo(tinta)} {...dibujo(animado, 0.1, 0.7)} />
      <motion.path d="M68 50 V26 M68 35 A9 9 0 0 1 86 35 V50 M86 35 A9 9 0 0 1 104 35 V50" {...trazo(tinta)} {...dibujo(animado, 0.2, 0.8)} />
      <motion.path d="M119 50 V15" {...trazo(tinta)} {...dibujo(animado, 0.32, 0.5)} />
      <motion.circle cx="131" cy="38" r="12" {...trazo(tinta)} {...dibujo(animado, 0.4, 0.7)} />
      <motion.circle cx="170" cy="38" r="12" {...trazo(tinta)} {...dibujo(animado, 0.5, 0.7)} />
      <motion.path d="M119 0.5 L129 12.5 H109 Z" fill={acento} stroke={acento} strokeWidth="3.5" strokeLinejoin="round"
        style={{ transformBox: 'view-box', transformOrigin: '119px 12px' }}
        {...(animado ? { initial: { y: 16, scale: 0.2, opacity: 0 }, animate: { y: 0, scale: 1, opacity: 1 }, transition: { type: 'spring', stiffness: 380, damping: 13, delay: 0.85 } } : {})} />
    </svg>
  )
}

/** Estampilla: sello con bordes perforados y una flecha que sale. */
export default function Logo({ tamano = 40, animado = true, fondo = C.fondo }: { tamano?: number; animado?: boolean; fondo?: string }) {
  const t = Array.from({ length: 7 }, (_, k) => 6 + (k * 52) / 6)
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 64 64" role="img" aria-label="Rumbo" style={{ display: 'block', overflow: 'visible' }}>
      <motion.g style={{ transformBox: 'view-box', transformOrigin: '32px 32px' }}
        {...(animado ? { initial: { scale: 1.7, rotate: -16, opacity: 0 }, animate: { scale: 1, rotate: 0, opacity: 1 }, transition: { type: 'spring', stiffness: 420, damping: 22 } } : {})}>
        <rect x="6" y="6" width="52" height="52" rx="1.5" fill={C.tinta} />
        {t.flatMap(v => [[v, 6], [v, 58], [6, v], [58, v]]).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.7" fill={fondo} />)}
        <rect x="13" y="13" width="38" height="38" rx="1.5" fill={C.acento} />
      </motion.g>
      <motion.path d="M23 41 L40.5 23.5" fill="none" stroke={fondo} strokeWidth="5" strokeLinecap="round" {...dibujo(animado, 0.45, 0.5)} />
      <motion.path d="M28 23.5 H40.5 V36" fill="none" stroke={fondo} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" {...dibujo(animado, 0.75, 0.45)} />
    </svg>
  )
}
