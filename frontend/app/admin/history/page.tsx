'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from 'date-fns'

const EMP_GRADS=['linear-gradient(135deg,#4F46E5,#7C3AED)','linear-gradient(135deg,#EC4899,#9333EA)','linear-gradient(135deg,#10B981,#059669)','linear-gradient(135deg,#F59E0B,#D97706)','linear-gradient(135deg,#EF4444,#DC2626)','linear-gradient(135deg,#06B6D4,#0284C7)']

async function api(url:string,opts?:RequestInit){
  const res=await fetch(url,{headers:{'Content-Type':'application/json'},...opts})
  if(!res.ok){const e=await res.json();throw new Error(e.error||'Error')}
  return res.json()
}

function sc(s:number){return s<0?'#EF4444':s===0?'#10B981':'#6B7280'}

function getWeekLabel(offset:number):string {
  const base = offset<=0 ? subWeeks(new Date(),Math.abs(offset)) : addWeeks(new Date(),offset)
  const start = startOfWeek(base,{weekStartsOn:1})
  const end = endOfWeek(base,{weekStartsOn:1})
  const fmt=(d:Date)=>format(d,'d MMM')
  if(offset===0) return `This Week\n${fmt(start)}–${fmt(end)}`
  if(offset===-1) return `Last Week\n${fmt(start)}–${fmt(end)}`
  return `${Math.abs(offset)}w ago\n${fmt(start)}–${fmt(end)}`
}

