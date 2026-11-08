import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { enviar, hace, NOMBRE_ESTADO, type Estado, type Oferta } from '../api'
import type { Ctx } from '../App'
import { Canal, Fit, Titulo, useAviso } from '../comunes'

const ETAPAS: [Estado, string][] = [['nueva', 'Nuevas'], ['lista', 'Listas para postular'], ['enviada', 'Enviadas'],
  ['respondio', 'Respondieron'], ['entrevista', 'Entrevistas']]

export default function Oportunidades({ estado, ofertas, abrir, recargar }: Ctx) {
  const aviso = useAviso()
  const [modo, setModo] = useState<'tablero' | 'lista'>('tablero')
  const [q, setQ] = useState(''); const [fuente, setFuente] = useState(''); const [tipo, setTipo] = useState('')
  const [fitMin, setFitMin] = useState(0); const [descartadas, setDescartadas] = useState(false)
  const [orden, setOrden] = useState<{ k: keyof Oferta; d: number }>({ k: 'fit', d: -1 })
  const [sobre, setSobre] = useState<Estado | null>(null)
  const pegar = useRef<HTMLDialogElement>(null)
  const [nueva, setNueva] = useState({ titulo: '', url: '', email: '', texto: '' })

  const fuentes = useMemo(() => [...new Set(ofertas.map(o => o.fuente))].sort(), [ofertas])
  const L = ofertas.filter(o => (descartadas || o.estado !== 'descartada') && (!fuente || o.fuente === fuente)
    && (!tipo || o.tipo === tipo) && (!fitMin || (o.fit ?? 0) >= fitMin)
    && (!q || `${o.titulo} ${o.empresa} ${o.descripcion}`.toLowerCase().includes(q.toLowerCase())))
  const etapas = descartadas ? [...ETAPAS, ['descartada', 'Descartadas'] as [Estado, string]] : ETAPAS

  const mover = async (id: string, e: Estado) => { await enviar('/api/oferta', { id, accion: e }); recargar() }
  const agregar = async () => {
    const r = await enviar('/api/manual', nueva); aviso(r.error || r.ok || ''); pegar.current?.close()
    setNueva({ titulo: '', url: '', email: '', texto: '' }); recargar()
  }

  const tarjeta = (o: Oferta) => (
    <motion.div layout key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .96 }}>
      <div className="tarjeta" draggable onClick={() => abrir(o.id)} onDragStart={ev => ev.dataTransfer.setData('id', o.id)}>
        <div className="chips"><Fit o={o} /><span className="chip">{o.fuente}</span><Canal o={o} portales={estado.portales_postulacion} /></div>
        <div className="t">{o.titulo}</div>
        <div className="m">{o.motivo || o.presupuesto || o.modalidad || o.ubicacion}</div>
        {o.error && <div className="err">⚠ {o.error.slice(0, 90)}</div>}
        <div className="f"><span>{o.empresa}</span><span>{o.enviada ? 'enviada ' + hace(o.enviada) : hace(o.encontrada)}</span></div>
      </div>
    </motion.div>
  )

  return (
    <>
      <header className="cab">
        <Titulo texto="Oportunidades" sub="Arrastra una tarjeta para cambiarla de etapa. Haz clic para ver y editar la postulación." />
        <div className="acciones"><button className="btn" onClick={() => pegar.current?.showModal()}>Pegar una oferta</button></div>
      </header>
      <div className="barra-filtros">
        <div className="segmento">
          <button className={modo === 'tablero' ? 'on' : ''} onClick={() => setModo('tablero')}>Tablero</button>
          <button className={modo === 'lista' ? 'on' : ''} onClick={() => setModo('lista')}>Lista</button>
        </div>
        <input type="search" placeholder="Buscar por cargo, empresa o texto" value={q} onChange={e => setQ(e.target.value)} />
        <select value={fuente} onChange={e => setFuente(e.target.value)}><option value="">Todas las fuentes</option>{fuentes.map(f => <option key={f}>{f}</option>)}</select>
        <select value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="">Todos los tipos</option><option value="oferta">Ofertas de portales</option><option value="agencia">Clientes por correo</option>
          <option value="manual">Pegadas a mano</option><option value="solo_ver">Solo ver</option></select>
        <select value={fitMin} onChange={e => setFitMin(+e.target.value)}><option value={0}>Cualquier fit</option><option value={40}>Fit 40+</option><option value={60}>Fit 60+</option><option value={80}>Fit 80+</option></select>
        <label className="check" style={{ margin: 0 }}><input type="checkbox" checked={descartadas} onChange={e => setDescartadas(e.target.checked)} /> Descartadas</label>
      </div>

      {modo === 'tablero' ? (
        <div className="tablero">
          {etapas.map(([k, n]) => {
            const items = L.filter(o => o.estado === k).sort((a, b) => (b.fit ?? -1) - (a.fit ?? -1) || b.encontrada - a.encontrada)
            return (
              <div key={k} className={'col' + (sobre === k ? ' drop' : '')}
                onDragOver={e => { e.preventDefault(); setSobre(k) }} onDragLeave={() => setSobre(null)}
                onDrop={e => { e.preventDefault(); setSobre(null); const id = e.dataTransfer.getData('id'); if (id) mover(id, k) }}>
                <h3>{n}<span>{items.length}</span></h3>
                <AnimatePresence initial={false}>{items.map(tarjeta)}</AnimatePresence>
                {!items.length && <div className="vacio">Nada por aquí</div>}
              </div>
            )
          })}
        </div>
      ) : (
        <table className="tabla"><thead><tr>
          {([['fit', 'Fit'], ['titulo', 'Oportunidad'], ['fuente', 'Fuente'], ['estado', 'Etapa'], ['encontrada', 'Encontrada'], ['enviada', 'Enviada']] as [keyof Oferta, string][])
            .map(([k, n]) => <th key={k} onClick={() => setOrden({ k, d: orden.k === k ? -orden.d : -1 })}>{n}</th>)}
        </tr></thead><tbody>
          {[...L].sort((a, b) => { const x = a[orden.k] ?? -1, y = b[orden.k] ?? -1; return (x > y ? 1 : x < y ? -1 : 0) * orden.d }).map(o => (
            <tr key={o.id} onClick={() => abrir(o.id)}><td><Fit o={o} /></td><td><b>{o.titulo}</b><div className="hist">{o.empresa}</div></td>
              <td>{o.fuente}</td><td>{NOMBRE_ESTADO[o.estado]}</td><td className="hist">{hace(o.encontrada)}</td><td className="hist">{hace(o.enviada)}</td></tr>
          ))}
        </tbody></table>
      )}

      <dialog ref={pegar}>
        <h2>Pegar una oferta</h2>
        <p className="nota">De cualquier portal, grupo o diario. Copia el texto completo y la IA la evalúa y redacta tu postulación.</p>
        <div className="form">
          <label>Cargo o título</label><input value={nueva.titulo} onChange={e => setNueva({ ...nueva, titulo: e.target.value })} />
          <label>Enlace</label><input value={nueva.url} onChange={e => setNueva({ ...nueva, url: e.target.value })} />
          <label>Correo de contacto (si tiene)</label><input value={nueva.email} onChange={e => setNueva({ ...nueva, email: e.target.value })} />
          <label>Texto de la oferta</label><textarea rows={8} value={nueva.texto} onChange={e => setNueva({ ...nueva, texto: e.target.value })} />
        </div>
        <div className="acciones"><button className="btn primario" onClick={agregar}>Agregar y evaluar</button>
          <button className="btn fantasma" onClick={() => pegar.current?.close()}>Cancelar</button></div>
      </dialog>
    </>
  )
}
