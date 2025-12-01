/**
 * Visão Geral - Main Page with Tabs
 *
 * Contains 3 subpages:
 * - Resultados
 * - Desempenho Financeiro
 * - Participação e Engajamento
 */

import { useState, useMemo, lazy, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Filters } from '../../components/Filters'
import type { FilterValues } from '../../components/Filters'
import { WaveLoader } from '../../components/WaveLoader'
import { getApiUrl } from '../../lib/api'

// Lazy load das abas para melhor performance
const Resultados = lazy(() => import('./ResultadosNew').then(m => ({ default: m.ResultadosNew })))
const DesempenhoFinanceiro = lazy(() => import('./DesempenhoFinanceiro').then(m => ({ default: m.DesempenhoFinanceiro })))
const ParticipacaoEngajamento = lazy(() => import('./ParticipacaoEngajamento').then(m => ({ default: m.ParticipacaoEngajamento })))

interface BaseGeralRow {
  'Evento'?: string
  'Base'?: string
  'Data'?: string
  [key: string]: unknown
}

const fetchBaseGeral = async (): Promise<BaseGeralRow[]> => {
  console.time('[Visão Geral] Fetch total')
  console.time('[Visão Geral] Network request')

  const response = await fetch(getApiUrl('api/planejamento/'))
  console.timeEnd('[Visão Geral] Network request')

  if (!response.ok) throw new Error('Falha ao carregar dados')

  console.time('[Visão Geral] JSON parse')
  const data = await response.json()
  console.timeEnd('[Visão Geral] JSON parse')

  console.log(`[Visão Geral] Received ${data?.length || 0} rows`)
  console.timeEnd('[Visão Geral] Fetch total')

  return data || []
}

type TabType = 'resultados' | 'desempenho' | 'participacao'

export function VisaoGeralPage() {
  const [activeTab, setActiveTab] = useState<TabType>('resultados')
  const [filters, setFilters] = useState<FilterValues>({
    dateRange: { start: '', end: '' },
    eventos: [],
    bases: [],
  })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['baseGeral'],
    queryFn: fetchBaseGeral,
    staleTime: 1000 * 60 * 30, // 30 minutos - dados considerados "frescos"
    gcTime: 1000 * 60 * 60, // 1 hora - manter em cache
  })

  // Extract unique eventos and bases for filters
  const { availableEventos, availableBases } = useMemo(() => {
    if (!data) return { availableEventos: [], availableBases: [] }

    console.time('[Visão Geral] Extract filters')
    const eventos = new Set<string>()
    const bases = new Set<string>()

    data.forEach((row) => {
      if (row['Evento']) eventos.add(String(row['Evento']))
      if (row['Base']) bases.add(String(row['Base']))
    })

    const result = {
      availableEventos: Array.from(eventos).sort(),
      availableBases: Array.from(bases).sort(),
    }
    console.timeEnd('[Visão Geral] Extract filters')
    console.log(`[Visão Geral] ${result.availableEventos.length} eventos, ${result.availableBases.length} bases`)

    return result
  }, [data])

  // Apply filters to data
  const filteredData = useMemo(() => {
    if (!data) return []

    console.time('[Visão Geral] Filter data')
    const result = data.filter((row) => {
      // Filter by date range
      if (filters.dateRange.start && row['Data']) {
        const rowDate = new Date(String(row['Data']))
        const startDate = new Date(filters.dateRange.start)
        if (rowDate < startDate) return false
      }

      if (filters.dateRange.end && row['Data']) {
        const rowDate = new Date(String(row['Data']))
        const endDate = new Date(filters.dateRange.end)
        if (rowDate > endDate) return false
      }

      // Filter by eventos
      if (filters.eventos.length > 0 && row['Evento']) {
        if (!filters.eventos.includes(String(row['Evento']))) return false
      }

      // Filter by bases
      if (filters.bases.length > 0 && row['Base']) {
        if (!filters.bases.includes(String(row['Base']))) return false
      }

      return true
    })
    console.timeEnd('[Visão Geral] Filter data')
    console.log(`[Visão Geral] Filtered ${data.length} → ${result.length} rows`)

    return result
  }, [data, filters])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <WaveLoader />
          <p className="mt-6 text-sm font-medium text-gray-600">Carregando dados...</p>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-900">Não foi possível carregar os dados</p>
          <p className="mt-2 text-gray-600">Tente novamente em instantes ou verifique sua conexão.</p>
          <button
            onClick={() => refetch()}
            className="mt-6 rounded-full bg-onda-yellow px-6 py-2 text-sm font-bold text-black shadow-sm transition hover:bg-onda-yellow/90"
          >
            Recarregar
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'resultados' as const, label: 'Resultados' },
    { id: 'desempenho' as const, label: 'Desempenho Financeiro' },
    { id: 'participacao' as const, label: 'Participação e Engajamento' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Planejamento</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Visão Geral</h1>
        </header>

        {/* Filters */}
        <Filters
          onFilterChange={setFilters}
          availableEventos={availableEventos}
          availableBases={availableBases}
        />

        {/* Tabs */}
        <div className="overflow-x-auto">
          <div className="flex gap-2 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap border-b-2 px-6 py-3 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'border-onda-yellow text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="py-4">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <WaveLoader />
              </div>
            }
          >
            {activeTab === 'resultados' && <Resultados data={filteredData} />}
            {activeTab === 'desempenho' && <DesempenhoFinanceiro data={filteredData} />}
            {activeTab === 'participacao' && <ParticipacaoEngajamento data={filteredData} />}
          </Suspense>
        </div>
      </div>
    </div>
  )
}
