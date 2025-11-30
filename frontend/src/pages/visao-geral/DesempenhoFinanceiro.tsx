/**
 * Desempenho Financeiro Subpage
 *
 * Displays:
 * - Financial indicators (Despesa Total, Receita Total, Lucro, ROI, GAP)
 * - Receitas: Projeção vs Realizado (dynamic chart with category selector)
 * - Receitas Totais: Projeção vs Realizado (stacked bar chart)
 * - Despesas por Categoria (dynamic chart)
 * - Despesas: Projeção vs Realizado
 */

import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MetricCard } from '../../features/dashboard/components/MetricCard'
import { formatCurrency, formatCompact } from '../../lib/formatters'
import { parseCurrency } from '../../lib/parsers'

interface BaseGeralRow {
  [key: string]: unknown
}

interface DesempenhoFinanceiroProps {
  data: BaseGeralRow[]
}

type RevenueCategory = 'Todas' | 'Bilheteria' | 'Bar' | 'Alimentação' | 'Patrocínios' | 'Loja' | 'Outros'
type ViewMode = 'evento' | 'base'

export function DesempenhoFinanceiro({ data }: DesempenhoFinanceiroProps) {
  const [revenueCategory, setRevenueCategory] = useState<RevenueCategory>('Todas')
  const [revenueViewMode, setRevenueViewMode] = useState<ViewMode>('evento')
  const [expenseViewMode, setExpenseViewMode] = useState<ViewMode>('evento')

  // Calculate financial indicators
  const indicators = useMemo(() => {
    const despesaTotal = data.reduce((sum, row) => sum + parseCurrency(row['Despesa Total ']), 0)
    const receitaTotal = data.reduce((sum, row) => sum + parseCurrency(row['Receitas atuais - Valor Total']), 0)
    const lucro = receitaTotal - despesaTotal
    const roi = despesaTotal > 0 ? ((lucro / despesaTotal) * 100) : 0

    const projecaoReceitas = data.reduce((sum, row) => sum + parseCurrency(row['Projeção de Receitas - Valor Total']), 0)
    const gap = receitaTotal - projecaoReceitas

    return { despesaTotal, receitaTotal, lucro, roi, gap, projecaoReceitas }
  }, [data])

  // Revenue categories mapping
  const revenueCategoryKeys: Record<RevenueCategory, string[]> = {
    'Todas': ['Receitas atuais - Valor Total'],
    'Bilheteria': ['Receitas atuais - Bilheteria'],
    'Bar': ['Receitas atuais - Bar'],
    'Alimentação': ['Receitas atuais - Alimentação'],
    'Patrocínios': ['Receitas atuais - Patrocínios'],
    'Loja': ['Receitas atuais - Loja'],
    'Outros': ['Receitas atuais - Outros'],
  }

  const projectionCategoryKeys: Record<RevenueCategory, string[]> = {
    'Todas': ['Projeção de Receitas - Valor Total'],
    'Bilheteria': ['Projeção de Receitas - Bilheteria'],
    'Bar': ['Projeção de Receitas - Bar'],
    'Alimentação': ['Projeção de Receitas - Alimentação'],
    'Patrocínios': ['Projeção de Receitas - Patrocínios'],
    'Loja': ['Projeção de Receitas - Loja'],
    'Outros': ['Projeção de Receitas - Outros'],
  }

  // Receitas: Projeção vs Realizado
  const receitasData = useMemo(() => {
    const map = new Map<string, { projecao: number; realizado: number }>()

    data.forEach((row) => {
      let key = ''
      if (revenueViewMode === 'evento') {
        const evento = String(row['Evento'] || '')
        const cidade = String(row['Cidade do Evento'] || '')
        key = evento && cidade ? `${evento} - ${cidade}` : evento || cidade
      } else {
        key = String(row['Base'] || '')
      }

      if (!key) return

      const currentKeys = revenueCategoryKeys[revenueCategory]
      const projectionKeys = projectionCategoryKeys[revenueCategory]

      const realizado = currentKeys.reduce((sum, k) => sum + parseCurrency(row[k]), 0)
      const projecao = projectionKeys.reduce((sum, k) => sum + parseCurrency(row[k]), 0)

      if (map.has(key)) {
        const current = map.get(key)!
        map.set(key, {
          projecao: current.projecao + projecao,
          realizado: current.realizado + realizado,
        })
      } else {
        map.set(key, { projecao, realizado })
      }
    })

    return Array.from(map.entries())
      .map(([name, values]) => ({
        name,
        'Projeção': values.projecao,
        'Realizado': values.realizado,
      }))
      .slice(0, 10)
  }, [data, revenueCategory, revenueViewMode])

  // Expense categories
  const expenseCategories = [
    { key: 'Despesas atuais - Artístico / Logística', label: 'Artístico' },
    { key: 'Despesas atuais - Licença / Impostos', label: 'Licença' },
    { key: 'Despesas atuais - Locação', label: 'Locação' },
    { key: 'Despesas atuais - Projeto', label: 'Projeto' },
    { key: 'Despesas atuais - Infraestrutura', label: 'Infra' },
    { key: 'Despesas atuais - Cenografia / Decoração', label: 'Ceno' },
    { key: 'Despesas atuais - Tecnologia', label: 'Tech' },
    { key: 'Despesas atuais - Marketing / Mídias Gerais', label: 'MKT' },
    { key: 'Despesas atuais - Operacional', label: 'Oper' },
    { key: 'Despesas atuais - A&B', label: 'A&B' },
    { key: 'Despesas atuais - Diversos', label: 'Div' },
  ]

  // Despesas por Categoria
  const despesasData = useMemo(() => {
    const map = new Map<string, Record<string, number>>()

    data.forEach((row) => {
      let key = ''
      if (expenseViewMode === 'evento') {
        const evento = String(row['Evento'] || '')
        const cidade = String(row['Cidade do Evento'] || '')
        key = evento && cidade ? `${evento} - ${cidade}` : evento || cidade
      } else {
        key = String(row['Base'] || '')
      }

      if (!key) return

      if (!map.has(key)) {
        map.set(key, {})
      }

      const current = map.get(key)!

      expenseCategories.forEach((cat) => {
        const value = parseCurrency(row[cat.key])
        current[cat.label] = (current[cat.label] || 0) + value
      })
    })

    return Array.from(map.entries())
      .map(([name, values]) => ({
        name,
        ...values,
      }))
      .slice(0, 10)
  }, [data, expenseViewMode])

  // Despesas: Projeção vs Realizado
  const despesasProjecaoData = useMemo(() => {
    const map = new Map<string, { projecao: number; realizado: number }>()

    data.forEach((row) => {
      let key = ''
      if (expenseViewMode === 'evento') {
        const evento = String(row['Evento'] || '')
        const cidade = String(row['Cidade do Evento'] || '')
        key = evento && cidade ? `${evento} - ${cidade}` : evento || cidade
      } else {
        key = String(row['Base'] || '')
      }

      if (!key) return

      const realizado = parseCurrency(row['Despesa Total '])
      const projecao = parseCurrency(row['Projeção de Despesas - Total'])

      if (map.has(key)) {
        const current = map.get(key)!
        map.set(key, {
          projecao: current.projecao + projecao,
          realizado: current.realizado + realizado,
        })
      } else {
        map.set(key, { projecao, realizado })
      }
    })

    return Array.from(map.entries())
      .map(([name, values]) => ({
        name,
        'Projeção Total': values.projecao,
        'Realizado Total': values.realizado,
      }))
      .slice(0, 10)
  }, [data, expenseViewMode])

  return (
    <div className="space-y-6">
      {/* Indicadores */}
      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Despesa Total"
          value={`R$ ${formatCompact(indicators.despesaTotal)}`}
          accentColor="orange"
        />
        <MetricCard
          title="Receita Total"
          value={`R$ ${formatCompact(indicators.receitaTotal)}`}
          accentColor="blue"
        />
        <MetricCard
          title="Lucro"
          value={`R$ ${formatCompact(indicators.lucro)}`}
          accentColor="yellow"
          positive={indicators.lucro >= 0}
        />
        <MetricCard
          title="ROI"
          value={`${indicators.roi.toFixed(1)}%`}
          helper="Retorno sobre investimento"
          accentColor="blue"
        />
        <MetricCard
          title="GAP"
          value={`R$ ${formatCompact(indicators.gap)}`}
          helper="Projeção vs Real"
          accentColor="orange"
          positive={indicators.gap >= 0}
        />
      </section>

      {/* Receitas: Projeção vs Realizado */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-gray-900">Receitas: Projeção vs Realizado</h3>
          <div className="flex flex-wrap gap-2">
            <select
              value={revenueCategory}
              onChange={(e) => setRevenueCategory(e.target.value as RevenueCategory)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium focus:border-onda-yellow focus:outline-none focus:ring-2 focus:ring-onda-yellow/20"
            >
              <option value="Todas">Todas</option>
              <option value="Bilheteria">Bilheteria</option>
              <option value="Bar">Bar</option>
              <option value="Alimentação">Alimentação</option>
              <option value="Patrocínios">Patrocínios</option>
              <option value="Loja">Loja</option>
              <option value="Outros">Outros</option>
            </select>
            <div className="flex rounded-lg border border-gray-300">
              <button
                onClick={() => setRevenueViewMode('evento')}
                className={`px-3 py-1.5 text-sm font-medium ${
                  revenueViewMode === 'evento'
                    ? 'bg-onda-yellow text-black'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Por Evento
              </button>
              <button
                onClick={() => setRevenueViewMode('base')}
                className={`px-3 py-1.5 text-sm font-medium ${
                  revenueViewMode === 'base'
                    ? 'bg-onda-yellow text-black'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Por Base
              </button>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={receitasData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              stroke="#6B7280"
              angle={0}
              textAnchor="middle"
              height={100}
              interval={0}
              tick={(props) => {
                const { x, y, payload } = props
                const parts = String(payload.value).split(' - ')
                const evento = parts[0] || ''
                const cidade = parts[1] || ''

                // Truncar texto se for muito longo
                const truncate = (text: string, maxLength: number) => {
                  if (text.length > maxLength) return text.substring(0, maxLength) + '...'
                  return text
                }

                return (
                  <g transform={`translate(${x},${y})`}>
                    <text x={0} y={0} dy={16} textAnchor="middle" fill="#6B7280" fontSize="9px">
                      {truncate(evento, 15)}
                    </text>
                    {cidade && (
                      <text x={0} y={0} dy={26} textAnchor="middle" fill="#9CA3AF" fontSize="8px">
                        {truncate(cidade, 12)}
                      </text>
                    )}
                  </g>
                )
              }}
            />
            <YAxis stroke="#6B7280" tickFormatter={(value) => formatCompact(value)} />
            <Tooltip
              contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Bar dataKey="Projeção" fill="#8BC5E5" radius={[8, 8, 0, 0]} />
            <Bar dataKey="Realizado" fill="#10B981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Despesas por Categoria */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-gray-900">Despesas por Categoria</h3>
          <div className="flex rounded-lg border border-gray-300">
            <button
              onClick={() => setExpenseViewMode('evento')}
              className={`px-3 py-1.5 text-sm font-medium ${
                expenseViewMode === 'evento'
                  ? 'bg-onda-orange text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Por Evento
            </button>
            <button
              onClick={() => setExpenseViewMode('base')}
              className={`px-3 py-1.5 text-sm font-medium ${
                expenseViewMode === 'base'
                  ? 'bg-onda-orange text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Por Base
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={despesasData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              stroke="#6B7280"
              angle={0}
              textAnchor="middle"
              height={100}
              interval={0}
              tick={(props) => {
                const { x, y, payload } = props
                const parts = String(payload.value).split(' - ')
                const evento = parts[0] || ''
                const cidade = parts[1] || ''

                // Truncar texto se for muito longo
                const truncate = (text: string, maxLength: number) => {
                  if (text.length > maxLength) return text.substring(0, maxLength) + '...'
                  return text
                }

                return (
                  <g transform={`translate(${x},${y})`}>
                    <text x={0} y={0} dy={16} textAnchor="middle" fill="#6B7280" fontSize="9px">
                      {truncate(evento, 15)}
                    </text>
                    {cidade && (
                      <text x={0} y={0} dy={26} textAnchor="middle" fill="#9CA3AF" fontSize="8px">
                        {truncate(cidade, 12)}
                      </text>
                    )}
                  </g>
                )
              }}
            />
            <YAxis stroke="#6B7280" tickFormatter={(value) => formatCompact(value)} />
            <Tooltip
              contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            {expenseCategories.map((cat, index) => (
              <Bar
                key={cat.label}
                dataKey={cat.label}
                stackId="a"
                fill={`hsl(${(index * 360) / expenseCategories.length}, 70%, 60%)`}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Despesas: Projeção vs Realizado */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-lg font-bold text-gray-900">Despesas: Projeção vs Realizado</h3>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={despesasProjecaoData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              stroke="#6B7280"
              angle={0}
              textAnchor="middle"
              height={100}
              interval={0}
              tick={(props) => {
                const { x, y, payload } = props
                const parts = String(payload.value).split(' - ')
                const evento = parts[0] || ''
                const cidade = parts[1] || ''

                // Truncar texto se for muito longo
                const truncate = (text: string, maxLength: number) => {
                  if (text.length > maxLength) return text.substring(0, maxLength) + '...'
                  return text
                }

                return (
                  <g transform={`translate(${x},${y})`}>
                    <text x={0} y={0} dy={16} textAnchor="middle" fill="#6B7280" fontSize="9px">
                      {truncate(evento, 15)}
                    </text>
                    {cidade && (
                      <text x={0} y={0} dy={26} textAnchor="middle" fill="#9CA3AF" fontSize="8px">
                        {truncate(cidade, 12)}
                      </text>
                    )}
                  </g>
                )
              }}
            />
            <YAxis stroke="#6B7280" tickFormatter={(value) => formatCompact(value)} />
            <Tooltip
              contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Bar dataKey="Projeção Total" fill="#F9501E" radius={[8, 8, 0, 0]} />
            <Bar dataKey="Realizado Total" fill="#EF4444" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  )
}
