import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import { Check, Inbox, Layers, List, Mail, RotateCcw, Send, X } from 'lucide-react'
import { enviar, hace, type Oferta } from '../api'
import type { Ctx } from '../App'
import { Anillo, Canal, EASE, EnSitio, RESORTE, Titulo, useAviso } from '../comunes'

const FILTROS = [
  { id: 'lista', nombre: 'Para enviar', f: (o: Oferta) => o.estado === 'lista' },
  { id: 'nueva', nombre: 'Por leer', f: (o: Oferta) => o.estado === 'nueva' },
  { id: 'enviada', nombre: 'Enviadas', f: (o: Oferta) => o.estado === 'enviada' },
  { id: 'respondio', nombre: 'Respondieron', f: (o: Oferta) => o.estado === 'respondio' || o.estado === 'entrevista' },
  { id: 'correo', nombre: 'Empresas por correo', f: (o: Oferta) => o.tipo === 'agencia' },
  { id: 'descartada', nombre: 'Descartadas', f: (o: Oferta) => o.estado === 'descartada' },
] as const
type FiltroId = (typeof FILTROS)[number]['id']

// ---------------------------------------------------------------- tarjeta que se desliza
function Tarjeta({ o, alDecidir, frente, indice }: { o: Oferta; alDecidir: (si: boolean) => void; frente: boolean; indice: number }) {
  const x = useMotionValue(0)
  const giro = useTransform(x, [-260, 260], [-12, 12])
  const si = useTransform(x, [30, 140], [0, 1])
  const no = useTransform(x, [-140, -30], [1, 0])
  const soltar = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 130 || info.velocity.x > 600) alDecidir(true)
    else if (info.offset.x < -130 || info.velocity.x < -600) alDecidir(false)
  }
  return (
    <motion.div className="tarjeta" style={{ x, rotate: giro, zIndex: 10 - indice }} drag={frente ? 'x' : false} dragSnapToOrigin onDragEnd={soltar}
      initial={{ scale: 0.92, y: 30, opacity: 0 }} animate={{ scale: 1 - indice * 0.04, y: indice * 14, opacity: indice > 2 ? 0 : 1 }}
      exit={{ x: x.get() >= 0 ? 520 : -520, opacity: 0, rotate: x.get() >= 0 ? 18 : -18, transition: { duration: 0.35, ease: EASE } }}
      transition={RESORTE} whileDrag={{ cursor: 'grabbing' }}>
      <motion.span className="tarjeta-sello si" style={{ opacity: si }}>Enviar</motion.span>
      <motion.span className="tarjeta-sello no" style={{ opacity: no }}>Saltar</motion.span>
      <div className="tarjeta-cab">
        <Anillo valor={o.fit} tamano={54} />
        <div><h2>{o.titulo}</h2><p>{o.empresa && <>{o.empresa} · </>}<EnSitio url={o.url} fuente={o.fuente} /></p></div>
      </div>
      {o.motivo && <p className="tarjeta-motivo">{o.motivo}</p>}
      <div className="tarjeta-chips">{o.modalidad && <span className="chip">{o.modalidad}</span>}{o.ubicacion && <span className="chip">{o.ubicacion}</span>}{o.presupuesto && <span className="chip">{o.presupuesto}</span>}</div>
      {o.propuesta && <div className="tarjeta-texto"><small>Lo que voy a enviar{o.asunto ? `: ${o.asunto}` : ''}</small><p>{o.propuesta}</p></div>}
    </motion.div>
  )
}

