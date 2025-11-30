import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MetricCard } from '../features/dashboard/components/MetricCard'
import { ChartCard } from '../features/dashboard/components/ChartCard'
import { formatCurrency, formatCompact } from '../lib/formatters'
import { parseCurrency } from '../lib/parsers'
import { PageTransition } from '../components/PageTransition'
import { WaveLoader } from '../components/WaveLoader'
import { Loader2, RefreshCcw } from 'lucide-react'

interface BaseGeralRow {
  'Receitas atuais - Valor Total'?: string | number
  'Despesa Total '?: string | number
  'Receitas atuais - Bilheteria'?: string | number
  'Projeção de Receitas - Bilheteria'?: string | number
  'Evento'?: string
  'Base'?: string
  [key: string]: unknown
}

const fetchBaseGeral = async (): Promise<BaseGeralRow[]> => {
  const response = await fetch('/api/dashboard')
  if (!response.ok) throw new Error('Falha ao carregar dados')

  const data = await response.json()
  console.log('[VisaoGeral] Received data:', data)
  return data.sheets || []
}

const LoadingState = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="text-center">
      <WaveLoader />
      <p className="mt-6 text-sm font-medium text-slate-400">Carregando visão geral...</p>
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

export function VisaoGeral() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['baseGeral'],
    queryFn: fetchBaseGeral,
  })

  if (isLoading) return <LoadingState />
  if (isError || !data) return <EmptyState onRetry={refetch} />

  console.log('[VisaoGeral] First row keys:', data[0] ? Object.keys(data[0]) : 'no data')
  console.log('[VisaoGeral] First row sample:', data[0])

  // Calcular métricas usando parseCurrency para valores formatados em português
  const despesaTotal = data.reduce((sum, row) => sum + parseCurrency(row['Despesa Total ']), 0)
  const receitasAtuais = data.reduce((sum, row) => sum + parseCurrency(row['Receitas atuais - Valor Total']), 0)
  const lucro = receitasAtuais - despesaTotal

  // Preparar dados para gráfico de Receitas Atuais - Bilheteria por Evento e Base
  const receitasPorEventoBase = data
    .filter(row => row['Evento'] && (row['Receitas atuais - Bilheteria'] || row['Projeção de Receitas - Bilheteria']))
    .map(row => ({
      name: `${row['Evento']} - ${row['Base']}`,
      'Receitas atuais': parseCurrency(row['Receitas atuais - Bilheteria']),
      'Projeção': parseCurrency(row['Projeção de Receitas - Bilheteria']),
    }))
    .slice(0, 10) // Limitar a 10 eventos para melhor visualização

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <header className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Planejamento</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Visão Geral do Planejamento</h1>
          </div>
          <button
            onClick={() => refetch()}
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {isFetching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Atualizar
          </button>
        </header>

        {/* Métricas principais */}
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            title="Despesa Total"
            value={formatCurrency(despesaTotal)}
            helper="Total de despesas planejadas"
          />
          <MetricCard
            title="Receitas Atuais"
            value={formatCurrency(receitasAtuais)}
            helper="Valor total de receitas atuais"
          />
          <MetricCard
            title="Lucro"
            value={formatCurrency(lucro)}
            helper="Receitas atuais - Despesas"
            positive={lucro >= 0}
          />
        </section>

        {/* Gráfico de Receitas Atuais vs Projeção por Evento e Base */}
        <section>
          <ChartCard
            title="Receitas atuais vs Projeção de Receitas"
            subtitle="Bilheteria por Evento e Base"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={receitasPorEventoBase} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
                <defs>
                  <linearGradient id="receitasAtuais" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="projecao" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#94a3b8" tickFormatter={(value) => formatCompact(value)} />
                <Tooltip
                  contentStyle={{
                    background: '#030712',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar
                  dataKey="Receitas atuais"
                  fill="url(#receitasAtuais)"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="Projeção"
                  fill="url(#projecao)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        {/* Detalhes dos eventos */}
        <section className="rounded-3xl border border-white/5 bg-white/5 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">Detalhamento por Evento</h3>
            <p className="text-sm text-slate-400">Receitas e despesas por evento e base</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-3 font-semibold text-slate-400">Evento</th>
                  <th className="pb-3 font-semibold text-slate-400">Base</th>
                  <th className="pb-3 text-right font-semibold text-slate-400">Receitas Atuais</th>
                  <th className="pb-3 text-right font-semibold text-slate-400">Projeção</th>
                  <th className="pb-3 text-right font-semibold text-slate-400">Despesas</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 10).map((row, index) => (
                  <tr key={index} className="border-b border-white/5">
                    <td className="py-3 text-white">{row['Evento'] || '-'}</td>
                    <td className="py-3 text-slate-300">{row['Base'] || '-'}</td>
                    <td className="py-3 text-right font-semibold text-emerald-400">
                      {formatCurrency(parseCurrency(row['Receitas atuais - Valor Total']))}
                    </td>
                    <td className="py-3 text-right font-semibold text-blue-400">
                      {formatCurrency(parseCurrency(row['Projeção de Receitas - Bilheteria']))}
                    </td>
                    <td className="py-3 text-right font-semibold text-rose-400">
                      {formatCurrency(parseCurrency(row['Despesa Total ']))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
