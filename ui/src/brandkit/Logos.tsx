import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { motion } from 'motion/react'

/**
 * Conceptos de logo de Rumbo. Todo SVG hecho a mano, con colores planos de la paleta
 * (tinta, acento, fondo) y sin degradados. Cada logo tiene una animación de entrada con
 * motion que solo corre con `anim`; sin `anim` se dibuja estático y completo.
 *
 * `fondo` siempre es el color real que queda detrás del logo (las perforaciones de la
 * estampilla, por ejemplo, se pintan de ese color).
 */
export type ColoresLogo = { tinta: string; acento: string; fondo: string }
export type PropsLogo = { c: ColoresLogo; tamano?: number; anim?: boolean }
export type LogoDef = {
  id: string
  nombre: string
  idea: string
  /** Pieza principal (símbolo o wordmark). `tamano` es el alto. */
  C: (p: PropsLogo) => ReactElement
  /** Versión cuadrada para ícono de app, favicon y lockup. */
  Icono: (p: PropsLogo) => ReactElement
  /** Ancho / alto de C (1 en símbolos, mayor en wordmarks). */
  proporcion: number
}

const EASE = [0.22, 1, 0.36, 1] as const

/** Origen de transformación en coordenadas del viewBox (no del bbox de la pieza). */
const origen = (x: number, y: number): CSSProperties => ({ transformBox: 'view-box', transformOrigin: `${x}px ${y}px` })

/** Trazo que se dibuja. */
const dibujo = (anim: boolean | undefined, delay = 0, duration = 1) =>
  anim
    ? {
        initial: { pathLength: 0, opacity: 0 },
        animate: { pathLength: 1, opacity: 1 },
        transition: { pathLength: { duration, delay, ease: EASE }, opacity: { duration: 0.01, delay } },
      }
    : {}

/** Pieza que aparece con resorte desde su centro (o el origen que se le dé). */
const aparece = (anim: boolean | undefined, delay = 0.6, stiffness = 320, damping = 17) =>
  anim ? { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { type: 'spring' as const, stiffness, damping, delay } } : {}

type Desde = { x?: number; y?: number; scale?: number; scaleX?: number; rotate?: number }
/** Pieza que llega desde una posición, escala o giro, con resorte. */
const desde = (anim: boolean | undefined, from: Desde, delay = 0, stiffness = 220, damping = 18) => {
  if (!anim) return {}
  const target: Desde = {}
  for (const k of Object.keys(from) as (keyof Desde)[]) target[k] = k === 'scale' || k === 'scaleX' ? 1 : 0
  return { initial: { ...from, opacity: 0 }, animate: { ...target, opacity: 1 }, transition: { type: 'spring' as const, stiffness, damping, delay } }
}

const pts = (p: [number, number][]) => p.map(([x, y]) => `${+x.toFixed(2)},${+y.toFixed(2)}`).join(' ')
/** Gira puntos (grados, horario en pantalla) y los traslada. */
const rotar = (p: [number, number][], grados: number, tx: number, ty: number): [number, number][] => {
  const a = (grados * Math.PI) / 180
  return p.map(([x, y]) => [tx + x * Math.cos(a) - y * Math.sin(a), ty + x * Math.sin(a) + y * Math.cos(a)])
}

function Lienzo({ tamano, vb = '0 0 64 64', proporcion = 1, children }: { tamano: number; vb?: string; proporcion?: number; children: ReactNode }) {
  return (
    <svg width={tamano * proporcion} height={tamano} viewBox={vb} role="img" aria-label="Rumbo" style={{ display: 'block', overflow: 'visible' }}>
      {children}
    </svg>
  )
}

/* ───────────────────────── Wordmarks ───────────────────────── */

/** Letras "rumb" monolínea, construidas a mano sobre una línea base en y=50 y altura x de 24. */
const LETRAS = {
  r: 'M4 50 V26 M4 38 C4 30 10 26 19 26',
  u: 'M33 26 V40 A10 10 0 0 0 53 40 V26 M53 40 V50',
  m: 'M68 50 V26 M68 35 A9 9 0 0 1 86 35 V50 M86 35 A9 9 0 0 1 104 35 V50',
}
const WM_VB = '-3 0 194 56'
const WM_PROP = 194 / 56
const trazo = (color: string) => ({ fill: 'none', stroke: color, strokeWidth: 8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const })

