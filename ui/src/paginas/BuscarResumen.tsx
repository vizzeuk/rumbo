import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, ArrowRight, Clock, MailCheck, Search, Send, Sparkles } from 'lucide-react'
import { hace, leer, type Catalogo } from '../api'
import type { Ctx } from '../App'
import { EASE, RESORTE } from '../comunes'

type Dia = { dia: string; inicio: number; encontradas: number; enviadas: number; respuestas: number }
type Fila = { id: string; titulo: string; empresa: string; fuente: string; error?: string; respuesta?: number }
type Act = { tipo: string; detalle: string; fecha: number; id: string; titulo: string; empresa: string; fuente: string }
export type Resumen = { dias: Dia[]; atencion: Fila[]; respondieron: Fila[]; actividad: Act[]; portales: { fuente: string; total: number; listas: number }[]; proxima: number | null }

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const QUE: Record<string, string> = { correo: 'Escribí a', postulacion: 'Postulé en', respuesta: 'Te respondió', seguimiento: 'Recordé a', rebote: 'Rebotó el correo de' }

export function useResumen(dependencia: unknown) {
  const [r, setR] = useState<Resumen | null>(null)
  useEffect(() => { leer<Resumen>('/api/resumen').then(setR) }, [dependencia])
  return r
}

/** Cuenta regresiva hasta la próxima búsqueda automática. */
function Faltan({ hasta }: { hasta: number }) {
  const [ahora, setAhora] = useState(Date.now() / 1000)
  useEffect(() => { const t = window.setInterval(() => setAhora(Date.now() / 1000), 1000); return () => window.clearInterval(t) }, [])
  const s = Math.max(0, Math.round(hasta - ahora))
  if (!s) return <>en cualquier momento</>
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), seg = s % 60
  return <span className="mono">{h ? `${h} h ` : ''}{String(m).padStart(2, '0')} min {String(seg).padStart(2, '0')} s</span>
}

