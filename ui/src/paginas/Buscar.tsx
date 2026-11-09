import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react'
import { Check, ChevronDown, Plus, Search, Sparkles, X } from 'lucide-react'
import { enviar, hace, leer, type Catalogo } from '../api'
import type { Ctx } from '../App'
import { Anillo, Desplegable, EASE, EnSitio, Fichas, RESORTE, useAviso } from '../comunes'
import type { Corrida, FaseId, FuenteVivo, Item } from '../vivo'
import BlurText from '../rb/BlurText'
import RotatingText from '../rb/RotatingText'
import StatusMark from '../rb/StatusMark'
import Magnet from '../rb/Magnet'
import { SlideConfirm } from '../bencho/SlideConfirm'
import '../bencho/SlideConfirm.css'
import Logo from '../Logo'
import { BusquedaRapida, Tablero, useResumen } from './BuscarResumen'

const FRASE: Record<string, string> = {
  practica: 'mi práctica', primer: 'mi primer trabajo', estudio: 'un trabajo para mientras estudio',
  secundario: 'un ingreso extra', freelance: 'proyectos freelance', cambio: 'un trabajo nuevo', volver: 'volver a trabajar',
}
const MODOS: Record<string, string> = { remoto: 'remoto', hibrido: 'híbrido', presencial: 'presencial' }

// ---------------------------------------------------------------- número que rueda al cambiar
function Numero({ valor }: { valor: number }) {
  const mv = useMotionValue(valor)
  const txt = useTransform(mv, v => Math.round(v).toLocaleString('es-CL'))
  useEffect(() => { const a = animate(mv, valor, { duration: 0.6, ease: EASE }); return () => a.stop() }, [valor, mv])
  return <motion.span>{txt}</motion.span>
}

// ---------------------------------------------------------------- la frase que arma la búsqueda
type Eleccion = { situacion: string; rubro: string; cargos: string[]; modalidades: string[]; region: string }

