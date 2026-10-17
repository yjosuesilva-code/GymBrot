import type { DiaSemana, HorarioInstructor, Cita } from '../types'

export type { IntervaloHorario, HorarioInstructor } from '../types'

export const DIAS_ORDEN: DiaSemana[] = [
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
  'DOMINGO',
]

const DIA_MAP: Record<string, DiaSemana> = {
  lun: 'LUNES',
  mar: 'MARTES',
  mie: 'MIERCOLES',
  jue: 'JUEVES',
  vie: 'VIERNES',
  sab: 'SABADO',
  dom: 'DOMINGO',
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10))
  return h * 60 + m
}

function dayOfWeekFromFecha(fechaISO: string): DiaSemana | null {
  const d = new Date(fechaISO + 'T00:00:00')
  const n = d.getDay() // 0 dom, 1 lun...
  switch (n) {
    case 1:
      return 'LUNES'
    case 2:
      return 'MARTES'
    case 3:
      return 'MIERCOLES'
    case 4:
      return 'JUEVES'
    case 5:
      return 'VIERNES'
    case 6:
      return 'SABADO'
    case 0:
      return 'DOMINGO'
    default:
      return null
  }
}

/* Texto legible de un horario, agrupando días con los mismos intervalos y
   colapsando los consecutivos en rangos: 'Lun-Vie 06:00-14:00',
   'Lun-Mié-Vie 16:00-21:00; Sáb 08:00-12:00'. */
export function disponibilidadTexto(h: HorarioInstructor | undefined): string {
  if (!h) return ''
  const short: Record<DiaSemana,string> = {
    LUNES: 'Lun',
    MARTES: 'Mar',
    MIERCOLES: 'Mié',
    JUEVES: 'Jue',
    VIERNES: 'Vie',
    SABADO: 'Sáb',
    DOMINGO: 'Dom',
  }
  const firma = (d: DiaSemana) => (h[d] ?? []).map((i) => `${i.desde}-${i.hasta}`).join(',')
  const vistas = new Set<DiaSemana>()
  const partes: string[] = []

  for (const dia of DIAS_ORDEN) {
    if (vistas.has(dia)) continue
    const ints = h[dia]
    if (!ints || ints.length === 0) continue
    const sig = firma(dia)
    const mismo = DIAS_ORDEN.filter((d) => !vistas.has(d) && firma(d) === sig)
    mismo.forEach((d) => vistas.add(d))

    // Colapsa los días consecutivos de este grupo en rangos 'A-B'
    const idxs = mismo.map((d) => DIAS_ORDEN.indexOf(d)).sort((a, b) => a - b)
    const etiquetas: string[] = []
    let inicio = idxs[0]
    let previo = idxs[0]
    for (let k = 1; k <= idxs.length; k++) {
      const actual = idxs[k]
      if (actual === previo + 1) {
        previo = actual
        continue
      }
      etiquetas.push(
        inicio === previo
          ? short[DIAS_ORDEN[inicio]]
          : `${short[DIAS_ORDEN[inicio]]}-${short[DIAS_ORDEN[previo]]}`
      )
      inicio = actual
      previo = actual
    }
    partes.push(`${etiquetas.join('-')} ${ints.map((i) => `${i.desde}-${i.hasta}`).join(', ')}`)
  }
  return partes.join('; ')
}

/* Convierte el texto libre legacy (ej. 'Lun-Vie 6:00-14:00') en intervalos.
   Reglas de parseo, alineadas con el vocabulario del escritorio:
   - Los días se separan con '-' y se normalizan sin tildes (Mié → mie).
   - Dos tokens (Lun-Vie, Mar-Jue) significan un RANGO continuo: todos los
     días de LUNES a VIERNES, etc.
   - Tres o más tokens (Lun-Mié-Vie) son una LISTA explícita de días.
   - Varios bloques se separan con ',' o ';'. */
export function migrarDisponibilidadTexto(texto: string): HorarioInstructor {
  const result: HorarioInstructor = {}
  if (!texto) return result
  const clean = texto.trim()
  if (!clean) return result
  const parts = clean.split(/[,;]/).map(p => p.trim()).filter(Boolean)
  for (const p of parts) {
    const m = p.match(/^([\wÀ-ÿ-]{3,}(?:-[\wÀ-ÿ-]{3})*)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/i)
    if (!m) continue
    const diasStr = m[1]
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    const desde = m[2].padStart(5, '0')
    const hasta = m[3].padStart(5, '0')
    const tokens = diasStr.split('-')
    let dias: DiaSemana[]
    if (tokens.length === 2) {
      const a = DIA_MAP[tokens[0]]
      const b = DIA_MAP[tokens[1]]
      if (!a || !b) continue
      const i = DIAS_ORDEN.indexOf(a)
      const j = DIAS_ORDEN.indexOf(b)
      if (i === -1 || j === -1) continue
      const s = Math.min(i, j)
      const e = Math.max(i, j)
      dias = DIAS_ORDEN.slice(s, e + 1)
    } else {
      dias = []
      for (const t of tokens) {
        const d = DIA_MAP[t]
        if (d) dias.push(d)
      }
    }
    for (const d of dias) {
      if (!result[d]) result[d] = []
      result[d].push({ desde, hasta })
    }
  }
  return result
}

export function diaDisponible(h: HorarioInstructor | undefined, fechaISO: string): boolean {
  if (!h) return false
  const dow = dayOfWeekFromFecha(fechaISO)
  if (!dow) return false
  const ints = h[dow]
  return !!(ints && ints.length > 0)
}

export function horaDisponible(h: HorarioInstructor | undefined, fechaISO: string, hhmm: string): boolean {
  if (!h) return false
  const dow = dayOfWeekFromFecha(fechaISO)
  if (!dow) return false
  const ints = h[dow]
  if (!ints || ints.length === 0) return false
  const t = toMinutes(hhmm)
  for (const i of ints) {
    const d = toMinutes(i.desde)
    const hasta = toMinutes(i.hasta)
    if (t >= d && t <= hasta) return true // inclusive as per typical ranges
  }
  return false
}

export function slotsPara(
  h: HorarioInstructor | undefined,
  fechaISO: string,
  from = '06:00',
  to = '22:30',
  step = 30
): string[] {
  const dow = dayOfWeekFromFecha(fechaISO)
  if (!dow || !h) return []
  const ints = h[dow]
  if (!ints || ints.length === 0) return []
  const out: string[] = []
  const start = toMinutes(from)
  const end = toMinutes(to)
  for (let t = start; t <= end; t += step) {
    const hh = Math.floor(t / 60)
    const mm = t % 60
    const s = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
    if (horaDisponible(h, fechaISO, s)) out.push(s)
  }
  return out
}

export function choque(
  citas: Cita[],
  idInstructor: string,
  fecha: string,
  hora: string,
  excluirId?: number
): boolean {
  return citas.some((c) => {
    if (excluirId !== undefined && c.id_cita === excluirId) return false
    if (c.id_instructor !== idInstructor) return false
    if (c.fecha !== fecha) return false
    if (c.hora !== hora) return false
    if (c.estado === 'CANCELADA') return false
    return true
  })
}
