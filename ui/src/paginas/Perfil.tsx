import { useEffect, useState } from 'react'
import { enviar, leer } from '../api'
import type { Ctx } from '../App'
import { Panel, Titulo, useAviso } from '../comunes'

const CAMPOS: [string, string][] = [['nombre', 'Nombre'], ['apellido', 'Apellido'], ['email', 'Correo'], ['telefono', 'Teléfono'],
  ['ciudad', 'Ciudad'], ['pais', 'País'], ['linkedin', 'LinkedIn'], ['portafolio', 'Portafolio o sitio'], ['cv', 'Ruta de tu CV (PDF)'],
  ['renta_esperada', 'Renta esperada'], ['disponibilidad', 'Disponibilidad u horario'], ['anios_experiencia', 'Años de experiencia']]

export default function Perfil(_: Ctx) {
  const aviso = useAviso()
  const [perfil, setPerfil] = useState('')
  const [datos, setDatos] = useState<Record<string, string>>({})
  useEffect(() => { leer<{ perfil: string; datos: Record<string, string> }>('/api/perfil').then(p => { setPerfil(p.perfil); setDatos(p.datos) }) }, [])
  const guardar = async () => { const r = await enviar('/api/perfil', { perfil, datos }); aviso(r.error || r.ok || '', !!r.error) }
  return (
    <>
      <header className="cab">
        <Titulo texto="Mi perfil" sub="Todo lo que Rumbo escribe sale de aquí. Si algo no está, la IA no lo va a afirmar." />
        <button className="btn primario" onClick={guardar}>Guardar perfil</button>
      </header>
      <div className="dos izq">
        <Panel><h2>Perfil</h2>
          <p className="nota">Quién eres, tu experiencia, qué buscas y cómo quieres presentarte. Puedes escribirlo como quieras; los títulos ayudan a la IA.</p>
          <textarea className="editor" value={perfil} onChange={e => setPerfil(e.target.value)} />
        </Panel>
        <Panel><h2>Datos para formularios</h2>
          <p className="nota">Se usan cuando un portal pide nombre, teléfono, renta esperada, etc.</p>
          <div className="form">{CAMPOS.map(([k, n]) => <div key={k}><label>{n}</label><input value={datos[k] || ''} onChange={e => setDatos({ ...datos, [k]: e.target.value })} /></div>)}</div>
        </Panel>
      </div>
    </>
  )
}
