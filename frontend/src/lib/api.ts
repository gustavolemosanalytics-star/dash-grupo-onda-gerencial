import type { DashboardResponse } from './types'

// Use VITE_API_URL em produção, caso contrário usa URLs relativas (dev com proxy)
const API_BASE = import.meta.env.VITE_API_URL || ''

// Helper para construir URLs da API
export const getApiUrl = (path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return API_BASE ? `${API_BASE}/${cleanPath}` : `/${cleanPath}`
}

const BASE_URL = getApiUrl('api/dashboard')

export const fetchDashboard = async (): Promise<DashboardResponse> => {
  const response = await fetch(BASE_URL)

  if (!response.ok) {
    throw new Error('Não foi possível carregar os dados do dashboard.')
  }

  return response.json()
}
