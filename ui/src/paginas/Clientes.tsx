import { useState } from 'react'
import { Building03Icon, Rocket01Icon, Store01Icon } from '@hugeicons/core-free-icons'
import { enviar, hace, NOMBRE_ESTADO } from '../api'
import type { Ctx } from '../App'
import { Entrada, Fit, Icono, Panel, Titulo, useAviso } from '../comunes'
import GlareHover from '../rb/GlareHover'

const SEGMENTOS = [
  { id: 'pymes', nombre: 'Pymes', icono: Store01Icon, texto: 'Negocios pequeños con señales de que les sirve lo que ofreces: procesos manuales, poca presencia en internet, agenda o ventas solo por WhatsApp.' },
  { id: 'startups', nombre: 'Startups', icono: Rocket01Icon, texto: 'Empresas jóvenes con equipo chico que necesitan apoyo por entregables o part time.' },
  { id: 'agencias', nombre: 'Agencias', icono: Building03Icon, texto: 'Agencias y consultoras de tu rubro que subcontratan cuando tienen más trabajo.' },
]

export default function Clientes({ ofertas, abrir, estado }: Ctx) {
  const aviso = useAviso()
  const [rubro, setRubro] = useState('')
  const [n, setN] = useState(10)
  const prospectos = ofertas.filter(o => o.tipo === 'agencia').sort((a, b) => (b.encontrada || 0) - (a.encontrada || 0))
  const buscar = async (segmento: string) => {
    const r = await enviar('/api/agencias', { segmento, rubro, n }); aviso(r.error || r.ok || '', !!r.error)
  }
  const enviadas = prospectos.filter(o => o.enviada).length

  return (
    <>
      <header className="cab">
        <Titulo texto="Clientes por correo" sub="Para freelancers y quien ofrece servicios: la IA encuentra empresas con su correo publicado y les escribe un correo humano, uno por uno." />
      </header>
      <div className="dos izq">
        <div className="grilla" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {SEGMENTOS.map((s, i) => (
            <Entrada key={s.id} retraso={i * 0.06}>
              <GlareHover width="100%" height="100%" background="var(--leche)" borderRadius="18px" borderColor="var(--linea)" glareColor="#E8B98F" glareOpacity={0.35}>
                <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
                  <span className="ico"><Icono icono={s.icono} /></span>
                  <h3>{s.nombre}</h3>
                  <p className="nota" style={{ flex: 1, margin: 0 }}>{s.texto}</p>
                  <button className="btn primario" onClick={() => buscar(s.id)}>Buscar {s.nombre.toLowerCase()}</button>
                </div>
              </GlareHover>
            </Entrada>
          ))}
        </div>
        <Entrada retraso={0.2}><Panel>
          <h2>Ajustar la búsqueda</h2>
          <div className="form">
            <label>Rubro (opcional, sirve para pymes)</label>
            <input placeholder="clínicas, inmobiliarias, talleres, restaurantes..." value={rubro} onChange={e => setRubro(e.target.value)} />
            <label>Cuántas empresas por búsqueda</label>
            <input type="number" min={1} max={15} value={n} onChange={e => setN(+e.target.value)} />
          </div>
          <p className="nota" style={{ marginTop: 14 }}>
            {estado.config.envio.modo_automatico
              ? `El modo automático envía hasta ${estado.config.envio.limite_correos_dia} correos al día a las de fit ${estado.config.envio.umbral} o más, y recuerda a los ${estado.config.envio.dias_seguimiento} días.`
              : 'El modo automático está apagado: revisas y envías cada correo desde Oportunidades.'}
          </p>
          <div className="chips"><span className="chip">{prospectos.length} encontradas</span><span className="chip ok">{enviadas} contactadas</span></div>
        </Panel></Entrada>
      </div>
      <Panel className="plano">
        <h2>Empresas encontradas</h2>
        {prospectos.slice(0, 80).map(o => (
          <div className="fila-ico clic" key={o.id} onClick={() => abrir(o.id)}>
            <Fit o={o} />
            <div><div className="t">{o.empresa}</div><small>{o.fuente} · {o.email} · {o.asunto || 'sin redactar'}</small></div>
            <span className={'chip ' + (o.estado === 'respondio' ? 'ok' : '')}>{NOMBRE_ESTADO[o.estado]}{o.enviada ? ` ${hace(o.enviada)}` : ''}</span>
          </div>
        ))}
        {!prospectos.length && <div className="vacio">Elige un segmento arriba y la IA empezará a buscar.</div>}
      </Panel>
    </>
  )
}
