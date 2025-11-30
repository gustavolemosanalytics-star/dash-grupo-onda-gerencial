import type { GenericRow } from './types'

const DECIMAL_REGEX = /[0-9]/g

export const parseCurrency = (value: unknown): number => {
  if (value == null) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    // Remove tudo exceto dígitos, vírgula e sinal negativo
    // Formato brasileiro: R$ 2.956.642,62 -> 2956642.62
    const cleaned = value
      .trim()
      .replace(/[^\d,.-]/g, '') // Remove tudo exceto números, vírgula, ponto e sinal
      .replace(/\./g, '')        // Remove pontos (separador de milhar no BR)
      .replace(',', '.')         // Troca vírgula por ponto (decimal)

    const parsed = Number(cleaned)

    // Debug first call
    if (value.includes('2.956.642')) {
      console.log('[parseCurrency] Debug:', { value, cleaned, parsed })
    }

    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export const parseNumber = (value: unknown): number => {
  if (value == null) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed.match(DECIMAL_REGEX)) return 0
    const normalized = trimmed.replace(/[^\d,-.]/g, '').replace(',', '.')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export const parsePercent = (value: unknown): number => {
  if (value == null) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const cleaned = value.replace('%', '')
    const parsed = parseNumber(cleaned)
    return parsed
  }
  return 0
}

export const pickValue = <T = unknown>(row: GenericRow, keys: string[]): T | undefined => {
  // First, try exact match
  for (const key of keys) {
    const candidate = row?.[key]
    if (candidate !== undefined && candidate !== null && candidate !== '') {
      return candidate as T
    }
  }

  // If no exact match, try fuzzy match (trim spaces)
  const normalizedKeys = keys.map(k => k.trim())
  for (const rowKey of Object.keys(row)) {
    const normalizedRowKey = rowKey.trim()
    if (normalizedKeys.includes(normalizedRowKey)) {
      const candidate = row[rowKey]
      if (candidate !== undefined && candidate !== null && candidate !== '') {
        return candidate as T
      }
    }
  }

  return undefined
}

export const parseDateLabel = (value?: string): string => {
  if (!value) return 'Sem data'

  const [day, month, year] = value.split(/[/-]/)
  if (!day || !month || !year) return value

  const iso = `${year.length === 2 ? `20${year}` : year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

