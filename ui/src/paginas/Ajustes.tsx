import { useState } from 'react'
import { enviar, type Config } from '../api'
import type { Ctx } from '../App'
import { Panel, Titulo, useAviso } from '../comunes'

export const MODALIDADES = [['remoto', 'Remoto'], ['hibrido', 'Híbrido'], ['presencial', 'Presencial']]
export const JORNADAS = [['full time', 'Jornada completa'], ['part time', 'Part time'], ['por proyecto', 'Por proyecto o freelance'], ['práctica', 'Práctica']]

export function Pildoras({ opciones, valor, cambiar }: { opciones: string[][]; valor: string[]; cambiar: (v: string[]) => void }) {
  return <div className="pildoras">{opciones.map(([k, n]) => (
    <button key={k} type="button" className={'pildora' + (valor.includes(k) ? ' on' : '')}
      onClick={() => cambiar(valor.includes(k) ? valor.filter(x => x !== k) : [...valor, k])}>{n}</button>
  ))}</div>
}

const lista = (t: string) => t.split(/[\n,]/).map(s => s.trim()).filter(Boolean)

export default function Ajustes({ estado, recargar }: Ctx) {
  const aviso = useAviso()
  const [c, setC] = useState<Config>(structuredClone(estado.config))
  const [correo, setCorreo] = useState({ cuenta: estado.correo_cuenta || '', clave: '' })
  const b = c.busqueda, e = c.envio
  const setB = (x: Partial<Config['busqueda']>) => setC({ ...c, busqueda: { ...b, ...x } })
  const setE = (x: Partial<Config['envio']>) => setC({ ...c, envio: { ...e, ...x } })
  const setI = (x: Partial<Config['ia']>) => setC({ ...c, ia: { ...c.ia, ...x } })
  const guardar = async () => {
    const r = await enviar('/api/config', { busqueda: { ...b, solo_remoto: b.modalidades.length === 1 && b.modalidades[0] === 'remoto' }, envio: e, ia: c.ia, ciclo: c.ciclo })
    aviso(r.error || r.ok || '', !!r.error); recargar()
  }
  const conectar = async () => { const r = await enviar('/api/correo', correo); aviso(r.error || r.ok || '', !!r.error); recargar() }

  return (
    <>
      <header className="cab"><Titulo texto="Ajustes" sub="Qué buscas, cómo se envía y con qué IA trabaja." /><button className="btn primario" onClick={guardar}>Guardar ajustes</button></header>
      <div className="dos">
        <Panel><div className="form">
          <h2>Qué buscas</h2>
          <label>Área o cargo</label><input value={b.area} onChange={x => setB({ area: x.target.value })} placeholder="ej. contabilidad, atención de público, desarrollo web" />
          <label>Qué escribir en los buscadores (una por línea)</label>
          <textarea rows={5} value={b.consultas.join('\n')} onChange={x => setB({ consultas: lista(x.target.value) })} />
          <label>Palabras que suman puntos</label><input value={b.palabras_clave.join(', ')} onChange={x => setB({ palabras_clave: lista(x.target.value) })} placeholder="excel, remuneraciones, react..." />
          <label>Palabras que descartan (en el título)</label><input value={b.excluir.join(', ')} onChange={x => setB({ excluir: lista(x.target.value) })} placeholder="turno noche, ventas en terreno..." />
          <label>Modalidad</label><Pildoras opciones={MODALIDADES} valor={b.modalidades} cambiar={v => setB({ modalidades: v })} />
          <label>Jornada</label><Pildoras opciones={JORNADAS} valor={b.jornadas} cambiar={v => setB({ jornadas: v })} />
          <div className="fila2"><div><label>Región o ciudad</label><input value={b.region} onChange={x => setB({ region: x.target.value })} /></div>
            <div><label>País</label><input value={b.pais} onChange={x => setB({ pais: x.target.value })} /></div></div>
          <label className="check"><input type="checkbox" checked={b.preset === 'tecnologia'} onChange={x => setB({ preset: x.target.checked ? 'tecnologia' : 'general' })} /> Soy del área de tecnología (agrega el diccionario técnico)</label>
          <label className="check"><input type="checkbox" checked={b.excluir_ingles} onChange={x => setB({ excluir_ingles: x.target.checked })} /> Descartar ofertas que pidan inglés</label>
          <h2 style={{ marginTop: 28 }}>Cada cuánto busca</h2>
          <div className="fila2"><div><label>Cada (horas)</label><input type="number" min={1} value={c.ciclo.horas} onChange={x => setC({ ...c, ciclo: { ...c.ciclo, horas: +x.target.value } })} /></div>
            <div><label>Entre (horas del día)</label><input value={`${c.ciclo.desde}-${c.ciclo.hasta}`} onChange={x => { const [d, h] = x.target.value.split('-').map(Number); setC({ ...c, ciclo: { ...c.ciclo, desde: d || 0, hasta: h || 24 } }) }} /></div></div>
        </div></Panel>
        <div style={{ display: 'grid', gap: 18 }}>
          <Panel><div className="form">
            <h2>Envío</h2>
            <label className="check"><input type="checkbox" checked={e.modo_automatico} onChange={x => setE({ modo_automatico: x.target.checked })} /> <b>Modo automático: enviar y postular solo</b></label>
            <p className="nota">Apagado, Rumbo busca y redacta, y tú decides qué enviar.</p>
            <label className="check"><input type="checkbox" checked={e.revisar_antes_de_enviar} onChange={x => setE({ revisar_antes_de_enviar: x.target.checked })} /> En portales, abrir el navegador y esperar mi clic final</label>
            <div className="fila2"><div><label>Fit mínimo para enviar solo</label><input type="number" value={e.umbral} onChange={x => setE({ umbral: +x.target.value })} /></div>
              <div><label>Recordatorio a los (días)</label><input type="number" value={e.dias_seguimiento} onChange={x => setE({ dias_seguimiento: +x.target.value })} /></div></div>
            <div className="fila2"><div><label>Correos por día</label><input type="number" value={e.limite_correos_dia} onChange={x => setE({ limite_correos_dia: +x.target.value })} /></div>
              <div><label>Postulaciones por portal y día</label><input type="number" value={e.limite_portal_dia} onChange={x => setE({ limite_portal_dia: +x.target.value })} /></div></div>
            <label>Nombre con el que firmas</label><input value={e.nombre} onChange={x => setE({ nombre: x.target.value })} />
          </div></Panel>
          <Panel><div className="form">
            <h2>Correo</h2>
            <p className="nota">{estado.correo_conectado ? `Conectado: ${estado.correo_cuenta}` : 'Sin conectar. Necesitas una contraseña de aplicación (Gmail: myaccount.google.com/apppasswords), no tu contraseña normal.'}</p>
            <label>Cuenta</label><input value={correo.cuenta} onChange={x => setCorreo({ ...correo, cuenta: x.target.value })} />
            <label>Contraseña de aplicación</label><input type="password" value={correo.clave} onChange={x => setCorreo({ ...correo, clave: x.target.value })} />
            <button className="btn" style={{ marginTop: 14 }} onClick={conectar}>Conectar correo</button>
          </div></Panel>
          <Panel><div className="form">
            <h2>Inteligencia artificial</h2>
            <label>Proveedor</label>
            <select value={c.ia.proveedor} onChange={x => setI({ proveedor: x.target.value })}>
              <option value="claude-cli">Claude Code, con tu sesión (sin API key)</option><option value="anthropic">API de Anthropic</option>
              <option value="openai">API compatible con OpenAI</option><option value="ollama">Ollama, gratis en tu PC</option></select>
            <div className="fila2"><div><label>Modelo</label><input value={c.ia.modelo} onChange={x => setI({ modelo: x.target.value })} /></div>
              <div><label>Ofertas que evalúa por ciclo</label><input type="number" value={c.ia.evaluar_por_ciclo} onChange={x => setI({ evaluar_por_ciclo: +x.target.value })} /></div></div>
            <label>URL base (OpenAI compatible u Ollama)</label><input value={c.ia.base_url} onChange={x => setI({ base_url: x.target.value })} placeholder="http://localhost:11434/v1" />
            <label>Variable de entorno con la API key</label><input value={c.ia.variable_clave} onChange={x => setI({ variable_clave: x.target.value })} placeholder="ANTHROPIC_API_KEY" />
          </div></Panel>
        </div>
      </div>
    </>
  )
}
