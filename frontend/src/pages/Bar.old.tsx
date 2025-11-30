import { useMemo, useState } from 'react'
import { BarChart3, RefreshCcw, Loader2, Filter, X, Database } from 'lucide-react'
import { BarChart, Bar as RechartsBar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { PageTransition } from '../components/PageTransition'
import { formatCurrency, formatNumber, formatDate } from '../lib/formatters'
import { useCSVData } from '../hooks/useCSVData'

interface BarZigRow {
  id: string
  barName: string
  eventName: string
  eventDate: string
  productName: string
  productCategory: string
  count: number
  unitValue: number
  discountValue: number
  employeeName: string
  transactionDate: string
  source: string
  isRefunded: boolean
}

const LoadingState = ({ progress }: { progress: number }) => (
  <div className="space-y-6">
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-onda-yellow" />
        <div>
          <p className="font-semibold text-gray-900">Carregando dados do Bar...</p>
          <p className="text-sm text-gray-600">
            {progress < 30 ? 'Baixando CSV...' : progress < 90 ? 'Processando dados...' : 'Finalizando...'}
          </p>
        </div>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full bg-gradient-to-r from-onda-yellow to-onda-orange transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-right text-sm font-semibold text-gray-900">{Math.round(progress)}%</p>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-3xl bg-white/5" />
      ))}
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

