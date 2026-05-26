import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession, requireAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getSession()
  const deny = requireAdmin(session)
  if (deny) return deny
  const { data, error } = await supabase.from('employees').select('id,name,role,created_at').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const session = await getSession()
  const deny = requireAdmin(session)
  if (deny) return deny
  const { name, role, pin } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  if (!pin || pin.length < 4) return NextResponse.json({ error: 'PIN must be at least 4 digits' }, { status: 400 })
  const pin_hash = await bcrypt.hash(pin, 10)
  const { data, error } = await supabase
    .from('employees')
    .insert({ name: name.trim().toUpperCase(), role: role?.trim() || '', pin_hash })
    .select('id,name,role,created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const session = await getSession()
  const deny = requireAdmin(session)
  if (deny) return deny
  const { id } = await req.json()
  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
