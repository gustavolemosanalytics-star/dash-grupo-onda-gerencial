import type { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  subtitle?: string
  actionSlot?: ReactNode
  children: ReactNode
}

export const ChartCard = ({ title, subtitle, actionSlot, children }: ChartCardProps) => (
  <div className="rounded-3xl border border-white/5 bg-gradient-to-b from-white/10 via-white/5 to-transparent p-6 backdrop-blur">
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div>
        <p className="text-sm uppercase tracking-wide text-slate-400">{subtitle}</p>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
      </div>
      {actionSlot && <div className="ml-auto">{actionSlot}</div>}
    </div>
    <div className="h-64 w-full">{children}</div>
  </div>
)

