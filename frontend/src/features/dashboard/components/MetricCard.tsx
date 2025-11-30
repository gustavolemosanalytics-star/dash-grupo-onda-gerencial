import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface MetricCardProps {
  title: string
  value: ReactNode
  helper?: string
  delta?: number
  positive?: boolean
  accentColor?: 'yellow' | 'orange' | 'blue'
}

export const MetricCard = ({
  title,
  value,
  helper,
  delta,
  positive = true,
  accentColor = 'yellow',
}: MetricCardProps) => {
  const accentColors = {
    yellow: 'border-onda-yellow/20 bg-onda-yellow/5',
    orange: 'border-onda-orange/20 bg-onda-orange/5',
    blue: 'border-onda-blue/20 bg-onda-blue/5',
  }

  const accentBorders = {
    yellow: 'border-l-onda-yellow',
    orange: 'border-l-onda-orange',
    blue: 'border-l-onda-blue',
  }

  return (
    <div
      className={`rounded-2xl border border-gray-200 ${accentColors[accentColor]} border-l-4 ${accentBorders[accentColor]} p-6 shadow-sm transition-shadow hover:shadow-md`}
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-600">{title}</p>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-3xl font-bold text-black">{value}</span>
        {delta !== undefined && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              positive
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-rose-100 text-rose-700'
            }`}
          >
            {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {`${delta.toFixed(1)}%`}
          </span>
        )}
      </div>
      {helper && <p className="mt-2 text-sm text-gray-500">{helper}</p>}
    </div>
  )
}