export function Bar() {
  const { data, isLoading, isError, progress, refetch, clearCache } = useCSVData<BarZigRow>({
    dataType: 'bar',
    cacheMaxAge: 60, // Cache por 1 hora
  })

  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })

  // Extrair categorias e eventos únicos
  const { categories, events } = useMemo(() => {
    if (!data.length) return { categories: [], events: [] }

    const cats = Array.from(new Set(data.map(row => row.productCategory).filter(Boolean))).sort()
    const evts = Array.from(new Set(data.map(row => row.eventName).filter(Boolean))).sort()

    return { categories: cats, events: evts }
  }, [data])

  // Filtrar dados
  const filteredData = useMemo(() => {
    if (!data.length) return []

    return data.filter(row => {
      if (selectedCategory && row.productCategory !== selectedCategory) return false
      if (selectedEvent && row.eventName !== selectedEvent) return false

      if (selectedDateRange.start || selectedDateRange.end) {
        const rowDate = new Date(row.transactionDate)
        if (selectedDateRange.start && rowDate < new Date(selectedDateRange.start)) return false
        if (selectedDateRange.end && rowDate > new Date(selectedDateRange.end)) return false
      }

      return true
    })
  }, [data, selectedCategory, selectedEvent, selectedDateRange])

  // Calcular métricas
  const metrics = useMemo(() => {
    const totalTransactions = filteredData.length
    const totalRevenue = filteredData.reduce((sum, row) => {
      const value = row.unitValue || 0
      const count = row.count || 1
      const discount = row.discountValue || 0
      return sum + (value * count - discount)
    }, 0)

    const totalProductsSold = filteredData.reduce((sum, row) => sum + (row.count || 0), 0)
    const avgTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    return { totalTransactions, totalRevenue, totalProductsSold, avgTicket }
  }, [filteredData])

  // Agregação para gráfico de vendas por data
  const salesByDate = useMemo(() => {
    if (!filteredData.length) return []

    const map = filteredData.reduce((acc, row) => {
      const date = formatDate(row.transactionDate)
      const value = row.unitValue || 0
      const count = row.count || 1
      const discount = row.discountValue || 0
      const revenue = value * count - discount

      if (!acc[date]) {
        acc[date] = { date, revenue: 0, quantity: 0 }
      }

      acc[date].revenue += revenue
      acc[date].quantity += count

      return acc
    }, {} as Record<string, { date: string; revenue: number; quantity: number }>)

    return Object.values(map).sort((a, b) => {
      const [dayA, monthA, yearA] = a.date.split('/').map(Number)
      const [dayB, monthB, yearB] = b.date.split('/').map(Number)
      const dateA = new Date(yearA, monthA - 1, dayA).getTime()
      const dateB = new Date(yearB, monthB - 1, dayB).getTime()
      return dateA - dateB
    })
  }, [filteredData])

  // Top produtos
  const topProducts = useMemo(() => {
    const productSales = filteredData.reduce((acc, row) => {
      const value = row.unitValue || 0
      const count = row.count || 1
      const discount = row.discountValue || 0
      const revenue = value * count - discount

      if (!acc[row.productName]) {
        acc[row.productName] = { quantity: 0, revenue: 0 }
      }
      acc[row.productName].quantity += count
      acc[row.productName].revenue += revenue
      return acc
    }, {} as Record<string, { quantity: number; revenue: number }>)

    return Object.entries(productSales)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [filteredData])

  // Vendas por categoria
  const topCategories = useMemo(() => {
    const categorySales = filteredData.reduce((acc, row) => {
      const value = row.unitValue || 0
      const count = row.count || 1
      const discount = row.discountValue || 0
      const revenue = value * count - discount

      const category = row.productCategory || 'Sem categoria'
      if (!acc[category]) {
        acc[category] = 0
      }
      acc[category] += revenue
      return acc
    }, {} as Record<string, number>)

    return Object.entries(categorySales)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [filteredData])

  const hasActiveFilters = selectedCategory || selectedEvent || selectedDateRange.start || selectedDateRange.end

  const clearFilters = () => {
    setSelectedCategory('')
    setSelectedEvent('')
    setSelectedDateRange({ start: '', end: '' })
  }

  const handleClearCache = async () => {
    await clearCache()
    await refetch()
  }

  if (isLoading) return <LoadingState progress={progress} />
  if (isError || !data) return <EmptyState onRetry={refetch} />

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <header className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-onda-yellow to-onda-orange">
              <BarChart3 className="h-6 w-6 text-gray-900" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-gray-600">Operações</p>
              <h1 className="mt-1 text-3xl font-semibold text-gray-900">Bar Zig</h1>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleClearCache}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
              title="Limpar cache e recarregar"
            >
              <Database size={16} />
              Limpar Cache
            </button>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
            >
              <RefreshCcw size={16} />
              Atualizar
            </button>
          </div>
        </header>

        {/* Info do Cache */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            <strong>Modo CSV:</strong> Dados carregados do servidor e armazenados localmente. Total de {formatNumber(data.length)} transações.
          </p>
        </div>

        {/* Filtros */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <Filter size={20} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-900 transition hover:bg-gray-200"
              >
                <X size={14} />
                Limpar
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-600">Categoria</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              >
                <option value="">Todas as categorias</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-600">Evento</label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              >
                <option value="">Todos os eventos</option>
                {events.map(evt => (
                  <option key={evt} value={evt}>{evt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-600">Data Inicial</label>
              <input
                type="date"
                value={selectedDateRange.start}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-600">Data Final</label>
              <input
                type="date"
                value={selectedDateRange.end}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 text-sm text-gray-600">
              Mostrando {filteredData.length} de {data.length} registros
            </div>
          )}
        </section>

        {/* Métricas principais */}
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-onda-yellow/10 to-onda-orange/10 p-6">
            <p className="text-sm font-medium text-gray-600">Faturamento Total</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(metrics.totalRevenue)}</p>
            <p className="mt-1 text-xs text-gray-500">Vendas no período</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-onda-blue/10 to-onda-yellow/10 p-6">
            <p className="text-sm font-medium text-gray-600">Transações</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(metrics.totalTransactions)}</p>
            <p className="mt-1 text-xs text-gray-500">Total de vendas</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-emerald-500/10 to-green-600/10 p-6">
            <p className="text-sm font-medium text-gray-600">Produtos Vendidos</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(metrics.totalProductsSold)}</p>
            <p className="mt-1 text-xs text-gray-500">Quantidade total</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-purple-500/10 to-violet-600/10 p-6">
            <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(metrics.avgTicket)}</p>
            <p className="mt-1 text-xs text-gray-500">Por transação</p>
          </div>
        </section>

        {/* Gráfico de vendas por data */}
        {salesByDate.length > 0 && (
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
                <RechartsBar dataKey="quantity" name="Quantidade" fill="#3b82f6" />
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
              {topProducts.map((product, index) => (
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
              {topCategories.map((category) => (
                <div key={category.name} className="rounded-xl bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{category.name}</p>
                    <p className="text-lg font-bold text-blue-400">{formatCurrency(category.revenue)}</p>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full bg-gradient-to-r from-onda-blue to-onda-yellow"
                      style={{ width: `${(category.revenue / metrics.totalRevenue) * 100}%` }}
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
                {filteredData.slice(0, 20).map((row) => {
                  const total = (row.unitValue || 0) * (row.count || 1) - (row.discountValue || 0)
                  return (
                    <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 text-gray-700">{formatDate(row.transactionDate)}</td>
                      <td className="py-3 text-gray-900">{row.productName || '-'}</td>
                      <td className="py-3 text-gray-700">{row.productCategory || '-'}</td>
                      <td className="py-3 text-gray-700">{row.eventName || '-'}</td>
                      <td className="py-3 text-center font-semibold text-blue-400">{row.count || 0}</td>
                      <td className="py-3 text-right text-gray-700">
                        {formatCurrency(row.unitValue || 0)}
                      </td>
                      <td className="py-3 text-right font-semibold text-emerald-400">
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
