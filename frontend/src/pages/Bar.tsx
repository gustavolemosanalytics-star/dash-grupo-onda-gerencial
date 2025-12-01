import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCcw, Calendar, Clock } from 'lucide-react'
import { BarChart, Bar as RechartsBar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { PageTransition } from '../components/PageTransition'
import { FilterBar } from '../components/FilterBar'
import { WaveLoader } from '../components/WaveLoader'
import { formatCurrency, formatNumber } from '../lib/formatters'
import { getApiUrl } from '../lib/api'
import zigLogo from '../assets/zig_logo.png'

// Tipos para dados agregados
interface BarMetrics {
  total_transactions: number
  total_revenue: number
  total_products_sold: number
  avg_ticket: number
}

interface SalesByDate {
  date: string
  revenue: number
  count: number
}

interface TopProduct {
  name: string
  revenue: number
  quantity: number
}

interface CategoryData {
  name: string
  revenue: number
}

interface RecentTransaction {
  id: string
  transactionDate: string
  productName: string
  productCategory: string
  eventName: string
  count: number
  unitValue: number
  discountValue: number
  total: number
}

interface Filters {
  tipos: string[]
  events: string[]
  event_dates: string[]
}

interface UpcomingEvent {
  event_name: string
  event_date: string
}

// Funções de fetch
const buildQueryString = (params: Record<string, string>) => {
  const filtered = Object.entries(params).filter(([_, v]) => v !== '')
  if (filtered.length === 0) return ''
  return '?' + filtered.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
}

const fetchMetrics = async (filters: Record<string, string>): Promise<BarMetrics> => {
  const response = await fetch(getApiUrl('api/bar-aggregated/metrics') + buildQueryString(filters))
  if (!response.ok) throw new Error('Falha ao carregar métricas')
  return response.json()
}

const fetchSalesByDate = async (filters: Record<string, string>): Promise<SalesByDate[]> => {
  const response = await fetch(getApiUrl('api/bar-aggregated/sales-by-date') + buildQueryString(filters))
  if (!response.ok) throw new Error('Falha ao carregar vendas por data')
  return response.json()
}

const fetchTopProducts = async (filters: Record<string, string>): Promise<TopProduct[]> => {
  const response = await fetch(getApiUrl('api/bar-aggregated/top-products?limit=5') + (buildQueryString(filters) ? '&' + buildQueryString(filters).slice(1) : ''))
  if (!response.ok) throw new Error('Falha ao carregar top produtos')
  return response.json()
}

const fetchByCategory = async (filters: Record<string, string>): Promise<CategoryData[]> => {
  const response = await fetch(getApiUrl('api/bar-aggregated/by-category') + buildQueryString(filters))
  if (!response.ok) throw new Error('Falha ao carregar categorias')
  return response.json()
}

const fetchRecentTransactions = async (filters: Record<string, string>): Promise<RecentTransaction[]> => {
  const response = await fetch(getApiUrl('api/bar-aggregated/recent-transactions?limit=20') + (buildQueryString(filters) ? '&' + buildQueryString(filters).slice(1) : ''))
  if (!response.ok) throw new Error('Falha ao carregar transações')
  return response.json()
}

const fetchFilters = async (filters: Record<string, string>): Promise<Filters> => {
  const response = await fetch(getApiUrl('api/bar-aggregated/filters') + buildQueryString(filters))
  if (!response.ok) throw new Error('Falha ao carregar filtros')
  return response.json()
}

const fetchUpcomingEvents = async (): Promise<UpcomingEvent[]> => {
  const response = await fetch(getApiUrl('api/bar-aggregated/upcoming-events'))
  if (!response.ok) throw new Error('Falha ao carregar próximos eventos')
  return response.json()
}

const LoadingState = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="text-center">
      <WaveLoader />
      <p className="mt-6 text-sm font-medium text-gray-600">Carregando dados do bar...</p>
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

// Função para converter dd/mm/yyyy para yyyy-mm-dd
const formatDateForAPI = (dateStr: string): string => {
  if (!dateStr) return ''
  const [day, month, year] = dateStr.split('/')
  return `${year}-${month}-${day}`
}

export function Bar() {
  // Estados dos filtros
  const [eventoTipo, setEventoTipo] = useState('')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')

  // Montar objeto de filtros para as queries
  const filterParams = useMemo(() => ({
    evento_tipo: eventoTipo,
    event_name: eventName,
    event_date: formatDateForAPI(eventDate),
  }), [eventoTipo, eventName, eventDate])

  // Carregar opções de filtros (dinâmicas baseadas em filtros ativos)
  const { data: filterOptions } = useQuery({
    queryKey: ['barFilterOptions', filterParams],
    queryFn: () => fetchFilters(filterParams),
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

  // Carregar dados agregados em paralelo
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['barMetrics', filterParams],
    queryFn: () => fetchMetrics(filterParams),
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

  const { data: salesByDate, isLoading: salesLoading } = useQuery({
    queryKey: ['barSalesByDate', filterParams],
    queryFn: () => fetchSalesByDate(filterParams),
    staleTime: 1000 * 60 * 5,
  })

  const { data: topProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['barTopProducts', filterParams],
    queryFn: () => fetchTopProducts(filterParams),
    staleTime: 1000 * 60 * 5,
  })

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['barCategories', filterParams],
    queryFn: () => fetchByCategory(filterParams),
    staleTime: 1000 * 60 * 5,
  })

  const { data: recentTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['barRecentTransactions', filterParams],
    queryFn: () => fetchRecentTransactions(filterParams),
    staleTime: 1000 * 60 * 5,
  })

  const { data: upcomingEvents } = useQuery({
    queryKey: ['barUpcomingEvents'],
    queryFn: fetchUpcomingEvents,
    staleTime: 1000 * 60 * 30, // 30 minutos
  })

  // Processar próximos eventos com dias restantes
  const processedUpcomingEvents = useMemo(() => {
    if (!upcomingEvents) return []

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    return upcomingEvents.map(event => {
      const eventDate = new Date(event.event_date + 'T00:00:00')
      const diffTime = eventDate.getTime() - hoje.getTime()
      const diasFaltando = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      return {
        ...event,
        eventDate,
        dataFormatada: eventDate.toLocaleDateString('pt-BR'),
        diasFaltando
      }
    }).filter(e => e.diasFaltando >= 0)
  }, [upcomingEvents])

  const isLoading = metricsLoading || salesLoading || productsLoading || categoriesLoading || transactionsLoading
  const isError = !metrics && !metricsLoading

  const refetchAll = () => {
    refetchMetrics()
  }

  const clearFilters = () => {
    setEventoTipo('')
    setEventName('')
    setEventDate('')
  }

  const hasActiveFilters = !!(eventoTipo || eventName || eventDate)

  if (isLoading) return <LoadingState />
  if (isError) return <EmptyState onRetry={refetchAll} />

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <img
              src={zigLogo}
              alt="Zig Bar"
              className="h-16 w-16 object-contain"
            />
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-gray-600">Operações</p>
              <h1 className="mt-1 text-3xl font-semibold text-gray-900">Bar Zig</h1>
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
                name: 'evento_tipo',
                label: 'Tipo de Venda',
                value: eventoTipo,
                options: filterOptions.tipos.map(t => ({ value: t, label: t })),
                onChange: setEventoTipo,
              },
              {
                name: 'event_name',
                label: 'Nome do Evento',
                value: eventName,
                options: filterOptions.events.map(e => ({ value: e, label: e })),
                onChange: setEventName,
              },
              {
                name: 'event_date',
                label: 'Data do Evento',
                value: eventDate,
                options: filterOptions.event_dates.map(d => ({ value: d, label: d })),
                onChange: setEventDate,
              },
            ]}
            onClearAll={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        {/* Métricas principais */}
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-onda-yellow/10 to-onda-orange/10 p-6">
            <p className="text-sm font-medium text-gray-600">Faturamento Total</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(metrics?.total_revenue || 0)}</p>
            <p className="mt-1 text-xs text-gray-500">Vendas no período</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-onda-blue/10 to-onda-yellow/10 p-6">
            <p className="text-sm font-medium text-gray-600">Transações</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(metrics?.total_transactions || 0)}</p>
            <p className="mt-1 text-xs text-gray-500">Total de vendas</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-emerald-500/10 to-green-600/10 p-6">
            <p className="text-sm font-medium text-gray-600">Produtos Vendidos</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(metrics?.total_products_sold || 0)}</p>
            <p className="mt-1 text-xs text-gray-500">Quantidade total</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-purple-500/10 to-violet-600/10 p-6">
            <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(metrics?.avg_ticket || 0)}</p>
            <p className="mt-1 text-xs text-gray-500">Por transação</p>
          </div>
        </section>

        {/* Próximos Eventos */}
        {processedUpcomingEvents.length > 0 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="text-onda-orange" size={24} />
              <h3 className="text-lg font-semibold text-gray-900">Próximos Eventos</h3>
              <span className="ml-2 rounded-full bg-onda-orange px-2 py-0.5 text-xs font-bold text-white">
                {processedUpcomingEvents.length}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {processedUpcomingEvents.map((item, index) => {
                const isUrgent = item.diasFaltando <= 7
                const isToday = item.diasFaltando === 0

                return (
                  <div
                    key={index}
                    className={`rounded-xl border-2 p-4 transition hover:shadow-md ${
                      isToday
                        ? 'border-red-300 bg-red-50'
                        : isUrgent
                        ? 'border-orange-300 bg-orange-50'
                        : 'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate" title={item.event_name}>
                          {item.event_name}
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                          <Calendar size={12} />
                          <span>{item.dataFormatada}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div
                          className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
                            isToday
                              ? 'bg-red-500 text-white'
                              : isUrgent
                              ? 'bg-orange-500 text-white'
                              : 'bg-blue-500 text-white'
                          }`}
                        >
                          <Clock size={12} />
                          {isToday ? 'HOJE' : `${item.diasFaltando}d`}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Gráfico de vendas por data */}
        {salesByDate && salesByDate.length > 0 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Vendas por Data</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesByDate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <RechartsBar dataKey="revenue" name="Faturamento" fill="#ec4899" />
                <RechartsBar dataKey="count" name="Quantidade" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* Top Produtos e Categorias */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Top Produtos */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Top 5 Produtos</h3>
            <p className="text-sm text-gray-600">Mais vendidos por faturamento</p>
            <div className="mt-6 space-y-4">
              {topProducts?.map((product, index) => (
                <div key={product.name} className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-onda-yellow to-onda-orange font-bold text-gray-900">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">{formatNumber(product.quantity)} unidades</p>
                  </div>
                  <p className="text-lg font-bold text-emerald-400">{formatCurrency(product.revenue)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Categorias */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Vendas por Categoria</h3>
            <p className="text-sm text-gray-600">Distribuição por tipo de produto</p>
            <div className="mt-6 space-y-3">
              {categories?.map((category) => (
                <div key={category.name} className="rounded-xl bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{category.name}</p>
                    <p className="text-lg font-bold text-blue-400">{formatCurrency(category.revenue)}</p>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full bg-gradient-to-r from-onda-blue to-onda-yellow"
                      style={{ width: `${(category.revenue / (metrics?.total_revenue || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tabela de transações recentes */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Transações Recentes</h3>
            <p className="text-sm text-gray-600">Últimas 20 vendas registradas</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="pb-3 font-semibold text-gray-600">Data</th>
                  <th className="pb-3 font-semibold text-gray-600">Produto</th>
                  <th className="pb-3 font-semibold text-gray-600">Categoria</th>
                  <th className="pb-3 font-semibold text-gray-600">Evento</th>
                  <th className="pb-3 text-center font-semibold text-gray-600">Qtd</th>
                  <th className="pb-3 text-right font-semibold text-gray-600">Valor Unit.</th>
                  <th className="pb-3 text-right font-semibold text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions?.map((row) => (
                  <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 text-gray-700">{new Date(row.transactionDate).toLocaleDateString('pt-BR')}</td>
                    <td className="py-3 text-gray-900">{row.productName || '-'}</td>
                    <td className="py-3 text-gray-700">{row.productCategory || '-'}</td>
                    <td className="py-3 text-gray-700">{row.eventName || '-'}</td>
                    <td className="py-3 text-center font-semibold text-blue-400">{row.count || 0}</td>
                    <td className="py-3 text-right text-gray-700">
                      {formatCurrency(row.unitValue || 0)}
                    </td>
                    <td className="py-3 text-right font-semibold text-emerald-400">
                      {formatCurrency(row.total)}
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
