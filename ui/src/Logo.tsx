import { motion } from 'motion/react'

/** La brújula de Rumbo: al aparecer, la aguja gira, duda y se asienta apuntando al norte. */
export default function Logo({ tamano = 40, animado = true }: { tamano?: number; animado?: boolean }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 64 64" role="img" aria-label="Rumbo">
      <circle cx="32" cy="32" r="30" fill="#3B2A20" />
      <motion.circle
        cx="32" cy="32" r="22.5" fill="none" stroke="#E6D5C1" strokeWidth="1.6"
        strokeDasharray="1.2 4.6" strokeLinecap="round"
        initial={animado ? { rotate: -90, opacity: 0 } : false}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: '32px 32px' }}
      />
      <motion.g
        initial={animado ? { rotate: 200 } : false}
        animate={{ rotate: [200, -24, 12, -5, 0] }}
        transition={{ duration: 1.8, times: [0, 0.45, 0.7, 0.86, 1], ease: 'easeOut', delay: 0.15 }}
        style={{ transformOrigin: '32px 32px' }}
      >
        <path d="M32 12.5 L38.2 33 L32 30.2 L25.8 33 Z" fill="#E8B98F" />
        <path d="M32 51.5 L25.8 31 L32 33.8 L38.2 31 Z" fill="none" stroke="#FAF6F0" strokeWidth="1.8" strokeLinejoin="round" />
      </motion.g>
      <circle cx="32" cy="32" r="2.6" fill="#FAF6F0" />
    </svg>
  )
}
