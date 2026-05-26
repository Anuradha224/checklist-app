import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calcKPI } from '@/lib/score'
import { Instance } from '@/types'

export async function GET() {
  const [{ data: employees }, { data: instances }, { data: settings }] = await Promise.all([
    supabase.from('employees').select('*').order('name'),
    supabase.from('instances').select('*'),
    supabase.from('settings').select('*'),
  ])

  const benchmark = Number(settings?.find((s: any) => s.key === 'benchmark')?.value ?? 0)

  const rows = (employees || []).map((emp: any) => {
    const cw = calcKPI(instances as Instance[] || [], emp.id, 0)
    const lw = calcKPI(instances as Instance[] || [], emp.id, -1)

    return {
      employee: emp,
      benchmark,
      currentWeek: {
        planned: cw.planned,
        done: cw.done,
        doneOnTime: cw.doneOnTime,
        score1: cw.score1,   // not-done score
        score2: cw.score2,   // not-on-time score
      },
      lastWeek: {
        planned: lw.planned,
        done: lw.done,
        doneOnTime: lw.doneOnTime,
        score1: lw.score1,
        score2: lw.score2,
      },
    }
  })

  return NextResponse.json({ rows, benchmark })
}
