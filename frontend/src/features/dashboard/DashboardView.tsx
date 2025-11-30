import { Loader2, RefreshCcw } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard } from './components/ChartCard'
import { MetricCard } from './components/MetricCard'
import { useDashboardData } from './useDashboardData'
import { formatCompact, formatCurrency, formatNumber, formatPercent } from '../../lib/formatters'

const LoadingState = () => (
  <div className="space-y-6">
    <div className="h-11 w-60 animate-pulse rounded-full bg-white/10" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-3xl bg-white/5" />
      ))}
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="h-80 animate-pulse rounded-3xl bg-white/5" />
      <div className="h-80 animate-pulse rounded-3xl bg-white/5" />
    </div>
  </div>
)

const EmptyState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="rounded-3xl border border-white/5 bg-white/5 p-10 text-center">
    <p className="text-lg font-semibold text-white">Não foi possível carregar os dados agora.</p>
    <p className="mt-2 text-slate-400">Tente novamente em instantes ou verifique sua conexão.</p>
    <button
      onClick={onRetry}
      className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
    >
      <RefreshCcw size={16} />
      Recarregar
    </button>
  </div>
)

export const DashboardView = () => {
  const { model, isLoading, isFetching, isError, refetch } = useDashboardData()

  if (isLoading) return <LoadingState />
  if (isError || !model) return <EmptyState onRetry={refetch} />

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-center gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Grupo Onda · Inteligência</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Painel de Performance em tempo quase real</h1>
        </div>
        <button
          onClick={() => refetch()}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          {isFetching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
          Atualizar
        </button>
      </header>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Receita realizada"
          value={formatCurrency(model.summary.totalRevenue)}
          helper="Consolidado das operações em andamento"
        />
        <MetricCard
          title="Receita projetada"
          value={formatCurrency(model.summary.projectedRevenue)}
          helper="Forecast baseado na planilha mestre"
        />
        <MetricCard
          title="ROI médio"
          value={formatPercent(model.summary.averageRoi)}
          helper="Eventos ativos"
          positive={model.summary.averageRoi >= 0}
        />
        <MetricCard
          title="Tickets validados"
          value={formatNumber(model.summary.ticketsValidated)}
          helper={`Ticket médio ${formatCurrency(model.summary.avgTicket)}`}
          delta={model.summary.revenueDelta}
          positive={model.summary.revenueDelta >= 0}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard
            title="Receita atual vs prevista"
            subtitle="Fluxo acumulado por evento"
            actionSlot={<span className="text-sm text-slate-400">Total {formatCurrency(model.summary.totalRevenue)}</span>}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={model.revenueTrend} margin={{ top: 10, left: 0, right: 0 }}>
                <defs>
                  <linearGradient id="actual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="forecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" tickFormatter={(value) => formatCompact(value)} />
                <Tooltip
                  contentStyle={{ background: '#030712', border: '1px solid rgba(255,255,255,0.1)' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Area type="monotone" dataKey="atual" stroke="#34d399" fill="url(#actual)" name="Realizado" />
                <Area type="monotone" dataKey="previsto" stroke="#60a5fa" fill="url(#forecast)" name="Previsto" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="Receita por praça" subtitle="Top cidades">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={model.cityBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(value) => formatCompact(value)} />
              <Tooltip
                contentStyle={{ background: '#030712', border: '1px solid rgba(255,255,255,0.1)' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Bar dataKey="value" fill="#818cf8" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Bar Zig · mix de faturamento" subtitle="Categorias líderes">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={model.barPerformance}>
              <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="label" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(value) => formatCompact(value)} />
              <Tooltip
                contentStyle={{ background: '#030712', border: '1px solid rgba(255,255,255,0.1)' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="value" fill="#f472b6" radius={[8, 8, 0, 0]} name="Receita" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Canais de ingresso" subtitle="Valor vs volume">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={model.ticketPerformance.channels}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="label" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(value) => formatCompact(value)} />
              <Tooltip
                contentStyle={{ background: '#030712', border: '1px solid rgba(255,255,255,0.1)' }}
                formatter={(value: number, _name, props) =>
                  props.dataKey === 'quantity' ? `${formatNumber(value)} ingressos` : formatCurrency(value)
                }
              />
              <Legend />
              <Bar dataKey="value" stackId="ticket" fill="#38bdf8" name="Receita" radius={[8, 8, 0, 0]} />
              <Bar dataKey="quantity" stackId="ticket" fill="#22d3ee" name="Ingressos" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/5 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-white">Destaques instantâneos</h3>
          <p className="text-sm text-slate-400">Sinais positivos capturados pelo modelo.</p>
          <div className="mt-6 space-y-5">
            {model.highlights.map((highlight) => (
              <div key={highlight.title} className="rounded-2xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{highlight.title}</p>
                <p className="mt-1 text-base font-medium text-white">{highlight.description}</p>
                <p className="text-sm text-brand-300">{highlight.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 rounded-3xl border border-white/5 bg-white/5 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Próximos focos</p>
              <h3 className="text-lg font-semibold text-white">Linha do tempo dos eventos</h3>
            </div>
            <span className="text-sm text-slate-400">{model.events.length} eventos ativos</span>
          </div>
          <div className="space-y-4">
            {model.events.slice(0, 6).map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap gap-3 rounded-2xl border border-white/5 bg-gradient-to-r from-white/10 to-transparent p-4"
              >
                <div className="min-w-[180px]">
                  <p className="text-sm font-semibold">{event.eventName}</p>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {event.city} · {event.dateLabel}
                  </p>
                </div>
                <div className="flex flex-1 flex-wrap gap-6 text-sm">
                  <div>
                    <p className="text-slate-400">Realizado</p>
                    <p className="font-semibold text-white">{formatCurrency(event.revenueActual)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Previsto</p>
                    <p className="font-semibold text-white">{formatCurrency(event.revenueProjection)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">ROI</p>
                    <p className={`font-semibold ${event.roi >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {formatPercent(event.roi)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Ingressos</p>
                    <p className="font-semibold text-white">
                      {formatNumber(event.ticketsValidated)}/{formatNumber(event.ticketsIssued)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}