function Rum({ c, anim }: { c: ColoresLogo; anim?: boolean }) {
  return (
    <>
      <motion.path d={LETRAS.r} {...trazo(c.tinta)} {...dibujo(anim, 0, 0.7)} />
      <motion.path d={LETRAS.u} {...trazo(c.tinta)} {...dibujo(anim, 0.12, 0.8)} />
      <motion.path d={LETRAS.m} {...trazo(c.tinta)} {...dibujo(anim, 0.24, 0.9)} />
    </>
  )
}

/** 1 · Aguja: wordmark con la "o" como brújula; la aguja se sale del anillo hacia el noreste. */
export function LogoAguja({ c, tamano = 64, anim }: PropsLogo) {
  return (
    <Lienzo tamano={tamano} vb={WM_VB} proporcion={WM_PROP}>
      <Rum c={c} anim={anim} />
      <motion.path d="M119 6 V50" {...trazo(c.tinta)} {...dibujo(anim, 0.36, 0.7)} />
      <motion.circle cx="131" cy="38" r="12" {...trazo(c.tinta)} {...dibujo(anim, 0.42, 0.8)} />
      <motion.circle cx="170" cy="38" r="12" {...trazo(c.tinta)} {...dibujo(anim, 0.52, 0.8)} />
      <motion.g style={origen(170, 38)} {...desde(anim, { rotate: -250, scale: 0.4 }, 0.85, 90, 11)}>
        <polygon points="161.51,46.49 173.18,41.18 166.82,34.82" fill={c.tinta} />
        <polygon points="186.97,21.03 173.18,41.18 166.82,34.82" fill={c.acento} />
        <circle cx="170" cy="38" r="2" fill={c.fondo} />
      </motion.g>
    </Lienzo>
  )
}

export function IconoAguja({ c, tamano = 64, anim }: PropsLogo) {
  return (
    <Lienzo tamano={tamano}>
      <motion.circle cx="31.5" cy="32.5" r="17" fill="none" stroke={c.tinta} strokeWidth="9" {...dibujo(anim, 0, 0.9)} />
      <motion.g style={origen(31.5, 32.5)} {...desde(anim, { rotate: -250, scale: 0.4 }, 0.35, 90, 11)}>
        <polygon points="23,41 35.04,36.04 27.96,28.96" fill={c.tinta} />
        <polygon points="54.1,9.9 35.04,36.04 27.96,28.96" fill={c.acento} />
        <circle cx="31.5" cy="32.5" r="2.3" fill={c.fondo} />
      </motion.g>
    </Lienzo>
  )
}

/** 2 · Ascenso: wordmark donde el asta de la "b" sube en color y termina en flecha. */
export function LogoAscenso({ c, tamano = 64, anim }: PropsLogo) {
  return (
    <Lienzo tamano={tamano} vb={WM_VB} proporcion={WM_PROP}>
      <Rum c={c} anim={anim} />
      <motion.path d="M119 50 V26" {...trazo(c.tinta)} {...dibujo(anim, 0.36, 0.5)} />
      <motion.circle cx="131" cy="38" r="12" {...trazo(c.tinta)} {...dibujo(anim, 0.42, 0.8)} />
      <motion.circle cx="170" cy="38" r="12" {...trazo(c.tinta)} {...dibujo(anim, 0.52, 0.8)} />
      <motion.path d="M119 26 V8" {...trazo(c.acento)} {...dibujo(anim, 0.8, 0.45)} />
      <motion.path d="M110.5 15 L119 6.5 L127.5 15" {...trazo(c.acento)} style={origen(119, 6.5)} {...desde(anim, { y: 14, scale: 0.3 }, 1.1, 380, 14)} />
    </Lienzo>
  )
}

