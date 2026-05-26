import { Instance } from '@/types'
import {
  startOfWeek, endOfWeek, subWeeks, addWeeks,
  isWithinInterval, parseISO, isAfter
} from 'date-fns'

// =IFERROR(IF(G4<>"",ROUND(G4/F4*100-100,2),""),0)
export function calcScore(planned: number, actual: number): number {
  if (planned === 0) return 0
  try {
    return Math.round((actual / planned * 100 - 100) * 100) / 100
  } catch {
    return 0
  }
}

function getWeekInterval(offsetWeeks: number) {
  const base = offsetWeeks >= 0
    ? addWeeks(new Date(), offsetWeeks)
    : subWeeks(new Date(), Math.abs(offsetWeeks))
  const start = startOfWeek(base, { weekStartsOn: 1 })
  const end = endOfWeek(base, { weekStartsOn: 1 })
  return { start, end }
}

export function isOnTime(inst: Instance): boolean {
  if (!inst.actual) return false
  const plannedEnd = new Date(inst.planned)
  plannedEnd.setHours(23, 59, 59, 999)
  return !isAfter(new Date(inst.actual), plannedEnd)
}

export function calcKPI(instances: Instance[], empId: string, offsetWeeks: number) {
  const { start, end } = getWeekInterval(offsetWeeks)
  const weekly = instances.filter(i => {
    if (i.employee_id !== empId) return false
    const p = parseISO(i.planned)
    return isWithinInterval(p, { start, end })
  })
  const planned = weekly.length
  const done = weekly.filter(i => i.actual).length
  const doneOnTime = weekly.filter(i => isOnTime(i)).length
  return {
    planned,
    done,
    doneOnTime,
    score1: calcScore(planned, done),
    score2: calcScore(planned, doneOnTime),
  }
}

export function isMissed(inst: Instance): boolean {
  if (inst.actual) return false
  const planned = new Date(inst.planned)
  planned.setHours(23, 59, 59, 999)
  return planned < new Date()
}

export function isDoneLate(inst: Instance): boolean {
  if (!inst.actual) return false
  const planned = new Date(inst.planned)
  planned.setHours(23, 59, 59, 999)
  return new Date(inst.actual) > planned
}

export function nextDate(freq: string, from: Date): Date {
  const d = new Date(from)
  switch (freq) {
    case 'D': d.setDate(d.getDate() + 1); break
    case 'W': d.setDate(d.getDate() + 7); break
    case 'F': d.setDate(d.getDate() + 14); break
    case 'M': d.setMonth(d.getMonth() + 1); break
    case 'Q': d.setMonth(d.getMonth() + 3); break
    case 'Y': d.setFullYear(d.getFullYear() + 1); break
  }
  return d
}

// Get week label e.g. "19 May – 25 May"
export function getWeekLabel(offsetWeeks: number): string {
  const { start, end } = getWeekInterval(offsetWeeks)
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return `${fmt(start)} – ${fmt(end)}`
}
