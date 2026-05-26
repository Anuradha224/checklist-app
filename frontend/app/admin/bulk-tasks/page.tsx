'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const FL:Record<string,string>={D:'Daily',W:'Weekly',F:'Fortnightly',M:'Monthly',Q:'Quarterly',Y:'Yearly'}
const FOPT=['D','W','F','M','Q','Y']
const FREQ_COLORS:Record<string,{bg:string,c:string}>={
  D:{bg:'#EEF2FF',c:'#4F46E5'},W:{bg:'#ECFDF5',c:'#059669'},
  F:{bg:'#FEF9C3',c:'#B45309'},M:{bg:'#FDF4FF',c:'#9333EA'},
  Q:{bg:'#FFF1F2',c:'#BE185D'},Y:{bg:'#FFF7ED',c:'#C2410C'}
}

interface TaskRow {
  id: number
  name: string
  employee_id: string
  freq: string
  start_date: string
  status: 'idle'|'saving'|'done'|'error'
  error?: string
}

async function api(url:string,opts?:RequestInit){
  const res=await fetch(url,{headers:{'Content-Type':'application/json'},...opts})
  if(!res.ok){const e=await res.json();throw new Error(e.error||'Error')}
  return res.json()
}

let nextId = 1
function makeRow(empId='',freq='D'):TaskRow{
  return {id:nextId++,name:'',employee_id:empId,freq,start_date:new Date().toISOString().slice(0,10),status:'idle'}
}

