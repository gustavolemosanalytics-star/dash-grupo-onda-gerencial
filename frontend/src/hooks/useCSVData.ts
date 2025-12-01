/**
 * Hook para gerenciar dados CSV com cache IndexedDB
 * Substituirá React Query para dados grandes
 */

import { useState, useEffect, useCallback } from 'react'
import { dbCache, STORES } from '../lib/indexedDBCache'
import { getApiUrl } from '../lib/api'

type DataType = 'bar' | 'vendas'

interface UseCSVDataOptions {
  dataType: DataType
  cacheMaxAge?: number // em minutos, padrão: 60
}

interface UseCSVDataReturn<T> {
  data: T[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  progress: number
  refetch: () => Promise<void>
  clearCache: () => Promise<void>
}

const ENDPOINTS = {
  bar: {
    csv: getApiUrl('api/csv/bar-zig'),
    metadata: getApiUrl('api/csv/bar-zig/metadata'),
    store: STORES.BAR_ZIG,
    cacheKey: 'bar_zig_metadata',
  },
  vendas: {
    csv: getApiUrl('api/csv/vendas-ingresso'),
    metadata: getApiUrl('api/csv/vendas-ingresso/metadata'),
    store: STORES.VENDAS_INGRESSO,
    cacheKey: 'vendas_ingresso_metadata',
  },
}

export function useCSVData<T = any>(
  options: UseCSVDataOptions
): UseCSVDataReturn<T> {
  const { dataType, cacheMaxAge = 60 } = options
  const config = ENDPOINTS[dataType]

  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [progress, setProgress] = useState(0)

  const shouldRefetch = useCallback(async (): Promise<boolean> => {
    try {
      // Verificar metadados do cache
      const cachedMetadata = await dbCache.getMetadata(config.cacheKey)

      if (!cachedMetadata) {
        console.log(`[useCSVData] Sem cache para ${dataType}`)
        return true
      }

      const cacheAge = Date.now() - cachedMetadata.timestamp
      const maxAgeMs = cacheMaxAge * 60 * 1000

      if (cacheAge > maxAgeMs) {
        console.log(`[useCSVData] Cache expirado para ${dataType} (${Math.round(cacheAge / 60000)} min)`)
        return true
      }

      // Verificar se dados mudaram no servidor
      const response = await fetch(config.metadata)
      if (!response.ok) return true

      const serverMetadata = await response.json()

      if (serverMetadata.total_rows !== cachedMetadata.totalRows) {
        console.log(`[useCSVData] Dados mudaram no servidor para ${dataType}`)
        return true
      }

      console.log(`[useCSVData] Cache válido para ${dataType}`)
      return false
    } catch (err) {
      console.error(`[useCSVData] Erro ao verificar cache:`, err)
      return true
    }
  }, [dataType, config, cacheMaxAge])

  const fetchAndParseCSV = useCallback(async (): Promise<T[]> => {
    console.time(`[useCSVData] Fetch total - ${dataType}`)
    setProgress(10)

    // Baixar CSV
    console.time(`[useCSVData] Download CSV - ${dataType}`)
    const response = await fetch(config.csv)

    if (!response.ok) {
      throw new Error(`Falha ao baixar CSV: ${response.statusText}`)
    }

    const csvText = await response.text()
    console.timeEnd(`[useCSVData] Download CSV - ${dataType}`)
    setProgress(30)

    // Processar CSV com Web Worker
    console.time(`[useCSVData] Parse CSV - ${dataType}`)

    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('../lib/csvParser.worker.ts', import.meta.url),
        { type: 'module' }
      )

      worker.onmessage = (e) => {
        const message = e.data

        if (message.type === 'progress') {
          setProgress(30 + (message.progress * 0.6)) // 30% a 90%
        } else if (message.type === 'result') {
          console.timeEnd(`[useCSVData] Parse CSV - ${dataType}`)
          console.log(`[useCSVData] Parsed ${message.totalRows} rows`)
          setProgress(100)
          worker.terminate()
          resolve(message.data)
        } else if (message.type === 'error') {
          console.error(`[useCSVData] Worker error:`, message.error)
          worker.terminate()
          reject(new Error(message.error))
        }
      }

      worker.onerror = (err) => {
        console.error(`[useCSVData] Worker error:`, err)
        worker.terminate()
        reject(err)
      }

      worker.postMessage({ type: 'parse', csvText, dataType })
    })
  }, [dataType, config.csv])

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setIsError(false)
      setError(null)
      setProgress(0)

      // Verificar se precisa atualizar
      const needsRefetch = await shouldRefetch()

      if (!needsRefetch) {
        // Carregar do cache
        console.log(`[useCSVData] Carregando do cache - ${dataType}`)
        const cachedData = await dbCache.getData(config.store)
        setData(cachedData as T[])
        setProgress(100)
        setIsLoading(false)
        return
      }

      // Buscar e processar CSV
      const parsedData = await fetchAndParseCSV()

      // Salvar no cache
      console.time(`[useCSVData] Save to IndexedDB - ${dataType}`)
      await dbCache.saveData(config.store, parsedData)

      // Salvar metadados
      const response = await fetch(config.metadata)
      const metadata = await response.json()

      await dbCache.saveMetadata(config.cacheKey, {
        timestamp: Date.now(),
        totalRows: parsedData.length,
        lastUpdate: metadata.last_transaction || metadata.last_sale || new Date().toISOString(),
      })

      console.timeEnd(`[useCSVData] Save to IndexedDB - ${dataType}`)
      console.timeEnd(`[useCSVData] Fetch total - ${dataType}`)

      setData(parsedData as T[])
      setIsLoading(false)
    } catch (err) {
      console.error(`[useCSVData] Erro ao carregar dados:`, err)
      setIsError(true)
      setError(err instanceof Error ? err : new Error('Erro desconhecido'))
      setIsLoading(false)
    }
  }, [dataType, config, shouldRefetch, fetchAndParseCSV])

  const clearCache = useCallback(async () => {
    await dbCache.clearStore(config.store)
    await dbCache.saveMetadata(config.cacheKey, {
      timestamp: 0,
      totalRows: 0,
      lastUpdate: '',
    })
    console.log(`[useCSVData] Cache limpo para ${dataType}`)
  }, [dataType, config])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    data,
    isLoading,
    isError,
    error,
    progress,
    refetch: loadData,
    clearCache,
  }
}
