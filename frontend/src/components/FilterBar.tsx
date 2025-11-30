import { X, Filter } from 'lucide-react'

interface FilterOption {
  value: string
  label: string
}

interface FilterBarProps {
  filters: {
    name: string
    label: string
    value: string
    options: FilterOption[]
    onChange: (value: string) => void
  }[]
  onClearAll: () => void
  hasActiveFilters: boolean
}

export function FilterBar({ filters, onClearAll, hasActiveFilters }: FilterBarProps) {
  const activeFilters = filters.filter(f => f.value !== '')

  return (
    <div className="space-y-4">
      {/* Filtros principais */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Filtros</h3>
          </div>
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
            >
              <X size={14} />
              Limpar Todos
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {filters.map((filter) => (
            <div key={filter.name}>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {filter.label}
              </label>
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Todos</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Badges de filtros ativos */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <span className="text-xs font-semibold text-blue-900">Filtros Ativos:</span>
          {activeFilters.map((filter) => (
            <button
              key={filter.name}
              onClick={() => filter.onChange('')}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
            >
              <span className="font-semibold">{filter.label}:</span>
              <span>{filter.value}</span>
              <X size={14} className="ml-0.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
