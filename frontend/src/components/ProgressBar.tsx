/**
 * ProgressBar Component
 *
 * Horizontal progress bar for showing goal achievement
 */

interface ProgressBarProps {
  label: string
  current: number
  target: number
  color?: 'yellow' | 'orange' | 'blue' | 'green'
  showPercentage?: boolean
  showValues?: boolean
}

export function ProgressBar({
  label,
  current,
  target,
  color = 'yellow',
  showPercentage = true,
  showValues = true,
}: ProgressBarProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0
  const isOverTarget = current > target

  const colorClasses = {
    yellow: 'bg-onda-yellow',
    orange: 'bg-onda-orange',
    blue: 'bg-onda-blue',
    green: 'bg-emerald-500',
  }

  const bgColorClasses = {
    yellow: 'bg-onda-yellow/10',
    orange: 'bg-onda-orange/10',
    blue: 'bg-onda-blue/10',
    green: 'bg-emerald-100',
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        {showPercentage && (
          <span
            className={`text-sm font-bold ${
              isOverTarget ? 'text-emerald-600' : 'text-gray-600'
            }`}
          >
            {percentage.toFixed(0)}%
          </span>
        )}
      </div>

      <div className={`h-3 w-full overflow-hidden rounded-full ${bgColorClasses[color]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {showValues && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Realizado: <span className="font-semibold text-gray-700">{current.toLocaleString('pt-BR')}</span>
          </span>
          <span>
            Meta: <span className="font-semibold text-gray-700">{target.toLocaleString('pt-BR')}</span>
          </span>
        </div>
      )}
    </div>
  )
}
