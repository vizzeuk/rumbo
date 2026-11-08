import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { enviar, hace, NOMBRE_ESTADO, type Estado } from '../api'
import type { Ctx } from '../App'
import { X } from 'lucide-react'
import { Anillo, Canal, EnSitio, useAviso } from '../comunes'

export default function Detalle({ id, ofertas, estado, recargar, cerrar }: Ctx & { id: string; cerrar: () => void }) {
  const aviso = useAviso()
  const o = ofertas.find(x => x.id === id)
  const [f, setF] = useState({ asunto: o?.asunto || '', email: o?.email || '', propuesta: o?.propuesta || '', notas: o?.notas || '' })
  useEffect(() => { if (o) setF({ asunto: o.asunto || '', email: o.email || '', propuesta: o.propuesta || '', notas: o.notas || '' }) }, [o?.propuesta, o?.fit]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && cerrar(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [cerrar])
  if (!o) return null

  const accion = async (a: string) => {
    const r = await enviar('/api/oferta', { id, accion: a, ...f }); aviso(r.error || r.ok || '', !!r.error); recargar()
  }
  const copiar = async () => { await navigator.clipboard.writeText(f.propuesta); if (o.url) window.open(o.url, '_blank'); aviso('Copiada. Pégala en el portal y márcala como enviada.') }
  const hitos: string[] = JSON.parse(o.hitos || '[]')
  const portal = estado.portales_postulacion.includes(o.fuente)

  return (
    <>
      <motion.div className="velo" onClick={cerrar} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.aside className="cajon" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 36 }}>
        <div className="cc">
          <div className="chips"><Anillo valor={o.fit} tamano={44} /><EnSitio url={o.url} fuente={o.fuente} />{o.modalidad && <span className="chip">{o.modalidad}</span>}
            {o.presupuesto && <span className="chip">{o.presupuesto}</span>}<Canal o={o} portales={estado.portales_postulacion} />
            <span style={{ marginLeft: 'auto' }} />
            <select style={{ width: 'auto' }} value={o.estado} onChange={e => accion(e.target.value as Estado)}>
              {Object.entries(NOMBRE_ESTADO).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
            <button className="btn fantasma redondo-chico" onClick={cerrar} aria-label="Cerrar"><X size={18} /></button></div>
          <h2>{o.titulo}</h2>
          <div className="hist">{o.empresa}{o.ubicacion ? ` · ${o.ubicacion}` : ''}</div>
        </div>
        <div className="cb">
          {o.fit != null
            ? <div className="motivo"><b>{o.fit >= 60 ? 'Por qué calza contigo' : 'Por qué no calza tanto'}:</b> {o.motivo}
              {o.precio && <><br /><b>Precio sugerido:</b> {o.precio}</>}{hitos.length > 0 && <><br /><b>Hitos:</b> {hitos.join(' · ')}</>}</div>
            : <div className="motivo">Todavía no la leo. <button className="btn primario" style={{ marginLeft: 8 }} onClick={() => accion('evaluar')}>Leer y redactar</button></div>}
          {o.tipo === 'solo_ver' && <div className="aviso ojo">Esta fuente es solo para encontrar: Rumbo nunca envía nada ahí. Si te interesa, postula tú y usa este texto como base.</div>}
          {o.error && <div className="aviso mal">{o.error}</div>}
          <div className="sec"><label>Postulación</label>
            <input placeholder="Asunto" value={f.asunto} onChange={e => setF({ ...f, asunto: e.target.value })} style={{ marginBottom: 8 }} />
            <input placeholder="Correo de destino (si tiene)" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} style={{ marginBottom: 8 }} />
            <textarea rows={12} placeholder="Aún no hay postulación redactada" value={f.propuesta} onChange={e => setF({ ...f, propuesta: e.target.value })} />
            <div className="acciones" style={{ marginTop: 12 }}>
              {o.tipo === 'solo_ver' ? <button className="btn primario" onClick={() => window.open(o.url, '_blank')}>Ver la oferta y postular yo</button>
                : f.email ? <button className="btn primario" onClick={() => confirm(`¿Enviar a ${f.email}?`) && accion('enviar_correo')}>Enviar por correo</button>
                  : portal ? <><button className="btn primario" onClick={() => accion('postular')}>Postular en {o.fuente}</button><button className="btn" onClick={copiar}>Copiar y abrir</button></>
                    : <button className="btn primario" onClick={copiar}>Copiar y abrir la oferta</button>}
              <button className="btn" onClick={() => accion('enviada')}>Marcar como enviada</button>
              <button className="btn fantasma" onClick={() => accion('guardar')}>Guardar</button>
              <button className="btn fantasma" onClick={() => accion('evaluar')}>Redactar de nuevo</button>
            </div>
          </div>
          <div className="sec"><label>Mis notas</label>
            <textarea rows={3} placeholder="Con quién hablaste, qué te dijeron, próximos pasos" value={f.notas}
              onChange={e => setF({ ...f, notas: e.target.value })} onBlur={() => enviar('/api/oferta', { id, accion: 'guardar', notas: f.notas })} /></div>
          <div className="sec"><label>Historial</label><div className="hist">Encontrada {hace(o.encontrada)}
            {o.enviada && ` · enviada ${hace(o.enviada)} (${o.canal || ''})`}{o.seguimiento && ` · recordatorio ${hace(o.seguimiento)}`}{o.respuesta && ` · respondió ${hace(o.respuesta)}`}</div></div>
          <div className="sec"><label>Descripción original</label><div className="desc">{o.descripcion}</div></div>
        </div>
      </motion.aside>
    </>
  )
}