export function IconoAscenso({ c, tamano = 64, anim }: PropsLogo) {
  return (
    <Lienzo tamano={tamano}>
      <motion.path d="M23 56 V30" {...trazo(c.tinta)} {...dibujo(anim, 0, 0.5)} />
      <motion.circle cx="36" cy="43" r="13" {...trazo(c.tinta)} {...dibujo(anim, 0.15, 0.8)} />
      <motion.path d="M23 30 V12" {...trazo(c.acento)} {...dibujo(anim, 0.55, 0.45)} />
      <motion.path d="M14 21 L23 11 L32 21" {...trazo(c.acento)} style={origen(23, 11)} {...desde(anim, { y: 14, scale: 0.3 }, 0.85, 380, 14)} />
    </Lienzo>
  )
}

/* ───────────────────────── Monogramas ───────────────────────── */

/** 3 · Píxel: una "r" armada en una cuadrícula de 5 × 5, con la casilla de destino marcada. */
const PX = (i: number) => 2 + i * 12.4
const PIXEL_R = new Set(['0,1', '0,2', '0,3', '0,4', '1,2', '2,1', '3,1'])
export function LogoPixel({ c, tamano = 64, anim }: PropsLogo) {
  const celdas = []
  for (let fila = 0; fila < 5; fila++)
    for (let col = 0; col < 5; col++) {
      const k = `${col},${fila}`
      const x = PX(col), y = PX(fila)
      const orden = col + (4 - fila)
      if (k === '4,0')
        celdas.push(<motion.rect key={k} x={x} y={y} width="10.4" height="10.4" rx="5.2" fill={c.acento} style={origen(x + 5.2, y + 5.2)} {...aparece(anim, 0.75, 420, 11)} />)
      else if (PIXEL_R.has(k))
        celdas.push(<motion.rect key={k} x={x} y={y} width="10.4" height="10.4" rx="2.6" fill={c.tinta} style={origen(x + 5.2, y + 5.2)} {...aparece(anim, orden * 0.06, 380, 16)} />)
    }
  return <Lienzo tamano={tamano}>{celdas}</Lienzo>
}

/** 4 · Trazado: un camino con línea central que dibuja la "r" y llega a un destino. */
export function LogoTrazado({ c, tamano = 64, anim }: PropsLogo) {
  const d = 'M20 56 V36 C20 25 27 19 38 19 H43'
  return (
    <Lienzo tamano={tamano}>
      <motion.path d={d} fill="none" stroke={c.tinta} strokeWidth="15" strokeLinecap="round" {...dibujo(anim, 0, 1)} />
      <motion.path d={d} fill="none" stroke={c.fondo} strokeWidth="2.4" strokeDasharray="4.5 4.5" strokeLinecap="butt"
        {...(anim ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.9, duration: 0.4 } } : {})} />
      <motion.g style={origen(52, 19)} {...aparece(anim, 1, 360, 12)}>
        <circle cx="52" cy="19" r="8.5" fill={c.acento} />
        <circle cx="52" cy="19" r="3" fill={c.fondo} />
      </motion.g>
    </Lienzo>
  )
}

/** 5 · Constelación: estrellas unidas que forman una "r"; la meta, en color. */
export function LogoConstelacion({ c, tamano = 64, anim }: PropsLogo) {
  const nodos: [number, number, number][] = [[16, 54, 5.5], [16, 32, 6], [25, 21, 5.5], [39, 17, 5.5]]
  return (
    <Lienzo tamano={tamano}>
      {[[46, 44], [55, 55]].map(([x, y], i) => (
        <motion.circle key={i} cx={x} cy={y} r="2.3" fill={c.tinta} {...(anim ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 1.1 + i * 0.15 } } : {})} />
      ))}
      <motion.path d="M16 54 L16 32 L25 21 L39 17" fill="none" stroke={c.tinta} strokeWidth="3.6" strokeLinejoin="round" {...dibujo(anim, 0.15, 0.9)} />
      <motion.path d="M39 17 L52 13" fill="none" stroke={c.acento} strokeWidth="3.6" strokeLinecap="round" {...dibujo(anim, 0.9, 0.3)} />
      {nodos.map(([x, y, r], i) => <motion.circle key={i} cx={x} cy={y} r={r} fill={c.tinta} style={origen(x, y)} {...aparece(anim, i * 0.18, 420, 14)} />)}
      <motion.circle cx="53" cy="12.5" r="7.5" fill={c.acento} style={origen(53, 12.5)} {...aparece(anim, 1.05, 380, 9)} />
    </Lienzo>
  )
}