function Mazo({ ofertas, estado, recargar, abrir }: Pick<Ctx, 'estado' | 'recargar' | 'abrir'> & { ofertas: Oferta[] }) {
  const aviso = useAviso()
  const [hechas, setHechas] = useState<string[]>([])
  const [historial, setHistorial] = useState<string[]>([])
  const pila = ofertas.filter(o => !hechas.includes(o.id))
  const actual = pila[0]
  const decidir = async (si: boolean) => {
    if (!actual) return
    setHechas(h => [...h, actual.id]); setHistorial(h => [actual.id, ...h])
    if (!si) { await enviar('/api/oferta', { id: actual.id, accion: 'descartada' }); return recargar() }
    const accion = actual.email ? 'enviar_correo' : estado.portales_postulacion.includes(actual.fuente) && actual.tipo !== 'solo_ver' ? 'postular' : null
    if (!accion) { window.open(actual.url, '_blank'); await navigator.clipboard.writeText(actual.propuesta || '').catch(() => {}); aviso('Texto copiado', false, `Pégalo en ${actual.fuente}; la dejé abierta.`); return }
    const r = await enviar('/api/oferta', { id: actual.id, accion })
    aviso(r.error || r.ok || '', !!r.error); recargar()
  }
  const deshacer = () => { const [u, ...resto] = historial; if (!u) return; setHistorial(resto); setHechas(h => h.filter(x => x !== u)); enviar('/api/oferta', { id: u, accion: 'lista' }).then(recargar) }
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return; if (e.key === 'ArrowRight') decidir(true); if (e.key === 'ArrowLeft') decidir(false) }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  })

  if (!actual) return (
    <motion.div className="mazo-vacio" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
      <Check size={36} /><h2>Revisaste todo</h2><p className="sub">Cuando encuentre más, aparecen aquí.</p>
    </motion.div>
  )
  return (
    <div className="mazo">
      <div className="mazo-pila">
        <AnimatePresence>{pila.slice(0, 3).map((o, i) => <Tarjeta key={o.id} o={o} indice={i} frente={i === 0} alDecidir={decidir} />)}</AnimatePresence>
      </div>
      <div className="mazo-botones">
        <motion.button className="redondo no" whileTap={{ scale: 0.88 }} onClick={() => decidir(false)} title="Saltar (←)"><X size={26} /></motion.button>
        <motion.button className="redondo chico" whileTap={{ scale: 0.88 }} onClick={deshacer} disabled={!historial.length} title="Deshacer"><RotateCcw size={18} /></motion.button>
        <motion.button className="redondo chico" whileTap={{ scale: 0.88 }} onClick={() => abrir(actual.id)} title="Ver y editar el texto"><Mail size={18} /></motion.button>
        <motion.button className="redondo si" whileTap={{ scale: 0.88 }} onClick={() => decidir(true)} title="Enviar (→)"><Send size={24} /></motion.button>
      </div>
      <p className="nota centro">Arrastra a la derecha para enviar y a la izquierda para saltar. También con las flechas del teclado. Quedan {pila.length}.</p>
    </div>
  )
}

// ---------------------------------------------------------------- pantalla
export default function Postulaciones(ctx: Ctx) {
  const { ofertas, estado, abrir } = ctx
  const [filtro, setFiltro] = useState<FiltroId>('lista')
  const [modo, setModo] = useState<'mazo' | 'lista'>('lista')
  const [q, setQ] = useState('')
  const cuenta = useMemo(() => Object.fromEntries(FILTROS.map(f => [f.id, ofertas.filter(f.f).length])), [ofertas])
  const filas = ofertas.filter(FILTROS.find(f => f.id === filtro)!.f).filter(o => !q || `${o.titulo} ${o.empresa} ${o.fuente}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="postulaciones">
      <header className="cab">
        <Titulo texto="Tus postulaciones" sub="Todo lo que encontré, lo que envié y quién respondió." />
        <div className="seg">
          {(['lista', 'mazo'] as const).map(m => (
            <button key={m} className={modo === m ? 'on' : ''} onClick={() => setModo(m)}>
              {modo === m && <motion.span layoutId="seg-modo" className="seg-fondo" transition={RESORTE} />}
              {m === 'lista' ? <><List size={16} /> Lista</> : <><Layers size={16} /> Revisar una por una</>}
            </button>
          ))}
        </div>
      </header>

      {modo === 'mazo'
        ? <Mazo {...ctx} ofertas={ofertas.filter(o => o.estado === 'lista')} />
        : <>
          <div className="filtros">
            {FILTROS.map(f => (
              <button key={f.id} className={filtro === f.id ? 'on' : ''} onClick={() => setFiltro(f.id)}>
                {filtro === f.id && <motion.span layoutId="filtro-fondo" className="filtro-fondo" transition={RESORTE} />}
                <span>{f.nombre}</span><b>{cuenta[f.id]}</b>
              </button>
            ))}
            <input className="buscar-lista" placeholder="Filtrar por cargo, empresa o portal" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="lista-post">
            <AnimatePresence initial={false} mode="popLayout">
              {filas.slice(0, 200).map((o, i) => (
                <motion.div key={o.id} layout className="post-fila" onClick={() => abrir(o.id)}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.35, ease: EASE }}>
                  <Anillo valor={o.fit} tamano={40} />
                  <div className="vivo-txt">
                    <b>{o.titulo}</b>
                    <span>{o.empresa && <>{o.empresa} · </>}<EnSitio url={o.url} fuente={o.fuente} /></span>
                    {o.error && <small className="mal">{o.error}</small>}
                  </div>
                  <Canal o={o} portales={estado.portales_postulacion} />
                  <small className="cuando">{o.respuesta ? `respondió ${hace(o.respuesta)}` : o.enviada ? `enviada ${hace(o.enviada)}` : hace(o.encontrada)}</small>
                </motion.div>
              ))}
            </AnimatePresence>
            {!filas.length && <div className="vacio"><Inbox size={28} /><p>Nada en esta lista todavía.</p></div>}
          </div>
        </>}
    </div>
  )
}
