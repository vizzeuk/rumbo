import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import { ArrowUpRight, Check, Inbox, Layers, List, Mail, Maximize2, RotateCcw, Send, Trash2, X } from 'lucide-react'
import HoldButton from '../rb/HoldButton'
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

// ---------------------------------------------------------------- vista previa al lado de la lista
function Vista({ o, estado, recargar, abrir }: { o: Oferta } & Pick<Ctx, 'estado' | 'recargar' | 'abrir'>) {
  const aviso = useAviso()
  const accion = async (a: string) => { const r = await enviar('/api/oferta', { id: o.id, accion: a }); aviso(r.error || r.ok || '', !!r.error); recargar() }
  const portal = estado.portales_postulacion.includes(o.fuente) && o.tipo !== 'solo_ver'
  const pendiente = o.estado === 'lista' || o.estado === 'nueva'
  return (
    <motion.aside key={o.id} className="vista" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: EASE }}>
      <div className="vista-cab">
        <Anillo valor={o.fit} tamano={52} />
        <div><h2>{o.titulo}</h2><p>{o.empresa && <>{o.empresa} · </>}<EnSitio url={o.url} fuente={o.fuente} /></p></div>
      </div>
      <div className="chips">{o.modalidad && <span className="chip">{o.modalidad}</span>}{o.ubicacion && <span className="chip">{o.ubicacion}</span>}{o.presupuesto && <span className="chip">{o.presupuesto}</span>}<Canal o={o} portales={estado.portales_postulacion} /></div>
      {o.motivo ? <p className="vista-motivo"><b>{(o.fit ?? 0) >= 60 ? 'Por qué calza: ' : 'Por qué no tanto: '}</b>{o.motivo}</p>
        : <p className="vista-motivo">Todavía no la leo. <button className="btn chico" onClick={() => accion('evaluar')}>Leer y redactar</button></p>}
      {o.error && <p className="aviso mal">{o.error}</p>}
      {o.propuesta && <div className="vista-texto"><small>{o.enviada ? 'Lo que envié' : 'Lo que voy a enviar'}{o.asunto ? `: ${o.asunto}` : ''}</small><p>{o.propuesta}</p></div>}
      <div className="vista-acciones">
        {pendiente && o.propuesta && (o.email ? <button className="btn primario" onClick={() => accion('enviar_correo')}><Send size={15} /> Enviar correo</button>
          : portal ? <button className="btn primario" onClick={() => accion('postular')}><Send size={15} /> Postular en {o.fuente}</button>
            : <a className="btn primario" href={o.url} target="_blank" rel="noreferrer" onClick={() => navigator.clipboard.writeText(o.propuesta)}>Copiar y abrir <ArrowUpRight size={15} /></a>)}
        <button className="btn" onClick={() => abrir(o.id)}><Maximize2 size={15} /> Abrir y editar</button>
        {pendiente && <button className="btn fantasma" onClick={() => accion('descartada')}><Trash2 size={15} /> Descartar</button>}
      </div>
    </motion.aside>
  )
}

const GRUPOS = (t: number) => {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const d = (hoy.getTime() / 1000 - t) / 86400
  return t >= hoy.getTime() / 1000 ? 'Hoy' : d < 1 ? 'Ayer' : d < 7 ? 'Esta semana' : 'Antes'
}

