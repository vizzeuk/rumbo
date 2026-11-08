export type Estado = 'nueva' | 'lista' | 'enviada' | 'respondio' | 'entrevista' | 'descartada'

export interface Oferta {
  id: string; tipo: string; fuente: string; titulo: string; empresa: string; url: string; url_postular: string
  descripcion: string; modalidad: string; ubicacion: string; presupuesto: string; email: string
  publicada: number; encontrada: number; puntaje: number; nota: string | null
  fit: number | null; motivo: string; asunto: string; propuesta: string; hitos: string; precio: string
  estado: Estado; enviada: number | null; canal: string | null; seguimiento: number | null
  respuesta: number | null; notas: string | null; error: string | null; captura: string | null
}

export interface Fuente { clave: string; nombre: string; descripcion: string; postula: boolean; activa: boolean; total: number }

export interface Config {
  general: { onboarding_hecho: boolean }
  ia: { proveedor: string; modelo: string; base_url: string; variable_clave: string; evaluar_por_ciclo: number }
  busqueda: {
    preset: string; area: string; situacion: string; rubro: string; cargos: string[]; consultas: string[]; palabras_clave: string[]; excluir: string[]
    modalidades: string[]; jornadas: string[]; region: string; pais: string; excluir_ingles: boolean
  }
  fuentes: Record<string, boolean>
  envio: { modo_automatico: boolean; umbral: number; limite_correos_dia: number; limite_portal_dia: number
    revisar_antes_de_enviar: boolean; dias_seguimiento: number; correo: string; nombre: string }
  ciclo: { horas: number; desde: number; hasta: number }
}

export interface Situacion { id: string; nombre: string; detalle: string; jornadas: string[] }
export interface Rubro { id: string; nombre: string; cargos: string[]; preset?: string }
export interface Catalogo { situaciones: Situacion[]; rubros: Rubro[]; modalidades: { id: string; nombre: string }[]; regiones: string[] }

export type EventoVivo = { n: number; t: number; tipo: string; [k: string]: unknown }
export interface Vivo { ultimo: number; eventos: EventoVivo[]; motor: EstadoGeneral['motor'] }

export interface EstadoGeneral {
  version: string; config: Config; resumen: Record<Estado, number>
  motor: { corriendo: boolean; paso: string; ultimo: number | null; resumen: string }
  bienvenida_pendiente: boolean; correo_conectado: boolean; correo_cuenta: string
  correos_hoy: number; postulaciones_hoy: number; fuentes: Fuente[]
  portales_postulacion: string[]; postulador_instalado: boolean
}

export interface Evento { id: number; oferta: string; tipo: string; detalle: string; fecha: number; titulo: string; fuente: string }

export async function leer<T>(ruta: string): Promise<T> {
  const r = await fetch(ruta)
  return r.json()
}

export const sitio = (url?: string | null) => {
  try { return url ? new URL(url).hostname.replace(/^www\./, '') : '' } catch { return '' }
}

export async function enviar(ruta: string, cuerpo: unknown): Promise<{ ok?: string; error?: string }> {
  const r = await fetch(ruta, { method: 'POST', body: JSON.stringify(cuerpo) })
  return r.json()
}

export const hace = (t?: number | null) => {
  if (!t) return ''
  const m = (Date.now() / 1000 - t) / 60
  if (m < 60) return `hace ${Math.max(1, Math.round(m))} min`
  const h = m / 60
  if (h < 24) return `hace ${Math.round(h)} h`
  const d = h / 24
  return d < 2 ? 'ayer' : `hace ${Math.floor(d)} días`
}

export const NOMBRE_ESTADO: Record<Estado, string> = {
  nueva: 'Nueva', lista: 'Lista', enviada: 'Enviada', respondio: 'Respondió', entrevista: 'Entrevista', descartada: 'Descartada',
}
