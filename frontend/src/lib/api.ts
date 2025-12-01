import type { DashboardResponse } from './types'

// Use VITE_API_URL em produção, caso contrário usa URLs relativas (dev com proxy)
const API_BASE = import.meta.env.VITE_API_URL || ''
const BASE_URL = `${API_BASE}/api/dashboard`

export const fetchDashboard = async (): Promise<DashboardResponse> => {
  const response = await fetch(BASE_URL)

  if (!response.ok) {
    throw new Error('Não foi possível carregar os dados do dashboard.')
  }

  return response.json()
}
