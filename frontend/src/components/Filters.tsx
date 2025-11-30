/**
 * Filters Component
 *
 * Global filters for Date, Event, and Base
 */

import { Calendar, Filter } from 'lucide-react'
import { useState } from 'react'

export interface FilterValues {
  dateRange: {
    start: string
    end: string
  }
  eventos: string[]
  bases: string[]
}

interface FiltersProps {
  onFilterChange: (filters: FilterValues) => void
  availableEventos?: string[]
  availableBases?: string[]
}

export function Filters({ onFilterChange, availableEventos = [], availableBases = [] }: FiltersProps) {
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [selectedEventos, setSelectedEventos] = useState<string[]>([])
  const [selectedBases, setSelectedBases] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const handleApplyFilters = () => {
    onFilterChange({
      dateRange: { start: dateStart, end: dateEnd },
      eventos: selectedEventos,
      bases: selectedBases,
    })
  }

  const handleClearFilters = () => {
    setDateStart('')
    setDateEnd('')
    setSelectedEventos([])
    setSelectedBases([])
    onFilterChange({
      dateRange: { start: '', end: '' },
      eventos: [],
      bases: [],
    })
  }

  const toggleEvento = (evento: string) => {
    setSelectedEventos((prev) =>
      prev.includes(evento) ? prev.filter((e) => e !== evento) : [...prev, evento]
    )
  }

  const toggleBase = (base: string) => {
    setSelectedBases((prev) =>
      prev.includes(base) ? prev.filter((b) => b !== base) : [...prev, base]
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <Filter size={16} />
          Filtros
          {(selectedEventos.length > 0 || selectedBases.length > 0 || dateStart || dateEnd) && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-onda-yellow text-xs font-bold text-black">
              {selectedEventos.length + selectedBases.length + (dateStart ? 1 : 0)}
            </span>
          )}
        </button>

        {(selectedEventos.length > 0 || selectedBases.length > 0 || dateStart || dateEnd) && (
          <button
            onClick={handleClearFilters}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {showFilters && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Data Range */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Calendar size={16} />
                Período
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-onda-yellow focus:outline-none focus:ring-2 focus:ring-onda-yellow/20"
                  placeholder="Data inicial"
                />
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-onda-yellow focus:outline-none focus:ring-2 focus:ring-onda-yellow/20"
                  placeholder="Data final"
                />
              </div>
            </div>

            {/* Eventos */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Eventos ({selectedEventos.length} selecionados)
              </label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-3">
                {availableEventos.length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhum evento disponível</p>
                ) : (
                  availableEventos.map((evento) => (
                    <label key={evento} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedEventos.includes(evento)}
                        onChange={() => toggleEvento(evento)}
                        className="h-4 w-4 rounded border-gray-300 text-onda-yellow focus:ring-onda-yellow"
                      />
                      <span className="text-gray-700">{evento}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Bases */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Bases ({selectedBases.length} selecionadas)
              </label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-3">
                {availableBases.length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhuma base disponível</p>
                ) : (
                  availableBases.map((base) => (
                    <label key={base} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedBases.includes(base)}
                        onChange={() => toggleBase(base)}
                        className="h-4 w-4 rounded border-gray-300 text-onda-yellow focus:ring-onda-yellow"
                      />
                      <span className="text-gray-700">{base}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleApplyFilters}
              className="rounded-full bg-onda-yellow px-6 py-2 text-sm font-bold text-black shadow-sm transition hover:bg-onda-yellow/90"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