function Constructor({ estado, recargar }: Pick<Ctx, 'estado' | 'recargar'>) {
  const aviso = useAviso()
  const b = estado.config.busqueda
  const [cat, setCat] = useState<Catalogo | null>(null)
  const [e, setE] = useState<Eleccion>({ situacion: b.situacion || '', rubro: b.rubro || '', cargos: b.cargos?.length ? b.cargos : b.consultas.slice(0, 4), modalidades: b.modalidades, region: b.region || '' })
  const [abierto, setAbierto] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState('')
  useEffect(() => { leer<Catalogo>('/api/catalogo').then(setCat) }, [])

  const guardar = async (x: Eleccion) => {
    setE(x)
    const r = await enviar('/api/busqueda', x)
    aviso(r.error || 'Búsqueda actualizada', !!r.error, r.error ? undefined : 'La próxima búsqueda usa esto.')
    recargar()
  }
  const rubro = cat?.rubros.find(r => r.id === e.rubro)
  const sugeridos = Array.from(new Set([...(rubro?.cargos || []), ...e.cargos]))
  const cerrar = () => setAbierto(null)
  const Hueco = ({ id, texto, vacio }: { id: string; texto: string; vacio: string }) => (
    <span className="hueco-env">
      <motion.button type="button" className={'hueco' + (texto ? '' : ' vacio') + (abierto === id ? ' abierto' : '')}
        onClick={() => setAbierto(abierto === id ? null : id)} whileTap={{ scale: 0.96 }} layout>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={texto} initial={{ y: 14, opacity: 0, filter: 'blur(4px)' }} animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ y: -14, opacity: 0, filter: 'blur(4px)' }} transition={{ duration: 0.28, ease: EASE }}>{texto || vacio}</motion.span>
        </AnimatePresence>
        <ChevronDown size={18} strokeWidth={2.4} />
      </motion.button>
    </span>
  )

  const cargosTxt = e.cargos.length ? (e.cargos.length > 2 ? `${e.cargos.slice(0, 2).join(', ')} y ${e.cargos.length - 2} más` : e.cargos.join(' o ')) : ''
  const modoTxt = e.modalidades.length === 3 || !e.modalidades.length ? 'en cualquier modalidad' : e.modalidades.map(m => MODOS[m]).join(' o ')

  return (
    <div className="frase">
      <span>Busco</span>
      <span className="hueco-env">
        <Hueco id="sit" texto={FRASE[e.situacion] || ''} vacio="algo" />
        <Desplegable abierto={abierto === 'sit'} cerrar={cerrar} ancho={420}>
          <p className="desp-titulo">¿En qué momento estás?</p>
          <Fichas opciones={(cat?.situaciones || []).map(s => ({ id: s.id, nombre: s.nombre, detalle: s.detalle }))} valor={[e.situacion]}
            cambiar={([v]) => { cerrar(); guardar({ ...e, situacion: v }) }} />
        </Desplegable>
      </span>
      <span>de</span>
      <span className="hueco-env">
        <Hueco id="rub" texto={rubro?.nombre.toLowerCase() || ''} vacio="tu rubro" />
        <Desplegable abierto={abierto === 'rub'} cerrar={cerrar} ancho={460}>
          <p className="desp-titulo">¿En qué rubro?</p>
          <Fichas opciones={(cat?.rubros || []).map(r => ({ id: r.id, nombre: r.nombre }))} valor={[e.rubro]}
            cambiar={([v]) => { cerrar(); const r = cat?.rubros.find(x => x.id === v); guardar({ ...e, rubro: v, cargos: r?.cargos.slice(0, 3) || e.cargos }) }} />
        </Desplegable>
      </span>
      <span>como</span>
      <span className="hueco-env">
        <Hueco id="car" texto={cargosTxt} vacio="elige cargos" />
        <Desplegable abierto={abierto === 'car'} cerrar={cerrar} ancho={480}>
          <p className="desp-titulo">Cargos que te interesan <small>elige varios</small></p>
          <Fichas multiple opciones={sugeridos.map(c => ({ id: c, nombre: c }))} valor={e.cargos} cambiar={v => setE({ ...e, cargos: v })} />
          <form className="agregar" onSubmit={ev => { ev.preventDefault(); if (nuevo.trim()) { setE({ ...e, cargos: [...e.cargos, nuevo.trim()] }); setNuevo('') } }}>
            <input placeholder="Otro cargo, como lo escribirías en un portal" value={nuevo} onChange={x => setNuevo(x.target.value)} />
            <button className="btn chico" type="submit"><Plus size={15} /> Agregar</button>
          </form>
          <div className="desp-pie"><button className="btn primario chico" onClick={() => { cerrar(); guardar(e) }}>Listo</button></div>
        </Desplegable>
      </span>
      <span className="hueco-env">
        <Hueco id="mod" texto={modoTxt} vacio="modalidad" />
        <Desplegable abierto={abierto === 'mod'} cerrar={cerrar} ancho={380}>
          <p className="desp-titulo">¿Cómo quieres trabajar?</p>
          <Fichas multiple opciones={(cat?.modalidades || []).map(m => ({ id: m.id, nombre: m.nombre }))} valor={e.modalidades} cambiar={v => setE({ ...e, modalidades: v })} />
          {e.modalidades.some(m => m !== 'remoto') && <>
            <p className="desp-titulo" style={{ marginTop: 14 }}>¿Dónde?</p>
            <Fichas opciones={(cat?.regiones || []).map(r => ({ id: r, nombre: r }))} valor={[e.region || 'Todo Chile']} cambiar={([v]) => setE({ ...e, region: v })} />
          </>}
          <div className="desp-pie"><button className="btn primario chico" onClick={() => { cerrar(); guardar(e) }}>Listo</button></div>
        </Desplegable>
      </span>
    </div>
  )
}

// ---------------------------------------------------------------- radar con los portales alrededor
const corto = (n: string) => n.replace('Bolsa Nacional de Empleo', 'BNE').replace('Prospección por correo', 'Empresas').replace('Empleos Públicos', 'Públicos').replace('Trabajando.com', 'Trabajando')

function hashPos(id: string, radio: number) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const ang = ((h % 360) * Math.PI) / 180
  const r = 28 + ((h >> 9) % 1000) / 1000 * (radio - 40)
  return { x: Math.cos(ang) * r, y: Math.sin(ang) * r }
}

