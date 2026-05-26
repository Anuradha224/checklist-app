import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession, requireDoer } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  const deny = requireDoer(session)
  if (deny) return deny
  if (session?.role !== 'doer') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  // Only return TODAY's instances for this doer
  const { data, error } = await supabase
    .from('instances')
    .select('*, tasks(name, freq)')
    .eq('employee_id', session.employeeId)
    .eq('planned', today)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const flat = (data || []).map((i: any) => ({
    ...i,
    task_name: i.tasks?.name || '—',
    freq: i.tasks?.freq || 'D',
    tasks: undefined,
  }))

  return NextResponse.json(flat)
}

export async function PATCH(req: Request) {
  const session = await getSession()
  const deny = requireDoer(session)
  if (deny) return deny
  if (session?.role !== 'doer') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const today = new Date().toISOString().slice(0, 10)

  // Verify this instance belongs to today AND this doer
  const { data: inst } = await supabase
    .from('instances').select('*').eq('id', id)
    .eq('employee_id', session.employeeId)
    .eq('planned', today)
    .single()

  if (!inst) return NextResponse.json({ error: 'Task not found or not allowed' }, { status: 403 })
  if (inst.actual) return NextResponse.json({ error: 'Already marked done' }, { status: 400 })

  const { data, error } = await supabase
    .from('instances').update({ actual: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