export default function HistoryPage(){
  const router = useRouter()
  const [historyData, setHistoryData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedEmp, setSelectedEmp] = useState<string>('all')
  const [allEmps, setAllEmps] = useState<any[]>([])

  const load = useCallback(async()=>{
    const me = await fetch('/api/auth/me').then(r=>r.json())
    if(me.role!=='admin'){router.replace('/');return}
    const emps = await api('/api/employees')
    setAllEmps(emps)
    const weeks = await Promise.all([-3,-2,-1,0].map(w=>api(`/api/score?week=${w}`)))
    setHistoryData(weeks)
    setLoading(false)
  },[router])

  useEffect(()=>{load()},[load])

  function exportExcel(){
    import('xlsx').then(XLSX=>{
      const wb = XLSX.utils.book_new()
      const rows:any[] = [['Employee','Role','KPI',...[-3,-2,-1,0].map(w=>getWeekLabel(w).replace('\n',' '))]]
      const names = getFilteredNames()
      names.forEach((name:string,ni:number)=>{
        const emp = allEmps.find((e:any)=>e.name===name)
        ;['% Work not done','% Work not on time'].forEach((kpi,ki)=>{
          rows.push([name, emp?.role||'', kpi, ...historyData.map((wk:any)=>{
            const row=wk?.rows?.find((r:any)=>r.employee.name===name)
            const v=ki===0?row?.currentWeek?.score1:row?.currentWeek?.score2
            return v!=null?v:''
          })])
        })
        rows.push(['','','','','','',''])
      })
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '4 Week History')
      XLSX.writeFile(wb, `Anuradha_History_${format(new Date(),'dd-MMM-yyyy')}.xlsx`)
    })
  }

  function exportPDF(){
    Promise.all([
      import('jspdf').then(m=>m.jsPDF),
      import('jspdf-autotable').then(m=>m.default||m)
    ]).then(([jsPDF, autoTable])=>{
      const doc = new jsPDF({orientation:'landscape'})
      doc.setFontSize(16)
      doc.setTextColor(79,70,229)
      doc.text('Anuradha Textile — 4-Week Score History', 14, 16)
      doc.setFontSize(9)
      doc.setTextColor(150,150,150)
      doc.text(`Generated: ${format(new Date(),'dd MMM yyyy, HH:mm')}`, 14, 22)

      const names = getFilteredNames()
      const head = [['Employee','Role','KPI',...[-3,-2,-1,0].map(w=>getWeekLabel(w).replace('\n','\n'))]]
      const body:any[] = []

      names.forEach((name:string)=>{
        const emp = allEmps.find((e:any)=>e.name===name)
        ;['% not done','% not on time'].forEach((kpi,ki)=>{
          const scores = historyData.map((wk:any)=>{
            const row=wk?.rows?.find((r:any)=>r.employee.name===name)
            const v=ki===0?row?.currentWeek?.score1:row?.currentWeek?.score2
            return v!=null?v.toFixed(2):'—'
          })
          body.push([ki===0?name:'', ki===0?(emp?.role||''):'', kpi, ...scores])
        })
      })

      autoTable(doc,{
        head, body,
        startY: 28,
        styles:{fontSize:8, cellPadding:4},
        headStyles:{fillColor:[79,70,229], textColor:255, fontStyle:'bold'},
        alternateRowStyles:{fillColor:[248,249,255]},
        didParseCell:(data:any)=>{
          if(data.section==='body' && data.column.index>=3){
            const val = parseFloat(data.cell.raw)
            if(!isNaN(val)){
              data.cell.styles.textColor = val<0?[239,68,68]:val===0?[16,185,129]:[107,114,128]
              data.cell.styles.fontStyle = 'bold'
            }
          }
        }
      })

      doc.save(`Anuradha_History_${format(new Date(),'dd-MMM-yyyy')}.pdf`)
    })
  }

  function getFilteredNames():string[]{
    const allNames = [...new Set((historyData[0]?.rows||[]).map((r:any)=>r.employee.name))] as string[]
    return allNames.filter((n:string)=>{
      const matchSearch = n.toLowerCase().includes(search.toLowerCase())
      const matchEmp = selectedEmp==='all' || n===selectedEmp
      return matchSearch && matchEmp
    })
  }

  const filteredNames = getFilteredNames()

  return (
    <div style={{maxWidth:1100,margin:'0 auto',padding:'1.25rem 1rem',minHeight:'100vh'}}>
      {/* Header */}
      <div className="fu card" style={{padding:'10px 16px',marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>router.push('/admin')} style={{width:32,height:32,borderRadius:8,border:'1.5px solid #E5E7EB',background:'#fff',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>←</button>
          <div style={{width:38,height:38,borderRadius:12,overflow:'hidden',border:'2px solid #E0E7FF'}}>
            <img src="/logo.jpeg" alt="logo" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:'0.95rem'}}>Score History</div>
            <div style={{fontSize:'0.68rem',color:'#9CA3AF'}}>4-week comparison · Monday meetings</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={exportExcel} style={{padding:'7px 14px',borderRadius:99,border:'1.5px solid #10B981',background:'rgba(16,185,129,0.08)',color:'#059669',cursor:'pointer',fontSize:'0.78rem',fontWeight:700,fontFamily:'var(--font)'}}>📊 Excel</button>
          <button onClick={exportPDF} style={{padding:'7px 14px',borderRadius:99,border:'1.5px solid #EF4444',background:'rgba(239,68,68,0.08)',color:'#DC2626',cursor:'pointer',fontSize:'0.78rem',fontWeight:700,fontFamily:'var(--font)'}}>📄 PDF</button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="fu1" style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#9CA3AF',fontSize:14}}>🔍</span>
          <input
            placeholder="Search employee..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
            style={{width:'100%',padding:'9px 12px 9px 34px',borderRadius:10,border:'1.5px solid #E5E7EB',background:'#fff',fontSize:'0.875rem',fontFamily:'var(--font)',outline:'none'}}
            onFocus={(e:any)=>e.target.style.borderColor='#4F46E5'}
            onBlur={(e:any)=>e.target.style.borderColor='#E5E7EB'}
          />
        </div>
        <select value={selectedEmp} onChange={e=>setSelectedEmp(e.target.value)}
          style={{padding:'9px 14px',borderRadius:10,border:'1.5px solid #E5E7EB',background:'#fff',fontSize:'0.875rem',fontFamily:'var(--font)',outline:'none',color:'#374151'}}>
          <option value="all">All Employees</option>
          {allEmps.map((e:any)=><option key={e.id} value={e.name}>{e.name}</option>)}
        </select>
        {(search||selectedEmp!=='all')&&(
          <button onClick={()=>{setSearch('');setSelectedEmp('all')}}
            style={{padding:'9px 14px',borderRadius:10,border:'1.5px solid #E5E7EB',background:'#fff',cursor:'pointer',fontSize:'0.78rem',fontFamily:'var(--font)',color:'#9CA3AF'}}>
            ✕ Clear
          </button>
        )}
      </div>

      {loading
        ? <div style={{textAlign:'center',padding:'4rem',color:'#9CA3AF'}}>Loading history…</div>
        : <>
          {/* 4-week table */}
          <div className="fu2 card" style={{overflow:'hidden',marginBottom:16}}>
            <div style={{background:'linear-gradient(135deg,#4F46E5 0%,#7C3AED 55%,#EC4899 100%)',padding:'14px 18px'}}>
              <div style={{fontSize:'0.75rem',fontWeight:700,color:'rgba(255,255,255,0.9)',textTransform:'uppercase',letterSpacing:'0.08em'}}>
                📅 4-Week History {filteredNames.length<(historyData[0]?.rows?.length||0)?`— ${filteredNames.length} result${filteredNames.length!==1?'s':''}`:''}</div>
              <div style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.55)',marginTop:2}}>Score = ROUND(Actual/Planned×100−100,2) · 0 = perfect · negative = not done</div>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.78rem'}}>
                <thead>
                  <tr style={{background:'#F8F9FF'}}>
                    <th style={{border:'1px solid #F0F0F0',padding:'10px 14px',textAlign:'left',fontWeight:600,color:'#9CA3AF',fontSize:'0.7rem',minWidth:140}}>Employee</th>
                    <th style={{border:'1px solid #F0F0F0',padding:'10px',textAlign:'center',fontWeight:600,color:'#9CA3AF',fontSize:'0.7rem'}}>KPI</th>
                    {[-3,-2,-1,0].map(w=>(
                      <th key={w} style={{border:'1px solid #F0F0F0',padding:'10px',textAlign:'center',fontWeight:600,fontSize:'0.7rem',minWidth:110,
                        color:w===0?'#4F46E5':'#9CA3AF',
                        background:w===0?'rgba(79,70,229,0.06)':'#F8F9FF'
                      }}>
                        <div>{w===0?'This Week':w===-1?'Last Week':`${Math.abs(w)} weeks ago`}</div>
                        <div style={{fontSize:'0.62rem',fontWeight:400,color:'#9CA3AF',marginTop:2}}>
                          {(()=>{
                            const base=w<=0?subWeeks(new Date(),Math.abs(w)):addWeeks(new Date(),w)
                            const s=startOfWeek(base,{weekStartsOn:1})
                            const e=endOfWeek(base,{weekStartsOn:1})
                            return `${format(s,'d MMM')} – ${format(e,'d MMM')}`
                          })()}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredNames.length===0&&(
                    <tr><td colSpan={6} style={{padding:'2rem',textAlign:'center',color:'#9CA3AF',border:'1px solid #F0F0F0'}}>
                      {search?`No employee found for "${search}"`:'No data yet'}
                    </td></tr>
                  )}
                  {filteredNames.map((name:string,ni:number)=>(
                    <>
                      <tr key={name+'k1'}>
                        <td rowSpan={2} style={{border:'1px solid #F0F0F0',padding:'10px 14px',fontWeight:700,verticalAlign:'middle'}}>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div style={{width:32,height:32,borderRadius:'50%',background:EMP_GRADS[ni%EMP_GRADS.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff',flexShrink:0}}>{name.slice(0,2)}</div>
                            <div>
                              <div style={{fontWeight:700,fontSize:'0.875rem'}}>{name}</div>
                              {allEmps.find((e:any)=>e.name===name)?.role&&
                                <div style={{fontSize:'0.68rem',color:'#9CA3AF'}}>{allEmps.find((e:any)=>e.name===name)?.role}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{border:'1px solid #F0F0F0',padding:'8px 10px',textAlign:'center',color:'#6B7280',background:'#FAFAFA',fontSize:'0.68rem',whiteSpace:'nowrap'}}>% work not done</td>
                        {[-3,-2,-1,0].map(w=>{
                          const row=historyData[w+3]?.rows?.find((r:any)=>r.employee.name===name)
                          const v=row?.currentWeek?.score1
                          const p=row?.currentWeek?.planned
                          const d=row?.currentWeek?.done
                          return <td key={w} style={{border:'1px solid #F0F0F0',padding:'8px',textAlign:'center',background:w===0?'rgba(79,70,229,0.03)':'white'}}>
                            {v!=null?<>
                              <div style={{fontFamily:'var(--mono)',fontWeight:700,fontSize:'1rem',color:sc(v)}}>{v.toFixed(2)}</div>
                              <div style={{fontSize:'0.62rem',color:'#9CA3AF',marginTop:2}}>{p}p / {d}d</div>
                            </>:'—'}
                          </td>
                        })}
                      </tr>
                      <tr key={name+'k2'} style={{background:'#FAFFFE'}}>
                        <td style={{border:'1px solid #F0F0F0',padding:'8px 10px',textAlign:'center',color:'#6B7280',background:'#FAFAFA',fontSize:'0.68rem',whiteSpace:'nowrap'}}>% work not on time</td>
                        {[-3,-2,-1,0].map(w=>{
                          const row=historyData[w+3]?.rows?.find((r:any)=>r.employee.name===name)
                          const v=row?.currentWeek?.score2
                          const d=row?.currentWeek?.doneOnTime
                          return <td key={w} style={{border:'1px solid #F0F0F0',padding:'8px',textAlign:'center',background:w===0?'rgba(79,70,229,0.03)':'white'}}>
                            {v!=null?<>
                              <div style={{fontFamily:'var(--mono)',fontWeight:700,fontSize:'1rem',color:sc(v)}}>{v.toFixed(2)}</div>
                              <div style={{fontSize:'0.62rem',color:'#9CA3AF',marginTop:2}}>{d} on time</div>
                            </>:'—'}
                          </td>
                        })}
                      </tr>
                      <tr key={name+'sp'}><td colSpan={6} style={{height:4,background:'rgba(79,70,229,0.04)',border:'none',padding:0}}/></tr>
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      }
    </div>
  )
}
