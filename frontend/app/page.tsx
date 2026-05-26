'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'choose'|'admin'|'doer'>('choose')
  const [form, setForm] = useState({ username:'', password:'', name:'', pin:'' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r=>r.json()).then(d=>{
      if(d.role==='admin') router.replace('/admin')
      if(d.role==='doer') router.replace('/doer')
    }).catch(()=>{})
  }, [router])

  async function login() {
    setErr(''); setLoading(true)
    try {
      const body = mode==='admin'
        ? { type:'admin', username:form.username, password:form.password }
        : { type:'doer', employeeName:form.name, pin:form.pin }
      const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
      const data = await res.json()
      if(!res.ok) { setErr(data.error); setLoading(false); return }
      router.push(data.role==='admin' ? '/admin' : '/doer')
    } catch { setErr('Something went wrong'); setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ width:'100%', maxWidth:380 }}>

        {/* Logo */}
        <div className="fu" style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ width:90, height:90, borderRadius:24, overflow:'hidden', margin:'0 auto 12px', boxShadow:'0 8px 32px rgba(79,70,229,0.2)', border:'3px solid #fff', background:'#fff' }}>
            <img src="/logo.jpeg" alt="Anuradha Textile" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
          <h1 style={{ fontSize:'1.6rem', fontWeight:800, letterSpacing:'-0.03em', color:'#111827' }}>Anuradha Textile</h1>
          <p style={{ fontSize:'0.8rem', fontWeight:600, background:'linear-gradient(135deg,#4F46E5,#7C3AED)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginTop:2 }}>TaskFlow — Employee Management</p>
        </div>

        {/* Choose mode */}
        {mode==='choose' && (
          <div className="fu1" style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { key:'admin', emoji:'🛡️', label:'Admin Login', sub:'Full access · Manage team & tasks', grad:'linear-gradient(135deg,rgba(79,70,229,0.08),rgba(124,58,237,0.06))', border:'rgba(79,70,229,0.25)', iconGrad:'linear-gradient(135deg,#4F46E5,#7C3AED)' },
              { key:'doer',  emoji:'👤', label:'Employee Login', sub:'View & complete today\'s tasks', grad:'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(5,150,105,0.04))', border:'rgba(16,185,129,0.25)', iconGrad:'linear-gradient(135deg,#10B981,#059669)' },
            ].map(btn => (
              <button key={btn.key} onClick={() => setMode(btn.key as any)} style={{
                padding:'16px 18px', borderRadius:18, border:`1.5px solid ${btn.border}`,
                background:btn.grad, cursor:'pointer', display:'flex', alignItems:'center', gap:14,
                textAlign:'left', fontFamily:'var(--font)', transition:'transform 0.15s',
              }}
              onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-2px)')}
              onMouseLeave={e=>(e.currentTarget.style.transform='translateY(0)')}>
                <div style={{ width:44, height:44, borderRadius:12, background:btn.iconGrad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{btn.emoji}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:'0.95rem', color:'#111827' }}>{btn.label}</div>
                  <div style={{ color:'#9CA3AF', fontSize:'0.78rem', marginTop:2 }}>{btn.sub}</div>
                </div>
                <span style={{ marginLeft:'auto', color:'#D1D5DB', fontSize:18 }}>›</span>
              </button>
            ))}
          </div>
        )}

        {/* Form */}
        {mode!=='choose' && (
          <div className="card fu1" style={{ padding:'1.75rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1.5rem' }}>
              <button onClick={()=>{setMode('choose');setErr('')}} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#9CA3AF', padding:0, lineHeight:1 }}>←</button>
              <span style={{ fontWeight:700, fontSize:'1rem' }}>{mode==='admin'?'Admin Login':'Employee Login'}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {mode==='admin' ? <>
                <FField label="Username"><FInput placeholder="admin" value={form.username} onChange={(v:string)=>setForm(p=>({...p,username:v}))} onEnter={login}/></FField>
                <FField label="Password"><FInput type="password" placeholder="••••••••" value={form.password} onChange={(v:string)=>setForm(p=>({...p,password:v}))} onEnter={login}/></FField>
                <p style={{ fontSize:'0.72rem', color:'#9CA3AF', textAlign:'center' }}>Default: admin / admin123</p>
              </> : <>
                <FField label="Your Name"><FInput placeholder="e.g. SANJANA" value={form.name} onChange={(v:string)=>setForm(p=>({...p,name:v}))} onEnter={login}/></FField>
                <FField label="PIN"><FInput type="password" placeholder="Enter your PIN" value={form.pin} onChange={(v:string)=>setForm(p=>({...p,pin:v}))} onEnter={login}/></FField>
              </>}
              {err && <div style={{ background:'#FEF2F2', border:'1.5px solid #FCA5A5', borderRadius:10, padding:'9px 12px', fontSize:'0.8rem', color:'#DC2626' }}>⚠ {err}</div>}
              <button onClick={login} disabled={loading} style={{
                padding:'13px', borderRadius:12, border:'none', cursor:loading?'default':'pointer',
                fontWeight:700, fontSize:'0.95rem', fontFamily:'var(--font)', color:'#fff',
                background:'linear-gradient(135deg,#4F46E5,#7C3AED)', opacity:loading?0.7:1,
                boxShadow:'0 4px 20px rgba(79,70,229,0.4)', transition:'all 0.2s',
              }}>
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FField({ label, children }: any) {
  return <div><label style={{ fontSize:'0.75rem', fontWeight:600, color:'#6B7280', display:'block', marginBottom:6 }}>{label}</label>{children}</div>
}
function FInput({ type='text', placeholder, value, onChange, onEnter }: {type?:string;placeholder?:string;value:string;onChange:(v:string)=>void;onEnter?:()=>void}) {
  return (
    <input type={type} placeholder={placeholder} value={value}
      onChange={(e:any)=>onChange(e.target.value)}
      onKeyDown={(e:any)=>e.key==='Enter'&&onEnter?.()}
      style={{ width:'100%', padding:'11px 14px', borderRadius:12, border:'1.5px solid #E5E7EB', background:'#F9FAFB', color:'#111827', fontSize:'0.9rem', fontFamily:'var(--font)', outline:'none', transition:'border-color 0.2s' }}
      onFocus={(e:any)=>(e.target.style.borderColor='#4F46E5')}
      onBlur={(e:any)=>(e.target.style.borderColor='#E5E7EB')}
    />
  )
}
