import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { hace, leer, NOMBRE_ESTADO, type Estado, type Evento } from '../api'
import type { Ctx } from '../App'
import { Panel, Titulo } from '../comunes'

export const ICONO_EVENTO: Record<string, string> = { correo: '@', seguimiento: '↺', postulacion: '⇥', respuesta: '★', evaluada: 'IA' }
export const NOMBRE_EVENTO = (e: Evento) => ({
  evaluada: `La IA la evaluó · fit ${e.detalle}`, correo: 'Correo enviado', seguimiento: 'Recordatorio enviado',
  postulacion: 'Postulación enviada en el portal', respuesta: 'Te respondieron',
} as Record<string, string>)[e.tipo] || (e.tipo.startsWith('estado:') ? `Movida a ${NOMBRE_ESTADO[e.tipo.slice(7) as Estado] || ''}` : e.tipo)

export default function Actividad({ ofertas, abrir }: Ctx) {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [registro, setRegistro] = useState<string[]>([])
  useEffect(() => { leer<Evento[]>('/api/actividad').then(setEventos); leer<string[]>('/api/log').then(setRegistro) }, [ofertas.length])
  const atencion = ofertas.filter(o => o.error && o.estado !== 'descartada')
  return (
    <>
      <header className="cab"><Titulo texto="Actividad" sub="Todo lo que Rumbo hizo por ti, y lo que necesita tu atención." /></header>
      <div className="dos izq">
        <Panel><h2>Historial</h2>
          {eventos.map((e, i) => (
            <motion.div className="fila-ico" key={e.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 20) * 0.025 }}>
              <span className="ico">{ICONO_EVENTO[e.tipo] || '•'}</span>
              <div><b>{NOMBRE_EVENTO(e)}</b><small>{e.titulo} · {e.fuente} · {hace(e.fecha)}</small></div>
            </motion.div>
          ))}
          {!eventos.length && <div className="vacio">Todavía no hay actividad.</div>}
        </Panel>
        <Panel><h2>Necesita tu atención</h2>
          {atencion.map(o => <div className="fila-ico clic" key={o.id} onClick={() => abrir(o.id)}><span className="ico">!</span><div><div className="t">{o.titulo}</div><small>{o.error}</small></div></div>)}
          {!atencion.length && <div className="vacio">Todo en orden.</div>}
          <h2 style={{ marginTop: 22 }}>Registro técnico</h2>
          <pre className="registro">{registro.slice(-60).join('\n')}</pre>
        </Panel>
      </div>
    </>
  )
}
