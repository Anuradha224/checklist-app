'use client'
import { Instance, FREQ_LABEL, FREQ_COLOR } from '@/types'
import { isMissed, isDoneLate } from '@/lib/score'
import { format, parseISO } from 'date-fns'

interface Props {
  inst: Instance
  showEmp?: boolean
  onMark: () => void
}

export default function TaskRow({ inst, showEmp, onMark }: Props) {
  const done = !!inst.actual
  const missed = isMissed(inst)
  const late = isDoneLate(inst)
  const freq = inst.freq || 'D'
  const fc = FREQ_COLOR[freq]

  let statusBg = '#f3f4f6', statusColor = '#6b7280', statusLabel = 'Pending'
  if (done && !late) { statusBg = '#dcfce7'; statusColor = '#166534'; statusLabel = 'Done ✓' }
  if (done && late)  { statusBg = '#fef9c3'; statusColor = '#854d0e'; statusLabel = 'Done late' }
  if (missed)        { statusBg = '#fee2e2'; statusColor = '#991b1b'; statusLabel = 'Missed' }

  const plannedStr = format(parseISO(inst.planned), 'd MMM')
  const actualStr = inst.actual ? format(new Date(inst.actual), 'd MMM, HH:mm') : null

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white mb-1.5">
      <button
        onClick={!done ? onMark : undefined}
        disabled={done}
        className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 text-[10px] transition-colors ${
          done ? 'border-green-500 bg-green-50 cursor-default text-green-700' : 'border-gray-300 hover:border-blue-400 cursor-pointer'
        }`}
      >
        {done ? '✓' : ''}
      </button>

      <span
        className="rounded px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0"
        style={{ background: fc.bg, color: fc.text }}
      >
        {FREQ_LABEL[freq]}
      </span>

      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{inst.task_name}</div>
        <div className="text-[10px] text-gray-400">
          {showEmp && inst.emp_name && <span>{inst.emp_name} · </span>}
          Planned: {plannedStr}
          {actualStr && <span> · Done: {actualStr}</span>}
        </div>
      </div>

      <span
        className="text-[10px] font-medium rounded px-2 py-0.5 flex-shrink-0"
        style={{ background: statusBg, color: statusColor }}
      >
        {statusLabel}
      </span>
    </div>
  )
}
