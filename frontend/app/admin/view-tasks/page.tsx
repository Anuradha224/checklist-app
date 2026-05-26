'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO, startOfWeek, endOfWeek, subWeeks, isToday, isPast } from 'date-fns'

const FL:Record<string,string>={D:'Daily',W:'Weekly',F:'Fortnightly',M:'Monthly',Q:'Quarterly',Y:'Yearly'}
const FC:Record<string,{bg:string,c:string}>={
  D:{bg:'#EEF2FF',c:'#4F46E5'},W:{bg:'#ECFDF5',c:'#059669'},
  F:{bg:'#FEF9C3',c:'#B45309'},M:{bg:'#FDF4FF',c:'#9333EA'},
  Q:{bg:'#FFF1F2',c:'#BE185D'},Y:{bg:'#FFF7ED',c:'#C2410C'}
}
const EMP_GRADS=['linear-gradient(135deg,#4F46E5,#7C3AED)','linear-gradient(135deg,#EC4899,#9333EA)','linear-gradient(135deg,#10B981,#059669)','linear-gradient(135deg,#F59E0B,#D97706)','linear-gradient(135deg,#EF4444,#DC2626)','linear-gradient(135deg,#06B6D4,#0284C7)']

async function api(url:string){
  const res=await fetch(url,{headers:{'Content-Type':'application/json'}})
  if(!res.ok){const e=await res.json();throw new Error(e.error||'Error')}
  return res.json()
}

function getStatus(inst:any):{label:string,bg:string,c:string}{
  if(inst.actual){
    const p=new Date(inst.planned); p.setHours(23,59,59)
    const late=new Date(inst.actual)>p
    return late
      ? {label:'Done Late',bg:'#FEF9C3',c:'#B45309'}
      : {label:'Done ✓',bg:'#ECFDF5',c:'#059669'}
  }
  const planned=new Date(inst.planned); planned.setHours(23,59,59)
  if(planned<new Date()) return {label:'Missed',bg:'#FEF2F2',c:'#DC2626'}
  if(isToday(new Date(inst.planned))) return {label:'Today',bg:'#EEF2FF',c:'#4F46E5'}
  return {label:'Pending',bg:'#F3F4F6',c:'#6B7280'}
}

