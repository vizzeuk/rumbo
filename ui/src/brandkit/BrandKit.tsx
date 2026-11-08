import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { motion } from 'motion/react'
import BlurText from '../rb/BlurText'
import SplitText from '../rb/SplitText'
import DecryptedText from '../rb/DecryptedText'
import TextType from '../rb/TextType'
import RotatingText from '../rb/RotatingText'
import TrueFocus from '../rb/TrueFocus'
import CountUp from '../rb/CountUp'
import Magnet from '../rb/Magnet'
import ClickSpark from '../rb/ClickSpark'
import SquishSwitch from '../rb/SquishSwitch'
import JellyRadio from '../rb/JellyRadio'
import HoldButton from '../rb/HoldButton'
import StatusMark from '../rb/StatusMark'
import CircularText from '../rb/CircularText'
import DotGrid from '../rb/DotGrid'
import { LOGOS } from './Logos'

const FUENTES = [
  { id: 'bricolage', nombre: 'Bricolage + Hanken', titulo: "'Bricolage Grotesque Variable'", texto: "'Hanken Grotesk Variable'", nota: 'Moderna con carácter: letras con personalidad, pero muy legibles.' },
  { id: 'instrument', nombre: 'Instrument Serif + Schibsted', titulo: "'Instrument Serif'", texto: "'Schibsted Grotesk Variable'", nota: 'Editorial y elegante, como una revista. Títulos finos y grandes.' },
  { id: 'young', nombre: 'Young Serif + Familjen', titulo: "'Young Serif'", texto: "'Familjen Grotesk Variable'", nota: 'Cálida y cercana: serif redonda con texto amable.' },
  { id: 'gloock', nombre: 'Gloock + Bricolage', titulo: "'Gloock'", texto: "'Bricolage Grotesque Variable'", nota: 'La más llamativa: títulos de alto contraste, texto con carácter.' },
]

const PALETAS = [
  { id: 'leche', nombre: 'Café con leche', nota: 'Suave y tranquila, la más pastel.', c: { fondo: '#FAF6F0', superficie: '#FFFDF9', suave: '#F2E9DD', borde: '#E6D5C1', acento: '#D9A066', accion: '#8B5E3C', tinta: '#2E2219', titulo: '#3B2A20', secundario: '#7A6656' } },
  { id: 'cortado', nombre: 'Cortado', nota: 'Más contraste: espresso profundo y acento terracota.', c: { fondo: '#F7F1E8', superficie: '#FFFCF7', suave: '#EDE3D5', borde: '#DCCBB5', acento: '#C2693E', accion: '#2B1D14', tinta: '#22170F', titulo: '#2B1D14', secundario: '#6E5A4A' } },
  { id: 'avena', nombre: 'Avena y salvia', nota: 'Café con un verde salvia suave como acento.', c: { fondo: '#F8F5EF', superficie: '#FFFEFA', suave: '#EEE8DC', borde: '#DDD3C2', acento: '#7E9F7A', accion: '#5B4636', tinta: '#2A231C', titulo: '#3A2E24', secundario: '#776A5C' } },
]

type Eleccion = { logo: string; fuente: string; paleta: string; animaciones: string[] }
const GUARDADO = 'rumbo-brandkit'

function Opcion({ elegida, onElegir, children }: { elegida: boolean; onElegir: () => void; children: ReactNode }) {
  return (
    <motion.div className={'opcion' + (elegida ? ' elegida' : '')} onClick={onElegir} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
      {elegida && <motion.span layoutId={undefined} className="sello" initial={{ scale: 0 }} animate={{ scale: 1 }}>Elegido</motion.span>}
      {children}
    </motion.div>
  )
}

function Demo({ id, nombre, nota, gusta, cambiar, children }: { id: string; nombre: string; nota: string; gusta: boolean; cambiar: (id: string) => void; children: ReactNode }) {
  return (
    <div className={'demo' + (gusta ? ' gusta' : '')}>
      <div className="escena">{children}</div>
      <div className="pie">
        <div><b>{nombre}</b><small>{nota}</small></div>
        <button className={'corazon' + (gusta ? ' on' : '')} onClick={() => cambiar(id)}>{gusta ? '♥ Me gusta' : '♡ Me gusta'}</button>
      </div>
    </div>
  )
}

