import { enviar } from '../api'
import type { Ctx } from '../App'
import { Entrada, Panel, Titulo } from '../comunes'
import SquishSwitch from '../rb/SquishSwitch'

export default function Fuentes({ estado, recargar }: Ctx) {
  const cambiar = async (clave: string, activa: boolean) => { await enviar('/api/config', { fuentes: { [clave]: activa } }); recargar() }
  return (
    <>
      <header className="cab"><Titulo texto="Fuentes" sub='Dónde busca Rumbo. Las que dicen "postula" pueden enviar tu postulación solas; las demás son solo para encontrar.' /></header>
      <div className="grilla">
        {estado.fuentes.map((f, i) => (
          <Entrada key={f.clave} retraso={i * 0.04}>
            <Panel className={'fuente' + (f.activa ? '' : ' off')}>
              <div className="top"><h3>{f.nombre}</h3>
                <SquishSwitch checked={f.activa} onChange={v => cambiar(f.clave, v)} trackColor="#E6D5C1" trackOnColor="#8B5E3C" thumbColor="#FFFDF9" thumbOnColor="#FFFDF9" width={46} height={26} />
              </div>
              <p>{f.descripcion}</p>
              <div className="chips"><span className="chip">{f.total} encontradas</span>
                {f.postula ? <span className="chip ok">postula</span> : <span className="chip">solo encontrar</span>}</div>
            </Panel>
          </Entrada>
        ))}
      </div>
    </>
  )
}
