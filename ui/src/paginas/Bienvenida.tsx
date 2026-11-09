import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Eye, Hand, Plane, Plus } from 'lucide-react'
import { enviar, leer, type Catalogo } from '../api'
import { EASE, Fichas, RESORTE, useAviso } from '../comunes'
import { PerfilConIA, SubirCV } from './Perfil'
import BlurText from '../rb/BlurText'
import RotatingText from '../rb/RotatingText'
import DotGrid from '../rb/DotGrid'
import Magnet from '../rb/Magnet'
import Logo, { Palabra } from '../Logo'

type Datos = { nombre: string; apellido: string; email: string; experiencia: string }
const PASOS = ['hola', 'momento', 'rubro', 'cargos', 'como', 'perfil', 'auto', 'listo'] as const
type Paso = (typeof PASOS)[number]

const AUTO = [
  { id: 'buscar', icono: Eye, nombre: 'Solo buscar', texto: 'Busco, leo cada oferta y te muestro las que calzan. Tú haces el resto.' },
  { id: 'preparar', icono: Hand, nombre: 'Dejarlo todo listo', texto: 'Además escribo cada postulación y lleno los formularios. Tú das el último clic.' },
  { id: 'piloto', icono: Plane, nombre: 'Piloto automático', texto: 'Postulo y escribo solo a las que calzan, con topes diarios para cuidar tus cuentas.' },
]

