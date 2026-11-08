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
import { LOGOS, PRIMERA_RONDA, TODOS_LOS_LOGOS, type LogoDef, type ColoresLogo } from './Logos'

/**
 * Parejas tipográficas: título + texto (y a veces una tercera para datos). Todas de Fontsource,
 * con subconjunto latin-ext (tildes, ñ, ¿¡). `peso`, `escala` y `tracking` ajustan cada letra de
 * título a su punto ideal: una condensada necesita más tamaño que una ancha para pesar lo mismo.
 */
type Fuente = { id: string; nombre: string; titulo: string; texto: string; datos?: string; peso: number; escala?: number; tracking?: string; familias: string; nota: string }
const MONO = "'Fragment Mono'"
const FUENTES: Fuente[] = [
  { id: 'bricolage', nombre: 'Bricolage + Hanken', titulo: "'Bricolage Grotesque Variable'", texto: "'Hanken Grotesk Variable'", peso: 700, tracking: '-0.03em', familias: 'Título: Bricolage Grotesque · Texto: Hanken Grotesk', nota: 'Grotesca con rarezas en la a, la g y la t que le dan voz propia; Hanken lee limpio en listas largas de ofertas.' },
  { id: 'instrument', nombre: 'Instrument Serif + Schibsted', titulo: "'Instrument Serif'", texto: "'Schibsted Grotesk Variable'", peso: 400, escala: 1.14, tracking: '-0.015em', familias: 'Título: Instrument Serif · Texto: Schibsted Grotesk', nota: 'Títulos finos de revista contra un texto firme y periodístico: se siente curada, no de plantilla.' },
  { id: 'young', nombre: 'Young Serif + Familjen', titulo: "'Young Serif'", texto: "'Familjen Grotesk Variable'", peso: 400, escala: 0.94, tracking: '-0.02em', familias: 'Título: Young Serif · Texto: Familjen Grotesk', nota: 'Serif redonda y amable con un texto de rasgos nórdicos: cálida sin ponerse infantil.' },
  { id: 'gloock', nombre: 'Gloock + Bricolage', titulo: "'Gloock'", texto: "'Bricolage Grotesque Variable'", peso: 400, tracking: '-0.015em', familias: 'Título: Gloock · Texto: Bricolage Grotesque', nota: 'Alto contraste de afiche en los títulos y un texto con carácter: la más llamativa de las serif.' },
  { id: 'unbounded', nombre: 'Unbounded + Onest', titulo: "'Unbounded Variable'", texto: "'Onest Variable'", datos: MONO, peso: 600, escala: 0.8, tracking: '-0.035em', familias: 'Título: Unbounded · Texto: Onest · Datos: Fragment Mono', nota: 'Títulos anchos y redondeados que hacen ver seguras las cifras grandes; Onest es sobria y rinde en pantallas chicas.' },
  { id: 'syne', nombre: 'Syne + Figtree', titulo: "'Syne Variable'", texto: "'Figtree Variable'", peso: 760, escala: 0.94, tracking: '-0.025em', familias: 'Título: Syne · Texto: Figtree', nota: 'Syne en negrita se ensancha y se vuelve gráfica, casi un logo; Figtree la calma con un texto geométrico y simpático.' },
  { id: 'newsreader', nombre: 'Newsreader + Host Grotesk', titulo: "'Newsreader Variable'", texto: "'Host Grotesk Variable'", datos: MONO, peso: 500, escala: 1.06, tracking: '-0.025em', familias: 'Título: Newsreader · Texto: Host Grotesk · Datos: Fragment Mono', nota: 'Serif de diario con tamaño óptico para titulares; Host es precisa y Fragment Mono ordena fechas, fit y portales.' },
  { id: 'funnel', nombre: 'Funnel Display + Funnel Sans', titulo: "'Funnel Display Variable'", texto: "'Funnel Sans Variable'", peso: 650, tracking: '-0.03em', familias: 'Título: Funnel Display · Texto: Funnel Sans', nota: 'Una familia con dos voces: display con cortes curiosos y su hermana de texto. Coherente sin esfuerzo.' },
  { id: 'gabarito', nombre: 'Gabarito + Literata', titulo: "'Gabarito Variable'", texto: "'Literata Variable'", peso: 800, tracking: '-0.035em', familias: 'Título: Gabarito · Texto: Literata', nota: 'Al revés de lo habitual: títulos sans compactos y texto en serif de lectura. Cuidada y poco vista.' },
  { id: 'bagel', nombre: 'Bagel Fat One + Rethink Sans', titulo: "'Bagel Fat One'", texto: "'Rethink Sans Variable'", peso: 400, escala: 0.9, tracking: '-0.01em', familias: 'Título: Bagel Fat One · Texto: Rethink Sans', nota: 'Títulos gorditos y juguetones que le quitan peso a buscar trabajo; Rethink equilibra con un texto serio y claro.' },
  { id: 'shoulders', nombre: 'Big Shoulders + Epilogue', titulo: "'Big Shoulders Variable'", texto: "'Epilogue Variable'", datos: MONO, peso: 800, escala: 1.2, tracking: '0em', familias: 'Título: Big Shoulders · Texto: Epilogue · Datos: Fragment Mono', nota: 'Condensada de cartel urbano, ideal para cifras y titulares cortos; Epilogue es amplia y la mono pone los datos.' },
  { id: 'darker', nombre: 'Darker Grotesque + Geologica', titulo: "'Darker Grotesque Variable'", texto: "'Geologica Variable'", peso: 800, escala: 1.22, tracking: '-0.01em', familias: 'Título: Darker Grotesque · Texto: Geologica', nota: 'Grotesca alta y apretada con mucha presencia en negrita; Geologica tiene un aire técnico que acompaña los datos.' },
]

