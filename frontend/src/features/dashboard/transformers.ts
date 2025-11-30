import { formatCurrency, formatNumber, formatPercent } from '../../lib/formatters'
import { parseCurrency, parseDateLabel, parseNumber, parsePercent, pickValue } from '../../lib/parsers'
import type { DashboardModel, DashboardResponse, EventInsight, GenericRow } from '../../lib/types'

const EVENT_NAME_KEYS = ['Evento', 'evento', 'titulo', 'nome', 'label']
const CITY_KEYS = ['Cidade do Evento', 'Cidade', 'cidade', 'local']
const DATE_KEYS = ['Data', 'data', 'dia']
const STATUS_KEYS = ['Status das Atrações', 'status']
const HIGHLIGHT_KEYS = ['Destaques', 'destaques', 'observacoes']
const REVENUE_ACTUAL_KEYS = [
  'Receitas atuais - Valor Total',
  'Receitas atuais - Bilheteria',
  'Receitas atuais - Bar',
  ' Receitas atuais - Alimentação ',
  'Receitas atuais - Alimentação',
  'Receitas atuais - Patrocínios',
  'Receitas atuais - Loja',
  'Receitas atuais - Outros',
  'receita_atual',
  'valor_total',
  'valor',
]
const REVENUE_PROJECTION_KEYS = [
  'Projeção de Receitas - Valor Total',
  'Projeção de Receitas - Bilheteria',
  'Projeção de Receitas - Bar',
  ' Projeção de Receitas - Alimentação ',
  'Projeção de Receitas - Alimentação',
  'Projeção de Receitas - Patrocínios',
  'Projeção de Receitas - Loja',
  'Projeção de Receitas - Outros',
  'receita_prevista',
  'projecao',
]
const EXPENSE_KEYS = ['Despesa Total ', 'Despesa Total', 'Despesas atuais - Valor Total', 'despesa_total']
const PROFIT_KEYS = [' Lucro - Receitas atuais - Despesas atuais ', 'Lucro - Receitas atuais - Despesas atuais', 'lucro', 'resultado']
const ROI_KEYS = ['ROI - Lucro / Receita', ' ROI - MARKETING ', 'ROI - MARKETING', 'ROI', 'roi']
const TICKETS_VALIDATED_KEYS = ['Ingressos Validados', 'tickets_validados', 'ingressos_validados']
const TICKETS_ISSUED_KEYS = ['Ingressos Emitidos', 'tickets_emitidos', 'ingressos_emitidos']
const AUDIENCE_KEYS = ['Público Estimado', 'publico_estimado']
const LEADS_KEYS = ['Quantidade de leads captado', 'leads', 'captacao']
const AVG_TICKET_KEYS = ['Ticket Médio (Bilheteria e AEB)', 'ticket_medio']

const BAR_LABEL_KEYS = [
  'categoria',
  'Categoria',
  'produto',
  'Produto',
  'item',
  'Item',
  'descricao',
  'Descrição',
]
const VALUE_KEYS = ['valor_total', 'valor', 'total', 'receita', 'Receita', 'faturamento']
const CHANNEL_KEYS = ['canal', 'canal_venda', 'origem', 'Canal', 'plataforma', 'Segmento']
const QUANTITY_KEYS = ['quantidade', 'qtd', 'volume', 'tickets', 'Ingressos', 'ingressos']