export default function BulkTasksPage(){
  const router = useRouter()
  const [emps, setEmps] = useState<any[]>([])
  const [rows, setRows] = useState<TaskRow[]>([makeRow(),makeRow(),makeRow()])
  const [saving, setSaving] = useState(false)
  const [filterEmp, setFilterEmp] = useState('all')
  const [savedCount, setSavedCount] = useState(0)

  const load = useCallback(async()=>{
    const me = await fetch('/api/auth/me').then(r=>r.json())
    if(me.role!=='admin'){router.replace('/');return}
    const e = await api('/api/employees')
    setEmps(e)
  },[router])

  useEffect(()=>{load()},[load])

  function updateRow(id:number, field:string, value:string){
    setRows(prev=>prev.map(r=>r.id===id?{...r,[field]:value,status:'idle',error:undefined}:r))
  }

  function addRows(count:number, empId=''){
    const newRows = Array.from({length:count},()=>makeRow(empId))
    setRows(prev=>[...prev,...newRows])
  }

  function removeRow(id:number){
    setRows(prev=>prev.filter(r=>r.id!==id))
  }

  function duplicateRow(id:number){
    const row = rows.find(r=>r.id===id)
    if(!row) return
    const newRow = {...makeRow(row.employee_id,row.freq), name:row.name, start_date:row.start_date}
    const idx = rows.findIndex(r=>r.id===id)
    setRows(prev=>[...prev.slice(0,idx+1), newRow, ...prev.slice(idx+1)])
  }

  // Fill same employee down
  function fillDown(id:number, field:string){
    const idx = rows.findIndex(r=>r.id===id)
    const val = rows[idx][field as keyof TaskRow] as string
    setRows(prev=>prev.map((r,i)=>i>=idx?{...r,[field]:val}:r))
  }

  async function saveAll(){
    const validRows = rows.filter(r=>r.name.trim()&&r.employee_id&&r.status!=='done')
    if(!validRows.length) return
    setSaving(true)
    let count = 0

    for(const row of validRows){
      setRows(prev=>prev.map(r=>r.id===row.id?{...r,status:'saving'}:r))
      try{
        await api('/api/tasks',{method:'POST',body:JSON.stringify({
          name:row.name.trim(),
          employee_id:row.employee_id,
          freq:row.freq,
          start_date:row.start_date
        })})
        setRows(prev=>prev.map(r=>r.id===row.id?{...r,status:'done'}:r))
        count++
      }catch(e:any){
        setRows(prev=>prev.map(r=>r.id===row.id?{...r,status:'error',error:e.message}:r))
      }
    }
    setSavedCount(c=>c+count)
    setSaving(false)
  }

  function clearDone(){
    setRows(prev=>prev.filter(r=>r.status!=='done'))
    if(rows.filter(r=>r.status!=='done').length===0){
      setRows([makeRow(),makeRow(),makeRow()])
    }
  }

  function clearAll(){
    if(!confirm('Clear all rows?')) return
    nextId=1
    setRows([makeRow(),makeRow(),makeRow()])
    setSavedCount(0)
  }

  const validCount = rows.filter(r=>r.name.trim()&&r.employee_id).length
  const doneCount = rows.filter(r=>r.status==='done').length
  const errorCount = rows.filter(r=>r.status==='error').length
  const filteredRows = filterEmp==='all' ? rows : rows.filter(r=>r.employee_id===filterEmp)

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
            <div style={{fontWeight:800,fontSize:'0.95rem'}}>Bulk Add Tasks</div>
            <div style={{fontSize:'0.68rem',color:'#9CA3AF'}}>Add many tasks at once — all employees</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          {savedCount>0&&<span style={{fontSize:'0.78rem',color:'#059669',fontWeight:600,background:'#ECFDF5',padding:'5px 10px',borderRadius:8}}>✅ {savedCount} tasks saved</span>}
          {doneCount>0&&<button onClick={clearDone} style={{padding:'7px 12px',borderRadius:99,border:'1.5px solid #E5E7EB',background:'#fff',cursor:'pointer',fontSize:'0.78rem',fontWeight:600,fontFamily:'var(--font)',color:'#6B7280'}}>Clear done ({doneCount})</button>}
          <button onClick={clearAll} style={{padding:'7px 12px',borderRadius:99,border:'1.5px solid #FCA5A5',background:'#FEF2F2',cursor:'pointer',fontSize:'0.78rem',fontWeight:600,fontFamily:'var(--font)',color:'#DC2626'}}>🗑 Clear all</button>
          <button onClick={saveAll} disabled={saving||validCount===0} style={{
            padding:'8px 20px',borderRadius:99,border:'none',cursor:saving||validCount===0?'default':'pointer',
            fontSize:'0.85rem',fontWeight:700,fontFamily:'var(--font)',
            background:validCount===0?'#E5E7EB':'linear-gradient(135deg,#4F46E5,#7C3AED)',
            color:validCount===0?'#9CA3AF':'#fff',
            boxShadow:validCount>0?'0 3px 12px rgba(79,70,229,0.35)':'none',
            opacity:saving?0.7:1
          }}>
            {saving?'Saving…':`Save ${validCount} task${validCount!==1?'s':''}`}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="fu1" style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
        {[
          {label:'Total rows',val:rows.length,bg:'#F8F9FF',c:'#4F46E5'},
          {label:'Ready to save',val:validCount,bg:'#EEF2FF',c:'#4F46E5'},
          {label:'Saved',val:doneCount,bg:'#ECFDF5',c:'#059669'},
          {label:'Errors',val:errorCount,bg:'#FEF2F2',c:'#DC2626'},
        ].map((s,i)=>(
          <div key={i} style={{background:s.bg,borderRadius:10,padding:'8px 14px',display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontFamily:'var(--mono)',fontWeight:800,fontSize:'1.1rem',color:s.c}}>{s.val}</span>
            <span style={{fontSize:'0.72rem',color:'#9CA3AF'}}>{s.label}</span>
          </div>
        ))}
        <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:'0.75rem',color:'#9CA3AF'}}>Filter:</span>
          <select value={filterEmp} onChange={e=>setFilterEmp(e.target.value)}
            style={{padding:'6px 10px',borderRadius:8,border:'1.5px solid #E5E7EB',background:'#fff',fontSize:'0.78rem',fontFamily:'var(--font)',outline:'none',color:'#374151'}}>
            <option value="all">All employees</option>
            {emps.map((e:any)=><option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      {/* Quick add bar */}
      <div className="fu2 card" style={{padding:'12px 16px',marginBottom:14,display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{fontSize:'0.78rem',fontWeight:600,color:'#374151'}}>Quick add rows:</span>
        {[1,5,10].map(n=>(
          <button key={n} onClick={()=>addRows(n)} style={{padding:'6px 14px',borderRadius:8,border:'1.5px solid #E5E7EB',background:'#fff',cursor:'pointer',fontSize:'0.78rem',fontWeight:600,fontFamily:'var(--font)',color:'#374151'}}>+ {n} row{n>1?'s':''}</button>
        ))}
        <span style={{margin:'0 6px',color:'#E5E7EB'}}>|</span>
        <span style={{fontSize:'0.78rem',fontWeight:600,color:'#374151'}}>Add rows for employee:</span>
        {emps.slice(0,6).map((e:any)=>(
          <button key={e.id} onClick={()=>addRows(3,e.id)} style={{padding:'5px 12px',borderRadius:8,border:'1.5px solid #E0E7FF',background:'#EEF2FF',cursor:'pointer',fontSize:'0.72rem',fontWeight:700,fontFamily:'var(--font)',color:'#4F46E5'}}>
            {e.name} +3
          </button>
        ))}
      </div>

      {/* Tips */}
      <div className="fu2" style={{background:'rgba(79,70,229,0.06)',border:'1.5px solid rgba(79,70,229,0.15)',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:'0.75rem',color:'#4F46E5'}}>
        💡 <strong>Tips:</strong> Click <strong>▼</strong> to fill a value down to all rows below · Click <strong>⊕</strong> to duplicate a row · Press <strong>Tab</strong> to move between cells
      </div>

      {/* Task table */}
      <div className="fu2 card" style={{overflow:'hidden',marginBottom:14}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
            <thead>
              <tr style={{background:'linear-gradient(135deg,#4F46E5,#7C3AED)'}}>
                <th style={{padding:'10px 8px',color:'rgba(255,255,255,0.7)',fontWeight:600,fontSize:'0.7rem',width:36}}>#</th>
                <th style={{padding:'10px 12px',textAlign:'left',color:'#fff',fontWeight:700,fontSize:'0.78rem',minWidth:260}}>Task Name *</th>
                <th style={{padding:'10px 12px',textAlign:'left',color:'#fff',fontWeight:700,fontSize:'0.78rem',minWidth:160}}>Employee *</th>
                <th style={{padding:'10px 12px',textAlign:'center',color:'#fff',fontWeight:700,fontSize:'0.78rem',minWidth:130}}>Frequency</th>
                <th style={{padding:'10px 12px',textAlign:'center',color:'#fff',fontWeight:700,fontSize:'0.78rem',minWidth:130}}>Start Date</th>
                <th style={{padding:'10px 12px',textAlign:'center',color:'rgba(255,255,255,0.7)',fontWeight:600,fontSize:'0.7rem',width:90}}>Status</th>
                <th style={{padding:'10px 8px',textAlign:'center',color:'rgba(255,255,255,0.7)',fontWeight:600,fontSize:'0.7rem',width:70}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length===0&&(
                <tr><td colSpan={7} style={{padding:'2rem',textAlign:'center',color:'#9CA3AF'}}>No rows yet. Click "+ rows" above to start.</td></tr>
              )}
              {filteredRows.map((row,idx)=>{
                const isValid = row.name.trim()&&row.employee_id
                const rowBg = row.status==='done'?'#F0FDF4':row.status==='error'?'#FEF2F2':idx%2===0?'#fff':'#FAFBFF'
                return (
                  <tr key={row.id} style={{background:rowBg,transition:'background 0.2s'}}>
                    {/* # */}
                    <td style={{padding:'6px 8px',textAlign:'center',color:'#D1D5DB',fontSize:'0.72rem',fontFamily:'var(--mono)'}}>{idx+1}</td>

                    {/* Task Name */}
                    <td style={{padding:'5px 8px'}}>
                      {row.status==='done'
                        ? <span style={{color:'#059669',fontWeight:600,fontSize:'0.82rem'}}>✓ {row.name}</span>
                        : <input
                            value={row.name}
                            onChange={e=>updateRow(row.id,'name',e.target.value)}
                            placeholder="Enter task name…"
                            disabled={row.status==='saving'}
                            style={{width:'100%',padding:'8px 10px',borderRadius:8,border:`1.5px solid ${row.status==='error'?'#FCA5A5':row.name.trim()?'#C7D2FE':'#E5E7EB'}`,background:'transparent',fontSize:'0.82rem',fontFamily:'var(--font)',outline:'none',transition:'border-color 0.2s'}}
                            onFocus={(e:any)=>e.target.style.borderColor='#4F46E5'}
                            onBlur={(e:any)=>e.target.style.borderColor=row.name.trim()?'#C7D2FE':'#E5E7EB'}
                          />
                      }
                      {row.status==='error'&&<div style={{fontSize:'0.65rem',color:'#DC2626',marginTop:2}}>⚠ {row.error}</div>}
                    </td>

                    {/* Employee */}
                    <td style={{padding:'5px 8px'}}>
                      {row.status==='done'
                        ? <span style={{color:'#9CA3AF',fontSize:'0.78rem'}}>{emps.find(e=>e.id===row.employee_id)?.name||'—'}</span>
                        : <div style={{display:'flex',alignItems:'center',gap:4}}>
                            <select value={row.employee_id} onChange={e=>updateRow(row.id,'employee_id',e.target.value)}
                              disabled={row.status==='saving'}
                              style={{flex:1,padding:'8px 8px',borderRadius:8,border:`1.5px solid ${row.employee_id?'#C7D2FE':'#E5E7EB'}`,background:'transparent',fontSize:'0.78rem',fontFamily:'var(--font)',outline:'none',color:row.employee_id?'#111827':'#9CA3AF'}}>
                              <option value="">Select…</option>
                              {emps.map((e:any)=><option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            <button onClick={()=>fillDown(row.id,'employee_id')} title="Fill down" style={{width:24,height:24,borderRadius:6,border:'1px solid #E5E7EB',background:'#F8F9FF',cursor:'pointer',fontSize:12,color:'#9CA3AF',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>▼</button>
                          </div>
                      }
                    </td>

                    {/* Frequency */}
                    <td style={{padding:'5px 8px'}}>
                      {row.status==='done'
                        ? <span className={`pill-${row.freq}`} style={{fontSize:'0.7rem',fontWeight:700,padding:'3px 8px',borderRadius:6,background:FREQ_COLORS[row.freq]?.bg,color:FREQ_COLORS[row.freq]?.c}}>{FL[row.freq]}</span>
                        : <div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'center'}}>
                            <select value={row.freq} onChange={e=>updateRow(row.id,'freq',e.target.value)}
                              disabled={row.status==='saving'}
                              style={{padding:'8px 6px',borderRadius:8,border:'1.5px solid #C7D2FE',background:FREQ_COLORS[row.freq]?.bg||'transparent',fontSize:'0.78rem',fontFamily:'var(--font)',outline:'none',color:FREQ_COLORS[row.freq]?.c||'#374151',fontWeight:600}}>
                              {FOPT.map(f=><option key={f} value={f}>{FL[f]}</option>)}
                            </select>
                            <button onClick={()=>fillDown(row.id,'freq')} title="Fill down" style={{width:24,height:24,borderRadius:6,border:'1px solid #E5E7EB',background:'#F8F9FF',cursor:'pointer',fontSize:12,color:'#9CA3AF',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>▼</button>
                          </div>
                      }
                    </td>

                    {/* Start Date */}
                    <td style={{padding:'5px 8px'}}>
                      {row.status==='done'
                        ? <span style={{color:'#9CA3AF',fontSize:'0.78rem'}}>{row.start_date}</span>
                        : <div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'center'}}>
                            <input type="date" value={row.start_date} onChange={e=>updateRow(row.id,'start_date',e.target.value)}
                              disabled={row.status==='saving'}
                              style={{padding:'7px 6px',borderRadius:8,border:'1.5px solid #C7D2FE',background:'transparent',fontSize:'0.78rem',fontFamily:'var(--font)',outline:'none',color:'#374151'}}/>
                            <button onClick={()=>fillDown(row.id,'start_date')} title="Fill down" style={{width:24,height:24,borderRadius:6,border:'1px solid #E5E7EB',background:'#F8F9FF',cursor:'pointer',fontSize:12,color:'#9CA3AF',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>▼</button>
                          </div>
                      }
                    </td>

                    {/* Status */}
                    <td style={{padding:'5px 8px',textAlign:'center'}}>
                      {row.status==='saving'&&<span style={{fontSize:'0.7rem',color:'#9CA3AF'}}>⏳ Saving…</span>}
                      {row.status==='done'&&<span style={{fontSize:'0.7rem',color:'#059669',fontWeight:700}}>✅ Done</span>}
                      {row.status==='error'&&<span style={{fontSize:'0.7rem',color:'#DC2626',fontWeight:700}}>❌ Error</span>}
                      {row.status==='idle'&&(
                        <span style={{fontSize:'0.68rem',color:isValid?'#4F46E5':'#D1D5DB',fontWeight:600}}>
                          {isValid?'✓ Ready':'⊘ Empty'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{padding:'5px 8px',textAlign:'center'}}>
                      <div style={{display:'flex',gap:4,justifyContent:'center'}}>
                        {row.status!=='done'&&(
                          <button onClick={()=>duplicateRow(row.id)} title="Duplicate row"
                            style={{width:26,height:26,borderRadius:6,border:'1px solid #C7D2FE',background:'#EEF2FF',cursor:'pointer',fontSize:13,color:'#4F46E5',display:'flex',alignItems:'center',justifyContent:'center'}}>⊕</button>
                        )}
                        <button onClick={()=>removeRow(row.id)} title="Remove row"
                          style={{width:26,height:26,borderRadius:6,border:'1px solid #FCA5A5',background:'#FEF2F2',cursor:'pointer',fontSize:13,color:'#DC2626',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom add row */}
        <div style={{padding:'10px 16px',borderTop:'1px solid #F0F0F0',display:'flex',gap:8,alignItems:'center',background:'#FAFBFF'}}>
          <span style={{fontSize:'0.75rem',color:'#9CA3AF'}}>Add more:</span>
          {[1,3,5,10].map(n=>(
            <button key={n} onClick={()=>addRows(n)} style={{padding:'5px 12px',borderRadius:8,border:'1.5px solid #E5E7EB',background:'#fff',cursor:'pointer',fontSize:'0.75rem',fontWeight:600,fontFamily:'var(--font)',color:'#374151',transition:'all 0.15s'}}
              onMouseEnter={(e:any)=>{e.currentTarget.style.borderColor='#4F46E5';e.currentTarget.style.color='#4F46E5'}}
              onMouseLeave={(e:any)=>{e.currentTarget.style.borderColor='#E5E7EB';e.currentTarget.style.color='#374151'}}>
              + {n}
            </button>
          ))}
          <span style={{marginLeft:'auto',fontSize:'0.72rem',color:'#9CA3AF'}}>{validCount} of {rows.length} rows ready</span>
        </div>
      </div>

      {/* Save button bottom */}
      {validCount>0&&(
        <div className="fu" style={{position:'sticky',bottom:16,display:'flex',justifyContent:'center'}}>
          <button onClick={saveAll} disabled={saving} style={{
            padding:'12px 40px',borderRadius:99,border:'none',cursor:saving?'default':'pointer',
            fontSize:'0.95rem',fontWeight:800,fontFamily:'var(--font)',color:'#fff',
            background:'linear-gradient(135deg,#4F46E5,#7C3AED)',
            boxShadow:'0 4px 24px rgba(79,70,229,0.45)',
            opacity:saving?0.7:1,transition:'all 0.2s'
          }}>
            {saving?'Saving tasks…':`💾 Save all ${validCount} tasks`}
          </button>
        </div>
      )}
    </div>
  )
}
