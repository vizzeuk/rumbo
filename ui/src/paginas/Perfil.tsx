import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, Check, ClipboardCopy, FileText, Upload } from 'lucide-react'
import { enviar, leer } from '../api'
import type { Ctx } from '../App'
import { EASE, RESORTE, Titulo, useAviso } from '../comunes'

export const CHATS = [
  { nombre: 'ChatGPT', url: 'https://chatgpt.com/' }, { nombre: 'Claude', url: 'https://claude.ai/new' },
  { nombre: 'Gemini', url: 'https://gemini.google.com/app' },
]

/** Los tres pasos para armar el perfil con la IA que la persona ya usa. */
export function PerfilConIA({ alImportar }: { alImportar?: (r: { nombre?: string; cargos?: string[] }) => void }) {
  const aviso = useAviso()
  const [prompt, setPrompt] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)
  useEffect(() => { leer<{ prompt: string }>('/api/perfil/prompt').then(r => setPrompt(r.prompt)) }, [])
  const copiar = async () => { await navigator.clipboard.writeText(prompt); setCopiado(true); window.setTimeout(() => setCopiado(false), 2400) }
  const importar = async () => {
    setCargando(true)
    const r = await enviar('/api/perfil/importar', { texto }) as { ok?: string; error?: string; nombre?: string; cargos?: string[] }
    setCargando(false)
    aviso(r.error || (r.nombre ? `Listo, ${r.nombre}` : 'Perfil listo'), !!r.error, r.error ? undefined : r.cargos?.length ? `Voy a buscar: ${r.cargos.slice(0, 3).join(', ')}` : 'Guardé tu perfil.')
    if (!r.error) { setTexto(''); alImportar?.(r) }
  }
  return (
    <div className="pasos-ia">
      <motion.div className="paso-ia" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, ...RESORTE }}>
        <span className="paso-num">1</span>
        <div><h3>Copia este mensaje</h3><p className="nota">Le pide a tu IA que te entreviste un poco y te devuelva el perfil en el formato que entiendo.</p></div>
        <motion.button className={'btn ' + (copiado ? 'ok' : 'primario')} onClick={copiar} whileTap={{ scale: 0.94 }} layout>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={copiado ? 'si' : 'no'} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="btn-cont">
              {copiado ? <><Check size={16} /> Copiado</> : <><ClipboardCopy size={16} /> Copiar mensaje</>}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </motion.div>
      <motion.div className="paso-ia" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, ...RESORTE }}>
        <span className="paso-num">2</span>
        <div><h3>Pégalo en tu IA y respóndele</h3><p className="nota">Si ya sabe cosas de ti, las usa. Toma un par de minutos.</p></div>
        <div className="chats">{CHATS.map(c => <a key={c.nombre} className="btn chico" href={c.url} target="_blank" rel="noreferrer">{c.nombre} <ArrowUpRight size={14} /></a>)}</div>
      </motion.div>
      <motion.div className="paso-ia col" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19, ...RESORTE }}>
        <div className="paso-ia-fila"><span className="paso-num">3</span><div><h3>Pega aquí lo que te devolvió</h3><p className="nota">Completo, con el bloque de datos y el perfil.</p></div></div>
        <textarea rows={6} placeholder="```json&#10;{ &quot;datos&quot;: { … }, &quot;busqueda&quot;: { … } }&#10;```&#10;# Perfil&#10;## Quién soy…" value={texto} onChange={e => setTexto(e.target.value)} />
        <button className="btn primario" disabled={texto.trim().length < 40 || cargando} onClick={importar}>{cargando ? 'Leyendo…' : 'Usar este perfil'}</button>
      </motion.div>
    </div>
  )
}

