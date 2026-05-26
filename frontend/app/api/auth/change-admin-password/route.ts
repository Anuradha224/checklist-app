import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession, requireAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const session = await getSession()
  const deny = requireAdmin(session)
  if (deny) return deny

  const { currentPassword, newPassword } = await req.json()

  if (!currentPassword || !newPassword)
    return NextResponse.json({ error: 'Both fields required' }, { status: 400 })

  if (newPassword.length < 6)
    return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })

  // Verify current password
  const { data: admin } = await supabase
    .from('admin').select('*').eq('id', 1).single()

  if (!admin)
    return NextResponse.json({ error: 'Admin not found' }, { status: 500 })

  const valid = await bcrypt.compare(currentPassword, admin.password_hash)
  if (!valid)
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })

  // Hash and save new password
  const password_hash = await bcrypt.hash(newPassword, 10)
  const { error } = await supabase
    .from('admin').update({ password_hash }).eq('id', 1)

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
