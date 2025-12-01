import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCcw } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts'
import { PageTransition } from '../components/PageTransition'
import { ChartCard } from '../features/dashboard/components/ChartCard'
import { FilterBar } from '../components/FilterBar'
import { WaveLoader } from '../components/WaveLoader'
import { formatCurrency, formatNumber, formatCompact } from '../lib/formatters'
import { getApiUrl } from '../lib/api'
import logoVendas from '../assets/logo_vendas.png'

// Tipos para dados agregados
interface VendasMetrics {
  total_vendas: number
  total_ingressos: number
  total_receita: number
  ticket_medio: number
}

interface EventData {
  name: string
  Receita: number
  Ingressos: number
}

interface ChannelData {
  label: string
  value: number
  quantity: number
}

interface TypeData {
  name: string
  value: number
}

interface RecentSale {
  id: string
  evento: string
  tipo: string
  ticketeira: string
  quantidade: number
  valor_unitario: number
  valor_liquido: number
  status: string
}

interface FilterOptions {
  cidades: string[]
  eventos: string[]
  bases: string[]
  ticketeiras: string[]
  datas_evento: string[]
}

// Funções de fetch
const buildQueryString = (params: Record<string, string>) => {
  const filtered = Object.entries(params).filter(([_, v]) => v !== '')
  if (filtered.length === 0) return ''
  return '?' + filtered.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
}

const fetchMetrics = async (filters: Record<string, string>): Promise<VendasMetrics> => {
  const response = await fetch(getApiUrl('api/vendas-aggregated/metrics') + buildQueryString(filters))
  if (!response.ok) throw new Error('Falha ao carregar métricas')
  return response.json()
}

const fetchByEvent = async (filters: Record<string, string>): Promise<EventData[]> => {
  const response = await fetch(getApiUrl('api/vendas-aggregated/by-event?limit=10') + (buildQueryString(filters) ? '&' + buildQueryString(filters).slice(1) : ''))
  if (!response.ok) throw new Error('Falha ao carregar eventos')
  return response.json()
}

const fetchByChannel = async (filters: Record<string, string>): Promise<ChannelData[]> => {
  const response = await fetch(getApiUrl('api/vendas-aggregated/by-channel') + buildQueryString(filters))
  if (!response.ok) throw new Error('Falha ao carregar canais')
  return response.json()
}

const fetchByType = async (filters: Record<string, string>): Promise<TypeData[]> => {
  const response = await fetch(getApiUrl('api/vendas-aggregated/by-type') + buildQueryString(filters))
  if (!response.ok) throw new Error('Falha ao carregar tipos')
  return response.json()
}

const fetchRecentSales = async (filters: Record<string, string>): Promise<RecentSale[]> => {
  const response = await fetch(getApiUrl('api/vendas-aggregated/recent-sales?limit=10') + (buildQueryString(filters) ? '&' + buildQueryString(filters).slice(1) : ''))
  if (!response.ok) throw new Error('Falha ao carregar vendas recentes')
  return response.json()
}

const fetchFilters = async (filters: Record<string, string>): Promise<FilterOptions> => {
  const response = await fetch(getApiUrl('api/vendas-aggregated/filters') + buildQueryString(filters))
  if (!response.ok) throw new Error('Falha ao carregar filtros')
  return response.json()
}

const LoadingState = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="text-center">
      <WaveLoader />
      <p className="mt-6 text-sm font-medium text-gray-600">Carregando vendas de ingressos...</p>
    </div>
  </div>
)

const EmptyState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
    <p className="text-lg font-semibold text-gray-900">Não foi possível carregar os dados agora.</p>
    <p className="mt-2 text-gray-600">Tente novamente em instantes ou verifique sua conexão.</p>
    <button
      onClick={onRetry}
      className="mt-6 inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-200"
    >
      <RefreshCcw size={16} />
      Recarregar
    </button>
  </div>
)

