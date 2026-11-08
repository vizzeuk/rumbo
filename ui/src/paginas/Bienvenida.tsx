import { useState, type CSSProperties } from 'react'
import Grainient from '../rb/Grainient'
import Stepper, { Step } from '../rb/Stepper'
import RotatingText from '../rb/RotatingText'
import ShinyText from '../rb/ShinyText'
import Logo from '../Logo'
import { enviar } from '../api'
import { useAviso } from '../comunes'
import { JORNADAS, MODALIDADES, Pildoras } from './Ajustes'

const lista = (t: string) => t.split(/[\n,]/).map(s => s.trim()).filter(Boolean)

export default function Bienvenida({ alTerminar }: { alTerminar: () => void }) {
  const aviso = useAviso()
  const [d, setD] = useState({ nombre: '', apellido: '', email: '', telefono: '', ciudad: '', pais: 'Chile', linkedin: '', disponibilidad: '' })
  const [b, setB] = useState({ area: '', consultas: '', palabras_clave: '', excluir: '', modalidades: ['remoto', 'hibrido', 'presencial'], jornadas: [] as string[], region: '' })
  const [p, setP] = useState({ titular: '', estudios: '', idiomas: 'Español', experiencia: '', habilidades: '', ofrezco: '', usar_ia: true })

  const terminar = async () => {
    const r = await enviar('/api/bienvenida', {
      datos: d, titular: p.titular, estudios: p.estudios, idiomas: p.idiomas, experiencia: p.experiencia,
      habilidades: p.habilidades, ofrezco: p.ofrezco, usar_ia: p.usar_ia,
      busqueda: { ...b, consultas: lista(b.consultas), palabras_clave: lista(b.palabras_clave), excluir: lista(b.excluir), pais: d.pais },
    })
    aviso(r.error || r.ok || '', !!r.error)
    if (!r.error) alTerminar()
  }
  const campo = (etq: string, v: string, set: (x: string) => void, ph = '', area = false) => (
    <div><label className="etq">{etq}</label>
      {area ? <textarea rows={5} value={v} placeholder={ph} onChange={e => set(e.target.value)} />
        : <input value={v} placeholder={ph} onChange={e => set(e.target.value)} />}</div>
  )

  return (
    <div className="bienvenida">
      <div className="fondo-grano">
        <Grainient colors={['#FAF6F0', '#F2E9DD', '#E6D5C1', '#E8B98F']} speed={0.25} grainAmount={0.08} lightMode softness={0.9} />
      </div>
      <div className="caja">
        <div className="hero">
          <Logo tamano={84} />
          <ShinyText text="Bienvenido a Rumbo" color="#7A6656" shineColor="#3B2A20" speed={3} />
          <h1>Tu búsqueda de trabajo, <span className="rotante"><RotatingText texts={['encontrada', 'evaluada', 'redactada', 'enviada']} rotationInterval={2000} /></span></h1>
          <p className="sub">Contesta unas preguntas y Rumbo empieza a buscar por ti. Puedes cambiar todo después.</p>
        </div>
        <Stepper theme="light" accentColor="#8B5E3C" width="100%" backButtonText="Atrás" nextButtonText="Siguiente"
          completeButtonText="Empezar a buscar" onFinalStepCompleted={terminar} radius={22}
          style={{
            '--stepper-frame': 'rgba(255, 253, 249, 0.9)', '--stepper-frame-edge': 'rgba(59, 42, 32, 0.08)',
            '--stepper-tile': 'linear-gradient(180deg, #FFFDF9 0%, #F7F0E6 100%)', '--stepper-tile-edge': 'rgba(59, 42, 32, 0.1)',
            '--stepper-well': 'rgba(139, 94, 60, 0.07)', '--stepper-ink': '#3B2A20', '--stepper-muted': '#7A6656',
          } as CSSProperties}>
          <Step>
            <h2>Quién eres</h2>
            <div className="fila2">{campo('Nombre', d.nombre, v => setD({ ...d, nombre: v }))}{campo('Apellido', d.apellido, v => setD({ ...d, apellido: v }))}</div>
            <div className="fila2">{campo('Correo', d.email, v => setD({ ...d, email: v }), 'tu@correo.com')}{campo('Teléfono', d.telefono, v => setD({ ...d, telefono: v }))}</div>
            <div className="fila2">{campo('Ciudad', d.ciudad, v => setD({ ...d, ciudad: v }))}{campo('País', d.pais, v => setD({ ...d, pais: v }))}</div>
            {campo('LinkedIn (opcional)', d.linkedin, v => setD({ ...d, linkedin: v }), 'linkedin.com/in/...')}
          </Step>
          <Step>
            <h2>Qué trabajo buscas</h2>
            {campo('Área o cargo', b.area, v => setB({ ...b, area: v }), 'ej. contador, vendedor, enfermera, diseñador, desarrollador web')}
            {campo('Qué escribirías en un buscador de empleos (separa con comas)', b.consultas, v => setB({ ...b, consultas: v }), 'asistente contable, analista de remuneraciones')}
            {campo('Palabras que te interesan (opcional)', b.palabras_clave, v => setB({ ...b, palabras_clave: v }), 'excel, sap, atención al cliente')}
            {campo('Lo que NO quieres (opcional)', b.excluir, v => setB({ ...b, excluir: v }), 'turno noche, ventas en terreno')}
          </Step>
          <Step>
            <h2>Cómo quieres trabajar</h2>
            <label className="etq">Modalidad</label><Pildoras opciones={MODALIDADES} valor={b.modalidades} cambiar={v => setB({ ...b, modalidades: v })} />
            <label className="etq">Jornada (si no marcas nada, todas)</label><Pildoras opciones={JORNADAS} valor={b.jornadas} cambiar={v => setB({ ...b, jornadas: v })} />
            <div className="fila2">{campo('Región o ciudad', b.region, v => setB({ ...b, region: v }), 'Región Metropolitana')}{campo('Disponibilidad u horario', d.disponibilidad, v => setD({ ...d, disponibilidad: v }), 'lunes a viernes desde las 14:00')}</div>
          </Step>
          <Step>
            <h2>Tu experiencia</h2>
            {campo('En una línea, quién eres profesionalmente', p.titular, v => setP({ ...p, titular: v }), 'Contadora con 5 años en pymes')}
            <div className="fila2">{campo('Estudios', p.estudios, v => setP({ ...p, estudios: v }))}{campo('Idiomas', p.idiomas, v => setP({ ...p, idiomas: v }))}</div>
            {campo('Tu experiencia (pega tu CV o cuéntala como quieras)', p.experiencia, v => setP({ ...p, experiencia: v }), 'Cargos, empresas, fechas y lo que lograste', true)}
            {campo('Habilidades y herramientas', p.habilidades, v => setP({ ...p, habilidades: v }), 'Excel avanzado, Defontana, liderazgo de equipos')}
            {campo('Si ofreces servicios por tu cuenta, ¿qué ofreces? (opcional)', p.ofrezco, v => setP({ ...p, ofrezco: v }), 'Contabilidad mensual para pymes')}
            <label className="check"><input type="checkbox" checked={p.usar_ia} onChange={e => setP({ ...p, usar_ia: e.target.checked })} /> Que la IA ordene mi perfil (usa solo lo que escribí)</label>
          </Step>
        </Stepper>
      </div>
    </div>
  )
}
