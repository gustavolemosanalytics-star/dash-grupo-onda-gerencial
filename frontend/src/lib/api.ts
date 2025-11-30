import type { DashboardResponse } from './types'

const BASE_URL = '/api/dashboard'

export const fetchDashboard = async (): Promise<DashboardResponse> => {
  const response = await fetch(BASE_URL)

  if (!response.ok) {
    throw new Error('Não foi possível carregar os dados do dashboard.')
  }

  return response.json()
}