const COLORS = ['#60a5fa', '#34d399', '#f472b6', '#a78bfa', '#fb923c', '#38bdf8']

// Função para converter dd/mm/yyyy para yyyy-mm-dd
const formatDateForAPI = (dateStr: string): string => {
  if (!dateStr) return ''
  const [day, month, year] = dateStr.split('/')
  return `${year}-${month}-${day}`
}

export function VendasIngresso() {
  // Estados dos filtros
  const [cidade, setCidade] = useState('')
  const [evento, setEvento] = useState('')
  const [baseResponsavel, setBaseResponsavel] = useState('')
  const [ticketeira, setTicketeira] = useState('')
  const [dataEvento, setDataEvento] = useState('')

  // Montar objeto de filtros para as queries
  const filterParams = useMemo(() => ({
    cidade,
    evento,
    base_responsavel: baseResponsavel,
    ticketeira,
    data_evento: formatDateForAPI(dataEvento),
  }), [cidade, evento, baseResponsavel, ticketeira, dataEvento])

  // Carregar opções de filtros (dinâmicas baseadas em filtros ativos)
  const { data: filterOptions } = useQuery({
    queryKey: ['vendasFilterOptions', filterParams],
    queryFn: () => fetchFilters(filterParams),
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

  // Carregar dados agregados em paralelo
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['vendasMetrics', filterParams],
    queryFn: () => fetchMetrics(filterParams),
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

  const { data: eventData, isLoading: eventsLoading } = useQuery({
    queryKey: ['vendasByEvent', filterParams],
    queryFn: () => fetchByEvent(filterParams),
    staleTime: 1000 * 60 * 5,
  })

  const { data: channelData, isLoading: channelsLoading } = useQuery({
    queryKey: ['vendasByChannel', filterParams],
    queryFn: () => fetchByChannel(filterParams),
    staleTime: 1000 * 60 * 5,
  })

  const { data: typeData, isLoading: typesLoading } = useQuery({
    queryKey: ['vendasByType', filterParams],
    queryFn: () => fetchByType(filterParams),
    staleTime: 1000 * 60 * 5,
  })

  const { data: recentSales, isLoading: salesLoading } = useQuery({
    queryKey: ['vendasRecentSales', filterParams],
    queryFn: () => fetchRecentSales(filterParams),
    staleTime: 1000 * 60 * 5,
  })

  const isLoading = metricsLoading || eventsLoading || channelsLoading || typesLoading || salesLoading
  const isError = !metrics && !metricsLoading

  const refetchAll = () => {
    refetchMetrics()
  }

  const clearFilters = () => {
    setCidade('')
    setEvento('')
    setBaseResponsavel('')
    setTicketeira('')
    setDataEvento('')
  }

  const hasActiveFilters = !!(cidade || evento || baseResponsavel || ticketeira || dataEvento)

  if (isLoading) return <LoadingState />
  if (isError) return <EmptyState onRetry={refetchAll} />

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <img
              src={logoVendas}
              alt="Vendas de Ingresso"
              className="h-20 w-20 rounded-full object-cover"
            />
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-gray-600">Bilheteria</p>
              <h1 className="mt-1 text-3xl font-semibold text-gray-900">Vendas de Ingresso</h1>
            </div>
          </div>
          <button
            onClick={refetchAll}
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
          >
            <RefreshCcw size={16} />
            Atualizar
          </button>
        </header>

        {/* Filtros */}
        {filterOptions && (
          <FilterBar
            filters={[
              {
                name: 'cidade',
                label: 'Cidade do Evento',
                value: cidade,
                options: filterOptions.cidades.map(c => ({ value: c, label: c })),
                onChange: setCidade,
              },
              {
                name: 'evento',
                label: 'Nome do Evento',
                value: evento,
                options: filterOptions.eventos.map(e => ({ value: e, label: e })),
                onChange: setEvento,
              },
              {
                name: 'base_responsavel',
                label: 'Base do Evento',
                value: baseResponsavel,
                options: filterOptions.bases.map(b => ({ value: b, label: b })),
                onChange: setBaseResponsavel,
              },
              {
                name: 'ticketeira',
                label: 'Ticketeira',
                value: ticketeira,
                options: filterOptions.ticketeiras.map(t => ({ value: t, label: t })),
                onChange: setTicketeira,
              },
              {
                name: 'data_evento',
                label: 'Data do Evento',
                value: dataEvento,
                options: filterOptions.datas_evento.map(d => ({ value: d, label: d })),
                onChange: setDataEvento,
              },
            ]}
            onClearAll={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        {/* Métricas principais */}
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-onda-blue/10 to-onda-yellow/10 p-6">
            <p className="text-sm font-medium text-gray-600">Receita Total</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(metrics?.total_receita || 0)}</p>
            <p className="mt-1 text-xs text-gray-500">Vendas de ingressos</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-emerald-500/10 to-green-600/10 p-6">
            <p className="text-sm font-medium text-gray-600">Total de Ingressos</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(metrics?.total_ingressos || 0)}</p>
            <p className="mt-1 text-xs text-gray-500">Ingressos vendidos</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-purple-500/10 to-violet-600/10 p-6">
            <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(metrics?.ticket_medio || 0)}</p>
            <p className="mt-1 text-xs text-gray-500">Valor por ingresso</p>
          </div>
        </section>

        {/* Gráficos de análise */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Vendas por evento */}
          <ChartCard
            title="Vendas por Evento"
            subtitle="Top 10 eventos por receita"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tickFormatter={(value) => formatCompact(value)} />
                <Tooltip
                  contentStyle={{
                    background: '#030712',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) =>
                    name === 'Receita' ? formatCurrency(value) : formatNumber(value)
                  }
                />
                <Legend />
                <Bar dataKey="Receita" fill="#60a5fa" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Ingressos" fill="#34d399" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Distribuição por tipo de ingresso */}
          <ChartCard
            title="Distribuição por Tipo"
            subtitle="Receita por tipo de ingresso"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData as any}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeData?.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#030712',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        {/* Vendas por canal */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Vendas por Canal</h3>
            <p className="text-sm text-gray-600">Desempenho de cada canal de vendas</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {channelData?.map((canal, index) => (
              <div key={canal.label} className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white/5 to-transparent p-5">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg font-bold text-gray-900"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{canal.label}</p>
                    <p className="text-sm text-gray-600">{formatNumber(canal.quantity)} ingressos</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-emerald-400">{formatCurrency(canal.value)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tabela de vendas recentes */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Vendas Recentes</h3>
            <p className="text-sm text-gray-600">Últimas 10 transações de ingressos</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="pb-3 font-semibold text-gray-600">Evento</th>
                  <th className="pb-3 font-semibold text-gray-600">Tipo</th>
                  <th className="pb-3 font-semibold text-gray-600">Canal</th>
                  <th className="pb-3 text-center font-semibold text-gray-600">Qtd</th>
                  <th className="pb-3 text-right font-semibold text-gray-600">Valor Unit.</th>
                  <th className="pb-3 text-right font-semibold text-gray-600">Total</th>
                  <th className="pb-3 text-center font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSales?.map((row) => (
                  <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 text-gray-900">{row.evento || '-'}</td>
                    <td className="py-3 text-gray-700">{row.tipo || '-'}</td>
                    <td className="py-3 text-gray-700">{row.ticketeira || '-'}</td>
                    <td className="py-3 text-center font-semibold text-blue-400">{row.quantidade || 0}</td>
                    <td className="py-3 text-right text-gray-700">
                      {formatCurrency(row.valor_unitario)}
                    </td>
                    <td className="py-3 text-right font-semibold text-emerald-400">
                      {formatCurrency(row.valor_liquido || 0)}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        row.status === 'confirmado' || row.status === 'validado' || row.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-slate-500/10 text-gray-600'
                      }`}>
                        {row.status || 'N/A'}
                      </span>
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