const PALETAS = [
  { id: 'lino', nombre: 'Lino', nota: 'Suave y tranquila, la más pastel.', c: { fondo: '#FAF6F0', superficie: '#FFFDF9', suave: '#F2E9DD', borde: '#E6D5C1', acento: '#D9A066', accion: '#8B5E3C', tinta: '#2E2219', titulo: '#3B2A20', secundario: '#7A6656' } },
  { id: 'arcilla', nombre: 'Arcilla', nota: 'Más contraste: marrón profundo y acento terracota.', c: { fondo: '#F7F1E8', superficie: '#FFFCF7', suave: '#EDE3D5', borde: '#DCCBB5', acento: '#C2693E', accion: '#2B1D14', tinta: '#22170F', titulo: '#2B1D14', secundario: '#6E5A4A' } },
  { id: 'salvia', nombre: 'Salvia', nota: 'Tonos arena con un verde salvia suave como acento.', c: { fondo: '#F8F5EF', superficie: '#FFFEFA', suave: '#EEE8DC', borde: '#DDD3C2', acento: '#7E9F7A', accion: '#5B4636', tinta: '#2A231C', titulo: '#3A2E24', secundario: '#776A5C' } },
]
/** Ids de paleta de la primera versión del brand kit, para no perder lo que ya estaba guardado. */
const PALETA_ANTERIOR: Record<string, string> = { leche: 'lino', cortado: 'arcilla', avena: 'salvia' }

type Eleccion = { logo: string; fuente: string; paleta: string; animaciones: string[] }
const GUARDADO = 'rumbo-brandkit'
const INICIAL: Eleccion = { logo: LOGOS[0].id, fuente: FUENTES[0].id, paleta: PALETAS[0].id, animaciones: [] }

function cargar(): Eleccion {
  try {
    const g = JSON.parse(localStorage.getItem(GUARDADO) || 'null') as Partial<Record<keyof Eleccion, unknown>> | null
    if (!g || typeof g !== 'object') return INICIAL
    const paleta = typeof g.paleta === 'string' ? (PALETA_ANTERIOR[g.paleta] ?? g.paleta) : ''
    return {
      logo: TODOS_LOS_LOGOS.some(l => l.id === g.logo) ? (g.logo as string) : INICIAL.logo,
      fuente: FUENTES.some(f => f.id === g.fuente) ? (g.fuente as string) : INICIAL.fuente,
      paleta: PALETAS.some(p => p.id === paleta) ? paleta : INICIAL.paleta,
      animaciones: Array.isArray(g.animaciones) ? g.animaciones.filter((a): a is string => typeof a === 'string') : [],
    }
  } catch {
    return INICIAL
  }
}

/** Variables CSS de una pareja tipográfica (la página entera o una tarjeta de muestra). */
const varsFuente = (f: Fuente) => ({
  '--f-titulo': f.titulo, '--f-texto': f.texto, '--f-datos': f.datos ?? f.texto,
  '--p-titulo': String(f.peso), '--e-titulo': String(f.escala ?? 1), '--t-titulo': f.tracking ?? '-0.01em',
}) as CSSProperties

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

