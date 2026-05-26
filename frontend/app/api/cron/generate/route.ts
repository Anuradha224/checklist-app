import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { nextDate } from '@/lib/score'
import { addDays } from 'date-fns'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || 'cron-secret-default'
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  const isAuthorized = isVercelCron || authHeader === `Bearer ${cronSecret}`

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const horizon = addDays(new Date(), 60)
    const { data: tasks } = await supabase.from('tasks').select('*').eq('active', true)

    if (!tasks?.length) {
      return NextResponse.json({ ok: true, message: 'No tasks', generated: 0 })
    }

    let totalGenerated = 0

    for (const task of tasks) {
      const { data: latest } = await supabase
        .from('instances').select('planned')
        .eq('task_id', task.id)
        .order('planned', { ascending: false })
        .limit(1).single()

      const lastDate = latest?.planned ? new Date(latest.planned) : new Date(task.start_date)
      const toInsert: any[] = []
      let current = nextDate(task.freq, lastDate)

      while (current <= horizon) {
        toInsert.push({ task_id: task.id, employee_id: task.employee_id, planned: current.toISOString().slice(0, 10) })
        current = nextDate(task.freq, current)
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('instances')
          .upsert(toInsert, { onConflict: 'task_id,planned', ignoreDuplicates: true })
        if (!error) totalGenerated += toInsert.length
      }
    }

    return NextResponse.json({ ok: true, generated: totalGenerated, horizon: horizon.toISOString().slice(0,10) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