export default function BrandKit() {
  const [e, setE] = useState<Eleccion>(() => JSON.parse(localStorage.getItem(GUARDADO) || 'null') || { logo: 'norte', fuente: 'bricolage', paleta: 'leche', animaciones: [] })
  const [repetir, setRepetir] = useState(0)
  const [copiado, setCopiado] = useState(false)
  useEffect(() => localStorage.setItem(GUARDADO, JSON.stringify(e)), [e])
  const fuente = FUENTES.find(f => f.id === e.fuente)!
  const paleta = PALETAS.find(p => p.id === e.paleta)!
  const logo = LOGOS.find(l => l.id === e.logo)!
  const c = paleta.c
  const cLogo = { tinta: c.titulo, acento: c.acento, fondo: c.fondo }
  const vars = useMemo(() => ({
    '--fondo': c.fondo, '--superficie': c.superficie, '--suave': c.suave, '--borde': c.borde, '--acento': c.acento,
    '--accion': c.accion, '--tinta': c.tinta, '--titulo': c.titulo, '--secundario': c.secundario,
    '--f-titulo': fuente.titulo, '--f-texto': fuente.texto,
  }) as CSSProperties, [c, fuente])
  const gusta = (id: string) => setE(x => ({ ...x, animaciones: x.animaciones.includes(id) ? x.animaciones.filter(a => a !== id) : [...x.animaciones, id] }))
  const g = (id: string) => e.animaciones.includes(id)
  const resumen = `Brand kit Rumbo · logo: ${logo.nombre} · tipografía: ${fuente.nombre} · paleta: ${paleta.nombre} · animaciones que me gustan: ${e.animaciones.join(', ') || 'ninguna todavía'}`

  return (
    <div className="bk" style={vars}>
      <nav className="bk-nav">
        <div className="bk-marca"><logo.C c={cLogo} tamano={30} /><span>rumbo</span><small>brand kit</small></div>
        <div className="bk-enlaces">{['logo', 'tipografia', 'color', 'movimiento', 'componentes', 'resumen'].map(s => <a key={s} href={'#' + s}>{s === 'tipografia' ? 'tipografía' : s}</a>)}</div>
      </nav>

      <header className="bk-hero">
        <div className="bk-puntos"><DotGrid dotSize={4} gap={22} baseColor={c.borde} activeColor={c.acento} proximity={120} glow={0} /></div>
        <div className="bk-hero-centro">
          <div className="bk-giro">
            <CircularText text="RUMBO · TU BÚSQUEDA EN PILOTO AUTOMÁTICO · " spinDuration={26} size={190} fontSize={11.5} color={c.secundario} />
            <div className="bk-giro-logo" key={e.logo + repetir}><logo.C c={cLogo} tamano={92} anim /></div>
          </div>
          <h1><BlurText key={e.fuente} text="Encuentra tu rumbo" animateBy="words" delay={90} /></h1>
          <p>Elige un logo, una tipografía y una paleta. Todo esta página cambia en vivo con tu elección, y al final
            copias el resumen para mandármelo.</p>
          <button className="bk-btn" onClick={() => setRepetir(r => r + 1)}>Repetir animación del logo</button>
        </div>
      </header>

      <section id="logo" className="bk-sec">
        <h2>1 · Logo</h2>
        <p className="bk-nota">Cinco ideas nuevas, todas planas (sin degradados). Pasa el mouse y elige una. Abajo de cada una, cómo se ve chica y sobre fondo oscuro.</p>
        <div className="bk-grilla cinco">
          {LOGOS.map(l => (
            <Opcion key={l.id} elegida={e.logo === l.id} onElegir={() => { setE({ ...e, logo: l.id }); setRepetir(r => r + 1) }}>
              <div className="bk-logo-grande" key={l.id + repetir}><l.C c={cLogo} tamano={96} anim /></div>
              <h3>{l.nombre}</h3><p>{l.idea}</p>
              <div className="bk-logo-variantes">
                <span className="claro"><l.C c={cLogo} tamano={22} /></span>
                <span className="claro"><l.C c={cLogo} tamano={36} /></span>
                <span className="oscuro"><l.C c={{ tinta: c.fondo, acento: c.acento, fondo: c.titulo }} tamano={36} /></span>
                <span className="marca-chica"><l.C c={cLogo} tamano={26} /><b>rumbo</b></span>
              </div>
            </Opcion>
          ))}
        </div>
      </section>

      <section id="tipografia" className="bk-sec">
        <h2>2 · Tipografía</h2>
        <p className="bk-nota">Cuatro combinaciones con más carácter. Cada una usa una letra para títulos y otra para el texto de la app.</p>
        <div className="bk-grilla dos">
          {FUENTES.map(f => (
            <Opcion key={f.id} elegida={e.fuente === f.id} onElegir={() => setE({ ...e, fuente: f.id })}>
              <div style={{ fontFamily: f.titulo }} className="bk-tipo-titulo">Encuentra tu rumbo</div>
              <div style={{ fontFamily: f.titulo }} className="bk-tipo-numero">128 ofertas · 92%</div>
              <p style={{ fontFamily: f.texto }}>Rumbo busca ofertas por ti, las evalúa con tu perfil y redacta cada postulación. Tú decides qué enviar.</p>
              <div style={{ fontFamily: f.texto }} className="bk-tipo-ui"><span>Buscar ahora</span><span>fit 86</span><span>Enviada hace 2 h</span></div>
              <h3 style={{ fontFamily: f.texto }}>{f.nombre}</h3><p className="bk-nota">{f.nota}</p>
            </Opcion>
          ))}
        </div>
      </section>

      <section id="color" className="bk-sec">
        <h2>3 · Color</h2>
        <p className="bk-nota">Tres paletas planas. La que elijas se aplica a toda la página.</p>
        <div className="bk-grilla tres">
          {PALETAS.map(p => (
            <Opcion key={p.id} elegida={e.paleta === p.id} onElegir={() => setE({ ...e, paleta: p.id })}>
              <div className="bk-muestras">{Object.entries(p.c).map(([k, v]) => <div key={k} className="bk-muestra"><span style={{ background: v }} /><small>{k}<br /><code>{v}</code></small></div>)}</div>
              <h3>{p.nombre}</h3><p className="bk-nota">{p.nota}</p>
            </Opcion>
          ))}
        </div>
      </section>

      <section id="movimiento" className="bk-sec">
        <h2>4 · Movimiento</h2>
        <p className="bk-nota">Animaciones de React Bits, sin degradados. Marca con ♥ las que te gusten para la app.</p>
        <div className="bk-grilla tres">
          <Demo id="BlurText" nombre="BlurText" nota="Títulos que aparecen enfocándose." gusta={g('BlurText')} cambiar={gusta}>
            <h3 className="bk-grande"><BlurText key={repetir} text="Hola, Camila" animateBy="words" delay={120} /></h3></Demo>
          <Demo id="SplitText" nombre="SplitText" nota="Letras que suben una por una." gusta={g('SplitText')} cambiar={gusta}>
            <SplitText key={repetir} text="Tu búsqueda, ordenada" tag="h3" className="bk-grande" splitType="chars" delay={30} /></Demo>
          <Demo id="DecryptedText" nombre="DecryptedText" nota="El texto se descifra, ideal para datos." gusta={g('DecryptedText')} cambiar={gusta}>
            <span className="bk-grande"><DecryptedText key={repetir} text="12 ofertas nuevas" animateOn="view" sequential speed={40} /></span></Demo>
          <Demo id="TextType" nombre="TextType" nota="Como si alguien escribiera en vivo." gusta={g('TextType')} cambiar={gusta}>
            <TextType className="bk-grande" text={['Buscando en Laborum...', 'Evaluando con IA...', 'Postulación lista.']} typingSpeed={45} pauseDuration={1400} cursorCharacter="|" /></Demo>
          <Demo id="RotatingText" nombre="RotatingText" nota="Palabras que se reemplazan." gusta={g('RotatingText')} cambiar={gusta}>
            <h3 className="bk-grande">Tu trabajo, <span className="bk-rot"><RotatingText texts={['encontrado', 'evaluado', 'enviado']} rotationInterval={1800} /></span></h3></Demo>
          <Demo id="TrueFocus" nombre="TrueFocus" nota="Enfoca una palabra a la vez." gusta={g('TrueFocus')} cambiar={gusta}>
            <TrueFocus sentence="Busca Evalúa Postula" borderColor={c.acento} blurAmount={3} glowColor="transparent" /></Demo>
          <Demo id="CountUp" nombre="CountUp" nota="Números que cuentan hasta su valor." gusta={g('CountUp')} cambiar={gusta}>
            <span className="bk-numero"><CountUp key={repetir} to={128} duration={1.4} /></span></Demo>
          <Demo id="Magnet" nombre="Magnet" nota="El botón se acerca al mouse." gusta={g('Magnet')} cambiar={gusta}>
            <Magnet padding={60} magnetStrength={3}><button className="bk-btn">Buscar ahora</button></Magnet></Demo>
          <Demo id="ClickSpark" nombre="ClickSpark" nota="Chispas al hacer clic." gusta={g('ClickSpark')} cambiar={gusta}>
            <ClickSpark sparkColor={c.acento} glow={0} sparkCount={10} sparkRadius={28}><button className="bk-btn">Haz clic</button></ClickSpark></Demo>
          <Demo id="HoldButton" nombre="HoldButton" nota="Mantén apretado para confirmar algo importante." gusta={g('HoldButton')} cambiar={gusta}>
            <HoldButton backgroundColor={c.suave} fillColor={c.accion} textColor={c.tinta} fillTextColor={c.superficie} glow={false} doneLabel="Enviados" holdTime={1.2}>Mantén para enviar 12</HoldButton></Demo>
          <Demo id="SquishSwitch" nombre="SquishSwitch" nota="Interruptor elástico." gusta={g('SquishSwitch')} cambiar={gusta}>
            <SquishSwitch defaultChecked trackColor={c.borde} trackOnColor={c.accion} thumbColor={c.superficie} thumbOnColor={c.superficie} width={56} height={32} /></Demo>
          <Demo id="JellyRadio" nombre="JellyRadio" nota="Selector con rebote." gusta={g('JellyRadio')} cambiar={gusta}>
            <JellyRadio items={[{ label: 'Remoto', value: 'r' }, { label: 'Híbrido', value: 'h' }, { label: 'Presencial', value: 'p' }]} defaultValue="r" chipColor={c.suave} activeColor={c.accion} textColor={c.tinta} activeTextColor={c.superficie} /></Demo>
          <Demo id="StatusMark" nombre="StatusMark" nota="Estado del motor: trabajando o listo." gusta={g('StatusMark')} cambiar={gusta}>
            <div className="bk-estados"><StatusMark status="running" size={26} color={c.accion} /><StatusMark status="done" size={26} color={c.acento} /><StatusMark status="failed" size={26} color="#B5503F" /></div></Demo>
          <Demo id="DotGrid" nombre="DotGrid" nota="Fondo de puntos que reacciona al mouse (el de arriba)." gusta={g('DotGrid')} cambiar={gusta}>
            <div style={{ position: 'relative', width: '100%', height: 120 }}><DotGrid dotSize={3} gap={14} baseColor={c.borde} activeColor={c.acento} proximity={70} glow={0} /></div></Demo>
          <Demo id="CircularText" nombre="CircularText" nota="Texto girando alrededor del logo." gusta={g('CircularText')} cambiar={gusta}>
            <CircularText text="RUMBO · RUMBO · RUMBO · " spinDuration={14} size={120} fontSize={11} color={c.secundario} /></Demo>
          <Demo id="LogoAnimado" nombre="Logo animado" nota="El logo se dibuja al abrir la app." gusta={g('LogoAnimado')} cambiar={gusta}>
            <div key={repetir}><logo.C c={cLogo} tamano={84} anim /></div></Demo>
        </div>
      </section>

      <section id="componentes" className="bk-sec">
        <h2>5 · Componentes</h2>
        <p className="bk-nota">Así se verían las piezas de la app con lo que elegiste. Todo plano.</p>
        <div className="bk-componentes">
          <div className="bk-tarjeta">
            <div className="bk-chips"><span className="fitA">fit 86</span><span>Laborum</span><span className="ok">postula solo</span></div>
            <h3>Asistente contable · Las Condes</h3>
            <p>Calza con tu experiencia en conciliaciones y remuneraciones; jornada completa presencial.</p>
            <div className="bk-fila"><button className="bk-btn">Postular</button><button className="bk-btn sec">Copiar y abrir</button><button className="bk-btn fan">Descartar</button></div>
          </div>
          <div className="bk-tarjeta">
            <div className="bk-kpis">{[['Encontradas', 128], ['Listas', 12], ['Enviadas', 41], ['Respuestas', 3]].map(([n, v]) => <div key={n}><b><CountUp key={repetir} to={v as number} duration={1.1} /></b><small>{n}</small></div>)}</div>
            <label>Qué buscas</label><input defaultValue="asistente contable, analista contable" />
            <div className="bk-toast">Correo enviado a Gina Travel</div>
          </div>
        </div>
      </section>

      <section id="resumen" className="bk-sec bk-resumen">
        <h2>Tu elección</h2>
        <div className="bk-elegido"><logo.C c={cLogo} tamano={64} /><div><b>{logo.nombre}</b> · {fuente.nombre} · {paleta.nombre}<br />
          <small>Animaciones: {e.animaciones.join(', ') || 'marca con ♥ las que te gusten'}</small></div></div>
        <button className="bk-btn" onClick={async () => { await navigator.clipboard.writeText(resumen); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }}>
          {copiado ? 'Copiado' : 'Copiar resumen para mandármelo'}</button>
      </section>
    </div>
  )
}
