const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
})

const compactFormatter = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export const formatCurrency = (value: number) => currencyFormatter.format(value || 0)
export const formatPercent = (value: number) => percentFormatter.format((value || 0) / 100)
export const formatNumber = (value: number) => numberFormatter.format(value || 0)
export const formatCompact = (value: number) => compactFormatter.format(value || 0)

export const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return '-'
  try {
    const date = typeof value === 'string' ? new Date(value) : value
    if (isNaN(date.getTime())) return '-'

    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  } catch {
    return '-'
  }
}

export const formatDateTime = (value: string | Date | null | undefined): string => {
  if (!value) return '-'
  try {
    const date = typeof value === 'string' ? new Date(value) : value
    if (isNaN(date.getTime())) return '-'

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return '-'
  }
}

