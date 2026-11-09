import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bot, Building2, Globe, Mail, Rocket, Search, Store, Zap } from 'lucide-react'
import { enviar, type Config } from '../api'
import type { Ctx } from '../App'
import { EASE, Fichas, RESORTE, Titulo, lista, useAviso } from '../comunes'
import SquishSwitch from '../rb/SquishSwitch'
import JellyRadio from '../rb/JellyRadio'

const SW = { trackColor: '#D6CAB6', trackOnColor: '#5B4636', thumbColor: '#FFFEFA', thumbOnColor: '#FFFEFA', width: 52, height: 30 }

function Interruptor({ on, cambiar, titulo, texto }: { on: boolean; cambiar: (v: boolean) => void; titulo: ReactNode; texto?: ReactNode }) {
  return (
    <div className="interruptor">
      <div><b>{titulo}</b>{texto && <small>{texto}</small>}</div>
      <SquishSwitch checked={on} onChange={cambiar} ariaLabel={typeof titulo === 'string' ? titulo : 'Interruptor'} {...SW} />
    </div>
  )
}

const SECCIONES = [
  { id: 'auto', nombre: 'Automatización', icono: Zap },
  { id: 'portales', nombre: 'Portales', icono: Globe },
  { id: 'busqueda', nombre: 'Búsqueda fina', icono: Search },
  { id: 'empresas', nombre: 'Empresas por correo', icono: Building2 },
  { id: 'correo', nombre: 'Tu correo', icono: Mail },
  { id: 'ia', nombre: 'Inteligencia artificial', icono: Bot },
] as const
type Sec = (typeof SECCIONES)[number]['id']

const SEGMENTOS = [
  { id: 'pymes', nombre: 'Pymes', icono: Store, texto: 'Negocios pequeños a los que les sirve lo que ofreces.' },
  { id: 'startups', nombre: 'Startups', icono: Rocket, texto: 'Equipos chicos que necesitan apoyo por entregables o part time.' },
  { id: 'agencias', nombre: 'Agencias', icono: Building2, texto: 'Agencias y consultoras que subcontratan cuando tienen más trabajo.' },
]

