import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, Check, Search } from 'lucide-react'
import { enviar, leer } from '../api'
import { EASE, Info, RESORTE, useAviso } from '../comunes'
import StatusMark from '../rb/StatusMark'

type Proveedor = {
  id: string; nombre: string; tipo: string; costo: string; detalle: string; base_url?: string
  clave_url?: string; instalar?: string; sin_clave?: boolean; editable?: boolean; listo: boolean; actual: boolean
  modelos?: { id: string; nombre: string }[]
}
type Modelo = { id: string; nombre: string; gratis?: boolean }
type EstadoIA = { proveedores: Proveedor[]; actual: { proveedor: string; modelo: string; base_url: string } }

const PASOS_CLAVE: Record<string, string[]> = {
  opencode: ['Entra a opencode.ai/auth e inicia sesión (con Google o GitHub).', 'Crea una API key y cópiala.', 'Pégala aquí y elige un modelo que diga gratis.'],
  openrouter: ['Entra a openrouter.ai y crea tu cuenta.', 'Ve a Keys y crea una clave nueva.', 'Pégala aquí. Los modelos que dicen gratis no cobran.'],
  gemini: ['Entra a aistudio.google.com/apikey con tu cuenta de Google.', 'Toca "Create API key" y cópiala.', 'Pégala aquí. La capa gratis tiene un límite diario.'],
  groq: ['Entra a console.groq.com y crea tu cuenta.', 'Ve a API Keys y crea una.', 'Pégala aquí.'],
  anthropic: ['Entra a console.anthropic.com.', 'En Settings → API keys crea una clave.', 'Carga saldo y pega la clave aquí.'],
  openai: ['Entra a platform.openai.com/api-keys.', 'Crea una clave secreta.', 'Carga saldo y pega la clave aquí.'],
  ollama: ['Descarga Ollama desde ollama.com y ábrelo.', 'En una terminal escribe: ollama pull qwen3:8b', 'Vuelve aquí y toca "Actualizar modelos".'],
  'claude-cli': ['Instala Claude Code desde claude.com/claude-code.', 'Inicia sesión una vez en la terminal con: claude', 'Vuelve aquí y conecta.'],
}