function Radar({ fuentes, items, activa }: { fuentes: FuenteVivo[]; items: Item[]; activa: boolean }) {
  const T = 380, C = T / 2, R = 150
  const blips = items.filter(i => i.guardada).slice(0, 14)
  return (
    <div className="radar" style={{ width: T, height: T }}>
      {activa && (
        <motion.div className="radar-giro" animate={{ rotate: 360 }} transition={{ duration: 3.4, ease: 'linear', repeat: Infinity }}>
          <svg width={T} height={T}>
            <path d={`M${C} ${C} L${C + R} ${C} A${R} ${R} 0 0 0 ${C + R * Math.cos(-0.7)} ${C + R * Math.sin(-0.7)} Z`} className="radar-barrido" />
            <line x1={C} y1={C} x2={C + R} y2={C} className="radar-linea" />
          </svg>
        </motion.div>
      )}
      <svg width={T} height={T} className="radar-svg">
        {[54, 102, R].map(r => <circle key={r} cx={C} cy={C} r={r} className="radar-anillo" />)}
        <line x1={C - R} y1={C} x2={C + R} y2={C} className="radar-eje" />
        <line x1={C} y1={C - R} x2={C} y2={C + R} className="radar-eje" />
        <AnimatePresence>
          {blips.map(b => {
            const p = hashPos(b.id, R)
            return (
              <motion.circle key={b.id} cx={C + p.x} cy={C + p.y} className={'radar-blip' + (b.lista ? ' lista' : '')}
                initial={{ r: 0, opacity: 0 }} animate={{ r: [0, 11, b.fit != null && b.fit >= 60 ? 6 : 4.5], opacity: 1 }} exit={{ opacity: 0, r: 0 }}
                transition={{ duration: 0.6, ease: EASE }} />
            )
          })}
        </AnimatePresence>
      </svg>
      {fuentes.map((f, i) => {
        const ang = (i / Math.max(1, fuentes.length)) * Math.PI * 2 - Math.PI / 2
        const x = C + Math.cos(ang) * (R + 4), y = C + Math.sin(ang) * (R + 4)
        return (
          <motion.div key={f.clave} className={'nodo ' + f.estado} style={{ left: x, top: y }}
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.05, ...RESORTE }} title={f.error || f.sitio}>
            <span className="nodo-punto">
              {f.estado === 'buscando' && <motion.i className="nodo-pulso" animate={{ scale: [1, 2.1], opacity: [0.55, 0] }} transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }} />}
              {f.estado === 'lista' ? (f.nuevas > 0 ? f.nuevas : <Check size={13} strokeWidth={3} />) : f.estado === 'error' ? '!' : ''}
            </span>
            <span className="nodo-nombre">{corto(f.nombre)}</span>
          </motion.div>
        )
      })}
      <div className="radar-centro">
        <motion.div animate={activa ? { rotate: [0, 8, -6, 0] } : { rotate: 0 }} transition={{ duration: 2.6, repeat: activa ? Infinity : 0 }}>
          <Logo tamano={58} />
        </motion.div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- pasos de la corrida
const FASES: { id: FaseId; nombre: string }[] = [
  { id: 'buscar', nombre: 'Buscar en portales' }, { id: 'evaluar', nombre: 'Leer cada oferta' },
  { id: 'correos', nombre: 'Escribir a empresas' }, { id: 'postular', nombre: 'Postular' },
]