/* ───────────────────────── Símbolos con capas ───────────────────────── */

/** Cometa de rosa de los vientos: punta, mitad derecha y figura completa. */
function cometa(cx: number, cy: number, grados: number, largo: number, ancho: number) {
  const a = (grados * Math.PI) / 180
  const u: [number, number] = [Math.sin(a), -Math.cos(a)]
  const v: [number, number] = [Math.cos(a), Math.sin(a)]
  const punta: [number, number] = [cx + largo * u[0], cy + largo * u[1]]
  const der: [number, number] = [cx + ancho * v[0], cy + ancho * v[1]]
  const izq: [number, number] = [cx - ancho * v[0], cy - ancho * v[1]]
  return { completa: pts([punta, der, [cx, cy], izq]), mitad: pts([punta, der, [cx, cy]]) }
}

/** 6 · Rosa: rosa de los vientos en capas, con el rumbo noreste más largo. */
export function LogoRosa({ c, tamano = 64, anim }: PropsLogo) {
  const diag = [45, 135, 225, 315].map(g => ({ g, k: cometa(32, 32, g, g === 45 ? 27 : 17, 4.6) }))
  const princ = [0, 90, 180, 270].map(g => ({ g, k: cometa(32, 32, g, 28, 6.2) }))
  return (
    <Lienzo tamano={tamano}>
      <motion.circle cx="32" cy="32" r="20.5" fill="none" stroke={c.tinta} strokeWidth="2.4" {...dibujo(anim, 0, 1)} />
      {diag.map(({ g, k }, i) => (
        <motion.polygon key={g} points={k.completa} fill={c.acento} style={origen(32, 32)} {...aparece(anim, 0.25 + i * 0.08, 300, 15)} />
      ))}
      <motion.g style={origen(32, 32)} {...desde(anim, { rotate: -135, scale: 0.2 }, 0.45, 160, 13)}>
        {princ.map(({ g, k }) => (
          <g key={g}>
            <polygon points={k.completa} fill={c.fondo} stroke={c.tinta} strokeWidth="2" strokeLinejoin="round" />
            <polygon points={k.mitad} fill={c.tinta} stroke={c.tinta} strokeWidth="2" strokeLinejoin="round" />
          </g>
        ))}
        <circle cx="32" cy="32" r="3.2" fill={c.fondo} stroke={c.tinta} strokeWidth="2" />
      </motion.g>
    </Lienzo>
  )
}

/** 7 · Bitácora: un rumbo a bordadas, como un velero contra el viento, con puntos de paso. */
const BITACORA_FLECHA = pts(rotar([[0, -10], [8, 7], [0, 3], [-8, 7]], 60.26, 48, 14))
export function LogoBitacora({ c, tamano = 64, anim }: PropsLogo) {
  const paso = (x: number, y: number) => pts([[x, y - 5.5], [x + 5.5, y], [x, y + 5.5], [x - 5.5, y]])
  return (
    <Lienzo tamano={tamano}>
      <motion.path d="M12 56 L42 46 L20 30 L48 14" fill="none" stroke={c.tinta} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" {...dibujo(anim, 0.1, 1.1)} />
      <motion.circle cx="12" cy="56" r="5" fill={c.tinta} style={origen(12, 56)} {...aparece(anim, 0, 400, 15)} />
      <motion.polygon points={paso(42, 46)} fill={c.fondo} stroke={c.tinta} strokeWidth="3" strokeLinejoin="round" style={origen(42, 46)} {...aparece(anim, 0.4, 420, 13)} />
      <motion.polygon points={paso(20, 30)} fill={c.fondo} stroke={c.tinta} strokeWidth="3" strokeLinejoin="round" style={origen(20, 30)} {...aparece(anim, 0.6, 420, 13)} />
      <motion.polygon points={BITACORA_FLECHA} fill={c.acento} stroke={c.acento} strokeWidth="1.5" strokeLinejoin="round" style={origen(48, 14)} {...desde(anim, { scale: 0, rotate: -60 }, 1, 300, 13)} />
    </Lienzo>
  )
}

