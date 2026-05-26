export type Freq = 'D' | 'W' | 'F' | 'M' | 'Q' | 'Y'

export interface Employee {
  id: string
  name: string
  role: string
  created_at?: string
}

export interface Task {
  id: string
  name: string
  employee_id: string
  freq: Freq
  start_date: string
  active: boolean
  created_at?: string
}

export interface Instance {
  id: string
  task_id: string
  employee_id: string
  planned: string        // date string YYYY-MM-DD
  actual: string | null  // ISO datetime
  created_at?: string
  // joined fields
  task_name?: string
  emp_name?: string
  freq?: Freq
}

export interface KPIRow {
  employee: Employee
  kpi1: KPIData   // % work not done
  kpi2: KPIData   // % work not done on time
}

export interface KPIData {
  planned: number
  actual: number       // done count (kpi1) or done-on-time count (kpi2)
  score: number | null // IFERROR(IF(G<>"", ROUND(G/F*100-100,2),""),0)
  lastWeekScore: number | null
}

export const FREQ_LABEL: Record<Freq, string> = {
  D: 'Daily', W: 'Weekly', F: 'Fortnightly',
  M: 'Monthly', Q: 'Quarterly', Y: 'Yearly'
}

export const FREQ_COLOR: Record<Freq, { bg: string; text: string }> = {
  D: { bg: '#dbeafe', text: '#1e40af' },
  W: { bg: '#dcfce7', text: '#166534' },
  F: { bg: '#fef9c3', text: '#854d0e' },
  M: { bg: '#ede9fe', text: '#4c1d95' },
  Q: { bg: '#fce7f3', text: '#9d174d' },
  Y: { bg: '#ffedd5', text: '#9a3412' },
}