/** Zona para soltar el CV. Se guarda en tu carpeta de Rumbo y se adjunta cuando un portal lo pide. */
export function SubirCV({ actual, alSubir }: { actual?: string; alSubir?: (ruta: string) => void }) {
  const aviso = useAviso()
  const [encima, setEncima] = useState(false)
  const [archivo, setArchivo] = useState(actual ? actual.split('/').pop() : '')
  const [progreso, setProgreso] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const subir = async (f?: File) => {
    if (!f) return
    if (f.size > 8e6) return aviso('Ese archivo pesa mucho', true, 'Sube un PDF de menos de 8 MB.')
    setProgreso(0.15)
    const b64 = await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(f) })
    setProgreso(0.6)
    const r = await enviar('/api/cv', { nombre: f.name, b64 }) as { ok?: string; error?: string; cv?: string }
    setProgreso(1)
    window.setTimeout(() => setProgreso(null), 700)
    aviso(r.error || 'CV guardado', !!r.error, r.ok)
    if (!r.error) { setArchivo(f.name); alSubir?.(r.cv || '') }
  }
  return (
    <motion.div className={'dropzone' + (encima ? ' encima' : '') + (archivo ? ' con' : '')} onClick={() => input.current?.click()}
      onDragOver={e => { e.preventDefault(); setEncima(true) }} onDragLeave={() => setEncima(false)}
      onDrop={e => { e.preventDefault(); setEncima(false); subir(e.dataTransfer.files[0]) }}
      animate={{ scale: encima ? 1.02 : 1 }} transition={RESORTE}>
      <input ref={input} type="file" accept=".pdf,.doc,.docx" hidden onChange={e => subir(e.target.files?.[0])} />
      <motion.span className="dz-ico" animate={encima ? { y: [-2, -8, -2] } : { y: 0 }} transition={{ repeat: encima ? Infinity : 0, duration: 0.9 }}>
        {archivo ? <FileText size={22} /> : <Upload size={22} />}
      </motion.span>
      <div>
        <b>{archivo || (encima ? 'Suéltalo aquí' : 'Arrastra tu CV o haz clic')}</b>
        <small>{archivo ? 'Clic para cambiarlo' : 'PDF o Word. Lo adjunto cuando un portal lo pide.'}</small>
      </div>
      {progreso != null && <motion.i className="dz-barra" initial={{ scaleX: 0 }} animate={{ scaleX: progreso }} transition={{ duration: 0.4, ease: EASE }} />}
    </motion.div>
  )
}

const CAMPOS: [string, string][] = [['nombre', 'Nombre'], ['apellido', 'Apellido'], ['email', 'Correo'], ['telefono', 'Teléfono'],
  ['ciudad', 'Ciudad'], ['pais', 'País'], ['linkedin', 'LinkedIn'], ['portafolio', 'Portafolio o sitio'],
  ['renta_esperada', 'Renta esperada'], ['disponibilidad', 'Disponibilidad u horario'], ['anios_experiencia', 'Años de experiencia']]

export default function Perfil(_: Ctx) {
  const aviso = useAviso()
  const [perfil, setPerfil] = useState('')
  const [datos, setDatos] = useState<Record<string, string>>({})
  const [pestana, setPestana] = useState<'ia' | 'texto' | 'datos'>('ia')
  const cargar = () => leer<{ perfil: string; datos: Record<string, string> }>('/api/perfil').then(p => { setPerfil(p.perfil); setDatos(p.datos) })
  useEffect(() => { cargar() }, [])
  const guardar = async () => { const r = await enviar('/api/perfil', { perfil, datos }); aviso(r.error || 'Perfil guardado', !!r.error, 'Lo próximo que escriba sale de aquí.') }
  const PEST = [['ia', 'Armarlo con tu IA'], ['texto', 'Tu perfil'], ['datos', 'Datos para formularios']] as const
  return (
    <div className="perfil">
      <header className="cab">
        <Titulo texto="Tu perfil" sub="Todo lo que escribo por ti sale de aquí. Si algo no está, no lo voy a inventar." />
      </header>
      <div className="perfil-grid">
        <div>
          <div className="seg ancho">
            {PEST.map(([id, n]) => (
              <button key={id} className={pestana === id ? 'on' : ''} onClick={() => setPestana(id)}>
                {pestana === id && <motion.span layoutId="seg-perfil" className="seg-fondo" transition={RESORTE} />}{n}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={pestana} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease: EASE }}>
              {pestana === 'ia' && <PerfilConIA alImportar={() => { cargar(); setPestana('texto') }} />}
              {pestana === 'texto' && <div className="hoja">
                <textarea className="editor" value={perfil} onChange={e => setPerfil(e.target.value)} />
                <button className="btn primario" onClick={guardar}>Guardar perfil</button></div>}
              {pestana === 'datos' && <div className="hoja"><div className="form grid2">
                {CAMPOS.map(([k, n]) => <div key={k}><label>{n}</label><input value={datos[k] || ''} onChange={e => setDatos({ ...datos, [k]: e.target.value })} /></div>)}
              </div><button className="btn primario" onClick={guardar}>Guardar datos</button></div>}
            </motion.div>
          </AnimatePresence>
        </div>
        <aside className="perfil-lado">
          <h2>Tu CV</h2>
          <SubirCV actual={datos.cv} alSubir={ruta => setDatos(d => ({ ...d, cv: ruta }))} />
          <p className="nota">Se queda en tu computador, en la carpeta de Rumbo. Nunca lo subo a otro lado salvo al portal donde postulas.</p>
        </aside>
      </div>
    </div>
  )
}