/** 8 · Envío: un sobre que termina en punta de flecha. */
export function LogoEnvio({ c, tamano = 64, anim }: PropsLogo) {
  return (
    <Lienzo tamano={tamano}>
      <motion.polygon points="38,8 61,32 38,56" fill={c.acento} stroke={c.acento} strokeWidth="2" strokeLinejoin="round" style={origen(38, 32)} {...desde(anim, { scaleX: 0 }, 0.45, 300, 12)} />
      <motion.rect x="3" y="17" width="40" height="30" rx="3.5" fill={c.tinta} {...desde(anim, { x: -18 }, 0, 260, 20)} />
      <motion.path d="M8 22 L21.5 33 L35 22" fill="none" stroke={c.fondo} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" {...dibujo(anim, 0.3, 0.6)} />
    </Lienzo>
  )
}

/** 9 · Avión: avión de papel a dos tonos con una estela de puntos. */
export function LogoAvion({ c, tamano = 64, anim }: PropsLogo) {
  return (
    <Lienzo tamano={tamano}>
      {[[20, 46, 3], [12, 53, 2.4], [6, 59, 1.8]].map(([x, y, r], i) => (
        <motion.circle key={i} cx={x} cy={y} r={r} fill={c.tinta} style={origen(x, y)} {...aparece(anim, 0.55 + i * 0.12, 420, 14)} />
      ))}
      <motion.g style={origen(33, 31)} {...desde(anim, { x: -26, y: 26, scale: 0.5, rotate: -20 }, 0, 170, 15)}>
        <polygon points="58,7 8,28 30,34" fill={c.tinta} stroke={c.tinta} strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="58,7 30,34 36,56" fill={c.acento} stroke={c.acento} strokeWidth="1.5" strokeLinejoin="round" />
      </motion.g>
    </Lienzo>
  )
}

