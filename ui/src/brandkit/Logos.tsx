import { motion } from 'motion/react'

/** Conceptos de logo. Todos con colores planos (sin degradados) y animación de entrada. */
export type ColoresLogo = { tinta: string; acento: string; fondo: string }
type P = { c: ColoresLogo; tamano?: number; anim?: boolean; clave?: number }

const dibujo = (anim?: boolean, delay = 0) =>
  anim ? { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] as const } } : {}
const aparece = (anim?: boolean, delay = 0.7) =>
  anim ? { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { type: 'spring' as const, stiffness: 300, damping: 16, delay } } : {}

/** 1 · Norte: un anillo y una sola marca de norte, como el bisel de una brújula. */
export function LogoNorte({ c, tamano = 64, anim }: P) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 64 64">
      <motion.circle cx="32" cy="34" r="22" fill="none" stroke={c.tinta} strokeWidth="7" {...dibujo(anim)} />
      <motion.path d="M32 3 L41 19 L23 19 Z" fill={c.acento} style={{ transformOrigin: '32px 12px' }} {...aparece(anim)} />
    </svg>
  )
}

/** 2 · Ruta: una "r" de un solo trazo que termina en flecha hacia arriba y a la derecha. */
export function LogoRuta({ c, tamano = 64, anim }: P) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 64 64">
      <motion.path d="M18 54 V26 M18 38 C18 26 26 20 37 20 H47" fill="none" stroke={c.tinta} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" {...dibujo(anim)} />
      <motion.path d="M40 11 L50 20 L40 29" fill="none" stroke={c.acento} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" {...dibujo(anim, 0.8)} />
    </svg>
  )
}

/** 3 · Hito: un pin de mapa que adentro tiene la aguja del norte (lugar + dirección). */
export function LogoHito({ c, tamano = 64, anim }: P) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 64 64">
      <motion.path d="M32 60 C32 60 11 39 11 25 A21 21 0 1 1 53 25 C53 39 32 60 32 60 Z" fill={c.tinta}
        style={{ transformOrigin: '32px 60px' }} {...(anim ? { initial: { scaleY: 0 }, animate: { scaleY: 1 }, transition: { type: 'spring', stiffness: 260, damping: 18 } } : {})} />
      <motion.path d="M32 11 L40 33 L32 28.5 L24 33 Z" fill={c.acento} style={{ transformOrigin: '32px 24px' }}
        {...(anim ? { initial: { rotate: 160, opacity: 0 }, animate: { rotate: 0, opacity: 1 }, transition: { duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] } } : {})} />
    </svg>
  )
}

/** 4 · Camino: un punto de partida, un camino que se curva y la meta. */
export function LogoCamino({ c, tamano = 64, anim }: P) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 64 64">
      <motion.path d="M14 50 C14 30 50 36 50 15" fill="none" stroke={c.tinta} strokeWidth="6" strokeLinecap="round" {...dibujo(anim, 0.2)} />
      <motion.circle cx="14" cy="50" r="7" fill={c.acento} {...aparece(anim, 0)} />
      <motion.circle cx="50" cy="13" r="7.5" fill={c.fondo} stroke={c.tinta} strokeWidth="5" {...aparece(anim, 1.1)} />
    </svg>
  )
}

/** 5 · Cuadrante: un círculo partido en cuatro, con el cuadrante norte-este marcado (tu rumbo). */
export function LogoCuadrante({ c, tamano = 64, anim }: P) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 64 64">
      <motion.circle cx="32" cy="32" r="27" fill={c.tinta} {...aparece(anim, 0)} />
      <motion.path d="M32 32 V5 A27 27 0 0 1 59 32 Z" fill={c.acento} style={{ transformOrigin: '32px 32px' }}
        {...(anim ? { initial: { rotate: -270, opacity: 0 }, animate: { rotate: 0, opacity: 1 }, transition: { duration: 1.3, delay: 0.3, ease: [0.22, 1, 0.36, 1] } } : {})} />
      <circle cx="32" cy="32" r="5" fill={c.fondo} />
    </svg>
  )
}

export const LOGOS = [
  { id: 'norte', nombre: 'Norte', idea: 'Un anillo y una sola marca: el norte de una brújula, reducido a lo mínimo. Se reconoce incluso muy chico.', C: LogoNorte },
  { id: 'ruta', nombre: 'Ruta', idea: 'La "r" de rumbo hecha con un trazo que avanza y termina en flecha: progreso, ir hacia adelante.', C: LogoRuta },
  { id: 'hito', nombre: 'Hito', idea: 'Un pin de mapa con la aguja del norte adentro: dónde estás y hacia dónde vas.', C: LogoHito },
  { id: 'camino', nombre: 'Camino', idea: 'Partida, camino y meta. La búsqueda de trabajo como un recorrido con destino.', C: LogoCamino },
  { id: 'cuadrante', nombre: 'Cuadrante', idea: 'Un círculo partido en cuatro con un cuadrante marcado: elegir una dirección entre todas.', C: LogoCuadrante },
]
