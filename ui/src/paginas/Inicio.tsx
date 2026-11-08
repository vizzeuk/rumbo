import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { leer, hace, type Evento } from '../api'
import type { Ctx } from '../App'
import { Entrada, Fit, Kpi, Panel, Titulo } from '../comunes'
import { ICONO_EVENTO, NOMBRE_EVENTO } from './Actividad'

export default function Inicio({ estado, ofertas, abrir, ir }: Ctx) {
  const [eventos, setEventos] = useState<Evento[]>([])
  useEffect(() => { leer<Evento[]>('/api/actividad').then(setEventos) }, [ofertas.length])
  const r = estado.resumen
  const enviadas = (r.enviada || 0) + (r.respondio || 0) + (r.entrevista || 0)
  const respuestas = (r.respondio || 0) + (r.entrevista || 0)
  const h = new Date().getHours()
  const nombre = estado.config.envio.nombre?.split(' ')[0]
  const saludo = (h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches') + (nombre ? `, ${nombre}` : '')
  const pasos: [string, number][] = [
    ['Encontradas', ofertas.length], ['Calzan contigo', ofertas.filter(o => (o.fit ?? 0) >= 40).length],
    ['Enviadas', enviadas], ['Respuestas', respuestas], ['Entrevistas', r.entrevista || 0],
  ]
  const max = Math.max(1, ofertas.length)
  const ia = estado.config.ia.proveedor === 'claude-cli' ? 'Claude Code, con tu sesión (sin API)' : estado.config.ia.proveedor
  const conexiones: [string, string, string, 'ok' | 'ojo' | ''][] = [
    ['IA', 'Inteligencia artificial', ia, 'ok'],
    ['@', 'Correo', estado.correo_conectado ? `${estado.correo_cuenta} · ${estado.correos_hoy}/${estado.config.envio.limite_correos_dia} hoy` : 'Sin conectar: hazlo en Ajustes', estado.correo_conectado ? 'ok' : 'ojo'],
    ['⇥', 'Postulación en portales', estado.postulador_instalado ? `${estado.postulaciones_hoy} hoy · ${estado.portales_postulacion.join(', ')}` : 'Falta instalar: pip install "rumbo[postular]"', estado.postulador_instalado ? 'ok' : 'ojo'],
    ['▶', 'Modo automático', estado.config.envio.modo_automatico ? 'Encendido: envía y postula solo' : 'Apagado: tú decides qué enviar', estado.config.envio.modo_automatico ? 'ok' : ''],
  ]

  return (
    <>
      <header className="cab">
        <Titulo texto={saludo} sub={r.lista ? `Tienes ${r.lista} postulaciones listas para revisar.` : 'Rumbo sigue buscando por ti.'} />
      </header>
      <div className="kpis">
        <Kpi valor={ofertas.length} etiqueta="Encontradas" />
        <Kpi valor={r.lista || 0} etiqueta="Listas" destacado />
        <Kpi valor={enviadas} etiqueta="Enviadas" />
        <Kpi valor={respuestas} etiqueta="Respondieron" />
        <Kpi valor={r.entrevista || 0} etiqueta="Entrevistas" />
        <Kpi valor={enviadas ? Math.round(respuestas * 100 / enviadas) : 0} sufijo="%" etiqueta="Tasa de respuesta" />
      </div>
      <div className="dos">
        <Entrada><Panel><h2>Tu embudo</h2>
          {pasos.map(([n, v], i) => (
            <div className="embudo" key={n}><span>{n}</span>
              <div className="barra"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(v ? 3 : 0, v * 100 / max)}%` }} transition={{ duration: 1, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] }} /></div>
              <em>{v}</em></div>
          ))}
        </Panel></Entrada>
        <Entrada retraso={0.08}><Panel><h2>Conexiones</h2>
          {conexiones.map(([i, t, d, c]) => (
            <div className="fila-ico" key={t}><span className="ico">{i}</span><div><b>{t}</b><small>{d}</small></div>
              {c && <span className={'chip ' + c}>{c === 'ok' ? 'Listo' : 'Pendiente'}</span>}</div>
          ))}
        </Panel></Entrada>
      </div>
      <div className="dos">
        <Entrada retraso={0.12}><Panel>
          <div className="cab" style={{ margin: 0 }}><h2>Mejores oportunidades para hoy</h2><a onClick={() => ir('oportunidades')}>Ver todas</a></div>
          {ofertas.filter(o => o.estado === 'lista').slice(0, 6).map(o => (
            <div className="fila-ico clic" key={o.id} onClick={() => abrir(o.id)}><Fit o={o} />
              <div><div className="t">{o.titulo}</div><small>{o.fuente}{o.empresa ? ` · ${o.empresa}` : ''}</small></div></div>
          ))}
          {!r.lista && <div className="vacio">Cuando la IA encuentre algo que calce contigo, aparece aquí.</div>}
        </Panel></Entrada>
        <Entrada retraso={0.16}><Panel>
          <div className="cab" style={{ margin: 0 }}><h2>Actividad reciente</h2><a onClick={() => ir('actividad')}>Ver todo</a></div>
          {eventos.slice(0, 6).map(e => (
            <div className="fila-ico" key={e.id}><span className="ico">{ICONO_EVENTO[e.tipo] || '•'}</span>
              <div><b>{NOMBRE_EVENTO(e)}</b><small>{e.titulo} · {e.fuente} · {hace(e.fecha)}</small></div></div>
          ))}
          {!eventos.length && <div className="vacio">Todavía no hay actividad.</div>}
        </Panel></Entrada>
      </div>
    </>
  )
}