export default function Ajustes({ estado, recargar }: Ctx) {
  const aviso = useAviso()
  const [sec, setSec] = useState<Sec>('auto')
  const [c, setC] = useState<Config>(structuredClone(estado.config))
  const [correo, setCorreo] = useState({ cuenta: estado.correo_cuenta || '', clave: '' })
  const [rubro, setRubro] = useState('')
  const b = c.busqueda, e = c.envio
  const setB = (x: Partial<Config['busqueda']>) => setC({ ...c, busqueda: { ...b, ...x } })
  const setE = (x: Partial<Config['envio']>) => setC({ ...c, envio: { ...e, ...x } })
  const setI = (x: Partial<Config['ia']>) => setC({ ...c, ia: { ...c.ia, ...x } })
  const guardar = async (cambios?: Partial<Config>) => {
    const r = await enviar('/api/config', cambios || { busqueda: { ...b, solo_remoto: b.modalidades.length === 1 && b.modalidades[0] === 'remoto' }, envio: e, ia: c.ia, ciclo: c.ciclo, fuentes: c.fuentes })
    aviso(r.error || 'Ajustes guardados', !!r.error); recargar()
  }
  const fuente = async (clave: string, v: boolean) => {
    const fuentes = { ...c.fuentes, [clave]: v }
    setC({ ...c, fuentes }); await enviar('/api/config', { fuentes }); recargar()
  }
  const conectar = async () => { const r = await enviar('/api/correo', correo); aviso(r.error || 'Correo conectado', !!r.error, r.error ? undefined : 'Ya puedo escribir desde tu cuenta.'); recargar() }
  const prospectar = async (segmento: string) => { const r = await enviar('/api/agencias', { segmento, rubro, n: 10 }); aviso(r.error || r.ok || '', !!r.error, 'Las verás en Postulaciones → Empresas por correo.') }

  return (
    <div className="ajustes">
      <header className="cab"><Titulo texto="Ajustes" sub="Cuánto hago solo, dónde busco y con qué trabajo." /></header>
      <div className="ajustes-grid">
        <nav className="ajustes-nav">
          {SECCIONES.map(s => (
            <button key={s.id} className={sec === s.id ? 'on' : ''} onClick={() => setSec(s.id)}>
              {sec === s.id && <motion.span layoutId="aj-fondo" className="aj-fondo" transition={RESORTE} />}
              <s.icono size={17} strokeWidth={2} /><span>{s.nombre}</span>
            </button>
          ))}
        </nav>
        <AnimatePresence mode="wait">
          <motion.section key={sec} className="hoja" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.25, ease: EASE }}>
            {sec === 'auto' && <>
              <h2>Cuánto hago solo</h2>
              <div className="nivel">
                <JellyRadio size="md" chipColor="#EEE8DC" activeColor="#5B4636" textColor="#3A2E24" activeTextColor="#FFFEFA"
                  items={[{ value: 'buscar', label: 'Solo buscar' }, { value: 'preparar', label: 'Dejarlo listo' }, { value: 'piloto', label: 'Piloto automático' }]}
                  value={e.modo_automatico ? 'piloto' : e.revisar_antes_de_enviar ? 'preparar' : 'buscar'}
                  onChange={v => setE({ modo_automatico: v === 'piloto', revisar_antes_de_enviar: v !== 'piloto' })} />
                <p className="nota">{e.modo_automatico ? 'Envío correos y postulo solo a las que calzan, respetando los topes de abajo.' : e.revisar_antes_de_enviar ? 'Busco, leo y escribo todo. En los portales lleno el formulario y te dejo el último clic.' : 'Busco y leo cada oferta. Tú decides qué enviar.'}</p>
              </div>
              <Interruptor on={!e.revisar_antes_de_enviar} cambiar={v => setE({ revisar_antes_de_enviar: !v })} titulo="Postular sin esperar tu clic final"
                texto="Apagado, abro el navegador, lleno todo y te dejo el botón de enviar a ti." />
              <div className="form grid2">
                <div><label>Calce mínimo para enviar solo</label><input type="number" min={0} max={100} value={e.umbral} onChange={x => setE({ umbral: +x.target.value })} /></div>
                <div><label>Recordatorio a los (días)</label><input type="number" value={e.dias_seguimiento} onChange={x => setE({ dias_seguimiento: +x.target.value })} /></div>
                <div><label>Correos por día</label><input type="number" value={e.limite_correos_dia} onChange={x => setE({ limite_correos_dia: +x.target.value })} /></div>
                <div><label>Postulaciones por portal y día</label><input type="number" value={e.limite_portal_dia} onChange={x => setE({ limite_portal_dia: +x.target.value })} /></div>
                <div><label>Ofertas que leo con IA por vuelta</label><input type="number" value={c.ia.evaluar_por_ciclo} onChange={x => setI({ evaluar_por_ciclo: +x.target.value })} /></div>
                <div><label>Buscar cada (horas)</label><input type="number" min={1} value={c.ciclo.horas} onChange={x => setC({ ...c, ciclo: { ...c.ciclo, horas: +x.target.value } })} /></div>
              </div>
              <p className="nota">Los portales bloquean cuentas que postulan muy rápido. Subir los topes te da más volumen, pero con más riesgo: parte bajo y sube de a poco.</p>
              <button className="btn primario" onClick={() => guardar()}>Guardar</button>
            </>}

            {sec === 'portales' && <>
              <h2>Dónde busco</h2>
              <p className="nota">Encendidos se revisan en cada vuelta. Los que dicen "postula solo" permiten enviar la postulación sin que entres tú.</p>
              <div className="portales">
                {estado.fuentes.map((f, i) => (
                  <motion.div key={f.clave} className="portal" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, ...RESORTE }}>
                    <div><b>{f.nombre}</b><small>{f.descripcion}</small>
                      <span className="portal-chips">{estado.portales_postulacion.includes(f.nombre) && <span className="chip ok">postula solo</span>}{f.total > 0 && <span className="chip">{f.total} encontradas</span>}</span></div>
                    <SquishSwitch checked={!!c.fuentes[f.clave]} onChange={v => fuente(f.clave, v)} ariaLabel={f.nombre} {...SW} />
                  </motion.div>
                ))}
              </div>
            </>}

            {sec === 'busqueda' && <>
              <h2>Búsqueda fina</h2>
              <p className="nota">Lo básico se arma con la frase de la pantalla Buscar. Aquí ajustas el detalle.</p>
              <div className="form">
                <label>Lo que escribo en los buscadores (una por línea)</label>
                <textarea rows={6} value={b.consultas.join('\n')} onChange={x => setB({ consultas: lista(x.target.value) })} />
                <label>Palabras que suman puntos</label><input value={b.palabras_clave.join(', ')} onChange={x => setB({ palabras_clave: lista(x.target.value) })} placeholder="excel, remuneraciones, react…" />
                <label>Palabras que descartan (en el título)</label><input value={b.excluir.join(', ')} onChange={x => setB({ excluir: lista(x.target.value) })} placeholder="turno noche, ventas en terreno…" />
                <label>Jornada</label>
                <Fichas multiple opciones={[{ id: 'full time', nombre: 'Jornada completa' }, { id: 'part time', nombre: 'Part time' }, { id: 'por proyecto', nombre: 'Por proyecto' }, { id: 'práctica', nombre: 'Práctica' }]}
                  valor={b.jornadas} cambiar={v => setB({ jornadas: v })} />
              </div>
              <Interruptor on={b.excluir_ingles} cambiar={v => setB({ excluir_ingles: v })} titulo="Saltar ofertas que piden inglés" />
              <Interruptor on={b.preset === 'tecnologia'} cambiar={v => setB({ preset: v ? 'tecnologia' : 'general' })} titulo="Soy de tecnología" texto="Suma un diccionario técnico para puntuar mejor." />
              <button className="btn primario" onClick={() => guardar()}>Guardar</button>
            </>}

            {sec === 'empresas' && <>
              <h2>Empresas a las que escribir</h2>
              <p className="nota">Si ofreces servicios, busco empresas con su correo publicado y les escribo uno a uno, como persona. Sin correos inventados.</p>
              <div className="form"><label>Rubro (opcional)</label><input placeholder="clínicas, inmobiliarias, talleres, restaurantes…" value={rubro} onChange={x => setRubro(x.target.value)} /></div>
              <div className="segmentos">
                {SEGMENTOS.map(s => (
                  <motion.button key={s.id} className="segmento" whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} onClick={() => prospectar(s.id)}>
                    <s.icono size={22} strokeWidth={1.8} /><b>{s.nombre}</b><small>{s.texto}</small>
                  </motion.button>
                ))}
              </div>
            </>}

            {sec === 'correo' && <>
              <h2>Tu correo</h2>
              <p className="nota">{estado.correo_conectado ? `Conectado: ${estado.correo_cuenta}. Hoy van ${estado.correos_hoy} correos.` : 'Necesitas una contraseña de aplicación (en Gmail: myaccount.google.com/apppasswords), no tu contraseña normal. Queda guardada en el llavero de tu computador.'}</p>
              <div className="form">
                <label>Cuenta</label><input value={correo.cuenta} onChange={x => setCorreo({ ...correo, cuenta: x.target.value })} />
                <label>Contraseña de aplicación</label><input type="password" value={correo.clave} onChange={x => setCorreo({ ...correo, clave: x.target.value })} />
                <label>Nombre con el que firmas</label><input value={e.nombre} onChange={x => setE({ nombre: x.target.value })} onBlur={() => guardar({ envio: { ...e } } as Partial<Config>)} />
              </div>
              <button className="btn primario" onClick={conectar}>Conectar correo</button>
            </>}

            {sec === 'ia' && <>
              <h2>Inteligencia artificial</h2>
              <div className="form">
                <label>Con qué leo y escribo</label>
                <Fichas opciones={[{ id: 'claude-cli', nombre: 'Claude Code', detalle: 'con tu sesión, sin API key' }, { id: 'anthropic', nombre: 'API de Anthropic' }, { id: 'openai', nombre: 'Compatible con OpenAI' }, { id: 'ollama', nombre: 'Ollama', detalle: 'gratis en tu PC' }]}
                  valor={[c.ia.proveedor]} cambiar={([v]) => setI({ proveedor: v })} />
                <div className="grid2">
                  <div><label>Modelo</label><input value={c.ia.modelo} onChange={x => setI({ modelo: x.target.value })} /></div>
                  <div><label>Variable con la API key</label><input value={c.ia.variable_clave} onChange={x => setI({ variable_clave: x.target.value })} placeholder="ANTHROPIC_API_KEY" /></div>
                </div>
                <label>URL base (OpenAI compatible u Ollama)</label><input value={c.ia.base_url} onChange={x => setI({ base_url: x.target.value })} placeholder="http://localhost:11434/v1" />
              </div>
              <button className="btn primario" onClick={() => guardar()}>Guardar</button>
            </>}
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  )
}
