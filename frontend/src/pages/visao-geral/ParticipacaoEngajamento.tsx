/**
 * Participação e Engajamento Subpage
 *
 * Displays:
 * - Público Estimado
 * - Ingressos Validados
 * - Público Estimado vs Validados (chart with %)
 * - No Show por Evento
 * - Cortesias Emitidas por Evento
 * - Ingressos Permuta por Evento
 * - Prestadores de Serviço por Evento
 */

import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MetricCard } from '../../features/dashboard/components/MetricCard'
import { formatCompact } from '../../lib/formatters'
import { parseNumber } from '../../lib/parsers'

interface BaseGeralRow {
  [key: string]: unknown
}

interface ParticipacaoEngajamentoProps {
  data: BaseGeralRow[]
}

type ViewMode = 'evento' | 'base'

export function ParticipacaoEngajamento({ data }: ParticipacaoEngajamentoProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('evento')

  // Calculate main indicators
  const indicators = useMemo(() => {
    const publicoEstimado = data.reduce((sum, row) => sum + parseNumber(row['Público Estimado']), 0)
    const ingressosValidados = data.reduce((sum, row) => sum + parseNumber(row['Ingressos Validados']), 0)
    const percentualValidados = publicoEstimado > 0 ? (ingressosValidados / publicoEstimado) * 100 : 0

    return { publicoEstimado, ingressosValidados, percentualValidados }
  }, [data])

  // Público Estimado vs Validados
  const publicoData = useMemo(() => {
    const map = new Map<string, { estimado: number; validados: number }>()

    data.forEach((row) => {
      let key = ''
      if (viewMode === 'evento') {
        const evento = String(row['Evento'] || '')
        const cidade = String(row['Cidade do Evento'] || '')
        key = evento && cidade ? `${evento} - ${cidade}` : evento || cidade
      } else {
        key = String(row['Base'] || '')
      }
      if (!key) return

      const estimado = parseNumber(row['Público Estimado'])
      const validados = parseNumber(row['Ingressos Validados'])

      if (map.has(key)) {
        const current = map.get(key)!
        map.set(key, {
          estimado: current.estimado + estimado,
          validados: current.validados + validados,
        })
      } else {
        map.set(key, { estimado, validados })
      }
    })

    return Array.from(map.entries())
      .map(([name, values]) => {
        const percentage = values.estimado > 0 ? ((values.validados / values.estimado) * 100).toFixed(1) : '0'
        return {
          name,
          'Estimado': values.estimado,
          'Validados': values.validados,
          percentage: `${percentage}%`,
        }
      })
      .slice(0, 10)
  }, [data, viewMode])

  // No Show
  const noShowData = useMemo(() => {
    const map = new Map<string, number>()

    data.forEach((row) => {
      let key = ''
      if (viewMode === 'evento') {
        const evento = String(row['Evento'] || '')
        const cidade = String(row['Cidade do Evento'] || '')
        key = evento && cidade ? `${evento} - ${cidade}` : evento || cidade
      } else {
        key = String(row['Base'] || '')
      }
      if (!key) return

      const noShow = parseNumber(row['No Show'])
      map.set(key, (map.get(key) || 0) + noShow)
    })

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, 'No Show': value }))
      .sort((a, b) => b['No Show'] - a['No Show'])
      .slice(0, 10)
  }, [data, viewMode])

  // Cortesias
  const cortesiasData = useMemo(() => {
    const map = new Map<string, number>()

    data.forEach((row) => {
      let key = ''
      if (viewMode === 'evento') {
        const evento = String(row['Evento'] || '')
        const cidade = String(row['Cidade do Evento'] || '')
        key = evento && cidade ? `${evento} - ${cidade}` : evento || cidade
      } else {
        key = String(row['Base'] || '')
      }
      if (!key) return

      const cortesias = parseNumber(row['Cortesias Emitidas'])
      map.set(key, (map.get(key) || 0) + cortesias)
    })

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, 'Cortesias': value }))
      .sort((a, b) => b.Cortesias - a.Cortesias)
      .slice(0, 10)
  }, [data, viewMode])

  // Permuta
  const permutaData = useMemo(() => {
    const map = new Map<string, number>()

    data.forEach((row) => {
      let key = ''
      if (viewMode === 'evento') {
        const evento = String(row['Evento'] || '')
        const cidade = String(row['Cidade do Evento'] || '')
        key = evento && cidade ? `${evento} - ${cidade}` : evento || cidade
      } else {
        key = String(row['Base'] || '')
      }
      if (!key) return

      const permuta = parseNumber(row['Ingressos Permuta'])
      map.set(key, (map.get(key) || 0) + permuta)
    })

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, 'Permuta': value }))
      .sort((a, b) => b.Permuta - a.Permuta)
      .slice(0, 10)
  }, [data, viewMode])

  // Prestadores
  const prestadoresData = useMemo(() => {
    const map = new Map<string, number>()

    data.forEach((row) => {
      let key = ''
      if (viewMode === 'evento') {
        const evento = String(row['Evento'] || '')
        const cidade = String(row['Cidade do Evento'] || '')
        key = evento && cidade ? `${evento} - ${cidade}` : evento || cidade
      } else {
        key = String(row['Base'] || '')
      }
      if (!key) return

      const prestadores = parseNumber(row['Prestadores de serviço'])
      map.set(key, (map.get(key) || 0) + prestadores)
    })

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, 'Prestadores': value }))
      .sort((a, b) => b.Prestadores - a.Prestadores)
      .slice(0, 10)
  }, [data, viewMode])

  const ViewModeToggle = () => (
    <div className="flex rounded-lg border border-gray-300">
      <button
        onClick={() => setViewMode('evento')}
        className={`px-3 py-1.5 text-sm font-medium transition ${
          viewMode === 'evento'
            ? 'bg-onda-blue text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        Por Evento
      </button>
      <button
        onClick={() => setViewMode('base')}
        className={`px-3 py-1.5 text-sm font-medium transition ${
          viewMode === 'base'
            ? 'bg-onda-blue text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        Por Base
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Indicadores */}
      <section className="grid gap-5 md:grid-cols-2">
        <MetricCard
          title="Público Estimado"
          value={indicators.publicoEstimado.toLocaleString('pt-BR')}
          accentColor="blue"
          helper="Total estimado para todos os eventos"
        />
        <MetricCard
          title="Ingressos Validados"
          value={`${indicators.ingressosValidados.toLocaleString('pt-BR')} (${indicators.percentualValidados.toFixed(1)}%)`}
          accentColor="yellow"
          helper="Percentual em relação ao estimado"
        />
      </section>

      {/* Público Estimado vs Validados */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-gray-900">Público Estimado vs Validados</h3>
          <ViewModeToggle />
        </div>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={publicoData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              stroke="#6B7280"
              height={120}
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
              formatter={(value: number, name: string, props: any) => {
                if (name === 'Estimado' || name === 'Validados') {
                  return [value.toLocaleString('pt-BR'), name]
                }
                return [value, name]
              }}
            />
            <Legend />
            <Bar dataKey="Estimado" fill="#8BC5E5" radius={[8, 8, 0, 0]} />
            <Bar dataKey="Validados" fill="#10B981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* No Show */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-gray-900">No Show por {viewMode === 'evento' ? 'Evento' : 'Base'}</h3>
          <ViewModeToggle />
        </div>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={noShowData} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" stroke="#6B7280" tickFormatter={(value) => formatCompact(value)} />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#6B7280"
              width={180}
              tick={(props) => {
                const { x, y, payload } = props
                const parts = String(payload.value).split(' - ')
                const evento = parts[0] || ''
                const cidade = parts[1] || ''

                return (
                  <g transform={`translate(${x},${y})`}>
                    <text x={-5} y={-5} textAnchor="end" fill="#6B7280" fontSize="10px">
                      {evento}
                    </text>
                    {cidade && (
                      <text x={-5} y={7} textAnchor="end" fill="#9CA3AF" fontSize="9px">
                        {cidade}
                      </text>
                    )}
                  </g>
                )
              }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
              formatter={(value: number) => value.toLocaleString('pt-BR')}
            />
            <Bar dataKey="No Show" fill="#F9501E" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Cortesias e Permuta */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cortesias */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-lg font-bold text-gray-900">Cortesias Emitidas</h3>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={cortesiasData} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" stroke="#6B7280" tickFormatter={(value) => formatCompact(value)} />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#6B7280"
                width={150}
                tick={(props) => {
                  const { x, y, payload } = props
                  const parts = String(payload.value).split(' - ')
                  const evento = parts[0] || ''
                  const cidade = parts[1] || ''

                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={-5} y={-5} textAnchor="end" fill="#6B7280" fontSize="10px">
                        {evento}
                      </text>
                      {cidade && (
                        <text x={-5} y={7} textAnchor="end" fill="#9CA3AF" fontSize="9px">
                          {cidade}
                        </text>
                      )}
                    </g>
                  )
                }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                formatter={(value: number) => value.toLocaleString('pt-BR')}
              />
              <Bar dataKey="Cortesias" fill="#FBC33D" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Permuta */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-lg font-bold text-gray-900">Ingressos Permuta</h3>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={permutaData} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" stroke="#6B7280" tickFormatter={(value) => formatCompact(value)} />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#6B7280"
                width={150}
                tick={(props) => {
                  const { x, y, payload } = props
                  const parts = String(payload.value).split(' - ')
                  const evento = parts[0] || ''
                  const cidade = parts[1] || ''

                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={-5} y={-5} textAnchor="end" fill="#6B7280" fontSize="10px">
                        {evento}
                      </text>
                      {cidade && (
                        <text x={-5} y={7} textAnchor="end" fill="#9CA3AF" fontSize="9px">
                          {cidade}
                        </text>
                      )}
                    </g>
                  )
                }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                formatter={(value: number) => value.toLocaleString('pt-BR')}
              />
              <Bar dataKey="Permuta" fill="#8BC5E5" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      {/* Prestadores */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-lg font-bold text-gray-900">Prestadores de Serviço</h3>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={prestadoresData} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" stroke="#6B7280" tickFormatter={(value) => formatCompact(value)} />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#6B7280"
              width={180}
              tick={(props) => {
                const { x, y, payload } = props
                const parts = String(payload.value).split(' - ')
                const evento = parts[0] || ''
                const cidade = parts[1] || ''

                return (
                  <g transform={`translate(${x},${y})`}>
                    <text x={-5} y={-5} textAnchor="end" fill="#6B7280" fontSize="10px">
                      {evento}
                    </text>
                    {cidade && (
                      <text x={-5} y={7} textAnchor="end" fill="#9CA3AF" fontSize="9px">
                        {cidade}
                      </text>
                    )}
                  </g>
                )
              }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
              formatter={(value: number) => value.toLocaleString('pt-BR')}
            />
            <Bar dataKey="Prestadores" fill="#10B981" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  )
}