/** Búsqueda puntual de una sola vez, sin cambiar la búsqueda guardada, más ideas para probar. */
export function BusquedaRapida({ estado, buscar }: Pick<Ctx, 'estado'> & { buscar: (consulta?: string) => void }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<Catalogo | null>(null)
  useEffect(() => { leer<Catalogo>('/api/catalogo').then(setCat) }, [])
  const b = estado.config.busqueda
  const rubro = cat?.rubros.find(r => r.id === b.rubro)
  const ideas = (rubro?.cargos || []).filter(c => !(b.cargos || []).includes(c)).slice(0, 5)
  return (
    <div className="rapida">
      <form className="rapida-campo" onSubmit={e => { e.preventDefault(); if (q.trim()) buscar(q.trim()) }}>
        <Search size={18} strokeWidth={2.2} />
        <input placeholder="O busca algo puntual, una sola vez: “diseñador freelance”, “práctica en banco”…" value={q} onChange={e => setQ(e.target.value)} />
        <AnimatePresence>{q.trim() && (
          <motion.button type="submit" className="btn primario chico" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>Buscar esto <ArrowRight size={15} /></motion.button>
        )}</AnimatePresence>
      </form>
      {ideas.length > 0 && (
        <div className="ideas">
          <span><Sparkles size={14} /> Ideas para probar:</span>
          {ideas.map((c, i) => (
            <motion.button key={c} className="idea" onClick={() => buscar(c)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.06, ...RESORTE }} whileTap={{ scale: 0.94 }}>{c}</motion.button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Tablero({ r, estado, abrir, ir }: { r: Resumen } & Pick<Ctx, 'estado' | 'abrir' | 'ir'>) {
  const max = Math.max(1, ...r.dias.map(d => Math.max(d.encontradas, d.enviadas)))
  const totEnc = r.dias.reduce((a, d) => a + d.encontradas, 0)
  const totEnv = r.dias.reduce((a, d) => a + d.enviadas, 0)
  const totResp = r.dias.reduce((a, d) => a + d.respuestas, 0)
  const maxPortal = Math.max(1, ...r.portales.map(p => p.total))
  const aparece = (i: number) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.25 + i * 0.08, duration: 0.5, ease: EASE } })

  return (
    <div className="tablero">
      <motion.section className="bloque semana" {...aparece(0)}>
        <h3>Tu semana</h3>
        <p className="frase-dato">Encontré <b>{totEnc}</b> {totEnc === 1 ? 'oferta' : 'ofertas'} para ti, envié <b>{totEnv}</b>{totResp ? <> y te respondieron <b>{totResp}</b></> : ''}.</p>
        <div className="barras">
          {r.dias.map((d, i) => (
            <div key={d.inicio} className="barra-dia" title={`${d.encontradas} encontradas · ${d.enviadas} enviadas`}>
              <div className="barra-par">
                <motion.i className="enc" initial={{ height: 0 }} animate={{ height: `${(d.encontradas / max) * 100}%` }} transition={{ delay: 0.4 + i * 0.05, duration: 0.6, ease: EASE }} />
                <motion.i className="env" initial={{ height: 0 }} animate={{ height: `${(d.enviadas / max) * 100}%` }} transition={{ delay: 0.45 + i * 0.05, duration: 0.6, ease: EASE }} />
              </div>
              <small>{i === 6 ? 'hoy' : DIAS[new Date(d.inicio * 1000).getDay()]}</small>
            </div>
          ))}
        </div>
        <div className="leyenda"><span><i className="enc" /> encontradas</span><span><i className="env" /> enviadas</span></div>
      </motion.section>

      <motion.section className="bloque" {...aparece(1)}>
        <h3><MailCheck size={17} /> Te respondieron</h3>
        {r.respondieron.length ? r.respondieron.map(f => (
          <button key={f.id} className="mini-fila" onClick={() => abrir(f.id)}><b>{f.empresa || f.titulo}</b><small>{f.titulo} · {hace(f.respuesta)}</small></button>
        )) : <p className="nota">Todavía nadie. Cuando alguien conteste tu correo, aparece aquí y te aviso.</p>}
        <h3 className="mt"><AlertCircle size={17} /> Necesita tu atención</h3>
        {r.atencion.length ? r.atencion.map(f => (
          <button key={f.id} className="mini-fila alerta" onClick={() => abrir(f.id)}><b>{f.titulo}</b><small>{f.fuente}: {f.error}</small></button>
        )) : <p className="nota">Nada pendiente. Todo va solo.</p>}
      </motion.section>

      <motion.section className="bloque" {...aparece(2)}>
        <h3><Clock size={17} /> Próxima búsqueda</h3>
        <p className="frase-dato grande">{estado.motor.corriendo ? 'Buscando ahora' : r.proxima ? <Faltan hasta={r.proxima} /> : `cada ${estado.config.ciclo.horas} h`}</p>
        <h3 className="mt">Dónde más encuentro</h3>
        {r.portales.length ? r.portales.map((p, i) => (
          <div key={p.fuente} className="portal-barra">
            <span>{p.fuente}</span>
            <div><motion.i initial={{ width: 0 }} animate={{ width: `${(p.total / maxPortal) * 100}%` }} transition={{ delay: 0.5 + i * 0.05, duration: 0.6, ease: EASE }} /></div>
            <b>{p.total}</b>
          </div>
        )) : <p className="nota">Después de la primera búsqueda verás qué portales te sirven más.</p>}
      </motion.section>

      {r.actividad.length > 0 && (
        <motion.section className="bloque ancho" {...aparece(3)}>
          <div className="bloque-cab"><h3><Send size={17} /> Lo último que hice por ti</h3><button className="btn fantasma chico" onClick={() => ir('postulaciones')}>Ver todo <ArrowRight size={14} /></button></div>
          <div className="linea-tiempo">
            {r.actividad.map((a, i) => (
              <button key={i} className={'hito ' + a.tipo} onClick={() => a.id && abrir(a.id)}>
                <i />
                <span><b>{QUE[a.tipo] || a.tipo}</b> {a.empresa || a.titulo}<small>{a.tipo === 'postulacion' ? a.fuente : a.detalle} · {hace(a.fecha)}</small></span>
              </button>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  )
}
