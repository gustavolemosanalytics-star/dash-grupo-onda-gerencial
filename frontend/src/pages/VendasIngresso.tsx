import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCcw, Calendar, Clock, X, Ticket, TrendingUp, Users, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageTransition } from '../components/PageTransition'
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
  quantidade?: number
}

interface CityData {
  cidade: string
  receita: number
  ingressos: number
}

interface UFData {
  uf: string
  receita: number
  ingressos: number
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

// Tipos para eventos futuros
interface UpcomingEvent {
  evento: string
  cidade: string
  data_evento: string
  total_vendas: number
  total_ingressos: number
  faturamento: number
  receita_liquida: number
}

interface TipoIngresso {
  tipo: string
  quantidade: number
  valor: number
}

interface VendaDia {
  data: string
  quantidade: number
  valor: number
}

interface VendaSemana {
  semana: string
  data_inicio: string
  quantidade: number
  valor: number
}

interface TicketeiraVenda {
  ticketeira: string
  quantidade: number
  valor: number
}

interface EventDetails {
  evento: string
  cidade: string
  data_evento: string
  total_vendas: number
  total_ingressos: number
  faturamento: number
  valor_bruto: number
  desconto_total: number
  ticket_medio: number
  tipos_ingresso: TipoIngresso[]
  vendas_dia: VendaDia[]
  vendas_semana: VendaSemana[]
  ticketeiras: TicketeiraVenda[]
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

const fetchByCity = async (filters: Record<string, string>): Promise<CityData[]> => {
  const response = await fetch(getApiUrl('api/vendas-aggregated/by-city') + buildQueryString(filters))
  if (!response.ok) throw new Error('Falha ao carregar cidades')
  return response.json()
}

const fetchByUF = async (filters: Record<string, string>): Promise<UFData[]> => {
  const response = await fetch(getApiUrl('api/vendas-aggregated/by-uf') + buildQueryString(filters))
  if (!response.ok) throw new Error('Falha ao carregar UFs')
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

const fetchUpcomingEvents = async (): Promise<UpcomingEvent[]> => {
  const response = await fetch(getApiUrl('api/vendas-aggregated/upcoming-events'))
  if (!response.ok) throw new Error('Falha ao carregar eventos futuros')
  return response.json()
}

const fetchEventDetails = async (evento: string): Promise<EventDetails> => {
  const response = await fetch(getApiUrl(`api/vendas-aggregated/event-details/${encodeURIComponent(evento)}`))
  if (!response.ok) throw new Error('Falha ao carregar detalhes do evento')
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

  // Estado para popup de detalhes do evento
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [chartViewMode, setChartViewMode] = useState<'dia' | 'semana'>('dia')
  const [tiposPage, setTiposPage] = useState(0)
  const TIPOS_PER_PAGE = 5

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

  const { data: cityData, isLoading: citiesLoading } = useQuery({
    queryKey: ['vendasByCity', filterParams],
    queryFn: () => fetchByCity(filterParams),
    staleTime: 1000 * 60 * 5,
  })

  const { data: ufData, isLoading: ufsLoading } = useQuery({
    queryKey: ['vendasByUF', filterParams],
    queryFn: () => fetchByUF(filterParams),
    staleTime: 1000 * 60 * 5,
  })

  const { data: recentSales, isLoading: salesLoading } = useQuery({
    queryKey: ['vendasRecentSales', filterParams],
    queryFn: () => fetchRecentSales(filterParams),
    staleTime: 1000 * 60 * 5,
  })

  // Query para eventos futuros
  const { data: upcomingEvents } = useQuery({
    queryKey: ['vendasUpcomingEvents'],
    queryFn: fetchUpcomingEvents,
    staleTime: 1000 * 60 * 15, // 15 minutos
  })

  // Query para detalhes do evento selecionado
  const { data: eventDetails, isLoading: eventDetailsLoading } = useQuery({
    queryKey: ['vendasEventDetails', selectedEvent],
    queryFn: () => fetchEventDetails(selectedEvent!),
    enabled: !!selectedEvent,
    staleTime: 1000 * 60 * 5,
  })

  // Processar eventos futuros com dias restantes
  const processedUpcomingEvents = useMemo(() => {
    if (!upcomingEvents) return []

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    return upcomingEvents.map(event => {
      const eventDate = new Date(event.data_evento + 'T00:00:00')
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

  const isLoading = metricsLoading || eventsLoading || channelsLoading || typesLoading || citiesLoading || ufsLoading || salesLoading
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

        {/* Próximos Eventos - Logo após métricas */}
        {processedUpcomingEvents.length > 0 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="text-onda-orange" size={24} />
              <h3 className="text-lg font-semibold text-gray-900">Eventos a Serem Realizados</h3>
              <span className="ml-2 rounded-full bg-onda-orange px-2 py-0.5 text-xs font-bold text-white">
                {processedUpcomingEvents.length}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {processedUpcomingEvents.map((item, index) => {
                const isUrgent = item.diasFaltando <= 7
                const isToday = item.diasFaltando === 0

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedEvent(item.evento)}
                    className={`rounded-xl border-2 p-4 text-left transition hover:shadow-md ${
                      isToday
                        ? 'border-red-300 bg-red-50 hover:bg-red-100'
                        : isUrgent
                        ? 'border-orange-300 bg-orange-50 hover:bg-orange-100'
                        : 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate" title={item.evento}>
                          {item.evento}
                        </p>
                        <p className="mt-1 text-xs text-gray-600 truncate" title={item.cidade}>
                          {item.cidade}
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                          <Calendar size={12} />
                          <span>{item.dataFormatada}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                          <span>{formatNumber(item.total_ingressos)} ingressos</span>
                          <span>•</span>
                          <span className="font-semibold text-emerald-600">{formatCurrency(item.faturamento)}</span>
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
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Gráficos de análise */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Vendas por evento */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Vendas por Evento</h3>
              <p className="text-sm text-gray-600">Top 10 eventos por receita</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventData} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#6B7280" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6B7280" tickFormatter={(value) => formatCompact(value)} />
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: '1px solid #E5E7EB',
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
            </div>
          </div>

          {/* Receita por Tipo de Ingresso - Barras Horizontais */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Receita por Tipo de Ingresso</h3>
              <p className="text-sm text-gray-600">Distribuição por categoria</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={typeData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#6B7280" tickFormatter={(value) => formatCompact(value)} />
                  <YAxis type="category" dataKey="name" stroke="#6B7280" tick={{ fontSize: 11 }} width={95} />
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="value" name="Receita" fill="#a78bfa" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Vendas por Canal - Gráfico de Barras */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Vendas por Canal (Ticketeira)</h3>
            <p className="text-sm text-gray-600">Receita e ingressos por canal de vendas</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={channelData?.map(c => ({ name: c.label, Receita: c.value, Ingressos: c.quantity }))}
                margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  stroke="#6B7280"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                  tick={{ fontSize: 11 }}
                />
                <YAxis stroke="#6B7280" tickFormatter={(value) => formatCompact(value)} />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #E5E7EB',
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
          </div>
        </section>

        {/* Receita por Cidade e UF */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Receita por Cidade */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Receita por Cidade</h3>
              <p className="text-sm text-gray-600">Top cidades por faturamento</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cityData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#6B7280" tickFormatter={(value) => formatCompact(value)} />
                  <YAxis type="category" dataKey="cidade" stroke="#6B7280" tick={{ fontSize: 11 }} width={95} />
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) =>
                      name === 'receita' ? formatCurrency(value) : formatNumber(value)
                    }
                  />
                  <Bar dataKey="receita" name="Receita" fill="#f472b6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Receita por UF */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Receita por Estado (UF)</h3>
              <p className="text-sm text-gray-600">Distribuição por unidade federativa</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ufData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="uf" stroke="#6B7280" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#6B7280" tickFormatter={(value) => formatCompact(value)} />
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) =>
                      name === 'receita' ? formatCurrency(value) : formatNumber(value)
                    }
                  />
                  <Bar dataKey="receita" name="Receita" fill="#fb923c" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="ingressos" name="Ingressos" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
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

        {/* Modal de Detalhes do Evento */}
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
              <button
                onClick={() => {
                  setSelectedEvent(null)
                  setTiposPage(0)
                  setChartViewMode('dia')
                }}
                className="absolute right-4 top-4 rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={24} />
              </button>

              {eventDetailsLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <WaveLoader />
                </div>
              ) : eventDetails ? (
                <div className="space-y-6">
                  {/* Header do evento */}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{eventDetails.evento}</h2>
                    <p className="mt-1 text-gray-600">{eventDetails.cidade}</p>
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                      <Calendar size={16} />
                      <span>{new Date(eventDetails.data_evento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        {(() => {
                          const hoje = new Date()
                          hoje.setHours(0, 0, 0, 0)
                          const eventDate = new Date(eventDetails.data_evento + 'T00:00:00')
                          const dias = Math.ceil((eventDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
                          return dias === 0 ? 'HOJE' : dias === 1 ? 'Amanhã' : `${dias} dias`
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Métricas principais - números compactos */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-3">
                      <div className="flex items-center gap-1.5 text-blue-600">
                        <Ticket size={16} />
                        <span className="text-xs font-medium">Ingressos</span>
                      </div>
                      <p className="mt-1 text-xl font-bold text-gray-900">{formatCompact(eventDetails.total_ingressos)}</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-3">
                      <div className="flex items-center gap-1.5 text-emerald-600">
                        <TrendingUp size={16} />
                        <span className="text-xs font-medium">Faturamento</span>
                      </div>
                      <p className="mt-1 text-xl font-bold text-gray-900">{formatCompact(eventDetails.faturamento)}</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-3">
                      <div className="flex items-center gap-1.5 text-purple-600">
                        <Users size={16} />
                        <span className="text-xs font-medium">Vendas</span>
                      </div>
                      <p className="mt-1 text-xl font-bold text-gray-900">{formatCompact(eventDetails.total_vendas)}</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 p-3">
                      <div className="flex items-center gap-1.5 text-orange-600">
                        <TrendingUp size={16} />
                        <span className="text-xs font-medium">Ticket Médio</span>
                      </div>
                      <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(eventDetails.ticket_medio)}</p>
                    </div>
                  </div>

                  {/* Gráfico de Vendas por Dia/Semana */}
                  {((eventDetails.vendas_dia && eventDetails.vendas_dia.length > 0) ||
                    (eventDetails.vendas_semana && eventDetails.vendas_semana.length > 0)) && (
                    <div className="rounded-xl border border-gray-200 p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BarChart3 size={20} className="text-blue-600" />
                          <h3 className="text-lg font-semibold text-gray-900">Evolução de Vendas</h3>
                        </div>
                        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                          <button
                            onClick={() => setChartViewMode('dia')}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                              chartViewMode === 'dia'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            Por Dia
                          </button>
                          <button
                            onClick={() => setChartViewMode('semana')}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                              chartViewMode === 'semana'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            Por Semana
                          </button>
                        </div>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={
                              chartViewMode === 'dia'
                                ? eventDetails.vendas_dia?.map(d => ({
                                    label: new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                                    Receita: d.valor,
                                    Ingressos: d.quantidade
                                  }))
                                : eventDetails.vendas_semana?.map(s => ({
                                    label: `Sem ${s.semana?.split('-W')[1] || ''}`,
                                    Receita: s.valor,
                                    Ingressos: s.quantidade
                                  }))
                            }
                            margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis
                              dataKey="label"
                              stroke="#6B7280"
                              tick={{ fontSize: 10 }}
                              angle={-45}
                              textAnchor="end"
                              height={50}
                            />
                            <YAxis stroke="#6B7280" tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 10 }} />
                            <Tooltip
                              contentStyle={{
                                background: '#FFFFFF',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px'
                              }}
                              formatter={(value: number, name: string) =>
                                name === 'Receita' ? formatCurrency(value) : formatNumber(value)
                              }
                            />
                            <Legend />
                            <Bar dataKey="Receita" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Ingressos" fill="#34d399" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Tipos de Ingresso com paginação */}
                  {eventDetails.tipos_ingresso && eventDetails.tipos_ingresso.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Por Tipo de Ingresso</h3>
                        {eventDetails.tipos_ingresso.length > TIPOS_PER_PAGE && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {tiposPage * TIPOS_PER_PAGE + 1}-{Math.min((tiposPage + 1) * TIPOS_PER_PAGE, eventDetails.tipos_ingresso.length)} de {eventDetails.tipos_ingresso.length}
                            </span>
                            <button
                              onClick={() => setTiposPage(p => Math.max(0, p - 1))}
                              disabled={tiposPage === 0}
                              className="rounded-md p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <ChevronLeft size={18} />
                            </button>
                            <button
                              onClick={() => setTiposPage(p => Math.min(Math.ceil(eventDetails.tipos_ingresso.length / TIPOS_PER_PAGE) - 1, p + 1))}
                              disabled={(tiposPage + 1) * TIPOS_PER_PAGE >= eventDetails.tipos_ingresso.length}
                              className="rounded-md p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <ChevronRight size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Tipo</th>
                              <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Qtd</th>
                              <th className="px-4 py-2.5 text-right font-semibold text-gray-600">Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {eventDetails.tipos_ingresso
                              .slice(tiposPage * TIPOS_PER_PAGE, (tiposPage + 1) * TIPOS_PER_PAGE)
                              .map((tipo, idx) => (
                                <tr key={idx} className="border-t border-gray-100">
                                  <td className="px-4 py-2.5 text-gray-900">{tipo.tipo}</td>
                                  <td className="px-4 py-2.5 text-center font-semibold text-blue-600">{formatCompact(tipo.quantidade)}</td>
                                  <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">{formatCompact(tipo.valor)}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Vendas por Ticketeira */}
                  {eventDetails.ticketeiras && eventDetails.ticketeiras.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-lg font-semibold text-gray-900">Por Ticketeira</h3>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {eventDetails.ticketeiras.map((tick, idx) => (
                          <div key={idx} className="rounded-lg border border-gray-200 p-3">
                            <p className="font-semibold text-gray-900 text-sm truncate" title={tick.ticketeira}>{tick.ticketeira}</p>
                            <div className="mt-1.5 flex items-center justify-between text-xs">
                              <span className="text-gray-600">{formatCompact(tick.quantidade)} ing.</span>
                              <span className="font-semibold text-emerald-600">{formatCompact(tick.valor)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center">
                  <p className="text-gray-500">Não foi possível carregar os detalhes do evento.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