export default function ViewTasksPage(){
  const router=useRouter()
  const [emps,setEmps]=useState<any[]>([])
  const [instances,setInstances]=useState<any[]>([])
  const [tasks,setTasks]=useState<any[]>([])
  const [loading,setLoading]=useState(true)

  // Filters
  const [selEmp,setSelEmp]=useState('all')
  const [selFreq,setSelFreq]=useState('all')
  const [selStatus,setSelStatus]=useState('all')
  const [selWeek,setSelWeek]=useState('this')
  const [search,setSearch]=useState('')
  const [viewMode,setViewMode]=useState<'table'|'cards'>('table')

  const load=useCallback(async()=>{
    const me=await fetch('/api/auth/me').then(r=>r.json())
    if(me.role!=='admin'){router.replace('/');return}
    const [e,inst,t]=await Promise.all([
      api('/api/employees'),
      api('/api/instances'),
      api('/api/tasks')
    ])
    setEmps(e)
    // Join instances with task and employee data
    const joined=inst.map((i:any)=>{
      const task=t.find((t:any)=>t.id===i.task_id)
      const emp=e.find((e:any)=>e.id===i.employee_id)
      return {...i,task_name:task?.name||'—',freq:task?.freq||'D',emp_name:emp?.name||'—',emp_role:emp?.role||''}
    })
    setInstances(joined)
    setTasks(t)
    setLoading(false)
  },[router])

  useEffect(()=>{load()},[load])

  // Week filter logic
  function inWeek(planned:string, week:string):boolean{
    const p=parseISO(planned)
    if(week==='today') return isToday(p)
    if(week==='this'){
      const s=startOfWeek(new Date(),{weekStartsOn:1})
      const e=endOfWeek(new Date(),{weekStartsOn:1})
      return p>=s&&p<=e
    }
    if(week==='last'){
      const s=startOfWeek(subWeeks(new Date(),1),{weekStartsOn:1})
      const e=endOfWeek(subWeeks(new Date(),1),{weekStartsOn:1})
      return p>=s&&p<=e
    }
    return true // 'all'
  }

  const filtered=instances.filter(i=>{
    if(selEmp!=='all'&&i.employee_id!==selEmp) return false
    if(selFreq!=='all'&&i.freq!==selFreq) return false
    if(!inWeek(i.planned,selWeek)) return false
    if(search&&!i.task_name.toLowerCase().includes(search.toLowerCase())&&!i.emp_name.toLowerCase().includes(search.toLowerCase())) return false
    const st=getStatus(i)
    if(selStatus==='done'&&st.label!=='Done ✓') return false
    if(selStatus==='missed'&&st.label!=='Missed') return false
    if(selStatus==='pending'&&st.label!=='Pending'&&st.label!=='Today') return false
    if(selStatus==='late'&&st.label!=='Done Late') return false
    return true
  }).sort((a,b)=>b.planned.localeCompare(a.planned))

  // Group by employee for card view
  const grouped=emps.reduce((acc:any,emp:any)=>{
    const empInst=filtered.filter(i=>i.employee_id===emp.id)
    if(empInst.length>0) acc[emp.id]={emp,instances:empInst}
    return acc
  },{})

  // Stats
  const total=filtered.length
  const done=filtered.filter(i=>getStatus(i).label==='Done ✓').length
  const missed=filtered.filter(i=>getStatus(i).label==='Missed').length
  const late=filtered.filter(i=>getStatus(i).label==='Done Late').length
  const pending=filtered.filter(i=>['Pending','Today'].includes(getStatus(i).label)).length

  return (
    <div style={{maxWidth:1200,margin:'0 auto',padding:'1.25rem 1rem',minHeight:'100vh'}}>

      {/* Header */}
      <div className="fu card" style={{padding:'12px 16px',marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>router.push('/admin')} style={{width:34,height:34,borderRadius:8,border:'1.5px solid #E5E7EB',background:'#fff',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>←</button>
          <div style={{width:38,height:38,borderRadius:12,overflow:'hidden',border:'2px solid #E0E7FF'}}>
            <img src="/logo.jpeg" alt="logo" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:'0.95rem'}}>All Tasks</div>
            <div style={{fontSize:'0.68rem',color:'#9CA3AF'}}>View & monitor every task for every employee</div>
          </div>
        </div>
        {/* View mode toggle */}
        <div style={{display:'flex',background:'#F3F4F6',borderRadius:10,padding:3,gap:2}}>
          {(['table','cards'] as const).map(v=>(
            <button key={v} onClick={()=>setViewMode(v)} style={{padding:'6px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:'0.75rem',fontWeight:600,fontFamily:'var(--font)',transition:'all 0.2s',
              background:viewMode===v?'#fff':'transparent',color:viewMode===v?'#4F46E5':'#9CA3AF',
              boxShadow:viewMode===v?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>
              {v==='table'?'📋 Table':'👤 By Employee'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="fu1" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:10,marginBottom:14}}>
        {[
          {label:'Total',val:total,bg:'#F8F9FF',c:'#4F46E5'},
          {label:'Done',val:done,bg:'#ECFDF5',c:'#059669'},
          {label:'Pending',val:pending,bg:'#EEF2FF',c:'#4F46E5'},
          {label:'Missed',val:missed,bg:'#FEF2F2',c:'#DC2626'},
          {label:'Done Late',val:late,bg:'#FEF9C3',c:'#B45309'},
        ].map((s,i)=>(
          <div key={i} onClick={()=>setSelStatus(
            s.label==='Total'?'all':s.label==='Done'?'done':s.label==='Pending'?'pending':s.label==='Missed'?'missed':'late'
          )} style={{background:s.bg,borderRadius:12,padding:'10px 14px',cursor:'pointer',transition:'transform 0.15s',border:`1.5px solid ${selStatus===(s.label==='Total'?'all':s.label.toLowerCase())?s.c:'transparent'}`}}
            onMouseEnter={(e:any)=>e.currentTarget.style.transform='translateY(-1px)'}
            onMouseLeave={(e:any)=>e.currentTarget.style.transform='translateY(0)'}>
            <div style={{fontFamily:'var(--mono)',fontWeight:800,fontSize:'1.4rem',color:s.c}}>{s.val}</div>
            <div style={{fontSize:'0.68rem',color:'#9CA3AF',marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="fu2 card" style={{padding:'12px 14px',marginBottom:14}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          {/* Search */}
          <div style={{position:'relative',flex:1,minWidth:180}}>
            <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#9CA3AF',fontSize:13}}>🔍</span>
            <input placeholder="Search task or employee…" value={search} onChange={e=>setSearch(e.target.value)}
              style={{width:'100%',padding:'8px 10px 8px 30px',borderRadius:9,border:'1.5px solid #E5E7EB',background:'#F9FAFB',fontSize:'0.8rem',fontFamily:'var(--font)',outline:'none'}}
              onFocus={(e:any)=>e.target.style.borderColor='#4F46E5'}
              onBlur={(e:any)=>e.target.style.borderColor='#E5E7EB'}/>
            {search&&<button onClick={()=>setSearch('')} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#9CA3AF',fontSize:14}}>✕</button>}
          </div>

          {/* Employee */}
          <select value={selEmp} onChange={e=>setSelEmp(e.target.value)}
            style={{padding:'8px 10px',borderRadius:9,border:`1.5px solid ${selEmp!=='all'?'#4F46E5':'#E5E7EB'}`,background:selEmp!=='all'?'#EEF2FF':'#F9FAFB',fontSize:'0.8rem',fontFamily:'var(--font)',outline:'none',color:selEmp!=='all'?'#4F46E5':'#374151',fontWeight:selEmp!=='all'?600:400}}>
            <option value="all">All Employees</option>
            {emps.map((e:any)=><option key={e.id} value={e.id}>{e.name}</option>)}
          </select>

          {/* Week */}
          <div style={{display:'flex',background:'#F3F4F6',borderRadius:9,padding:3,gap:2}}>
            {[['today','Today'],['this','This Week'],['last','Last Week'],['all','All Time']].map(([v,l])=>(
              <button key={v} onClick={()=>setSelWeek(v)} style={{padding:'5px 10px',borderRadius:7,border:'none',cursor:'pointer',fontSize:'0.72rem',fontWeight:600,fontFamily:'var(--font)',transition:'all 0.15s',
                background:selWeek===v?'#fff':'transparent',color:selWeek===v?'#4F46E5':'#9CA3AF',
                boxShadow:selWeek===v?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>{l}</button>
            ))}
          </div>

          {/* Frequency */}
          <select value={selFreq} onChange={e=>setSelFreq(e.target.value)}
            style={{padding:'8px 10px',borderRadius:9,border:`1.5px solid ${selFreq!=='all'?FC[selFreq]?.c||'#E5E7EB':'#E5E7EB'}`,background:selFreq!=='all'?FC[selFreq]?.bg||'#F9FAFB':'#F9FAFB',fontSize:'0.8rem',fontFamily:'var(--font)',outline:'none',color:selFreq!=='all'?FC[selFreq]?.c||'#374151':'#374151',fontWeight:selFreq!=='all'?600:400}}>
            <option value="all">All Frequencies</option>
            {Object.entries(FL).map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>

          {/* Reset */}
          {(selEmp!=='all'||selFreq!=='all'||selStatus!=='all'||selWeek!=='this'||search)&&(
            <button onClick={()=>{setSelEmp('all');setSelFreq('all');setSelStatus('all');setSelWeek('this');setSearch('')}}
              style={{padding:'8px 12px',borderRadius:9,border:'1.5px solid #E5E7EB',background:'#fff',cursor:'pointer',fontSize:'0.75rem',fontFamily:'var(--font)',color:'#9CA3AF'}}>
              ✕ Reset
            </button>
          )}
        </div>
      </div>

      {loading&&<div style={{textAlign:'center',padding:'4rem',color:'#9CA3AF'}}>Loading tasks…</div>}

      {/* TABLE VIEW */}
      {!loading&&viewMode==='table'&&(
        <div className="fu2 card" style={{overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}>
              <thead>
                <tr style={{background:'linear-gradient(135deg,#4F46E5,#7C3AED)'}}>
                  {['Employee','Task','Frequency','Planned Date','Actual Done','Status'].map((h,i)=>(
                    <th key={i} style={{padding:'10px 12px',textAlign:i===0||i===1?'left':'center',color:'#fff',fontWeight:700,fontSize:'0.75rem',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length===0&&(
                  <tr><td colSpan={6} style={{padding:'3rem',textAlign:'center',color:'#9CA3AF'}}>
                    No tasks found for the selected filters
                  </td></tr>
                )}
                {filtered.map((inst,idx)=>{
                  const st=getStatus(inst)
                  const empIdx=emps.findIndex(e=>e.id===inst.employee_id)
                  return (
                    <tr key={inst.id} style={{background:idx%2===0?'#fff':'#FAFBFF',transition:'background 0.15s'}}
                      onMouseEnter={(e:any)=>e.currentTarget.style.background='#F0F4FF'}
                      onMouseLeave={(e:any)=>e.currentTarget.style.background=idx%2===0?'#fff':'#FAFBFF'}>
                      <td style={{padding:'10px 12px',borderBottom:'1px solid #F3F4F6'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{width:28,height:28,borderRadius:'50%',background:EMP_GRADS[empIdx%EMP_GRADS.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#fff',flexShrink:0}}>{inst.emp_name.slice(0,2)}</div>
                          <div>
                            <div style={{fontWeight:600,fontSize:'0.82rem'}}>{inst.emp_name}</div>
                            {inst.emp_role&&<div style={{fontSize:'0.65rem',color:'#9CA3AF'}}>{inst.emp_role}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{padding:'10px 12px',borderBottom:'1px solid #F3F4F6',fontWeight:500,maxWidth:220}}>
                        <div style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{inst.task_name}</div>
                      </td>
                      <td style={{padding:'10px 12px',borderBottom:'1px solid #F3F4F6',textAlign:'center'}}>
                        <span style={{fontSize:'0.7rem',fontWeight:700,padding:'3px 8px',borderRadius:6,background:FC[inst.freq]?.bg,color:FC[inst.freq]?.c}}>{FL[inst.freq]}</span>
                      </td>
                      <td style={{padding:'10px 12px',borderBottom:'1px solid #F3F4F6',textAlign:'center',fontFamily:'var(--mono)',fontSize:'0.78rem',color:'#374151'}}>
                        {format(parseISO(inst.planned),'d MMM yyyy')}
                        {isToday(parseISO(inst.planned))&&<div style={{fontSize:'0.62rem',color:'#4F46E5',fontWeight:700}}>TODAY</div>}
                      </td>
                      <td style={{padding:'10px 12px',borderBottom:'1px solid #F3F4F6',textAlign:'center',fontFamily:'var(--mono)',fontSize:'0.75rem',color:inst.actual?'#059669':'#D1D5DB'}}>
                        {inst.actual?format(new Date(inst.actual),'d MMM, HH:mm'):'—'}
                      </td>
                      <td style={{padding:'10px 12px',borderBottom:'1px solid #F3F4F6',textAlign:'center'}}>
                        <span style={{fontSize:'0.72rem',fontWeight:700,padding:'4px 10px',borderRadius:99,background:st.bg,color:st.c}}>{st.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{padding:'10px 14px',background:'#FAFBFF',borderTop:'1px solid #F0F0F0',fontSize:'0.72rem',color:'#9CA3AF',display:'flex',justifyContent:'space-between'}}>
            <span>Showing {filtered.length} task{filtered.length!==1?'s':''}</span>
            <span>Click stat cards above to filter by status</span>
          </div>
        </div>
      )}

      {/* CARDS VIEW — grouped by employee */}
      {!loading&&viewMode==='cards'&&(
        <div className="fu2">
          {Object.keys(grouped).length===0&&(
            <div style={{textAlign:'center',padding:'4rem',color:'#9CA3AF',background:'#fff',borderRadius:16}}>No tasks found for the selected filters</div>
          )}
          {Object.values(grouped).map((g:any,gi:number)=>{
            const empIdx=emps.findIndex(e=>e.id===g.emp.id)
            const empDone=g.instances.filter((i:any)=>getStatus(i).label==='Done ✓').length
            const empMissed=g.instances.filter((i:any)=>getStatus(i).label==='Missed').length
            const empTotal=g.instances.length
            const pct=empTotal?Math.round(empDone/empTotal*100):0
            return (
              <div key={g.emp.id} className="card" style={{marginBottom:16,overflow:'hidden'}}>
                {/* Employee header */}
                <div style={{padding:'14px 16px',background:'linear-gradient(135deg,rgba(79,70,229,0.06),rgba(124,58,237,0.04))',borderBottom:'1px solid #F0F0F0',display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:42,height:42,borderRadius:'50%',background:EMP_GRADS[empIdx%EMP_GRADS.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#fff',flexShrink:0}}>{g.emp.name.slice(0,2)}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:'1rem'}}>{g.emp.name}</div>
                    {g.emp.role&&<div style={{fontSize:'0.72rem',color:'#9CA3AF'}}>{g.emp.role}</div>}
                  </div>
                  <div style={{display:'flex',gap:10,alignItems:'center'}}>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontFamily:'var(--mono)',fontWeight:800,fontSize:'1.1rem',color:'#059669'}}>{empDone}</div>
                      <div style={{fontSize:'0.6rem',color:'#9CA3AF'}}>Done</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontFamily:'var(--mono)',fontWeight:800,fontSize:'1.1rem',color:'#DC2626'}}>{empMissed}</div>
                      <div style={{fontSize:'0.6rem',color:'#9CA3AF'}}>Missed</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontFamily:'var(--mono)',fontWeight:800,fontSize:'1.1rem',color:'#4F46E5'}}>{empTotal}</div>
                      <div style={{fontSize:'0.6rem',color:'#9CA3AF'}}>Total</div>
                    </div>
                    {/* Mini progress */}
                    <div style={{width:48,height:48,flexShrink:0}}>
                      <svg viewBox="0 0 48 48" style={{transform:'rotate(-90deg)'}}>
                        <circle cx="24" cy="24" r="18" fill="none" stroke="#E5E7EB" strokeWidth="5"/>
                        <circle cx="24" cy="24" r="18" fill="none" stroke={pct===100?'#10B981':pct>50?'#F59E0B':'#EF4444'} strokeWidth="5"
                          strokeDasharray={`${2*Math.PI*18}`}
                          strokeDashoffset={`${2*Math.PI*18*(1-pct/100)}`}
                          strokeLinecap="round"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Task rows */}
                <div>
                  {g.instances.map((inst:any,ii:number)=>{
                    const st=getStatus(inst)
                    return (
                      <div key={inst.id} style={{
                        display:'flex',alignItems:'center',gap:10,padding:'9px 16px',
                        borderBottom:ii<g.instances.length-1?'1px solid #F5F5F5':'none',
                        background:ii%2===0?'#fff':'#FAFBFF'
                      }}>
                        <div style={{width:8,height:8,borderRadius:'50%',flexShrink:0,background:st.c}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:500,fontSize:'0.82rem',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{inst.task_name}</div>
                          <div style={{fontSize:'0.65rem',color:'#9CA3AF',marginTop:1}}>
                            Planned: {format(parseISO(inst.planned),'d MMM yyyy')}
                            {inst.actual&&<span style={{color:'#059669'}}> · Done: {format(new Date(inst.actual),'d MMM, HH:mm')}</span>}
                          </div>
                        </div>
                        <span style={{fontSize:'0.68rem',fontWeight:700,padding:'2px 8px',borderRadius:6,background:FC[inst.freq]?.bg,color:FC[inst.freq]?.c,flexShrink:0}}>{FL[inst.freq]}</span>
                        <span style={{fontSize:'0.7rem',fontWeight:700,padding:'3px 10px',borderRadius:99,background:st.bg,color:st.c,flexShrink:0,whiteSpace:'nowrap'}}>{st.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
