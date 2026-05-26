import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabase.from('settings').select('*')
  const obj: Record<string, string> = {}
  ;(data || []).forEach((r: any) => { obj[r.key] = r.value })
  return NextResponse.json(obj)
}

export async function POST(req: Request) {
  const body = await req.json()
  for (const [key, value] of Object.entries(body)) {
    await supabase.from('settings').upsert({ key, value: String(value), updated_at: new Date().toISOString() })
  }
  return NextResponse.json({ ok: true })
}