const toTimestamp = (value?: string): number => {
  if (!value) return Date.now()
  const [day, month, year] = value.split(/[/-]/)
  if (!day || !month || !year) return Date.now()
  const isoYear = year.length === 2 ? `20${year}` : year
  const date = new Date(`${isoYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
  return Number.isNaN(date.getTime()) ? Date.now() : date.getTime()
}

const sum = (values: number[]) => values.reduce((acc, value) => acc + (Number.isFinite(value) ? value : 0), 0)

const getNumericFromRow = (row: GenericRow, keys: string[]) => parseCurrency(pickValue(row, keys))
const getNumberFromRow = (row: GenericRow, keys: string[]) => parseNumber(pickValue(row, keys))

const buildEventInsights = (rows: GenericRow[]): EventInsight[] =>
  rows.map((row, index) => {
    const eventName = (pickValue<string>(row, EVENT_NAME_KEYS) ?? 'Evento sem nome').trim()
    const city = pickValue<string>(row, CITY_KEYS) ?? 'Cidade indefinida'
    const dateRaw = pickValue<string>(row, DATE_KEYS) ?? ''
    const revenueActual = getNumericFromRow(row, REVENUE_ACTUAL_KEYS)
    const revenueProjection = getNumericFromRow(row, REVENUE_PROJECTION_KEYS)
    const expenseActual = getNumericFromRow(row, EXPENSE_KEYS)

    // Debug first event
    if (index === 0) {
      console.log('[Transformer] First event raw values:', {
        eventName,
        revenueActualRaw: pickValue(row, REVENUE_ACTUAL_KEYS),
        revenueActual,
        revenueProjectionRaw: pickValue(row, REVENUE_PROJECTION_KEYS),
        revenueProjection,
        expenseActualRaw: pickValue(row, EXPENSE_KEYS),
        expenseActual,
      })
    }
    const ticketsValidated = getNumberFromRow(row, TICKETS_VALIDATED_KEYS)
    const ticketsIssued = getNumberFromRow(row, TICKETS_ISSUED_KEYS)
    const audienceEstimated = getNumberFromRow(row, AUDIENCE_KEYS)
    const leadsCaptured = getNumberFromRow(row, LEADS_KEYS)
    const profitActualCandidate = getNumericFromRow(row, PROFIT_KEYS)
    const profitActual = profitActualCandidate || revenueActual - expenseActual
    const roi = parsePercent(pickValue(row, ROI_KEYS))
    const avgTicket = getNumericFromRow(row, AVG_TICKET_KEYS)

    return {
      id: `${eventName}-${index}`,
      eventName,
      city,
      dateLabel: parseDateLabel(dateRaw),
      dateValue: toTimestamp(dateRaw),
      revenueActual,
      revenueProjection,
      expenseActual,
      profitActual,
      roi,
      ticketsValidated,
      ticketsIssued,
      audienceEstimated,
      leadsCaptured,
      status: pickValue<string>(row, STATUS_KEYS),
      highlights: pickValue<string>(row, HIGHLIGHT_KEYS),
      avgTicket,
    }
  })

const aggregateByLabel = (rows: GenericRow[], labelKeys: string[], valueKeys: string[]) => {
  const map = new Map<string, number>()

  rows.forEach((row) => {
    const label = (pickValue<string>(row, labelKeys) ?? 'Outros').toString()
    const amount = getNumericFromRow(row, valueKeys)
    if (!amount) return
    map.set(label, (map.get(label) ?? 0) + amount)
  })

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

const aggregateChannels = (rows: GenericRow[]) => {
  const map = new Map<string, { value: number; quantity: number }>()

  rows.forEach((row) => {
    const label = (pickValue<string>(row, CHANNEL_KEYS) ?? 'Outros').toString()
    const value = getNumericFromRow(row, VALUE_KEYS)
    const quantity = getNumberFromRow(row, QUANTITY_KEYS)
    const current = map.get(label) ?? { value: 0, quantity: 0 }
    map.set(label, { value: current.value + value, quantity: current.quantity + quantity })
  })

  return Array.from(map.entries())
    .map(([label, data]) => ({ label, ...data }))
    .sort((a, b) => b.value - a.value)
}

export const buildDashboardModel = (payload?: DashboardResponse): DashboardModel | null => {
  if (!payload) return null

  // Debug logging
  console.log('[Dashboard Transformer] Received payload:', {
    bar: payload.bar,
    vendas: payload.vendas,
    sheetsCount: payload.sheets?.length,
  })

  const events = buildEventInsights(payload.sheets ?? []).filter(
    (event) => event.revenueActual || event.revenueProjection || event.expenseActual,
  )

  console.log('[Dashboard Transformer] Parsed events:', {
    eventsCount: events.length,
    firstEvent: events[0],
  })

  const totalRevenueActual = sum(events.map((event) => event.revenueActual))
  const projectedRevenueTotal = sum(events.map((event) => event.revenueProjection))
  const expenseActualTotal = sum(events.map((event) => event.expenseActual))
  const avgTicket = events.length ? sum(events.map((event) => event.avgTicket ?? 0)) / events.length : 0

  // Use stats from new API structure
  const barRevenue = payload.bar?.total_revenue ?? 0
  const vendasRevenue = payload.vendas?.total_revenue ?? 0
  const ticketsValidatedTotal = payload.vendas?.total_tickets ?? sum(events.map((event) => event.ticketsValidated))

  console.log('[Dashboard Transformer] Calculated totals:', {
    barRevenue,
    vendasRevenue,
    totalRevenueActual,
    totalCombined: totalRevenueActual + barRevenue + vendasRevenue,
  })

  const revenueTrend = [...events]
    .sort((a, b) => a.dateValue - b.dateValue)
    .map((event) => ({
      name: event.dateLabel,
      atual: Math.round(event.revenueActual),
      previsto: Math.round(event.revenueProjection),
    }))

  const cityBreakdown = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.city] = (acc[event.city] ?? 0) + event.revenueActual
    return acc
  }, {})

  const cityBreakdownArray = Object.entries(cityBreakdown)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  // Use aggregated bar stats
  const barPerformance = [{ label: 'Bar Total', value: barRevenue }]
  const ticketChannels = [{ label: 'Vendas Total', value: vendasRevenue, quantity: ticketsValidatedTotal }]

  const roiAverage = events.length ? sum(events.map((event) => event.roi)) / events.length : 0
  const revenueDeltaBase = projectedRevenueTotal || totalRevenueActual || 1
  const revenueDelta = ((totalRevenueActual - projectedRevenueTotal) / revenueDeltaBase) * 100

  const summary = {
    totalRevenue: totalRevenueActual + barRevenue + vendasRevenue,
    projectedRevenue: projectedRevenueTotal,
    expenseActual: expenseActualTotal,
    averageRoi: roiAverage,
    ticketsValidated: ticketsValidatedTotal,
    avgTicket: payload.vendas?.avg_ticket_price ?? avgTicket,
    revenueDelta,
  }

  const topEvent = events.reduce((acc, event) => (event.roi > (acc?.roi ?? -Infinity) ? event : acc), events[0])
  const topCity = cityBreakdownArray[0]
  const topChannel = ticketChannels[0]

  const highlights = [
    topEvent && {
      title: 'Melhor ROI',
      description: topEvent.eventName,
      value: formatPercent(topEvent.roi),
    },
    topCity && {
      title: 'Cidade em alta',
      description: topCity.name,
      value: formatCurrency(topCity.value),
    },
    topChannel && {
      title: 'Canal mais quente',
      description: topChannel.label,
      value: `${formatCurrency(topChannel.value)} · ${formatNumber(topChannel.quantity)} tks`,
    },
  ].filter(Boolean) as DashboardModel['highlights']

  return {
    summary,
    events,
    revenueTrend,
    cityBreakdown: cityBreakdownArray,
    barPerformance,
    ticketPerformance: {
      totalValue: vendasRevenue,
      totalQuantity: ticketsValidatedTotal,
    channels: ticketChannels.map((channel) => ({
      label: channel.label,
      value: channel.value,
      quantity: channel.quantity,
    })),
    },
    highlights,
  }
}

