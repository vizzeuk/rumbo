import { useEffect, useRef, useState } from 'react'
import { leer, type EventoVivo, type Vivo } from './api'

/** Estado de la búsqueda en vivo, armado desde los eventos que manda el motor (GET /api/vivo). */
export type FaseId = 'buscar' | 'evaluar' | 'respuestas' | 'correos' | 'postular'
export type FuenteVivo = { clave: string; nombre: string; sitio: string; estado: 'esperando' | 'buscando' | 'lista' | 'error'; nuevas: number; error?: string }
export type Item = {
  id: string; titulo: string; empresa: string; fuente: string; url: string; sitio: string
  guardada: boolean; nota: string; fit?: number; motivo?: string; lista?: boolean
  postulada?: boolean; correo?: boolean; t: number
}
export type Corrida = {
  activa: boolean; masivo: boolean; consulta: string; inicio: number; fin: number | null; fase: FaseId | null; fasesHechas: FaseId[]
  fuentes: FuenteVivo[]; items: Item[]; revisadas: number; guardadas: number; descartadas: number
  evaluadas: number; porEvaluar: number; listas: number; postuladas: number; correos: number; resumen: string
}

const vacia = (): Corrida => ({
  activa: false, masivo: false, consulta: '', inicio: 0, fin: null, fase: null, fasesHechas: [], fuentes: [], items: [],
  revisadas: 0, guardadas: 0, descartadas: 0, evaluadas: 0, porEvaluar: 0, listas: 0, postuladas: 0, correos: 0, resumen: '',
})

const s = (v: unknown) => (typeof v === 'string' ? v : '')

function aplicar(c: Corrida, e: EventoVivo): Corrida {
  switch (e.tipo) {
    case 'ciclo':
      if (e.fase === 'inicio') return { ...vacia(), activa: true, masivo: !!e.masivo, consulta: s(e.consulta), inicio: e.t }
      return { ...c, activa: false, fin: e.t, fase: null, fasesHechas: c.fase ? [...c.fasesHechas, c.fase] : c.fasesHechas, resumen: s(e.resumen) }
    case 'fase': {
      const hechas = c.fase && c.fase !== e.fase ? [...c.fasesHechas, c.fase] : c.fasesHechas
      const x: Corrida = { ...c, activa: true, fase: e.fase as FaseId, fasesHechas: hechas }
      if (e.fase === 'buscar' && Array.isArray(e.fuentes))
        x.fuentes = (e.fuentes as FuenteVivo[]).map(f => ({ ...f, estado: 'esperando', nuevas: 0 }))
      if (e.fase === 'evaluar') x.porEvaluar = Number(e.total || 0)
      return x
    }
    case 'fuente': {
      const f = { clave: s(e.clave), nombre: s(e.nombre), sitio: s(e.sitio), estado: e.estado as FuenteVivo['estado'], nuevas: Number(e.nuevas || 0), error: s(e.error) }
      const existe = c.fuentes.some(x => x.clave === f.clave)
      return { ...c, activa: true, fuentes: existe ? c.fuentes.map(x => (x.clave === f.clave ? f : x)) : [...c.fuentes, f] }
    }
    case 'hallazgo': {
      const it: Item = { id: s(e.id), titulo: s(e.titulo), empresa: s(e.empresa), fuente: s(e.fuente), url: s(e.url), sitio: s(e.sitio), guardada: !!e.guardada, nota: s(e.nota), t: e.t }
      const items = [it, ...c.items.filter(x => x.id !== it.id)].slice(0, 160)
      return { ...c, items, revisadas: c.revisadas + 1, guardadas: c.guardadas + (it.guardada ? 1 : 0), descartadas: c.descartadas + (it.guardada ? 0 : 1) }
    }
    case 'evaluada': {
      const base: Item = { id: s(e.id), titulo: s(e.titulo), empresa: s(e.empresa), fuente: s(e.fuente), url: s(e.url), sitio: '', guardada: true, nota: '', t: e.t }
      const previo = c.items.find(x => x.id === base.id) || base
      const it = { ...previo, fit: Number(e.fit), motivo: s(e.motivo), lista: !!e.lista, t: e.t }
      return { ...c, items: [it, ...c.items.filter(x => x.id !== it.id)], evaluadas: c.evaluadas + 1, listas: c.listas + (it.lista ? 1 : 0) }
    }
    case 'postulada':
    case 'correo': {
      const previo = c.items.find(x => x.id === e.id) || { id: s(e.id), titulo: s(e.titulo), empresa: s(e.empresa), fuente: s(e.fuente), url: s(e.url), sitio: '', guardada: true, nota: '', t: e.t }
      const it = { ...previo, postulada: e.tipo === 'postulada' || previo.postulada, correo: e.tipo === 'correo' || previo.correo, t: e.t }
      return { ...c, items: [it, ...c.items.filter(x => x.id !== it.id)], postuladas: c.postuladas + (e.tipo === 'postulada' ? 1 : 0), correos: c.correos + (e.tipo === 'correo' ? 1 : 0) }
    }
    default:
      return c
  }
}

export function useVivo(alCambiar?: () => void) {
  const [corrida, setCorrida] = useState<Corrida>(vacia)
  const [motor, setMotor] = useState<Vivo['motor'] | null>(null)
  const ultimo = useRef(0)
  const aviso = useRef(alCambiar)
  aviso.current = alCambiar

  useEffect(() => {
    let vivo = true
    let t = 0
    const tick = async () => {
      try {
        const r = await leer<Vivo>(`/api/vivo?desde=${ultimo.current}`)
        if (!vivo) return
        // si el servidor se reinició, el contador vuelve a empezar
        if (r.ultimo < ultimo.current) ultimo.current = 0
        if (r.eventos.length) {
          ultimo.current = r.ultimo
          setCorrida(c => r.eventos.reduce(aplicar, c))
          if (r.eventos.some(e => ['ciclo', 'evaluada', 'postulada', 'correo'].includes(e.tipo))) aviso.current?.()
        }
        setMotor(r.motor)
        t = window.setTimeout(tick, r.motor.corriendo ? 700 : 2500)
      } catch {
        t = window.setTimeout(tick, 4000)
      }
    }
    tick()
    return () => { vivo = false; window.clearTimeout(t) }
  }, [])

  return { corrida, motor }
}
