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
      const pageW = doc.internal.pageSize.getWidth()

      // ── Header bar ──────────────────────────────────
      doc.setFillColor(79,70,229)
      doc.rect(0, 0, pageW, 28, 'F')

      // Logo circle
      doc.setFillColor(255,255,255)
      doc.circle(20, 14, 8, 'F')
      doc.setTextColor(79,70,229)
      doc.setFontSize(10)
      doc.setFont('helvetica','bold')
      doc.text('AT', 17, 17)

      // Title
      doc.setTextColor(255,255,255)
      doc.setFontSize(14)
      doc.setFont('helvetica','bold')
      doc.text('Anuradha Textile', 32, 11)
      doc.setFontSize(9)
      doc.setFont('helvetica','normal')
      doc.text('4-Week KRA / KPI Score History Report', 32, 18)

      // Date on right
      doc.setFontSize(8)
      doc.setTextColor(200,200,255)
      doc.text(`Generated: ${format(new Date(),'dd MMM yyyy, HH:mm')}`, pageW - 14, 11, {align:'right'})
      doc.text(`Score = ROUND(Actual / Planned × 100 − 100, 2)  ·  0 = perfect  ·  negative = tasks not done`, pageW - 14, 18, {align:'right'})

      // ── Score legend ─────────────────────────────────
      doc.setFillColor(248,249,255)
      doc.rect(0, 28, pageW, 10, 'F')
      doc.setFontSize(7.5)
      doc.setFont('helvetica','bold')
      doc.setTextColor(16,185,129)
      doc.text('● 0.00 = All work done (perfect)', 14, 34)
      doc.setTextColor(239,68,68)
      doc.text('● Negative = Tasks not done / late', 90, 34)
      doc.setTextColor(107,114,128)
      doc.text(`● Benchmark: ${historyData[0]?.benchmark ?? 0}`, 180, 34)

      // ── Table ─────────────────────────────────────────
      const names = getFilteredNames()

      // Build week headers with date ranges
      const weekHeaders = [-3,-2,-1,0].map(w=>{
        const label = w===0?'This Week':w===-1?'Last Week':`${Math.abs(w)} Weeks Ago`
        const wkData = historyData[w+3]
        const rows0 = wkData?.rows||[]
        return label
      })

      const head = [[
        {content:'Employee', styles:{halign:'left'}},
        {content:'Role', styles:{halign:'left'}},
        {content:'KPI', styles:{halign:'center'}},
        ...weekHeaders.map((h,i)=>({
          content: h,
          styles:{
            halign:'center',
            fillColor: i===3?[79,70,229]:[55,48,163],
            fontStyle:'bold'
          }
        }))
      ]]

      const body:any[] = []

      names.forEach((name:string)=>{
        const emp = allEmps.find((e:any)=>e.name===name)
        ;[['% Work not done',0],['% Work not on time',1]].forEach(([kpi,ki]:any)=>{
          const rowData = historyData.map((wk:any)=>{
            const row = wk?.rows?.find((r:any)=>r.employee.name===name)
            if(!row) return {score:'—', detail:''}
            const score = ki===0?row.currentWeek.score1:row.currentWeek.score2
            const planned = row.currentWeek.planned
            const actual = ki===0?row.currentWeek.done:row.currentWeek.doneOnTime
            return {
              score: score!=null?score.toFixed(2):'—',
              detail: planned>0?`${planned}p / ${actual}d`:''
            }
          })
          body.push([
            {content: ki===0?name:'', styles:{fontStyle:'bold', valign:'middle'}},
            {content: ki===0?(emp?.role||''):'', styles:{textColor:[150,150,150]}},
            {content: kpi, styles:{textColor:[107,114,128], fontSize:7}},
            ...rowData.map((d:any,i:number)=>({
              content: d.detail ? (d.score + ' | ' + d.detail) : d.score,
              styles:{
                halign:'center',
                fontStyle:'bold',
                fillColor: i===3?[245,247,255]:[255,255,255]
              }
            }))
          ])
        })
        // Spacer row between employees
        body.push([{content:'', colSpan:7, styles:{fillColor:[240,242,255], cellPadding:1}}])
      })

      autoTable(doc,{
        head: head as any,
        body: body as any,
        startY: 42,
        styles:{fontSize:8, cellPadding:4, lineColor:[230,230,240], lineWidth:0.3},
        headStyles:{fillColor:[55,48,163], textColor:255, fontStyle:'bold', fontSize:8},
        columnStyles:{
          0:{cellWidth:35, fontStyle:'bold'},
          1:{cellWidth:28, textColor:[150,150,150]},
          2:{cellWidth:32, textColor:[107,114,128]},
          3:{cellWidth:'auto'},
          4:{cellWidth:'auto'},
          5:{cellWidth:'auto'},
          6:{cellWidth:'auto', fillColor:[245,247,255]},
        },
        didParseCell:(data:any)=>{
          if(data.section==='body' && data.column.index>=3){
            const raw = String(data.cell.raw||'')
            const val = parseFloat(raw.split('\n')[0])
            if(!isNaN(val)){
              data.cell.styles.textColor = val<0?[220,38,38]:val===0?[5,150,105]:[107,114,128]
            }
          }
          // Skip spacer rows styling
          if(data.row.raw?.[0]?.colSpan===7){
            data.cell.styles.cellPadding=1
          }
        },
        // Footer
        didDrawPage:(data:any)=>{
          const pg = doc.getCurrentPageInfo().pageNumber
          const total = doc.getNumberOfPages()
          doc.setFontSize(7)
          doc.setTextColor(180,180,180)
          doc.text(`Anuradha Textile — Confidential  |  Page ${pg} of ${total}`, pageW/2, doc.internal.pageSize.getHeight()-6, {align:'center'})
        }
      })

      doc.save(`Anuradha_Textile_Report_${format(new Date(),'dd-MMM-yyyy')}.pdf`)
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