/** 10 · Estampilla: sello con bordes perforados y una flecha. */
export function LogoEstampilla({ c, tamano = 64, anim }: PropsLogo) {
  const t = Array.from({ length: 7 }, (_, k) => 6 + (k * 52) / 6)
  return (
    <Lienzo tamano={tamano}>
      <motion.g style={origen(32, 32)} {...desde(anim, { scale: 1.7, rotate: -16 }, 0, 420, 22)}>
        <rect x="6" y="6" width="52" height="52" rx="1.5" fill={c.tinta} />
        {t.flatMap(v => [[v, 6], [v, 58], [6, v], [58, v]]).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.7" fill={c.fondo} />)}
        <rect x="13" y="13" width="38" height="38" rx="1.5" fill={c.acento} />
      </motion.g>
      <motion.path d="M23 41 L40.5 23.5" fill="none" stroke={c.fondo} strokeWidth="5" strokeLinecap="round" {...dibujo(anim, 0.45, 0.5)} />
      <motion.path d="M28 23.5 H40.5 V36" fill="none" stroke={c.fondo} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" {...dibujo(anim, 0.75, 0.45)} />
    </Lienzo>
  )
}

/** 11 · Manzanas: cuadrícula de ciudad y una ruta que dobla por las calles hasta la meta. */
export function LogoManzanas({ c, tamano = 64, anim }: PropsLogo) {
  const pos = [4, 25, 46]
  const bloques = []
  for (let f = 0; f < 3; f++)
    for (let col = 0; col < 3; col++) {
      const meta = f === 0 && col === 2
      const x = pos[col], y = pos[f]
      bloques.push(
        <motion.rect key={`${f}${col}`} x={x} y={y} width="14" height="14" rx="3.5" fill={meta ? c.acento : c.tinta} style={origen(x + 7, y + 7)}
          {...aparece(anim, meta ? 1.15 : (col + 2 - f) * 0.07, meta ? 380 : 360, meta ? 10 : 17)} />,
      )
    }
  return (
    <Lienzo tamano={tamano}>
      {bloques}
      <motion.path d="M21.5 59 V42.5 H42.5 V11" fill="none" stroke={c.acento} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" {...dibujo(anim, 0.45, 0.9)} />
    </Lienzo>
  )
}

/** 12 · Veleta: gira, oscila y se asienta apuntando hacia adelante. */
export function LogoVeleta({ c, tamano = 64, anim }: PropsLogo) {
  return (
    <Lienzo tamano={tamano}>
      <motion.path d="M32 28 V55" fill="none" stroke={c.tinta} strokeWidth="4" strokeLinecap="round" {...dibujo(anim, 0, 0.5)} />
      <motion.rect x="20" y="54" width="24" height="6" rx="3" fill={c.tinta} style={origen(32, 57)} {...desde(anim, { scaleX: 0 }, 0, 300, 20)} />
      <motion.g style={origen(32, 26)} {...desde(anim, { scaleX: -1 }, 0.4, 110, 7)}>
        <path d="M14 26 H48" fill="none" stroke={c.tinta} strokeWidth="4" strokeLinecap="round" />
        <polygon points="3,17 15,17 21,26 15,35 3,35 9,26" fill={c.tinta} stroke={c.tinta} strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="61,26 45,15.5 45,36.5" fill={c.acento} stroke={c.acento} strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="32" cy="26" r="4" fill={c.fondo} stroke={c.tinta} strokeWidth="3" />
      </motion.g>
    </Lienzo>
  )
}

/* ───────────────────────── Primera ronda (formas simples) ───────────────────────── */

/** Norte: un anillo y una sola marca de norte, como el bisel de una brújula. */
export function LogoNorte({ c, tamano = 64, anim }: PropsLogo) {
  return (
    <Lienzo tamano={tamano}>
      <motion.circle cx="32" cy="34" r="22" fill="none" stroke={c.tinta} strokeWidth="7" {...dibujo(anim, 0, 1.1)} />
      <motion.path d="M32 3 L41 19 L23 19 Z" fill={c.acento} style={origen(32, 12)} {...aparece(anim, 0.7, 300, 16)} />
    </Lienzo>
  )
}

/** Ruta: una "r" de un solo trazo que termina en flecha hacia arriba y a la derecha. */
export function LogoRuta({ c, tamano = 64, anim }: PropsLogo) {
  return (
    <Lienzo tamano={tamano}>
      <motion.path d="M18 54 V26 M18 38 C18 26 26 20 37 20 H47" fill="none" stroke={c.tinta} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" {...dibujo(anim, 0, 1.1)} />
      <motion.path d="M40 11 L50 20 L40 29" fill="none" stroke={c.acento} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" {...dibujo(anim, 0.8, 1.1)} />
    </Lienzo>
  )
}

/** Hito: un pin de mapa que adentro tiene la aguja del norte (lugar + dirección). */
export function LogoHito({ c, tamano = 64, anim }: PropsLogo) {
  return (
    <Lienzo tamano={tamano}>
      <motion.path d="M32 60 C32 60 11 39 11 25 A21 21 0 1 1 53 25 C53 39 32 60 32 60 Z" fill={c.tinta}
        style={origen(32, 60)} {...(anim ? { initial: { scaleY: 0 }, animate: { scaleY: 1 }, transition: { type: 'spring' as const, stiffness: 260, damping: 18 } } : {})} />
      <motion.path d="M32 11 L40 33 L32 28.5 L24 33 Z" fill={c.acento} style={origen(32, 24)}
        {...(anim ? { initial: { rotate: 160, opacity: 0 }, animate: { rotate: 0, opacity: 1 }, transition: { duration: 1.2, delay: 0.4, ease: EASE } } : {})} />
    </Lienzo>
  )
}

/** Camino: un punto de partida, un camino que se curva y la meta. */
export function LogoCamino({ c, tamano = 64, anim }: PropsLogo) {
  return (
    <Lienzo tamano={tamano}>
      <motion.path d="M14 50 C14 30 50 36 50 15" fill="none" stroke={c.tinta} strokeWidth="6" strokeLinecap="round" {...dibujo(anim, 0.2, 1.1)} />
      <motion.circle cx="14" cy="50" r="7" fill={c.acento} style={origen(14, 50)} {...aparece(anim, 0)} />
      <motion.circle cx="50" cy="13" r="7.5" fill={c.fondo} stroke={c.tinta} strokeWidth="5" style={origen(50, 13)} {...aparece(anim, 1.1)} />
    </Lienzo>
  )
}

/** Cuadrante: un círculo partido en cuatro, con el cuadrante noreste marcado. */
export function LogoCuadrante({ c, tamano = 64, anim }: PropsLogo) {
  return (
    <Lienzo tamano={tamano}>
      <motion.circle cx="32" cy="32" r="27" fill={c.tinta} style={origen(32, 32)} {...aparece(anim, 0)} />
      <motion.path d="M32 32 V5 A27 27 0 0 1 59 32 Z" fill={c.acento} style={origen(32, 32)}
        {...(anim ? { initial: { rotate: -270, opacity: 0 }, animate: { rotate: 0, opacity: 1 }, transition: { duration: 1.3, delay: 0.3, ease: EASE } } : {})} />
      <circle cx="32" cy="32" r="5" fill={c.fondo} />
    </Lienzo>
  )
}

const simbolo = (id: string, nombre: string, idea: string, C: LogoDef['C']): LogoDef => ({ id, nombre, idea, C, Icono: C, proporcion: 1 })

export const LOGOS: LogoDef[] = [
  { id: 'aguja', nombre: 'Aguja', idea: 'Wordmark "rumbo" dibujado a mano, con la "o" como brújula: la aguja apunta al noreste y se sale del anillo.', C: LogoAguja, Icono: IconoAguja, proporcion: WM_PROP },
  { id: 'ascenso', nombre: 'Ascenso', idea: 'Wordmark "rumbo" donde el asta de la "b" sube en color y termina en flecha: la palabra misma avanza.', C: LogoAscenso, Icono: IconoAscenso, proporcion: WM_PROP },
  simbolo('pixel', 'Píxel', 'Una "r" armada con módulos de una cuadrícula de 5 × 5, con la casilla de destino arriba a la derecha.', LogoPixel),
  simbolo('trazado', 'Trazado', 'Un camino con línea central que dibuja la "r" y desemboca en un punto de destino.', LogoTrazado),
  simbolo('constelacion', 'Constelación', 'Estrellas unidas que forman una "r", como orientarse de noche, con la meta marcada en color.', LogoConstelacion),
  simbolo('rosa', 'Rosa', 'Rosa de los vientos en capas: puntas a dos tonos y el rumbo noreste más largo que el resto.', LogoRosa),
  simbolo('bitacora', 'Bitácora', 'Un rumbo a bordadas, como un velero contra el viento: tramos, puntos de paso y una flecha final.', LogoBitacora),
  simbolo('envio', 'Envío', 'Un sobre que termina en punta de flecha: tu postulación sale sola hacia adelante.', LogoEnvio),
  simbolo('avion', 'Avión', 'Un avión de papel a dos tonos con una estela de puntos: lo envías y sigue su curso.', LogoAvion),
  simbolo('estampilla', 'Estampilla', 'Un sello con bordes perforados y una flecha: cada envío sale con tu marca.', LogoEstampilla),
  simbolo('manzanas', 'Manzanas', 'Cuadrícula de manzanas de ciudad y una ruta que dobla por las calles hasta la meta.', LogoManzanas),
  simbolo('veleta', 'Veleta', 'Una veleta que gira, oscila y se asienta: Rumbo lee hacia dónde sopla el mercado y apunta.', LogoVeleta),
]

export const PRIMERA_RONDA: LogoDef[] = [
  simbolo('norte', 'Norte', 'Un anillo y una sola marca: el norte de una brújula, reducido a lo mínimo.', LogoNorte),
  simbolo('ruta', 'Ruta', 'La "r" de rumbo hecha con un trazo que avanza y termina en flecha.', LogoRuta),
  simbolo('hito', 'Hito', 'Un pin de mapa con la aguja del norte adentro: dónde estás y hacia dónde vas.', LogoHito),
  simbolo('camino', 'Camino', 'Partida, camino y meta. La búsqueda de trabajo como un recorrido con destino.', LogoCamino),
  simbolo('cuadrante', 'Cuadrante', 'Un círculo partido en cuatro con un cuadrante marcado: elegir una dirección.', LogoCuadrante),
]

export const TODOS_LOS_LOGOS: LogoDef[] = [...LOGOS, ...PRIMERA_RONDA]
