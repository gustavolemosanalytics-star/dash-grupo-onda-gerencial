export type GenericRow = Record<string, unknown>

export interface BarStats {
  total_transactions: number
  total_revenue: number
  unique_products: number
  unique_events: number
}

export interface VendasStats {
  total_transactions: number
  total_tickets: number
  total_revenue: number
  avg_ticket_price: number
  total_gross: number
  total_discount: number
}

export interface DashboardResponse {
  bar: BarStats
  vendas: VendasStats
  sheets: GenericRow[]
}

export interface EventInsight {
  id: string
  eventName: string
  city: string
  dateLabel: string
  dateValue: number
  revenueActual: number
  revenueProjection: number
  expenseActual: number
  profitActual: number
  roi: number
  ticketsValidated: number
  ticketsIssued: number
  audienceEstimated: number
  leadsCaptured: number
  avgTicket?: number
  status?: string
  highlights?: string
}

export interface DashboardModel {
  summary: {
    totalRevenue: number
    projectedRevenue: number
    expenseActual: number
    averageRoi: number
    ticketsValidated: number
    avgTicket: number
    revenueDelta: number
  }
  events: EventInsight[]
  revenueTrend: Array<{ name: string; atual: number; previsto: number }>
  cityBreakdown: Array<{ name: string; value: number }>
  barPerformance: Array<{ label: string; value: number }>
  ticketPerformance: {
    totalValue: number
    totalQuantity: number
    channels: Array<{ label: string; value: number; quantity: number }>
  }
  highlights: Array<{ title: string; description: string; value: string }>
}

