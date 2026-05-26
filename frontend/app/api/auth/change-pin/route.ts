import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession, requireAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const session = await getSession()
  const deny = requireAdmin(session)
  if (deny) return deny

  const { employeeId, newPin } = await req.json()
  if (!employeeId || !newPin || newPin.length < 4)
    return NextResponse.json({ error: 'PIN must be at least 4 characters' }, { status: 400 })

  const pin_hash = await bcrypt.hash(newPin, 10)
  const { error } = await supabase.from('employees').update({ pin_hash }).eq('id', employeeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