function Pregunta({ titulo, sub }: { titulo: string; sub?: string }) {
  return (
    <div className="ob-pregunta">
      <h1><BlurText key={titulo} text={titulo} animateBy="words" delay={45} direction="bottom" /></h1>
      {sub && <motion.p className="sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>{sub}</motion.p>}
    </div>
  )
}

export default function Bienvenida({ alTerminar }: { alTerminar: () => void }) {
  const aviso = useAviso()
  const [cat, setCat] = useState<Catalogo | null>(null)
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const [sit, setSit] = useState('')
  const [rub, setRub] = useState('')
  const [cargos, setCargos] = useState<string[]>([])
  const [otro, setOtro] = useState('')
  const [modos, setModos] = useState<string[]>(['remoto', 'hibrido'])
  const [region, setRegion] = useState('Región Metropolitana')
  const [via, setVia] = useState<'ia' | 'rapido' | null>(null)
  const [importado, setImportado] = useState(false)
  const [d, setD] = useState<Datos>({ nombre: '', apellido: '', email: '', experiencia: '' })
  const [auto, setAuto] = useState('preparar')
  const [enviando, setEnviando] = useState(false)
  useEffect(() => { leer<Catalogo>('/api/catalogo').then(setCat) }, [])

  const paso: Paso = PASOS[i]
  const ir = (n: number) => { setDir(n > i ? 1 : -1); setI(Math.max(0, Math.min(PASOS.length - 1, n))) }
  const sig = () => ir(i + 1)
  const rubro = cat?.rubros.find(r => r.id === rub)
  const sugeridos = Array.from(new Set([...(rubro?.cargos || []), ...cargos]))

  const terminar = async () => {
    setEnviando(true)
    const r = await enviar('/api/bienvenida', {
      eleccion: { situacion: sit, rubro: rub, cargos, modalidades: modos, region },
      datos: { nombre: d.nombre, apellido: d.apellido, email: d.email },
      experiencia: d.experiencia, usar_ia: false, automatizacion: auto, perfil_importado: importado,
    })
    if (r.error) { setEnviando(false); return aviso(r.error, true) }
    alTerminar()
  }

  const puede = { hola: true, momento: !!sit, rubro: !!rub, cargos: cargos.length > 0, como: modos.length > 0, perfil: importado || (!!d.nombre && via === 'rapido') || via === null, auto: true, listo: true }[paso]

  return (
    <div className="ob">
      <div className="ob-fondo"><DotGrid dotSize={3} gap={26} baseColor="#D6CAB6" activeColor="#7E9F7A" proximity={110} shockRadius={200} shockStrength={4} /></div>
      {i > 0 && (
        <div className="ob-progreso">
          {PASOS.slice(1).map((p, k) => <motion.i key={p} className={k < i ? 'on' : ''} animate={{ scaleX: k < i ? 1 : 0.4 }} transition={RESORTE} />)}
        </div>
      )}
      <div className="ob-escena">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={paso} className="ob-paso" custom={dir}
            initial={{ opacity: 0, x: dir * 60, filter: 'blur(8px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: dir * -60, filter: 'blur(8px)' }} transition={{ duration: 0.4, ease: EASE }}>

            {paso === 'hola' && (
              <div className="ob-hola">
                <Palabra alto={66} />
                <h1 className="ob-grande"><BlurText text="Encontremos tu próximo trabajo" animateBy="words" delay={90} direction="bottom" /></h1>
                <p className="sub ob-rota">Yo reviso
                  <span className="rota"><RotatingText texts={['Laborum', 'Computrabajo', 'Trabajando.com', 'Get on Board', 'Chiletrabajos', 'LinkedIn', 'la BNE']} rotationInterval={1500} staggerDuration={0.015} staggerFrom="last" /></span>
                  por ti, leo cada oferta y postulo a las que calzan.</p>
                <Magnet padding={70} magnetStrength={4}>
                  <motion.button className="btn primario enorme" onClick={sig} whileTap={{ scale: 0.95 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
                    Empezar <ArrowRight size={20} />
                  </motion.button>
                </Magnet>
                <small className="nota">Toma dos minutos. Todo queda en tu computador.</small>
              </div>
            )}

            {paso === 'momento' && <>
              <Pregunta titulo="¿En qué momento estás?" sub="Así sé qué tipo de ofertas buscar." />
              <div className="ob-tarjetas">
                {cat?.situaciones.map((s, k) => (
                  <motion.button key={s.id} className={'ob-tarjeta' + (sit === s.id ? ' on' : '')} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + k * 0.05, ...RESORTE }} whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }}
                    onClick={() => { setSit(s.id); window.setTimeout(sig, 260) }}>
                    <b>{s.nombre}</b><small>{s.detalle}</small>
                    {sit === s.id && <motion.span className="ob-check" layoutId="ob-check"><Check size={14} strokeWidth={3} /></motion.span>}
                  </motion.button>
                ))}
              </div>
            </>}

            {paso === 'rubro' && <>
              <Pregunta titulo="¿De qué rubro?" sub="Si no está el tuyo, elige Otro y lo escribes en el paso siguiente." />
              <Fichas opciones={(cat?.rubros || []).map(r => ({ id: r.id, nombre: r.nombre }))} valor={[rub]}
                cambiar={([v]) => { setRub(v); setCargos(cat?.rubros.find(r => r.id === v)?.cargos.slice(0, 3) || []); window.setTimeout(sig, 260) }} />
            </>}

            {paso === 'cargos' && <>
              <Pregunta titulo="¿Qué cargos te interesan?" sub="Marqué algunos para partir. Elige todos los que quieras." />
              <Fichas multiple opciones={sugeridos.map(c => ({ id: c, nombre: c }))} valor={cargos} cambiar={setCargos} />
              <form className="agregar" onSubmit={e => { e.preventDefault(); if (otro.trim()) { setCargos([...cargos, otro.trim()]); setOtro('') } }}>
                <input placeholder="Escribe otro cargo, como aparecería en un portal" value={otro} onChange={e => setOtro(e.target.value)} />
                <button className="btn" type="submit"><Plus size={16} /> Agregar</button>
              </form>
            </>}

            {paso === 'como' && <>
              <Pregunta titulo="¿Cómo quieres trabajar?" />
              <Fichas multiple opciones={cat?.modalidades || []} valor={modos} cambiar={setModos} />
              <AnimatePresence>{modos.some(m => m !== 'remoto') && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="ob-sub">
                  <p className="sub">¿Dónde?</p>
                  <Fichas opciones={(cat?.regiones || []).map(r => ({ id: r, nombre: r }))} valor={[region]} cambiar={([v]) => setRegion(v)} />
                </motion.div>
              )}</AnimatePresence>
            </>}

            {paso === 'perfil' && <>
              <Pregunta titulo="Ahora, cuéntame de ti" sub="Con esto escribo tus postulaciones. Nunca invento nada que no esté aquí." />
              {!via && (
                <div className="ob-tarjetas dos">
                  <motion.button className="ob-tarjeta grande" whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} onClick={() => setVia('ia')}>
                    <span className="ob-etq">Recomendado</span><b>Con la IA que ya usas</b><small>Copias un mensaje, lo pegas en ChatGPT, Claude o Gemini y me traes la respuesta. Queda más completo.</small>
                  </motion.button>
                  <motion.button className="ob-tarjeta grande" whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} onClick={() => setVia('rapido')}>
                    <b>Rápido, aquí mismo</b><small>Tu nombre, tu correo y tres líneas de tu experiencia. Lo completas después.</small>
                  </motion.button>
                </div>
              )}
              {via === 'ia' && (importado
                ? <motion.div className="ob-ok" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><Check size={22} /> Perfil listo</motion.div>
                : <PerfilConIA alImportar={r => { setImportado(true); if (r.cargos?.length) setCargos(r.cargos) }} />)}
              {via === 'rapido' && (
                <div className="form ob-form">
                  <div className="grid2"><div><label>Nombre</label><input autoFocus value={d.nombre} onChange={e => setD({ ...d, nombre: e.target.value })} /></div>
                    <div><label>Apellido</label><input value={d.apellido} onChange={e => setD({ ...d, apellido: e.target.value })} /></div></div>
                  <label>Correo</label><input type="email" value={d.email} onChange={e => setD({ ...d, email: e.target.value })} />
                  <label>Tu experiencia en pocas líneas</label>
                  <textarea rows={4} placeholder="Dónde has trabajado o estudiado, qué hacías y algo de lo que estés orgulloso." value={d.experiencia} onChange={e => setD({ ...d, experiencia: e.target.value })} />
                </div>
              )}
              {via && <div className="ob-cv"><SubirCV /></div>}
              {via && <button className="btn fantasma" onClick={() => setVia(null)}>Elegir otra forma</button>}
            </>}

            {paso === 'auto' && <>
              <Pregunta titulo="¿Cuánto quieres que haga solo?" sub="Lo cambias cuando quieras en Ajustes." />
              <div className="ob-tarjetas tres">
                {AUTO.map((a, k) => (
                  <motion.button key={a.id} className={'ob-tarjeta grande' + (auto === a.id ? ' on' : '')} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + k * 0.07, ...RESORTE }} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} onClick={() => setAuto(a.id)}>
                    <a.icono size={24} strokeWidth={1.8} /><b>{a.nombre}</b><small>{a.texto}</small>
                    {auto === a.id && <motion.span className="ob-check" layoutId="ob-check-auto"><Check size={14} strokeWidth={3} /></motion.span>}
                  </motion.button>
                ))}
              </div>
            </>}

            {paso === 'listo' && (
              <div className="ob-hola">
                <Logo tamano={92} />
                <h1 className="ob-grande"><BlurText text={d.nombre ? `Todo listo, ${d.nombre}` : 'Todo listo'} animateBy="words" delay={80} direction="bottom" /></h1>
                <p className="sub">Voy a buscar <b>{cargos.slice(0, 3).join(', ')}</b>{cargos.length > 3 ? ` y ${cargos.length - 3} más` : ''}. Mira cómo lo hago.</p>
                <Magnet padding={70} magnetStrength={4}>
                  <motion.button className="btn primario enorme" onClick={terminar} disabled={enviando} whileTap={{ scale: 0.95 }}>
                    {enviando ? 'Partiendo…' : 'Empezar a buscar'} <ArrowRight size={20} />
                  </motion.button>
                </Magnet>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      {i > 0 && paso !== 'listo' && (
        <div className="ob-pie">
          <button className="btn fantasma" onClick={() => ir(i - 1)}><ArrowLeft size={18} /> Atrás</button>
          <motion.button className="btn primario" onClick={sig} disabled={!puede} whileTap={{ scale: 0.95 }}>
            {paso === 'perfil' && !via ? 'Lo hago después' : 'Seguir'} <ArrowRight size={18} />
          </motion.button>
        </div>
      )}
    </div>
  )
}