function TarjetaLogo({ l, c, elegido, repetir, onElegir }: { l: LogoDef; c: (typeof PALETAS)[number]['c']; elegido: boolean; repetir: number; onElegir: () => void }) {
  const claro: ColoresLogo = { tinta: c.titulo, acento: c.acento, fondo: c.fondo }
  const app: ColoresLogo = { ...claro, fondo: c.suave }
  const oscuro: ColoresLogo = { tinta: c.fondo, acento: c.acento, fondo: c.titulo }
  const palabra = l.proporcion > 1
  return (
    <Opcion elegida={elegido} onElegir={onElegir}>
      <div className={'bk-logo-grande' + (palabra ? ' palabra' : '')} key={l.id + repetir}><l.C c={claro} tamano={palabra ? 72 : 108} anim /></div>
      <h3>{l.nombre}</h3><p>{l.idea}</p>
      <div className="bk-logo-contexto">
        <figure><span className="app" style={{ background: c.suave }}><l.Icono c={app} tamano={40} /></span><figcaption>app</figcaption></figure>
        <figure><span className="fav"><l.Icono c={claro} tamano={32} /></span><figcaption>32 px</figcaption></figure>
        <figure><span className="fav"><l.Icono c={claro} tamano={16} /></span><figcaption>16 px</figcaption></figure>
        <figure><span className="app" style={{ background: c.titulo }}><l.Icono c={oscuro} tamano={40} /></span><figcaption>oscuro</figcaption></figure>
      </div>
      <div className="bk-pestana"><l.Icono c={{ ...claro, fondo: c.superficie }} tamano={16} /><span>Rumbo · 12 ofertas nuevas</span><i>×</i></div>
      <div className="bk-lockups">
        <span className="bk-lockup"><l.Icono c={claro} tamano={30} /><b>rumbo</b></span>
        <span className="bk-lockup oscuro"><l.Icono c={oscuro} tamano={30} /><b>rumbo</b></span>
      </div>
    </Opcion>
  )
}

function MuestraTipo({ f }: { f: Fuente }) {
  return (
    <div className="bk-tipo" style={varsFuente(f)}>
      <div className="bk-tipo-titulo">Encontré 42 ofertas para ti</div>
      <p className="bk-tipo-texto">Revisé Laborum, Computrabajo y LinkedIn mientras hacías otra cosa. ¿Postulo a las 12 que más calzan contigo?</p>
      <div className="bk-tipo-cuerpo">
        <div className="bk-tipo-oferta">
          <div className="bk-tipo-meta">LinkedIn · hace 2 h · fit 92</div>
          <div className="bk-tipo-cargo">Diseñadora de producto senior</div>
          <div className="bk-tipo-empresa">Compañía Andina de Señales · Ñuñoa</div>
          <div className="bk-tipo-chips"><span className="fuerte">¡Lista para enviar!</span><span>Remoto</span><span>Jornada completa</span></div>
        </div>
        <div className="bk-tipo-cifra"><b>128</b><small>postulaciones enviadas este mes</small></div>
      </div>
      <div className="bk-tipo-pie">
        <div><h3>{f.nombre}</h3><small>{f.familias}</small></div>
        <span className="bk-tipo-glifos">Aa Ññ ¿¡</span>
      </div>
      <p className="bk-tipo-nota">{f.nota}</p>
    </div>
  )
}

