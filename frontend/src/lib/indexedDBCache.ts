/**
 * Gerenciador de cache usando IndexedDB
 * Armazena dados CSV processados localmente
 */

const DB_NAME = 'DashboardCache'
const DB_VERSION = 1
const STORES = {
  BAR_ZIG: 'bar_zig',
  VENDAS_INGRESSO: 'vendas_ingresso',
  METADATA: 'metadata',
}

export interface CacheMetadata {
  key: string
  timestamp: number
  totalRows: number
  lastUpdate: string
}

class IndexedDBCache {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Store para dados do bar
        if (!db.objectStoreNames.contains(STORES.BAR_ZIG)) {
          db.createObjectStore(STORES.BAR_ZIG, { keyPath: 'id' })
        }

        // Store para vendas de ingresso
        if (!db.objectStoreNames.contains(STORES.VENDAS_INGRESSO)) {
          db.createObjectStore(STORES.VENDAS_INGRESSO, { keyPath: 'id' })
        }

        // Store para metadados
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' })
        }
      }
    })
  }

  async saveData(storeName: string, data: any[]): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)

      // Limpar dados antigos
      store.clear()

      // Inserir novos dados em batches
      const batchSize = 100
      let index = 0

      const insertBatch = () => {
        const batch = data.slice(index, index + batchSize)
        if (batch.length === 0) {
          resolve()
          return
        }

        batch.forEach((item) => {
          store.add(item)
        })

        index += batchSize
        setTimeout(insertBatch, 0) // Permitir que a UI respire
      }

      transaction.onerror = () => reject(transaction.error)
      insertBatch()
    })
  }

  async getData(storeName: string): Promise<any[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  async saveMetadata(key: string, metadata: Omit<CacheMetadata, 'key'>): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.METADATA], 'readwrite')
      const store = transaction.objectStore(STORES.METADATA)

      const data: CacheMetadata = { key, ...metadata }
      const request = store.put(data)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getMetadata(key: string): Promise<CacheMetadata | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.METADATA], 'readonly')
      const store = transaction.objectStore(STORES.METADATA)
      const request = store.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  async clearStore(storeName: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clearAll(): Promise<void> {
    await this.clearStore(STORES.BAR_ZIG)
    await this.clearStore(STORES.VENDAS_INGRESSO)
    await this.clearStore(STORES.METADATA)
  }
}

export const dbCache = new IndexedDBCache()
export { STORES }