// ---------------------------------------------------------------- pantalla
export default function Postulaciones(ctx: Ctx) {
  const { ofertas, estado, abrir, recargar } = ctx
  const aviso = useAviso()
  const [filtro, setFiltro] = useState<FiltroId>('lista')
  const [modo, setModo] = useState<'mazo' | 'lista'>('lista')
  const [orden, setOrden] = useState<'calce' | 'fecha'>('calce')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const cuenta = useMemo(() => Object.fromEntries(FILTROS.map(f => [f.id, ofertas.filter(f.f).length])), [ofertas])
  const fecha = (o: Oferta) => o.respuesta || o.enviada || o.encontrada || 0
  const filas = ofertas.filter(FILTROS.find(f => f.id === filtro)!.f)
    .filter(o => !q || `${o.titulo} ${o.empresa} ${o.fuente}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => orden === 'calce' ? (b.fit ?? -1) - (a.fit ?? -1) || fecha(b) - fecha(a) : fecha(b) - fecha(a))
    .slice(0, 300)
  const grupos = orden === 'fecha'
    ? filas.reduce<[string, Oferta[]][]>((acc, o) => { const g = GRUPOS(fecha(o)); const u = acc[acc.length - 1]; if (u && u[0] === g) u[1].push(o); else acc.push([g, [o]]); return acc }, [])
    : [['', filas] as [string, Oferta[]]]
  const elegida = filas.find(o => o.id === sel) || filas[0]
  const enviadas = estado.resumen.enviada + estado.resumen.respondio + estado.resumen.entrevista
  const tasa = enviadas ? Math.round(((estado.resumen.respondio + estado.resumen.entrevista) / enviadas) * 100) : 0
  const postularTodo = async () => { const r = await enviar('/api/postular_todo', {}); aviso(r.error || r.ok || '', !!r.error) }

  return (
    <div className="postulaciones">
      <header className="cab">
        <Titulo texto="Tus postulaciones" sub={<>{enviadas} enviadas · {estado.resumen.respondio + estado.resumen.entrevista} respondieron{enviadas ? ` (${tasa}%)` : ''} · {estado.resumen.lista} esperan tu revisión</>} />
        <div className="seg">
          {(['lista', 'mazo'] as const).map(m => (
            <button key={m} className={modo === m ? 'on' : ''} onClick={() => setModo(m)}>
              {modo === m && <motion.span layoutId="seg-modo" className="seg-fondo" transition={RESORTE} />}
              {m === 'lista' ? <><List size={16} /><span>Lista</span></> : <><Layers size={16} /><span>Revisar una por una</span></>}
            </button>
          ))}
        </div>
      </header>

      {modo === 'mazo'
        ? <Mazo {...ctx} ofertas={ofertas.filter(o => o.estado === 'lista')} />
        : <>
          <div className="filtros">
            {FILTROS.map(f => (
              <button key={f.id} className={filtro === f.id ? 'on' : ''} onClick={() => { setFiltro(f.id); setSel(null) }}>
                {filtro === f.id && <motion.span layoutId="filtro-fondo" className="filtro-fondo" transition={RESORTE} />}
                <span>{f.nombre}</span><b>{cuenta[f.id]}</b>
              </button>
            ))}
          </div>
          <div className="barra-lista">
            <input className="buscar-lista" placeholder="Filtrar por cargo, empresa o portal" value={q} onChange={e => setQ(e.target.value)} />
            <div className="seg chico">
              {(['calce', 'fecha'] as const).map(k => (
                <button key={k} className={orden === k ? 'on' : ''} onClick={() => setOrden(k)}>
                  {orden === k && <motion.span layoutId="seg-orden" className="seg-fondo" transition={RESORTE} />}<span>{k === 'calce' ? 'Por calce' : 'Por fecha'}</span>
                </button>
              ))}
            </div>
            {filtro === 'lista' && cuenta.lista > 0 && (
              <HoldButton backgroundColor="#EEE8DC" fillColor="#5B4636" textColor="#3A2E24" fillTextColor="#FFFEFA" glow={false} size="sm" holdTime={1.2}
                doneLabel="En marcha" onHold={postularTodo}>Mantén para enviar las {cuenta.lista}</HoldButton>
            )}
          </div>
          <div className="lista-y-vista">
            <div className="tabla">
              <div className="tabla-cab"><span>Calce</span><span>Cargo y empresa</span><span>Cómo se envía</span><span>Cuándo</span></div>
              {grupos.map(([g, os]) => (
                <div key={g || 'todo'}>
                  {g && <div className="grupo">{g}<small>{os.length}</small></div>}
                  <AnimatePresence initial={false} mode="popLayout">
                    {os.map((o, i) => (
                      <motion.div key={o.id} layout className={'post-fila' + (elegida?.id === o.id ? ' sel' : '')} onClick={() => setSel(o.id)} onDoubleClick={() => abrir(o.id)}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ delay: Math.min(i * 0.015, 0.25), duration: 0.3, ease: EASE }}>
                        <Anillo valor={o.fit} tamano={38} />
                        <div className="vivo-txt">
                          <b>{o.titulo}</b>
                          <span>{o.empresa || 'Empresa sin nombre'} · <EnSitio url={o.url} fuente={o.fuente} /></span>
                        </div>
                        <Canal o={o} portales={estado.portales_postulacion} />
                        <small className="cuando">{o.respuesta ? `respondió ${hace(o.respuesta)}` : o.enviada ? `enviada ${hace(o.enviada)}` : hace(o.encontrada)}</small>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ))}
              {!filas.length && <div className="vacio"><Inbox size={28} /><p>Nada en esta lista todavía.</p></div>}
            </div>
            <AnimatePresence mode="wait">{elegida && <Vista key={elegida.id} o={elegida} estado={estado} recargar={recargar} abrir={abrir} />}</AnimatePresence>
          </div>
        </>}
    </div>
  )
}
