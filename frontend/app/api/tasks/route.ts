import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession, requireAdmin } from '@/lib/auth'
import { nextDate } from '@/lib/score'
import { addDays } from 'date-fns'

async function generateInstances(taskId: string, empId: string, freq: string, startDate: string) {
  const horizon = addDays(new Date(), 30)
  const { data: existing } = await supabase.from('instances').select('planned').eq('task_id', taskId)
  const existingDates = new Set((existing || []).map((i: any) => i.planned))
  const toInsert: any[] = []
  let current = new Date(startDate)
  while (current <= horizon) {
    const dateStr = current.toISOString().slice(0, 10)
    if (!existingDates.has(dateStr)) toInsert.push({ task_id: taskId, employee_id: empId, planned: dateStr })
    current = nextDate(freq, current)
  }
  if (toInsert.length > 0) await supabase.from('instances').insert(toInsert)
}

export async function GET() {
  const session = await getSession()
  const deny = requireAdmin(session)
  if (deny) return deny
  const { data, error } = await supabase.from('tasks').select('*, employees(name)').eq('active', true).order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const session = await getSession()
  const deny = requireAdmin(session)
  if (deny) return deny
  const { name, employee_id, freq, start_date } = await req.json()
  if (!name || !employee_id || !freq || !start_date)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const { data, error } = await supabase.from('tasks')
    .insert({ name: name.trim(), employee_id, freq, start_date }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await generateInstances(data.id, employee_id, freq, start_date)
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const session = await getSession()
  const deny = requireAdmin(session)
  if (deny) return deny
  const { id } = await req.json()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