export default function ConectarIA({ alConectar }: { alConectar?: () => void }) {
  const aviso = useAviso()
  const [ia, setIa] = useState<EstadoIA | null>(null)
  const [sel, setSel] = useState('')
  const [clave, setClave] = useState('')
  const [url, setUrl] = useState('')
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [modelo, setModelo] = useState('')
  const [q, setQ] = useState('')
  const [soloGratis, setSoloGratis] = useState(true)
  const [errorModelos, setErrorModelos] = useState('')
  const [estado, setEstado] = useState<'quieto' | 'probando' | 'ok' | 'mal'>('quieto')
  const [mensaje, setMensaje] = useState('')

  const cargar = () => leer<EstadoIA>('/api/ia/proveedores').then(r => { setIa(r); if (!sel) { setSel(r.actual.proveedor); setModelo(r.actual.modelo); setUrl(r.actual.base_url) } })
  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const p = ia?.proveedores.find(x => x.id === sel)

  const traerModelos = async (k = clave) => {
    if (!p) return
    setErrorModelos('')
    const r = await enviar('/api/ia/modelos', { proveedor: p.id, clave: k }) as { modelos: Modelo[]; error?: string }
    setModelos(r.modelos || []); setErrorModelos(r.error || '')
    if (r.modelos?.length && !r.modelos.some(m => m.id === modelo)) setModelo(r.modelos[0].id)
  }
  useEffect(() => { if (p) { setModelos(p.modelos || []); setEstado('quieto'); setMensaje(''); if (!p.modelos) traerModelos('') } }, [sel]) // eslint-disable-line react-hooks/exhaustive-deps

  const conectar = async () => {
    if (!p) return
    setEstado('probando'); setMensaje('Le hago una pregunta corta para comprobar que responde…')
    const r = await enviar('/api/ia/conectar', { proveedor: p.id, modelo, clave, base_url: url }) as { ok?: string; error?: string; segundos?: number }
    if (r.error) { setEstado('mal'); setMensaje(r.error); return }
    setEstado('ok'); setMensaje(`${r.ok} Tardó ${r.segundos} s.`); setClave('')
    aviso('IA conectada', false, `${p.nombre} · ${modelo}`); cargar(); alConectar?.()
  }

  const hayGratis = modelos.some(m => m.gratis)
  const visibles = useMemo(() => modelos.filter(m => (!soloGratis || !hayGratis || m.gratis) && (!q || `${m.id} ${m.nombre}`.toLowerCase().includes(q.toLowerCase()))).slice(0, 80), [modelos, soloGratis, hayGratis, q])
  const necesitaClave = p && !p.sin_clave && p.tipo !== 'cli'

  return (
    <div className="conectar-ia">
      <div className="proveedores">
        {ia?.proveedores.map((x, i) => (
          <motion.button key={x.id} className={'proveedor' + (sel === x.id ? ' on' : '')} onClick={() => setSel(x.id)}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, ...RESORTE }} whileTap={{ scale: 0.97 }}>
            <b>{x.nombre}</b>
            {x.costo && <span className={'costo' + (/gratis/i.test(x.costo) ? ' gratis' : '')}>{x.costo}</span>}
            {x.actual && x.listo && <span className="en-uso"><Check size={12} strokeWidth={3} /> en uso</span>}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {p && (
          <motion.div key={p.id} className="ia-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}>
            <p className="nota">{p.detalle}</p>
            <ol className="ia-pasos">
              {necesitaClave && (
                <li>
                  <span className="paso-num chico">1</span>
                  <div>
                    <label>Tu clave de {p.nombre} <Info titulo={`Cómo sacar tu clave de ${p.nombre}`} pasos={PASOS_CLAVE[p.id] || []} enlace={p.clave_url} /></label>
                    <div className="fila-input">
                      <input type="password" placeholder={p.listo ? 'Ya guardaste una clave. Pega otra para cambiarla.' : 'Pega aquí tu clave'} value={clave} onChange={e => setClave(e.target.value)} onBlur={() => clave && traerModelos()} />
                      {p.clave_url && <a className="btn chico" href={p.clave_url} target="_blank" rel="noreferrer">Sacar clave <ArrowUpRight size={14} /></a>}
                    </div>
                  </div>
                </li>
              )}
              {(p.tipo === 'cli' || p.sin_clave) && (
                <li>
                  <span className="paso-num chico">1</span>
                  <div>
                    <label>{p.listo ? `${p.nombre} está listo en este computador` : `Primero instala ${p.nombre}`} <Info titulo={`Cómo preparar ${p.nombre}`} pasos={PASOS_CLAVE[p.id] || []} enlace={p.instalar} /></label>
                    {!p.listo && p.instalar && <a className="btn chico" href={p.instalar} target="_blank" rel="noreferrer">Descargar {p.nombre} <ArrowUpRight size={14} /></a>}
                  </div>
                </li>
              )}
              {p.editable && (
                <li>
                  <span className="paso-num chico">·</span>
                  <div><label>Dirección del servidor (URL base)</label><input value={url} onChange={e => setUrl(e.target.value)} placeholder="http://localhost:1234/v1" onBlur={() => traerModelos()} /></div>
                </li>
              )}
              <li>
                <span className="paso-num chico">2</span>
                <div>
                  <label>Elige el modelo {modelos.length > 0 && <small>({modelos.length} disponibles)</small>}</label>
                  {errorModelos && <p className="aviso ojo">{errorModelos} <button className="btn chico" onClick={() => traerModelos()}>Actualizar modelos</button></p>}
                  {modelos.length > 6 && (
                    <div className="fila-input">
                      <div className="buscador-chico"><Search size={15} /><input placeholder="Buscar modelo" value={q} onChange={e => setQ(e.target.value)} /></div>
                      {hayGratis && <label className="mini-check"><input type="checkbox" checked={soloGratis} onChange={e => setSoloGratis(e.target.checked)} /> Solo gratis</label>}
                    </div>
                  )}
                  <div className="modelos">
                    {visibles.map(m => (
                      <button key={m.id} className={'modelo' + (modelo === m.id ? ' on' : '')} onClick={() => setModelo(m.id)}>
                        <span>{m.nombre}</span>{m.gratis && <em>gratis</em>}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
              <li>
                <span className="paso-num chico">3</span>
                <div>
                  <button className="btn primario" disabled={!modelo || estado === 'probando' || (necesitaClave && !p.listo && !clave)} onClick={conectar}>Conectar y probar</button>
                  <AnimatePresence>
                    {estado !== 'quieto' && (
                      <motion.p className={'ia-resultado ' + estado} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <StatusMark status={estado === 'probando' ? 'running' : estado === 'ok' ? 'done' : 'failed'} size={18} color="var(--acento)" doneColor="var(--exito)" errorColor="var(--error)" />
                        {mensaje}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </li>
            </ol>
            {p.id !== 'claude-cli' && <p className="nota">Los modelos gratis y los chicos escriben peor y a veces se equivocan con el formato. Si ves postulaciones raras, prueba un modelo más grande.</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
