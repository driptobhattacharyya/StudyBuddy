import { Select } from '@/components/ui/Field'
import { WEEKS } from './utils'

export function WeekSelect({ value, onChange, label = 'Week', all, ...props }) {
  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} {...props}>
      {all && <option value="">{all}</option>}
      {WEEKS.map((w) => (
        <option key={w} value={w}>Week {w}</option>
      ))}
    </Select>
  )
}
