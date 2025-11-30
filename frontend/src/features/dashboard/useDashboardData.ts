import { useQuery } from '@tanstack/react-query'
import { fetchDashboard } from '../../lib/api'
import { buildDashboardModel } from './transformers'

export const useDashboardData = () => {
  const query = useQuery({
    queryKey: ['dashboard-data'],
    queryFn: fetchDashboard,
  })

  const model = buildDashboardModel(query.data)

  return {
    ...query,
    model,
  }
}

