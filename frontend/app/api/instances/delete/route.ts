import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession, requireAdmin } from '@/lib/auth'

export async function DELETE(req: Request) {
  const session = await getSession()
  const deny = requireAdmin(session)
  if (deny) return deny

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { error } = await supabase.from('instances').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
