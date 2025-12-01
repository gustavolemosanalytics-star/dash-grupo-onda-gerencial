/**
 * Resultados Subpage - Redesigned
 *
 * Displays:
 * - Resultado Sócio Dono (fixed column name)
 * - Graph 1: Evento por Receitas atuais (Valor Total vs Despesa Total + Lucro)
 * - Graph 2: Evento por Projeção de Receitas (with % projection vs actual)
 * - Graph 3: Evento por ROI (Lucro / Receita)
 * - Graph 4: Evento por Resultado Grupo Onda
 * - Dynamic List: Meta Atingida por Evento
 */

import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, ComposedChart } from 'recharts'
import { MetricCard } from '../../features/dashboard/components/MetricCard'
import { formatCurrency, formatCompact } from '../../lib/formatters'
import { parseCurrency } from '../../lib/parsers'
import { CheckCircle2, XCircle, Calendar, Clock } from 'lucide-react'

interface BaseGeralRow {
  [key: string]: unknown
}

interface ResultadosProps {
  data: BaseGeralRow[]
}

type GroupBy = 'evento' | 'lider' | 'base'

export function ResultadosNew({ data }: ResultadosProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>('evento')

  // Log available columns for debugging
  console.log('[Resultados] Available columns:', data[0] ? Object.keys(data[0]) : [])

  // Calcular os três indicadores principais
  const indicadores = useMemo(() => {
    const socioLocal = data.reduce((sum, row) => sum + parseCurrency(row['Resultado Sócio Local Label']), 0)
    const socioDono = data.reduce((sum, row) => sum + parseCurrency(row['Resultado Sócio Dono Label']), 0)
    const grupoOnda = data.reduce((sum, row) => sum + parseCurrency(row['Resultado Grupo Onda']), 0)

    console.log('[Resultados] Indicadores:', { socioLocal, socioDono, grupoOnda })

    return { socioLocal, socioDono, grupoOnda }
  }, [data])

  // Graph 1: Evento por Receitas atuais - Valor Total vs Despesa Total + Lucro
  const receitasDespesas = useMemo(() => {
    const groupMap = new Map<string, { receitas: number; despesas: number; lucro: number }>()

    data.forEach((row) => {
      let key = ''
      if (groupBy === 'evento') {
        const evento = String(row['Evento'] || '')
        const cidade = String(row['Cidade do Evento'] || '')
        key = evento && cidade ? `${evento} - ${cidade}` : evento || cidade
      } else if (groupBy === 'lider') {
        key = String(row['Líder do Evento'] || row['Lider do Evento'] || '')
      } else {
        key = String(row['Base'] || '')
      }

      if (!key) return

      const receitas = parseCurrency(row['Receitas atuais - Valor Total'])
      const despesas = parseCurrency(row['Despesa Total '] || row['Despesa Total'])
      const lucro = receitas - despesas

      if (groupMap.has(key)) {
        const current = groupMap.get(key)!
        groupMap.set(key, {
          receitas: current.receitas + receitas,
          despesas: current.despesas + despesas,
          lucro: current.lucro + lucro,
        })
      } else {
        groupMap.set(key, { receitas, despesas, lucro })
      }
    })

    return Array.from(groupMap.entries())
      .map(([name, values]) => ({
        name,
        'Valor Total': values.receitas,
        'Despesa Total': values.despesas,
        'Lucro': values.lucro,
      }))
      .filter(item => item['Valor Total'] > 0 || item['Despesa Total'] > 0)
      .sort((a, b) => b['Valor Total'] - a['Valor Total'])
      .slice(0, 10)
  }, [data, groupBy])

  // Graph 2: Evento por Projeção de Receitas
  const projecaoReceitas = useMemo(() => {
    const groupMap = new Map<string, { projecao: number; atuais: number }>()

    data.forEach((row) => {
      let key = ''
      if (groupBy === 'evento') {
        const evento = String(row['Evento'] || '')
        const cidade = String(row['Cidade do Evento'] || '')
        key = evento && cidade ? `${evento} - ${cidade}` : evento || cidade
      } else if (groupBy === 'lider') {
        key = String(row['Líder do Evento'] || row['Lider do Evento'] || '')
      } else {
        key = String(row['Base'] || '')
      }

      if (!key) return

      const projecao = parseCurrency(row['Projeção de Receitas - Valor Total'] || row['Projecao de Receitas - Valor Total'])
      const atuais = parseCurrency(row['Receitas atuais - Valor Total'])

      if (projecao === 0) return // Only show where projection ≠ 0

      if (groupMap.has(key)) {
        const current = groupMap.get(key)!
        groupMap.set(key, {
          projecao: current.projecao + projecao,
          atuais: current.atuais + atuais,
        })
      } else {
        groupMap.set(key, { projecao, atuais })
      }
    })

    return Array.from(groupMap.entries())
      .map(([name, values]) => {
        const percentage = values.projecao > 0 ? (values.atuais / values.projecao) * 100 : 0
        return {
          name,
          'Projeção': values.projecao,
          'Receitas Atuais': values.atuais,
          '% Atingido': percentage,
        }
      })
      .filter(item => item['Projeção'] > 0)
      .sort((a, b) => b['Projeção'] - a['Projeção'])
      .slice(0, 10)
  }, [data, groupBy])

  // Graph 3: Evento por ROI (Lucro / Receita)
  const roiData = useMemo(() => {
    const groupMap = new Map<string, { lucro: number; receita: number }>()

    data.forEach((row) => {
      let key = ''
      if (groupBy === 'evento') {
        const evento = String(row['Evento'] || '')
        const cidade = String(row['Cidade do Evento'] || '')
        key = evento && cidade ? `${evento} - ${cidade}` : evento || cidade
      } else if (groupBy === 'lider') {
        key = String(row['Líder do Evento'] || row['Lider do Evento'] || '')
      } else {
        key = String(row['Base'] || '')
      }

      if (!key) return

      const receita = parseCurrency(row['Receitas atuais - Valor Total'])
      const despesa = parseCurrency(row['Despesa Total '] || row['Despesa Total'])
      const lucro = receita - despesa

      if (groupMap.has(key)) {
        const current = groupMap.get(key)!
        groupMap.set(key, {
          lucro: current.lucro + lucro,
          receita: current.receita + receita,
        })
      } else {
        groupMap.set(key, { lucro, receita })
      }
    })

    return Array.from(groupMap.entries())
      .map(([name, values]) => {
        const roi = values.receita > 0 ? (values.lucro / values.receita) * 100 : 0
        return {
          name,
          'ROI (%)': roi,
          'Lucro': values.lucro,
          'Receita': values.receita,
        }
      })
      .filter(item => item['Receita'] > 0)
      .sort((a, b) => b['ROI (%)'] - a['ROI (%)'])
      .slice(0, 10)
  }, [data, groupBy])

  // Graph 4: Evento por Resultado Grupo Onda
  const resultadoGrupoOndaData = useMemo(() => {
    const groupMap = new Map<string, number>()

    data.forEach((row) => {
      let key = ''
      if (groupBy === 'evento') {
        const evento = String(row['Evento'] || '')
        const cidade = String(row['Cidade do Evento'] || '')
        key = evento && cidade ? `${evento} - ${cidade}` : evento || cidade
      } else if (groupBy === 'lider') {
        key = String(row['Líder do Evento'] || row['Lider do Evento'] || '')
      } else {
        key = String(row['Base'] || '')
      }

      if (!key) return

      const resultado = parseCurrency(row['Resultado Grupo Onda'])

      if (groupMap.has(key)) {
        groupMap.set(key, groupMap.get(key)! + resultado)
      } else {
        groupMap.set(key, resultado)
      }
    })

    return Array.from(groupMap.entries())
      .map(([name, resultado]) => ({
        name,
        'Resultado': resultado,
      }))
      .filter(item => item['Resultado'] !== 0)
      .sort((a, b) => b['Resultado'] - a['Resultado'])
      .slice(0, 10)
  }, [data, groupBy])

  // Dynamic List: Meta Atingida por Evento
  const metasAtingidas = useMemo(() => {
    return data
      .filter((row) => row['Evento'])
      .map((row) => ({
        evento: String(row['Evento']),
        metaAtingida: String(row['Meta Atingida'] || ''),
        cidade: String(row['Cidade do Evento'] || ''),
      }))
      .filter((item, index, self) =>
        index === self.findIndex((t) => t.evento === item.evento)
      )
      .slice(0, 20)
  }, [data])

  // Próximos Eventos - eventos com data futura
  const proximosEventos = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    return data
      .filter((row) => {
        const dataEvento = row['Data']
        if (!dataEvento) return false
        const dataObj = new Date(String(dataEvento))
        return dataObj >= hoje
      })
      .map((row) => {
        const dataEvento = new Date(String(row['Data']))
        const diffTime = dataEvento.getTime() - hoje.getTime()
        const diasFaltando = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        return {
          evento: String(row['Evento'] || ''),
          cidade: String(row['Cidade do Evento'] || ''),
          data: dataEvento,
          dataFormatada: dataEvento.toLocaleDateString('pt-BR'),
          diasFaltando,
          base: String(row['Base'] || ''),
          lider: String(row['Líder do Evento'] || row['Lider do Evento'] || ''),
        }
      })
      .filter((item) => item.evento)
      .sort((a, b) => a.data.getTime() - b.data.getTime())
      .filter((item, index, self) =>
        index === self.findIndex((t) => t.evento === item.evento && t.dataFormatada === item.dataFormatada)
      )
      .slice(0, 12)
  }, [data])

  const getMetaStatus = (status: string) => {
    const normalized = status.toLowerCase()
    if (normalized.includes('sim') || normalized === 's') {
      return { icon: <CheckCircle2 className="text-emerald-600" size={18} />, label: 'SIM', color: 'text-emerald-600', bg: 'bg-emerald-50' }
    } else {
      return { icon: <XCircle className="text-rose-600" size={18} />, label: 'NÃO', color: 'text-rose-600', bg: 'bg-rose-50' }
    }
  }

  const GroupBySelector = () => (
    <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
      <button
        onClick={() => setGroupBy('evento')}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
          groupBy === 'evento' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Evento
      </button>
      <button
        onClick={() => setGroupBy('lider')}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
          groupBy === 'lider' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Líder do Evento
      </button>
      <button
        onClick={() => setGroupBy('base')}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
          groupBy === 'base' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Base
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Indicadores Principais */}
      <section className="grid gap-5 md:grid-cols-3">
        <MetricCard
          title="Resultado Sócio Local"
          value={formatCurrency(indicadores.socioLocal)}
          accentColor="yellow"
          positive={indicadores.socioLocal >= 0}
          helper="Resultado para o sócio local"
        />
        <MetricCard
          title="Resultado Sócio Dono"
          value={formatCurrency(indicadores.socioDono)}
          accentColor="orange"
          positive={indicadores.socioDono >= 0}
          helper="Resultado para o sócio dono"
        />
        <MetricCard
          title="Resultado Grupo Onda"
          value={formatCurrency(indicadores.grupoOnda)}
          accentColor="blue"
          positive={indicadores.grupoOnda >= 0}
          helper="Resultado para o Grupo Onda"
        />
      </section>

      {/* PRÓXIMOS EVENTOS */}
      {proximosEventos.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="text-onda-orange" size={24} />
            <h3 className="text-lg font-bold text-gray-900">Próximos Eventos</h3>
            <span className="ml-2 rounded-full bg-onda-orange px-2 py-0.5 text-xs font-bold text-white">
              {proximosEventos.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {proximosEventos.map((item, index) => {
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

      {/* GRÁFICO 1: Evento por Receitas atuais - Valor Total vs Despesa Total + Lucro */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Receitas Atuais vs Despesas</h3>
            <p className="text-sm text-gray-600">Valor Total, Despesa Total e Lucro</p>
          </div>
          <GroupBySelector />
        </div>
        <ResponsiveContainer width="100%" height={450}>
          <ComposedChart data={receitasDespesas} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
              itemSorter={(item) => {
                const order = { 'Valor Total': 1, 'Despesa Total': 2, 'Lucro': 3 }
                return order[item.name as keyof typeof order] || 4
              }}
            />
            <Legend />
            <Bar dataKey="Valor Total" fill="#10B981" radius={[8, 8, 0, 0]} name="Valor Total" />
            <Bar dataKey="Despesa Total" fill="#EF4444" radius={[8, 8, 0, 0]} name="Despesa Total" />
            <Line type="monotone" dataKey="Lucro" stroke="#FBC33D" strokeWidth={3} dot={{ r: 5, fill: '#FBC33D' }} name="Lucro" />
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      {/* GRÁFICO 2: Evento por Projeção de Receitas */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Projeção de Receitas vs Receitas Atuais</h3>
            <p className="text-sm text-gray-600">Comparação entre projetado e realizado (apenas eventos com projeção)</p>
          </div>
          <GroupBySelector />
        </div>
        <ResponsiveContainer width="100%" height={450}>
          <ComposedChart data={projecaoReceitas} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
            <YAxis yAxisId="left" stroke="#6B7280" tickFormatter={(value) => formatCompact(value)} />
            <YAxis yAxisId="right" orientation="right" stroke="#EF4444" tickFormatter={(value) => `${value.toFixed(0)}%`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
              formatter={(value: number, name: string) => {
                if (name === '% Atingido') return `${value.toFixed(1)}%`
                return formatCurrency(value)
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="Projeção" fill="#60A5FA" radius={[8, 8, 0, 0]} name="Projeção" />
            <Bar yAxisId="left" dataKey="Receitas Atuais" fill="#10B981" radius={[8, 8, 0, 0]} name="Receitas Atuais" />
            <Line yAxisId="right" type="monotone" dataKey="% Atingido" stroke="#EF4444" strokeWidth={3} dot={{ r: 5, fill: '#EF4444' }} name="% Atingido" />
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      {/* GRÁFICO 3: Evento por ROI */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">ROI por Evento</h3>
            <p className="text-sm text-gray-600">Return on Investment (Lucro / Receita × 100)</p>
          </div>
          <GroupBySelector />
        </div>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={roiData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
            <YAxis stroke="#6B7280" tickFormatter={(value) => `${value.toFixed(0)}%`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
              formatter={(value: number, name: string) => {
                if (name === 'ROI (%)') return `${value.toFixed(1)}%`
                return formatCurrency(value)
              }}
            />
            <Legend />
            <Bar dataKey="ROI (%)" fill="#8B5CF6" radius={[8, 8, 0, 0]} name="ROI (%)" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* GRÁFICO 4: Evento por Resultado Grupo Onda */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Resultado Grupo Onda</h3>
            <p className="text-sm text-gray-600">Resultado financeiro por evento para o Grupo Onda</p>
          </div>
          <GroupBySelector />
        </div>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={resultadoGrupoOndaData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
            <Bar dataKey="Resultado" fill="#8BC5E5" radius={[8, 8, 0, 0]} name="Resultado Grupo Onda" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* LISTA DINÂMICA: Meta Atingida por Evento */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-gray-900">Meta Atingida por Evento</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metasAtingidas.map((item, index) => {
            const status = getMetaStatus(item.metaAtingida)
            return (
              <div
                key={index}
                className={`rounded-xl border-2 p-4 transition hover:shadow-md ${
                  status.label === 'SIM' ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{item.evento}</p>
                    <p className="mt-1 text-xs text-gray-600">{item.cidade}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {status.icon}
                    <span className={`text-xs font-bold ${status.color}`}>{status.label}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
