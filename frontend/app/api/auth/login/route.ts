import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { signToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const { type, username, password, employeeName, pin } = await req.json()

  if (type === 'admin') {
    const { data: admin } = await supabase.from('admin').select('*').eq('id', 1).single()
    if (!admin) return NextResponse.json({ error: 'Admin not configured' }, { status: 500 })
    const valid = await bcrypt.compare(password, admin.password_hash)
    if (username !== admin.username || !valid)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    const token = await signToken({ role: 'admin' })
    const res = NextResponse.json({ ok: true, role: 'admin' })
    res.cookies.set('cl_token', token, { httpOnly: true, maxAge: 43200, path: '/', sameSite: 'lax' })
    return res
  }

  if (type === 'doer') {
    const { data: emp } = await supabase
      .from('employees').select('*').ilike('name', employeeName.trim()).single()
    if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 401 })
    if (!emp.pin_hash) return NextResponse.json({ error: 'No PIN set — ask your admin.' }, { status: 401 })
    const valid = await bcrypt.compare(pin, emp.pin_hash)
    if (!valid) return NextResponse.json({ error: 'Wrong PIN. Try again.' }, { status: 401 })
    const token = await signToken({ role: 'doer', employeeId: emp.id, name: emp.name })
    const res = NextResponse.json({ ok: true, role: 'doer', employeeId: emp.id, name: emp.name })
    res.cookies.set('cl_token', token, { httpOnly: true, maxAge: 43200, path: '/', sameSite: 'lax' })
    return res
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