function Fases({ c }: { c: Corrida }) {
  return (
    <div className="fases">
      {FASES.map((f, i) => {
        const hecha = c.fasesHechas.includes(f.id) || (f.id === 'evaluar' && c.fasesHechas.includes('respuestas'))
        const ahora = c.fase === f.id || (f.id === 'evaluar' && c.fase === 'respuestas')
        return (
          <div key={f.id} className={'fase' + (ahora ? ' ahora' : hecha ? ' hecha' : '')}>
            <StatusMark status={ahora ? 'running' : hecha ? 'done' : 'pending'} size={18} color="var(--accion)" doneColor="var(--accion)" />
            <span>{f.nombre}</span>
            {i < FASES.length - 1 && <i className="fase-linea" />}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------- transmisión de hallazgos
function FilaVivo({ it, abrir }: { it: Item; abrir: (id: string) => void }) {
  if (!it.guardada) {
    return (
      <motion.div layout className="vivo-fila descartada" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: EASE }}>
        <X size={13} strokeWidth={2.4} /><span className="t">{it.titulo}</span><small>{it.nota || 'no calza con tus filtros'}</small>
      </motion.div>
    )
  }
  return (
    <motion.div layout onClick={() => abrir(it.id)} className={'vivo-fila clic' + (it.lista ? ' lista' : '') + (it.postulada || it.correo ? ' enviada' : '')}
      initial={{ opacity: 0, y: -18, scale: 0.97, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: EASE }}>
      {it.fit != null ? <Anillo valor={it.fit} tamano={40} /> : <span className="punto-nuevo"><Sparkles size={16} /></span>}
      <div className="vivo-txt">
        <b>{it.titulo}</b>
        <span>{it.empresa && <>{it.empresa} · </>}<EnSitio url={it.url} fuente={it.fuente} /></span>
        {it.motivo && <motion.small initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>{it.motivo}</motion.small>}
      </div>
      <AnimatePresence mode="popLayout">
        {it.postulada ? <motion.span key="p" className="sello ok" initial={{ scale: 0 }} animate={{ scale: 1 }}><Check size={14} /> Postulada</motion.span>
          : it.correo ? <motion.span key="c" className="sello ok" initial={{ scale: 0 }} animate={{ scale: 1 }}><Check size={14} /> Correo enviado</motion.span>
            : it.lista ? <motion.span key="l" className="sello" initial={{ scale: 0 }} animate={{ scale: 1 }}>Calza contigo</motion.span>
              : it.fit != null ? <motion.span key="n" className="sello apagado" initial={{ scale: 0 }} animate={{ scale: 1 }}>No tanto</motion.span> : null}
      </AnimatePresence>
    </motion.div>
  )
}

function Transmision({ c, abrir }: { c: Corrida; abrir: (id: string) => void }) {
  const [verDescartadas, setVer] = useState(true)
  const items = c.items.filter(i => verDescartadas || i.guardada).slice(0, 60)
  return (
    <section className="transmision">
      <div className="contadores">
        <div><b><Numero valor={c.revisadas} /></b><i>revisadas</i></div>
        <div className="fuerte"><b><Numero valor={c.guardadas} /></b><i>para ti</i></div>
        <div><b><Numero valor={c.listas} /></b><i>calzan contigo</i></div>
        <div><b><Numero valor={c.postuladas + c.correos} /></b><i>enviadas</i></div>
      </div>
      <div className="trans-cab">
        <span>{c.activa ? 'En vivo' : 'Lo que encontré'}</span>
        <label className="mini-check"><input type="checkbox" checked={verDescartadas} onChange={e => setVer(e.target.checked)} /> Ver descartadas</label>
      </div>
      <div className="vivo-lista">
        <AnimatePresence initial={false}>{items.map(it => <FilaVivo key={it.id} it={it} abrir={abrir} />)}</AnimatePresence>
        {!items.length && <div className="vacio">{c.activa ? 'Abriendo los portales…' : 'Todavía nada por aquí.'}</div>}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- pantalla
export default function Buscar(ctx: Ctx & { corrida: Corrida; buscar: (consulta?: string) => void }) {
  const { estado, ofertas, corrida: c, buscar, abrir, ir, recargar } = ctx
  const aviso = useAviso()
  const corriendo = estado.motor.corriendo || c.activa
  const listas = estado.resumen.lista || 0
  const nombre = (estado.config.envio.nombre || '').split(' ')[0]
  const recientes = useMemo(() => ofertas.filter(o => o.estado !== 'descartada').sort((a, b) => (b.encontrada || 0) - (a.encontrada || 0)).slice(0, 10), [ofertas])
  const postularTodo = async () => {
    const r = await enviar('/api/postular_todo', {})
    aviso(r.error || r.ok || '', !!r.error, r.error ? undefined : estado.config.envio.revisar_antes_de_enviar ? 'Tienes activado revisar antes de enviar: el navegador te esperará en cada una.' : 'Va a su ritmo para no parecer un robot.')
  }
  const [cerrada, setCerrada] = useState(0)
  const resumen = useResumen(`${c.fin}-${ofertas.length}`)
  const reciente = c.fin != null && Date.now() / 1000 - c.fin < 45 * 60
  const mostrarCorrida = corriendo || (reciente && cerrada !== c.inicio)

  if (!mostrarCorrida) {
    return (
      <div className="buscar-inicio">
        <motion.div className="saludo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
          <h1 className="hola"><BlurText text={nombre ? `Hola, ${nombre}.` : 'Hola.'} animateBy="words" delay={70} direction="bottom" /></h1>
          <p className="sub">Dime qué buscas y yo reviso
            <span className="rota"><RotatingText texts={['Laborum', 'Computrabajo', 'Trabajando', 'Get on Board', 'Chiletrabajos', 'la BNE', 'LinkedIn']}
              rotationInterval={1700} staggerDuration={0.015} staggerFrom="last" /></span>
            por ti.</p>
        </motion.div>
        <Constructor estado={estado} recargar={recargar} />
        <div className="cta-buscar">
          <Magnet padding={60} magnetStrength={4}>
            <motion.button className="btn primario enorme" onClick={() => buscar()} whileTap={{ scale: 0.95 }}><Search size={20} strokeWidth={2.4} /> Buscar ahora</motion.button>
          </Magnet>
          {listas > 0 && <button className="btn enorme sec" onClick={() => ir('postulaciones')}>{listas} esperan tu revisión</button>}
        </div>
        <BusquedaRapida estado={estado} buscar={buscar} />
        <p className="pie-auto">{estado.config.envio.modo_automatico ? `Piloto automático encendido: busco cada ${estado.config.ciclo.horas} h${estado.motor.ultimo ? `, la última vez ${hace(estado.motor.ultimo)}` : ''}.` : `Busco cada ${estado.config.ciclo.horas} h y te dejo todo listo para que decidas.`}</p>

        {resumen && <Tablero r={resumen} estado={estado} abrir={abrir} ir={ir} />}
        {recientes.length > 0 && (
          <section className="recientes">
            <h2>Lo último que encontré</h2>
            <div className="vivo-lista">
              {recientes.map((o, i) => (
                <motion.div key={o.id} className={'vivo-fila clic' + (o.estado === 'lista' ? ' lista' : '') + (o.enviada ? ' enviada' : '')} onClick={() => abrir(o.id)}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05, duration: 0.45, ease: EASE }}>
                  <Anillo valor={o.fit} tamano={40} />
                  <div className="vivo-txt"><b>{o.titulo}</b><span>{o.empresa && <>{o.empresa} · </>}<EnSitio url={o.url} fuente={o.fuente} /> · {hace(o.encontrada)}</span></div>
                  {o.enviada ? <span className="sello ok"><Check size={14} /> Enviada</span> : o.estado === 'lista' ? <span className="sello">Calza contigo</span> : null}
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    )
  }

  return (
    <div className="corrida">
      <div className="corrida-cab">
        <div>
          <h1>{corriendo ? (c.masivo ? 'Postulando a lo que calza' : c.consulta ? `Buscando “${c.consulta}”` : 'Buscando para ti') : 'Listo por ahora'}</h1>
          <p className="sub">{corriendo ? estado.motor.paso || 'Preparando…' : c.resumen || 'Terminé la vuelta.'}</p>
        </div>
        <Fases c={c} />
      </div>
      <div className="corrida-cuerpo">
        <div className="corrida-izq">
          <Radar fuentes={c.fuentes} items={c.items} activa={corriendo} />
          <AnimatePresence>
            {!corriendo && (
              <motion.div className="cierre" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: EASE }}>
                <h2>{c.guardadas ? `Encontré ${c.guardadas} ${c.guardadas === 1 ? 'oferta nueva' : 'ofertas nuevas'}` : 'Nada nuevo esta vez'}</h2>
                <p className="sub">{listas ? `${listas} ${listas === 1 ? 'calza' : 'calzan'} contigo y están listas para enviar.` : 'Vuelvo a mirar en unas horas.'}</p>
                {listas > 0 && <SlideConfirm width={360} label={`Desliza para postular a ${listas}`} doneLabel="En marcha" onConfirm={postularTodo} />}
                <div className="fila-botones">
                  {listas > 0 && <button className="btn" onClick={() => ir('postulaciones')}>Revisarlas una por una</button>}
                  <button className="btn fantasma" onClick={() => buscar()}>Buscar de nuevo</button>
                  <button className="btn fantasma" onClick={() => setCerrada(c.inicio)}>Volver al inicio</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <Transmision c={c} abrir={abrir} />
      </div>
    </div>
  )
}
