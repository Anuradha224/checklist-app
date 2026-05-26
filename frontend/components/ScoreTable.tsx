'use client'

import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'

interface ScoreRow {
  employee: { id: string; name: string; role: string }
  benchmark: number
  currentWeek: { planned: number; done: number; doneOnTime: number; score1: number; score2: number }
  lastWeek: { planned: number; done: number; doneOnTime: number; score1: number; score2: number }
}

function scoreClass(score: number) {
  if (score < 0) return 'text-red-700 font-semibold'
  if (score === 0) return 'text-gray-700 font-semibold'
  return 'text-green-700 font-semibold'  // positive would be better than planned (unlikely but handle)
}

function fmt(score: number | null) {
  if (score === null) return '—'
  return score.toFixed(2)
}

export default function ScoreTable({ rows, benchmark }: { rows: ScoreRow[]; benchmark: number }) {
  const now = new Date()
  const cwStart = startOfWeek(now, { weekStartsOn: 1 })
  const cwEnd = endOfWeek(now, { weekStartsOn: 1 })
  const lwStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const lwEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })

  const cwLabel = `${format(cwStart, 'd MMM')} – ${format(cwEnd, 'd MMM')}`
  const lwLabel = `${format(lwStart, 'd MMM')} – ${format(lwEnd, 'd MMM')}`

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-blue-50">
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[110px]">
              Team / Person
            </th>
            <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">KRA</th>
            <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">KPI</th>
            <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">Benchmark</th>
            <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">
              Last Week<br />
              <span className="font-normal text-gray-500 text-[10px]">{lwLabel}</span><br />
              Actual
            </th>
            <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">
              Current Week<br />
              <span className="font-normal text-gray-500 text-[10px]">{cwLabel}</span><br />
              Planned
            </th>
            <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">
              Current Week<br />
              Actual
            </th>
            <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">
              Current Week<br />
              Actual %
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="border border-gray-300 px-4 py-8 text-center text-gray-400">
                No employees yet. Add employees and tasks to see scores.
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <>
              {/* KPI 1: % work not done */}
              <tr key={`${row.employee.id}-kpi1`} className="bg-white hover:bg-gray-50">
                <td
                  rowSpan={2}
                  className="border border-gray-300 px-3 py-2 font-bold text-sm align-middle bg-gray-50"
                >
                  {row.employee.name}
                  {row.employee.role && (
                    <div className="text-[10px] text-gray-400 font-normal">{row.employee.role}</div>
                  )}
                </td>
                <td rowSpan={2} className="border border-gray-300 px-3 py-2 text-center text-gray-600 bg-gray-50 align-middle">
                  All work should<br />be done
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center text-gray-500">
                  % work not done
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center text-gray-600">
                  {benchmark}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  {row.lastWeek.planned > 0 ? (
                    <>
                      <span className={scoreClass(row.lastWeek.score1)}>{fmt(row.lastWeek.score1)}</span>
                      <div className="text-[10px] text-gray-400">{row.lastWeek.planned}p / {row.lastWeek.done}d</div>
                    </>
                  ) : '—'}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                  {row.currentWeek.planned}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                  {row.currentWeek.done}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  <span className={scoreClass(row.currentWeek.score1)}>
                    {fmt(row.currentWeek.score1)}
                  </span>
                </td>
              </tr>

              {/* KPI 2: % work not done on time */}
              <tr key={`${row.employee.id}-kpi2`} className="bg-white hover:bg-gray-50">
                <td className="border border-gray-300 px-3 py-2 text-center text-gray-500">
                  % work not done on time
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center text-gray-600">
                  {benchmark}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  {row.lastWeek.planned > 0 ? (
                    <>
                      <span className={scoreClass(row.lastWeek.score2)}>{fmt(row.lastWeek.score2)}</span>
                      <div className="text-[10px] text-gray-400">{row.lastWeek.doneOnTime} on time</div>
                    </>
                  ) : '—'}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                  {row.currentWeek.planned}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                  {row.currentWeek.doneOnTime}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  <span className={scoreClass(row.currentWeek.score2)}>
                    {fmt(row.currentWeek.score2)}
                  </span>
                </td>
              </tr>

              {/* Spacer row */}
              <tr key={`${row.employee.id}-spacer`}>
                <td colSpan={8} className="bg-gray-100 h-1 border-x border-gray-300 p-0" />
              </tr>
            </>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10px] text-gray-400">
        Score = ROUND(Actual / Planned × 100 − 100, 2) · 0 = perfect · negative = work not done
      </p>
    </div>
  )
}
