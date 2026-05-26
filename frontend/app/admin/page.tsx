'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'

const FL:Record<string,string>={D:'Daily',W:'Weekly',F:'Fortnightly',M:'Monthly',Q:'Quarterly',Y:'Yearly'}
const FOPT=['D','W','F','M','Q','Y']
const EMP_GRADS=['linear-gradient(135deg,#4F46E5,#7C3AED)','linear-gradient(135deg,#EC4899,#9333EA)','linear-gradient(135deg,#10B981,#059669)','linear-gradient(135deg,#F59E0B,#D97706)','linear-gradient(135deg,#EF4444,#DC2626)','linear-gradient(135deg,#06B6D4,#0284C7)']

async function api(url:string,opts?:RequestInit){
  const res=await fetch(url,{headers:{'Content-Type':'application/json'},...opts})
  if(!res.ok){const e=await res.json();throw new Error(e.error||'Error')}
  return res.json()
}
function sc(s:number){return s<0?'#EF4444':s===0?'#10B981':'#6B7280'}

export default function AdminPage(){
  const router=useRouter()
  const [tab,setTab]=useState<'dashboard'|'employees'|'tasks'>('dashboard')
  const [emps,setEmps]=useState<any[]>([])
  const [tasks,setTasks]=useState<any[]>([])
  const [score,setScore]=useState<any>(null)
  const [bench,setBench]=useState(0)
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  const [modal,setModal]=useState<string|null>(null)
  const [pinTarget,setPinTarget]=useState<any>(null)
  const [empF,setEmpF]=useState({name:'',role:'',pin:''})
  const [taskF,setTaskF]=useState({name:'',employee_id:'',freq:'D',start_date:new Date().toISOString().slice(0,10)})
  const [pinF,setPinF]=useState({newPin:''})
  const [adminPwF,setAdminPwF]=useState({current:'',newPw:'',confirm:''})
  const [adminPwErr,setAdminPwErr]=useState('')
  const [adminPwOk,setAdminPwOk]=useState(false)
  const [saving,setSaving]=useState(false)
  const [err,setErr]=useState('')

  const load=useCallback(async()=>{
    setLoading(true)
    try{
      const me=await fetch('/api/auth/me').then(r=>r.json())
      if(me.role!=='admin'){router.replace('/');return}
      const [e,t,s]=await Promise.all([api('/api/employees'),api('/api/tasks'),api('/api/score?week=0')])
      setEmps(e);setTasks(t);setScore(s);setBench(s.benchmark)
    }catch{router.replace('/')}
    setLoading(false)
  },[router])

  useEffect(()=>{load()},[load])

  async function logout(){await fetch('/api/auth/logout',{method:'POST'});router.push('/')}
  async function addEmp(){
    if(!empF.name||!empF.pin)return
    setSaving(true);setErr('')
    try{await api('/api/employees',{method:'POST',body:JSON.stringify(empF)});setEmpF({name:'',role:'',pin:''});setModal(null);await load()}
    catch(e:any){setErr(e.message)}
    setSaving(false)
  }
  async function delEmp(id:string){
    if(!confirm('Delete employee and all their tasks?'))return
    await api('/api/employees',{method:'DELETE',body:JSON.stringify({id})});await load()
  }
  async function addTask(){
    if(!taskF.name||!taskF.employee_id)return
    setSaving(true);setErr('')
    try{await api('/api/tasks',{method:'POST',body:JSON.stringify(taskF)});setTaskF({name:'',employee_id:'',freq:'D',start_date:new Date().toISOString().slice(0,10)});setModal(null);await load()}
    catch(e:any){setErr(e.message)}
    setSaving(false)
  }
  async function delTask(id:string){
    if(!confirm('Delete task and all records?'))return
    await api('/api/tasks',{method:'DELETE',body:JSON.stringify({id})});await load()
  }
  async function changePin(){
    if(!pinTarget||!pinF.newPin||pinF.newPin.length<4)return
    setSaving(true);setErr('')
    try{await api('/api/auth/change-pin',{method:'POST',body:JSON.stringify({employeeId:pinTarget.id,newPin:pinF.newPin})});setPinF({newPin:''});setModal(null);setPinTarget(null)}
    catch(e:any){setErr(e.message)}
    setSaving(false)
  }
  async function changeAdminPassword(){
    setAdminPwErr('');setAdminPwOk(false)
    if(!adminPwF.current||!adminPwF.newPw||!adminPwF.confirm){setAdminPwErr('All fields required');return}
    if(adminPwF.newPw.length<6){setAdminPwErr('Min 6 characters');return}
    if(adminPwF.newPw!==adminPwF.confirm){setAdminPwErr('Passwords do not match');return}
    setSaving(true)
    try{
      await api('/api/auth/change-admin-password',{method:'POST',body:JSON.stringify({currentPassword:adminPwF.current,newPassword:adminPwF.newPw})})
      setAdminPwOk(true);setAdminPwF({current:'',newPw:'',confirm:''})
    }catch(e:any){setAdminPwErr(e.message)}
    setSaving(false)
  }
  async function saveBench(){
    await api('/api/settings',{method:'POST',body:JSON.stringify({benchmark:bench})});setModal(null);await load()
  }

  // Filter employees by search
  const filteredRows=(score?.rows||[]).filter((r:any)=>
    r.employee.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.employee.role||'').toLowerCase().includes(search.toLowerCase())
  )

  if(loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',color:'#9CA3AF'}}>
        <div style={{width:40,height:40,border:'3px solid #E0E7FF',borderTopColor:'#4F46E5',borderRadius:'50%',margin:'0 auto 12px',animation:'spin 0.8s linear infinite'}}/>
        Loading…
      </div>
    </div>
  )

  return (
    <div style={{maxWidth:1100,margin:'0 auto',padding:'1.25rem 1rem',minHeight:'100vh'}}>

      {/* Top bar */}
      <div className="fu card" style={{padding:'10px 16px',marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:40,height:40,borderRadius:12,overflow:'hidden',border:'2px solid #E0E7FF',flexShrink:0}}>
            <img src="/logo.jpeg" alt="logo" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:'0.95rem',color:'#111827'}}>Anuradha Textile</div>
            <div style={{fontSize:'0.68rem',color:'#9CA3AF'}}>TaskFlow · {emps.length} employees · {tasks.length} tasks</div>
          </div>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <button onClick={()=>router.push('/admin/history')} style={{padding:'7px 14px',borderRadius:99,border:'1.5px solid #4F46E5',background:'rgba(79,70,229,0.08)',color:'#4F46E5',cursor:'pointer',fontSize:'0.78rem',fontWeight:700,fontFamily:'var(--font)'}}>📅 History & Export</button>
          {[['⚙','bench','#F3F4F6','#374151'],['+ Employee','addEmp','#F3F4F6','#374151'],['🔐','changeAdminPw','#EEF2FF','#4F46E5']].map(([l,m,bg,c])=>(
            <button key={m} onClick={()=>setModal(m)} style={{padding:'7px 12px',borderRadius:99,border:'none',cursor:'pointer',fontSize:'0.78rem',fontWeight:600,fontFamily:'var(--font)',background:bg,color:c}}>{l}</button>
          ))}
          <button onClick={()=>setModal('addTask')} style={{padding:'7px 14px',borderRadius:99,border:'none',cursor:'pointer',fontSize:'0.78rem',fontWeight:700,fontFamily:'var(--font)',background:'linear-gradient(135deg,#4F46E5,#7C3AED)',color:'#fff',boxShadow:'0 3px 12px rgba(79,70,229,0.35)'}}>+ Task</button>
          <button onClick={logout} style={{padding:'7px 12px',borderRadius:99,border:'1.5px solid #E5E7EB',background:'transparent',cursor:'pointer',fontSize:'0.78rem',fontFamily:'var(--font)',color:'#9CA3AF'}}>Sign out</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="fu1" style={{display:'flex',gap:4,marginBottom:14,background:'rgba(255,255,255,0.6)',padding:4,borderRadius:14,width:'fit-content',boxShadow:'0 1px 6px rgba(0,0,0,0.06)'}}>
        {(['dashboard','employees','tasks'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:'7px 20px',borderRadius:10,border:'none',cursor:'pointer',fontFamily:'var(--font)',fontSize:'0.82rem',fontWeight:600,transition:'all 0.2s',
            background:tab===t?'linear-gradient(135deg,#4F46E5,#7C3AED)':'transparent',
            color:tab===t?'#fff':'#9CA3AF',boxShadow:tab===t?'0 2px 10px rgba(79,70,229,0.3)':'none'
          }}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab==='dashboard'&&<div className="fu2">

        {/* Search bar */}
        <div style={{position:'relative',marginBottom:14}}>
          <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'#9CA3AF',fontSize:16}}>🔍</span>
          <input placeholder="Search employee by name or role…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{width:'100%',padding:'10px 14px 10px 38px',borderRadius:12,border:'1.5px solid #E5E7EB',background:'#fff',fontSize:'0.875rem',fontFamily:'var(--font)',outline:'none'}}
            onFocus={(e:any)=>e.target.style.borderColor='#4F46E5'}
            onBlur={(e:any)=>e.target.style.borderColor='#E5E7EB'}
          />
          {search&&<button onClick={()=>setSearch('')} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#9CA3AF',fontSize:16}}>✕</button>}
        </div>

        {/* Summary stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:14}}>
          {[
            {label:'Total Employees',val:emps.length,icon:'👥'},
            {label:'Total Tasks',val:tasks.length,icon:'📋'},
            {label:'This Week Planned',val:(score?.rows||[]).reduce((a:number,r:any)=>a+r.currentWeek.planned,0),icon:'📅'},
            {label:'This Week Done',val:(score?.rows||[]).reduce((a:number,r:any)=>a+r.currentWeek.done,0),icon:'✅'},
          ].map((s,i)=>(
            <div key={i} style={{background:'#fff',borderRadius:14,padding:'12px 14px',boxShadow:'0 2px 10px rgba(0,0,0,0.06)'}}>
              <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
              <div style={{fontFamily:'var(--mono)',fontWeight:800,fontSize:'1.5rem',color:'#111827'}}>{s.val}</div>
              <div style={{fontSize:'0.68rem',color:'#9CA3AF',marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* KPI Table */}
        <div style={{fontSize:'0.72rem',fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>
          Current Week Score {search&&`— ${filteredRows.length} result${filteredRows.length!==1?'s':''}`}
        </div>
        <div className="card" style={{overflow:'hidden',marginBottom:14}}>
          <div style={{background:'linear-gradient(135deg,#4F46E5 0%,#7C3AED 55%,#EC4899 100%)',padding:'12px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:'0.75rem',fontWeight:700,color:'rgba(255,255,255,0.9)',textTransform:'uppercase',letterSpacing:'0.08em'}}>KRA / KPI Score Table</div>
              <div style={{fontSize:'0.68rem',color:'rgba(255,255,255,0.55)',marginTop:2}}>ROUND(Actual/Planned×100−100,2) · 0=perfect · negative=not done</div>
            </div>
            <button onClick={()=>router.push('/admin/history')} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.1)',color:'#fff',cursor:'pointer',fontSize:'0.72rem',fontWeight:600,fontFamily:'var(--font)'}}>
              📅 View History →
            </button>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.78rem'}}>
              <thead>
                <tr style={{background:'#F8F9FF'}}>
                  {['Team / Person','KRA','KPI','Benchmark','Last Week','CW Planned','CW Actual','CW Score'].map((h,i)=>(
                    <th key={i} style={{border:'1px solid #F0F0F0',padding:'9px 10px',textAlign:'center',fontWeight:600,color:'#9CA3AF',fontSize:'0.7rem'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!filteredRows.length&&<tr><td colSpan={8} style={{padding:'2rem',textAlign:'center',color:'#9CA3AF',border:'1px solid #F0F0F0'}}>{search?`No results for "${search}"`:'No employees yet'}</td></tr>}
                {filteredRows.map((row:any,ri:number)=>(
                  <>
                    <tr key={ri+'a'}>
                      <td rowSpan={2} style={{border:'1px solid #F0F0F0',padding:'10px 12px',fontWeight:700,verticalAlign:'middle'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{width:28,height:28,borderRadius:'50%',background:EMP_GRADS[ri%EMP_GRADS.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#fff',flexShrink:0}}>{row.employee.name.slice(0,2)}</div>
                          <div>
                            <div style={{fontWeight:700}}>{row.employee.name}</div>
                            {row.employee.role&&<div style={{fontSize:'0.65rem',color:'#9CA3AF',fontWeight:400}}>{row.employee.role}</div>}
                          </div>
                        </div>
                      </td>
                      <td rowSpan={2} style={{border:'1px solid #F0F0F0',padding:'8px',textAlign:'center',color:'#9CA3AF',fontSize:'0.7rem',verticalAlign:'middle',background:'#FAFAFA'}}>All work<br/>should be done</td>
                      <td style={{border:'1px solid #F0F0F0',padding:'8px',textAlign:'center',color:'#6B7280'}}>% work not done</td>
                      <td style={{border:'1px solid #F0F0F0',padding:'8px',textAlign:'center'}}>{row.benchmark}</td>
                      <td style={{border:'1px solid #F0F0F0',padding:'8px',textAlign:'center'}}>
                        {row.lastWeek.planned>0?<><span style={{fontFamily:'var(--mono)',fontWeight:700,fontSize:'0.9rem',color:sc(row.lastWeek.score1)}}>{row.lastWeek.score1.toFixed(2)}</span><div style={{fontSize:'0.62rem',color:'#9CA3AF'}}>{row.lastWeek.planned}p/{row.lastWeek.done}d</div></>:'—'}
                      </td>
                      <td style={{border:'1px solid #F0F0F0',padding:'8px',textAlign:'center',fontWeight:700}}>{row.currentWeek.planned}</td>
                      <td style={{border:'1px solid #F0F0F0',padding:'8px',textAlign:'center',fontWeight:700}}>{row.currentWeek.done}</td>
                      <td style={{border:'1px solid #F0F0F0',padding:'8px',textAlign:'center'}}><span style={{fontFamily:'var(--mono)',fontWeight:800,fontSize:'1.1rem',color:sc(row.currentWeek.score1)}}>{row.currentWeek.score1.toFixed(2)}</span></td>
                    </tr>
                    <tr key={ri+'b'} style={{background:'#FAFFFE'}}>
                      <td style={{border:'1px solid #F0F0F0',padding:'8px',textAlign:'center',color:'#6B7280'}}>% work not on time</td>
                      <td style={{border:'1px solid #F0F0F0',padding:'8px',textAlign:'center'}}>{row.benchmark}</td>
                      <td style={{border:'1px solid #F0F0F0',padding:'8px',textAlign:'center'}}>
                        {row.lastWeek.planned>0?<><span style={{fontFamily:'var(--mono)',fontWeight:700,fontSize:'0.9rem',color:sc(row.lastWeek.score2)}}>{row.lastWeek.score2.toFixed(2)}</span><div style={{fontSize:'0.62rem',color:'#9CA3AF'}}>{row.lastWeek.doneOnTime} on time</div></>:'—'}
                      </td>
                      <td style={{border:'1px solid #F0F0F0',padding:'8px',textAlign:'center',fontWeight:700}}>{row.currentWeek.planned}</td>
                      <td style={{border:'1px solid #F0F0F0',padding:'8px',textAlign:'center',fontWeight:700}}>{row.currentWeek.doneOnTime}</td>
                      <td style={{border:'1px solid #F0F0F0',padding:'8px',textAlign:'center'}}><span style={{fontFamily:'var(--mono)',fontWeight:800,fontSize:'1.1rem',color:sc(row.currentWeek.score2)}}>{row.currentWeek.score2.toFixed(2)}</span></td>
                    </tr>
                    <tr key={ri+'sp'}><td colSpan={8} style={{height:3,background:'rgba(79,70,229,0.04)',border:'none',padding:0}}/></tr>
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Employee score cards */}
        <div style={{fontSize:'0.72rem',fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Employee Scorecards</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
          {filteredRows.map((row:any,i:number)=>(
            <div key={row.employee.id} className="card" style={{padding:'1rem',cursor:'pointer',transition:'transform 0.15s'}}
              onMouseEnter={(e:any)=>e.currentTarget.style.transform='translateY(-2px)'}
              onMouseLeave={(e:any)=>e.currentTarget.style.transform='translateY(0)'}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                <div style={{width:38,height:38,borderRadius:'50%',background:EMP_GRADS[i%EMP_GRADS.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff'}}>{row.employee.name.slice(0,2)}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:'0.875rem'}}>{row.employee.name}</div>
                  {row.employee.role&&<div style={{fontSize:'0.68rem',color:'#9CA3AF'}}>{row.employee.role}</div>}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {[['Not done',row.currentWeek.score1,`${row.currentWeek.planned}p·${row.currentWeek.done}d`],
                  ['Not on time',row.currentWeek.score2,`${row.currentWeek.doneOnTime} on time`]].map(([lbl,val,sub]:any)=>(
                  <div key={lbl} style={{background:'#F8F9FF',borderRadius:10,padding:'8px'}}>
                    <div style={{fontSize:'0.62rem',color:'#9CA3AF',fontWeight:600,marginBottom:2}}>{lbl}</div>
                    <div style={{fontFamily:'var(--mono)',fontWeight:800,fontSize:'1.1rem',color:sc(val)}}>{val.toFixed(2)}</div>
                    <div style={{fontSize:'0.6rem',color:'#9CA3AF',marginTop:1}}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>}

      {/* EMPLOYEES */}
      {tab==='employees'&&<div className="fu2">
        {emps.length===0
          ? <Empty icon="👥" title="No employees yet" sub='Click "+ Employee"'/>
          : emps.map((emp,i)=>(
            <div key={emp.id} className="card" style={{padding:'1rem 1.25rem',marginBottom:10,display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:42,height:42,borderRadius:'50%',background:EMP_GRADS[i%EMP_GRADS.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#fff',flexShrink:0}}>{emp.name.slice(0,2)}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700}}>{emp.name}</div>
                {emp.role&&<div style={{fontSize:'0.75rem',color:'#9CA3AF'}}>{emp.role}</div>}
              </div>
              <button onClick={()=>{setPinTarget(emp);setPinF({newPin:''});setErr('');setModal('changePin')}} style={{padding:'6px 12px',borderRadius:8,border:'none',cursor:'pointer',fontSize:'0.75rem',fontWeight:700,fontFamily:'var(--font)',background:'#FEF3C7',color:'#D97706'}}>🔑 Change PIN</button>
              <button onClick={()=>delEmp(emp.id)} style={{padding:'6px 12px',borderRadius:8,border:'none',cursor:'pointer',fontSize:'0.75rem',fontWeight:700,fontFamily:'var(--font)',background:'#FEF2F2',color:'#DC2626'}}>Remove</button>
            </div>
          ))
        }
      </div>}

      {/* TASKS */}
      {tab==='tasks'&&<div className="fu2">
        {tasks.length===0
          ? <Empty icon="📋" title="No tasks yet" sub='Click "+ Task"'/>
          : tasks.map(t=>{
            const emp=emps.find((e:any)=>e.id===t.employee_id)
            const FCOL:any={D:{bg:'#EEF2FF',c:'#4F46E5'},W:{bg:'#ECFDF5',c:'#059669'},F:{bg:'#FEF9C3',c:'#B45309'},M:{bg:'#FDF4FF',c:'#9333EA'},Q:{bg:'#FFF1F2',c:'#BE185D'},Y:{bg:'#FFF7ED',c:'#C2410C'}}
            const fc=FCOL[t.freq]||FCOL.D
            return (
              <div key={t.id} className="card" style={{padding:'0.875rem 1.25rem',marginBottom:8,display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:'0.7rem',fontWeight:700,padding:'3px 9px',borderRadius:7,flexShrink:0,background:fc.bg,color:fc.c}}>{FL[t.freq]}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:'0.875rem',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.name}</div>
                  <div style={{fontSize:'0.72rem',color:'#9CA3AF'}}>{emp?.name||'—'} · From {format(parseISO(t.start_date),'d MMM yyyy')}</div>
                </div>
                <button onClick={()=>delTask(t.id)} style={{padding:'6px 12px',borderRadius:8,border:'none',cursor:'pointer',fontSize:'0.75rem',fontWeight:700,fontFamily:'var(--font)',background:'#FEF2F2',color:'#DC2626'}}>Delete</button>
              </div>
            )
          })
        }
      </div>}

      {/* MODALS */}
      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}} onClick={()=>{setModal(null);setErr('')}}>
          <div className="card fu" style={{padding:'1.75rem',maxWidth:420,width:'100%'}} onClick={(e:any)=>e.stopPropagation()}>
            {modal==='bench'&&<>
              <MTitle title="⚙ Set Benchmark" onClose={()=>setModal(null)}/>
              <p style={{fontSize:'0.8rem',color:'#6B7280',marginBottom:12}}>Score = ROUND(Actual/Planned×100−100, 2). 0 = all work done.</p>
              <MField label="Benchmark value"><MInput type="number" value={String(bench)} onChange={(v:string)=>setBench(Number(v))}/></MField>
              <MActions onCancel={()=>setModal(null)} onSave={saveBench}/>
            </>}
            {modal==='addEmp'&&<>
              <MTitle title="👤 Add Employee" onClose={()=>setModal(null)}/>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <MField label="Name *"><MInput placeholder="e.g. SANJANA" value={empF.name} onChange={(v:string)=>setEmpF(p=>({...p,name:v}))}/></MField>
                <MField label="Role"><MInput placeholder="e.g. Sales Executive" value={empF.role} onChange={(v:string)=>setEmpF(p=>({...p,role:v}))}/></MField>
                <MField label="PIN (min 4 digits) *"><MInput type="password" placeholder="Set a PIN" value={empF.pin} onChange={(v:string)=>setEmpF(p=>({...p,pin:v}))}/></MField>
                {err&&<ErrBox msg={err}/>}
                <MActions onCancel={()=>setModal(null)} onSave={addEmp} saving={saving} saveLabel="Add Employee"/>
              </div>
            </>}
            {modal==='addTask'&&<>
              <MTitle title="📋 Add Recurring Task" onClose={()=>setModal(null)}/>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <MField label="Task name *"><MInput placeholder="e.g. Daily design send" value={taskF.name} onChange={(v:string)=>setTaskF(p=>({...p,name:v}))}/></MField>
                <MField label="Employee *">
                  <select value={taskF.employee_id} onChange={(e:any)=>setTaskF(p=>({...p,employee_id:e.target.value}))} style={{width:'100%',padding:'11px 14px',borderRadius:12,border:'1.5px solid #E5E7EB',background:'#F9FAFB',color:'#111827',fontSize:'0.9rem',fontFamily:'var(--font)',outline:'none'}}>
                    <option value="">Select employee</option>
                    {emps.map((e:any)=><option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </MField>
                <MField label="Frequency">
                  <select value={taskF.freq} onChange={(e:any)=>setTaskF(p=>({...p,freq:e.target.value}))} style={{width:'100%',padding:'11px 14px',borderRadius:12,border:'1.5px solid #E5E7EB',background:'#F9FAFB',color:'#111827',fontSize:'0.9rem',fontFamily:'var(--font)',outline:'none'}}>
                    {FOPT.map(f=><option key={f} value={f}>{FL[f]}</option>)}
                  </select>
                </MField>
                <MField label="Start date"><MInput type="date" value={taskF.start_date} onChange={(v:string)=>setTaskF(p=>({...p,start_date:v}))}/></MField>
                {err&&<ErrBox msg={err}/>}
                <MActions onCancel={()=>setModal(null)} onSave={addTask} saving={saving} saveLabel="Add Task"/>
              </div>
            </>}
            {modal==='changePin'&&pinTarget&&<>
              <MTitle title={`🔑 Change PIN — ${pinTarget.name}`} onClose={()=>{setModal(null);setErr('')}}/>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <MField label="New PIN (min 4 characters) *"><MInput type="password" placeholder="Enter new PIN" value={pinF.newPin} onChange={(v:string)=>setPinF({newPin:v})}/></MField>
                {err&&<ErrBox msg={err}/>}
                <MActions onCancel={()=>{setModal(null);setErr('')}} onSave={changePin} saving={saving} saveLabel="Update PIN"/>
              </div>
            </>}
            {modal==='changeAdminPw'&&<>
              <MTitle title="🔐 Change Admin Password" onClose={()=>{setModal(null);setAdminPwErr('');setAdminPwOk(false);setAdminPwF({current:'',newPw:'',confirm:''})}}/>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {adminPwOk&&<div style={{background:'#ECFDF5',border:'1.5px solid #6EE7B7',borderRadius:10,padding:'10px 14px',fontSize:'0.85rem',color:'#065F46',fontWeight:600}}>✅ Password changed!</div>}
                <MField label="Current Password *"><MInput type="password" placeholder="Current password" value={adminPwF.current} onChange={(v:string)=>setAdminPwF(p=>({...p,current:v}))}/></MField>
                <MField label="New Password * (min 6 chars)"><MInput type="password" placeholder="New password" value={adminPwF.newPw} onChange={(v:string)=>setAdminPwF(p=>({...p,newPw:v}))}/></MField>
                <MField label="Confirm New Password *"><MInput type="password" placeholder="Re-enter new password" value={adminPwF.confirm} onChange={(v:string)=>setAdminPwF(p=>({...p,confirm:v}))}/></MField>
                {adminPwErr&&<ErrBox msg={adminPwErr}/>}
                <div style={{background:'#FEF3C7',border:'1.5px solid #FCD34D',borderRadius:10,padding:'9px 12px',fontSize:'0.78rem',color:'#92400E'}}>⚠ After changing, sign in again.</div>
                <MActions onCancel={()=>{setModal(null);setAdminPwErr('');setAdminPwOk(false);setAdminPwF({current:'',newPw:'',confirm:''})}} onSave={changeAdminPassword} saving={saving} saveLabel="Change Password"/>
              </div>
            </>}
          </div>
        </div>
      )}
    </div>
  )
}

function MTitle({title,onClose}:any){return <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}><h3 style={{fontWeight:800,fontSize:'1rem'}}>{title}</h3><button onClick={onClose} style={{background:'none',border:'none',color:'#9CA3AF',cursor:'pointer',fontSize:20,lineHeight:1}}>✕</button></div>}
function MField({label,children}:any){return <div><label style={{fontSize:'0.72rem',fontWeight:600,color:'#6B7280',display:'block',marginBottom:5}}>{label}</label>{children}</div>}
function MInput({type='text',placeholder,value,onChange}:{type?:string;placeholder?:string;value:string;onChange:(v:string)=>void}){
  return <input type={type} placeholder={placeholder} value={value} onChange={(e:any)=>onChange(e.target.value)}
    style={{width:'100%',padding:'11px 14px',borderRadius:12,border:'1.5px solid #E5E7EB',background:'#F9FAFB',color:'#111827',fontSize:'0.9rem',fontFamily:'var(--font)',outline:'none',transition:'border-color 0.2s'}}
    onFocus={(e:any)=>(e.target.style.borderColor='#4F46E5')}
    onBlur={(e:any)=>(e.target.style.borderColor='#E5E7EB')}/>
}
function MActions({onCancel,onSave,saving=false,saveLabel='Save'}:any){
  return <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:8}}>
    <button onClick={onCancel} style={{padding:'9px 16px',borderRadius:10,border:'1.5px solid #E5E7EB',background:'#fff',color:'#374151',fontWeight:600,cursor:'pointer',fontFamily:'var(--font)',fontSize:'0.875rem'}}>Cancel</button>
    <button onClick={onSave} disabled={saving} style={{padding:'9px 18px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#4F46E5,#7C3AED)',color:'#fff',fontWeight:700,cursor:saving?'default':'pointer',fontFamily:'var(--font)',fontSize:'0.875rem',opacity:saving?0.7:1,boxShadow:'0 3px 12px rgba(79,70,229,0.35)'}}>
      {saving?'Saving…':saveLabel}
    </button>
  </div>
}
function ErrBox({msg}:any){return <div style={{background:'#FEF2F2',border:'1.5px solid #FCA5A5',borderRadius:10,padding:'9px 12px',fontSize:'0.8rem',color:'#DC2626'}}>⚠ {msg}</div>}
function Empty({icon,title,sub}:any){return <div style={{textAlign:'center',padding:'4rem 0',color:'#9CA3AF'}}><div style={{fontSize:40,marginBottom:12}}>{icon}</div><div style={{fontWeight:700,color:'#374151',marginBottom:4}}>{title}</div><div style={{fontSize:'0.8rem'}}>{sub}</div></div>}
