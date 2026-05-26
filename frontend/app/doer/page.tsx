'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface Inst { id:string; task_name:string; freq:string; planned:string; actual:string|null }
const FL:Record<string,string> = {D:'Daily',W:'Weekly',F:'Fortnightly',M:'Monthly',Q:'Quarterly',Y:'Yearly'}

export default function DoerPage() {
  const router = useRouter()
  const [user, setUser] = useState<{name:string}|null>(null)
  const [tasks, setTasks] = useState<Inst[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState<string|null>(null)
  const [confirm, setConfirm] = useState<string|null>(null)

  const load = useCallback(async () => {
    const me = await fetch('/api/auth/me').then(r=>r.json())
    if(me.role!=='doer') { router.replace('/'); return }
    setUser({ name: me.name })
    const data = await fetch('/api/doer/tasks').then(r=>r.json())
    setTasks(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function markDone(id:string) {
    setMarking(id)
    await fetch('/api/doer/tasks', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id}) })
    await load(); setMarking(null); setConfirm(null)
  }

  async function logout() {
    await fetch('/api/auth/logout', { method:'POST' }); router.push('/')
  }

  const done = tasks.filter(t=>t.actual)
  const pending = tasks.filter(t=>!t.actual)
  const pct = tasks.length ? Math.round(done.length/tasks.length*100) : 0
  const ringDash = 163.4
  const ringOffset = ringDash - (ringDash * pct / 100)
  const ringColor = pct===100 ? '#10B981' : pct>50 ? '#F59E0B' : '#EF4444'

  if(loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', color:'#9CA3AF' }}>
        <div style={{ width:40, height:40, border:'3px solid #E0E7FF', borderTopColor:'#4F46E5', borderRadius:'50%', margin:'0 auto 12px', animation:'spin 0.8s linear infinite' }}/>
        Loading your tasks…
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth:520, margin:'0 auto', padding:'1.25rem 1rem', minHeight:'100vh' }}>

      {/* Hero header */}
      <div className="fu" style={{
        borderRadius:24, padding:'20px 20px 24px', marginBottom:14, color:'#fff', position:'relative', overflow:'hidden',
        background:'linear-gradient(135deg,#4F46E5 0%,#7C3AED 55%,#EC4899 100%)'
      }}>
        <div style={{ position:'absolute', top:-20, right:-20, width:110, height:110, borderRadius:'50%', background:'rgba(255,255,255,0.08)' }}/>
        <div style={{ position:'absolute', bottom:-30, right:50, width:75, height:75, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }}/>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:46, height:46, borderRadius:14, overflow:'hidden', border:'2px solid rgba(255,255,255,0.4)', flexShrink:0, background:'#fff' }}>
              <img src="/logo.jpeg" alt="Anuradha Textile" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            </div>
            <div>
              <div style={{ fontSize:'0.7rem', opacity:0.75, marginBottom:1 }}>Anuradha Textile · 👋 Hello,</div>
              <div style={{ fontSize:'1.5rem', fontWeight:800, letterSpacing:'-0.03em' }}>{user?.name}</div>
              <div style={{ fontSize:'0.7rem', opacity:0.65, marginTop:2 }}>{format(new Date(),'EEEE, d MMMM yyyy')}</div>
            </div>
          </div>
          {/* SVG ring */}
          <div style={{ textAlign:'center' }}>
            <svg width="68" height="68" viewBox="0 0 68 68">
              <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6"/>
              <circle cx="34" cy="34" r="28" fill="none" stroke="#fff" strokeWidth="6"
                strokeDasharray={ringDash} strokeDashoffset={ringOffset}
                strokeLinecap="round" transform="rotate(-90 34 34)" style={{ transition:'stroke-dashoffset 0.6s' }}/>
              <text x="34" y="30" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800" fontFamily="var(--font)">{pct}%</text>
              <text x="34" y="43" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="9" fontFamily="var(--font)">done</text>
            </svg>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop:16, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.2)', borderRadius:99 }}>
            <div style={{ height:'100%', borderRadius:99, background:'rgba(255,255,255,0.9)', width:`${pct}%`, transition:'width 0.6s' }}/>
          </div>
          <span style={{ fontSize:'0.8rem', fontWeight:600, opacity:0.85 }}>{done.length}/{tasks.length} tasks</span>
        </div>

        {pct===100 && <div style={{ marginTop:10, fontSize:'0.82rem', fontWeight:600 }}>🎉 All done for today! Excellent work.</div>}

        <button onClick={logout} style={{ position:'absolute', top:14, right:90, background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, padding:'4px 10px', color:'#fff', fontSize:'0.72rem', cursor:'pointer', fontFamily:'var(--font)' }}>Sign out</button>
      </div>

      {/* Notice */}
      <div className="fu1" style={{ background:'linear-gradient(135deg,rgba(245,158,11,0.1),rgba(251,191,36,0.06))', border:'1.5px solid rgba(245,158,11,0.2)', borderRadius:14, padding:'10px 14px', marginBottom:14, fontSize:'0.78rem', color:'#B45309', fontWeight:500, display:'flex', gap:8, alignItems:'center' }}>
        ⚡ Only today's tasks shown — yesterday's work cannot be marked.
      </div>

      {/* Pending */}
      {pending.length>0 && (
        <div className="fu2">
          <SectionLabel text={`Pending (${pending.length})`} />
          {pending.map(t => (
            <TaskCard key={t.id} task={t} done={false} marking={marking===t.id} onMark={()=>setConfirm(t.id)} />
          ))}
        </div>
      )}

      {/* Done */}
      {done.length>0 && (
        <div className="fu3">
          <SectionLabel text={`Completed (${done.length})`} />
          {done.map(t => <TaskCard key={t.id} task={t} done marking={false} />)}
        </div>
      )}

      {tasks.length===0 && (
        <div className="fu2 card" style={{ padding:'3rem', textAlign:'center', color:'#9CA3AF' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🎯</div>
          <div style={{ fontWeight:700, color:'#374151' }}>No tasks for today</div>
          <div style={{ fontSize:'0.8rem', marginTop:4 }}>Contact your admin if this seems wrong</div>
        </div>
      )}

      {/* Confirm modal */}
      {confirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
          onClick={()=>setConfirm(null)}>
          <div className="card fu" style={{ padding:'1.75rem', maxWidth:340, width:'100%' }} onClick={(e:any)=>e.stopPropagation()}>
            <div style={{ fontSize:36, marginBottom:8, textAlign:'center' }}>✅</div>
            <h3 style={{ fontWeight:800, textAlign:'center', marginBottom:6, fontSize:'1.05rem' }}>Mark as done?</h3>
            <p style={{ color:'#6B7280', fontSize:'0.85rem', textAlign:'center', marginBottom:'1.5rem' }}>
              <strong style={{ color:'#111827' }}>{tasks.find(t=>t.id===confirm)?.task_name}</strong><br/>
              Will be recorded at current time.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setConfirm(null)} style={{ flex:1, padding:'11px', borderRadius:12, border:'1.5px solid #E5E7EB', background:'#fff', color:'#374151', fontWeight:600, cursor:'pointer', fontFamily:'var(--font)', fontSize:'0.875rem' }}>Cancel</button>
              <button onClick={()=>markDone(confirm)} style={{ flex:1, padding:'11px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#10B981,#059669)', color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'var(--font)', fontSize:'0.875rem', boxShadow:'0 4px 16px rgba(16,185,129,0.35)' }}>Confirm ✓</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionLabel({ text }: { text:string }) {
  return <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.08em', margin:'14px 0 8px' }}>{text}</div>
}

function TaskCard({ task, done, marking, onMark }: { task:Inst; done:boolean; marking:boolean; onMark?:()=>void }) {
  const pillCls = `pill-${task.freq}`
  return (
    <div style={{
      background: done ? 'linear-gradient(135deg,rgba(16,185,129,0.06),rgba(5,150,105,0.03))' : '#fff',
      border: `1.5px solid ${done?'rgba(16,185,129,0.2)':'#F3F4F6'}`,
      borderRadius:16, padding:'13px 14px', marginBottom:8,
      display:'flex', alignItems:'center', gap:12,
      boxShadow: done ? 'none' : '0 1px 6px rgba(0,0,0,0.05)',
      opacity: done ? 0.85 : 1, transition:'all 0.2s'
    }}>
      <button onClick={!done?onMark:undefined} disabled={done||marking}
        style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, border:'2px solid', cursor:done?'default':'pointer',
          borderColor: done?'#10B981':'#D1D5DB',
          background: done?'linear-gradient(135deg,#10B981,#059669)':'transparent',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'#fff', transition:'all 0.2s',
          boxShadow: done?'0 2px 8px rgba(16,185,129,0.3)':'none'
        }}>
        {done?'✓':marking?'…':''}
      </button>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:600, fontSize:'0.9rem', color:done?'#9CA3AF':'#111827', textDecoration:done?'line-through':'none' }}>{task.task_name}</div>
        {task.actual && <div style={{ fontSize:'0.7rem', color:'#10B981', fontWeight:500, marginTop:2 }}>✓ Done at {format(new Date(task.actual),'HH:mm')}</div>}
      </div>
      <span className={pillCls} style={{ fontSize:'0.7rem', fontWeight:700, padding:'3px 9px', borderRadius:7, flexShrink:0 }}>{FL[task.freq]||task.freq}</span>
    </div>
  )
}
