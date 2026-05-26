import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const empId = searchParams.get('employee_id')
  const from = searchParams.get('from')   // YYYY-MM-DD
  const to = searchParams.get('to')       // YYYY-MM-DD

  let query = supabase
    .from('instances')
    .select('*, tasks(name, freq)')
    .order('planned', { ascending: false })

  if (empId) query = query.eq('employee_id', empId)
  if (from)  query = query.gte('planned', from)
  if (to)    query = query.lte('planned', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Flatten joined fields
  const flat = (data || []).map((i: any) => ({
    ...i,
    task_name: i.tasks?.name || '—',
    freq: i.tasks?.freq || 'D',
    tasks: undefined,
  }))

  return NextResponse.json(flat)
}

export async function PATCH(req: Request) {
  const { id } = await req.json()
  const { data, error } = await supabase
    .from('instances')
    .update({ actual: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