export default function BrandKit() {
  const [e, setE] = useState<Eleccion>(cargar)
  const [repetir, setRepetir] = useState(0)
  const [copiado, setCopiado] = useState(false)
  useEffect(() => localStorage.setItem(GUARDADO, JSON.stringify(e)), [e])
  const fuente = FUENTES.find(f => f.id === e.fuente)!
  const paleta = PALETAS.find(p => p.id === e.paleta)!
  const logo = TODOS_LOS_LOGOS.find(l => l.id === e.logo)!
  const c = paleta.c
  const cLogo = { tinta: c.titulo, acento: c.acento, fondo: c.fondo }
  const vars = useMemo(() => ({
    '--fondo': c.fondo, '--superficie': c.superficie, '--suave': c.suave, '--borde': c.borde, '--acento': c.acento,
    '--accion': c.accion, '--tinta': c.tinta, '--titulo': c.titulo, '--secundario': c.secundario,
    ...varsFuente(fuente),
  }) as CSSProperties, [c, fuente])
  const elegirLogo = (id: string) => { setE(x => ({ ...x, logo: id })); setRepetir(r => r + 1) }
  const gusta = (id: string) => setE(x => ({ ...x, animaciones: x.animaciones.includes(id) ? x.animaciones.filter(a => a !== id) : [...x.animaciones, id] }))
  const g = (id: string) => e.animaciones.includes(id)
  const nombreLogo = logo.nombre + (PRIMERA_RONDA.includes(logo) ? ' (primera ronda)' : '')
  const resumen = `Brand kit Rumbo · logo: ${nombreLogo} · tipografía: ${fuente.nombre} · paleta: ${paleta.nombre} · animaciones que me gustan: ${e.animaciones.join(', ') || 'ninguna todavía'}`

  return (
    <div className="bk" style={vars}>
      <nav className="bk-nav">
        <div className="bk-marca"><logo.Icono c={cLogo} tamano={30} /><span>rumbo</span><small>brand kit</small></div>
        <div className="bk-enlaces">{['logo', 'tipografia', 'color', 'movimiento', 'componentes', 'resumen'].map(s => <a key={s} href={'#' + s}>{s === 'tipografia' ? 'tipografía' : s}</a>)}</div>
      </nav>

      <header className="bk-hero">
        <div className="bk-puntos"><DotGrid dotSize={4} gap={22} baseColor={c.borde} activeColor={c.acento} proximity={120} glow={0} /></div>
        <div className="bk-hero-centro">
          <div className="bk-giro">
            <CircularText text="RUMBO · TU BÚSQUEDA EN PILOTO AUTOMÁTICO · " spinDuration={26} size={190} fontSize={11.5} color={c.secundario} />
            <div className="bk-giro-logo" key={e.logo + repetir}><logo.Icono c={cLogo} tamano={92} anim /></div>
          </div>
          <h1><BlurText key={e.fuente} text="Encuentra tu rumbo" animateBy="words" delay={90} /></h1>
          <p>Elige un logo, una tipografía y una paleta. Todo esta página cambia en vivo con tu elección, y al final
            copias el resumen para mandármelo.</p>
          <button className="bk-btn" onClick={() => setRepetir(r => r + 1)}>Repetir animación del logo</button>
        </div>
      </header>

      <section id="logo" className="bk-sec">
        <h2>1 · Logo</h2>
        <p className="bk-nota">Doce conceptos nuevos, dibujados a mano y todos planos. Cada tarjeta muestra el logo grande con su animación,
          el ícono de app, el favicon a 32 y 16 px, la versión sobre fondo oscuro y el logo junto al nombre con la tipografía que elegiste.</p>
        <div className="bk-grilla tres">
          {LOGOS.map(l => <TarjetaLogo key={l.id} l={l} c={c} elegido={e.logo === l.id} repetir={repetir} onElegir={() => elegirLogo(l.id)} />)}
        </div>
        <h3 className="bk-sub">Primera ronda</h3>
        <p className="bk-nota">Las cinco ideas anteriores, más simples. Siguen disponibles por si alguna te sigue gustando más.</p>
        <div className="bk-grilla cinco">
          {PRIMERA_RONDA.map(l => (
            <Opcion key={l.id} elegida={e.logo === l.id} onElegir={() => elegirLogo(l.id)}>
              <div className="bk-logo-grande chico" key={l.id + repetir}><l.C c={cLogo} tamano={64} anim /></div>
              <h3>{l.nombre}</h3><p>{l.idea}</p>
              <div className="bk-logo-mini">
                <span className="claro"><l.C c={cLogo} tamano={16} /></span>
                <span className="claro"><l.C c={cLogo} tamano={28} /></span>
                <span className="oscuro"><l.C c={{ tinta: c.fondo, acento: c.acento, fondo: c.titulo }} tamano={28} /></span>
              </div>
            </Opcion>
          ))}
        </div>
      </section>

      <section id="tipografia" className="bk-sec">
        <h2>2 · Tipografía</h2>
        <p className="bk-nota">Doce parejas, cada una con letra de título y letra de texto (y en algunas, una mono para datos). Todas
          traen tildes, ñ y signos de apertura. La que elijas se aplica a toda la página.</p>
        <div className="bk-grilla dos">
          {FUENTES.map(f => (
            <Opcion key={f.id} elegida={e.fuente === f.id} onElegir={() => setE(x => ({ ...x, fuente: f.id }))}>
              <MuestraTipo f={f} />
            </Opcion>
          ))}
        </div>
      </section>

      <section id="color" className="bk-sec">
        <h2>3 · Color</h2>
        <p className="bk-nota">Tres paletas planas. La que elijas se aplica a toda la página.</p>
        <div className="bk-grilla tres">
          {PALETAS.map(p => (
            <Opcion key={p.id} elegida={e.paleta === p.id} onElegir={() => setE(x => ({ ...x, paleta: p.id }))}>
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
            <div key={repetir}><logo.C c={cLogo} tamano={logo.proporcion > 1 ? 52 : 84} anim /></div></Demo>
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
        <div className="bk-elegido"><logo.Icono c={cLogo} tamano={64} /><div><b>{nombreLogo}</b> · {fuente.nombre} · {paleta.nombre}<br />
          <small>Animaciones: {e.animaciones.join(', ') || 'marca con ♥ las que te gusten'}</small></div></div>
        <button className="bk-btn" onClick={async () => { await navigator.clipboard.writeText(resumen); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }}>
          {copiado ? 'Copiado' : 'Copiar resumen para mandármelo'}</button>
      </section>
    </div>
  )
}
