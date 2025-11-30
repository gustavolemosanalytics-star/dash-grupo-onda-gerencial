/**
 * Web Worker para processar CSV em background
 * Evita travar a UI durante o parsing de grandes arquivos
 */

interface ParseMessage {
  type: 'parse'
  csvText: string
  dataType: 'bar' | 'vendas'
}

interface ProgressMessage {
  type: 'progress'
  progress: number
  rowsProcessed: number
}

interface ResultMessage {
  type: 'result'
  data: any[]
  totalRows: number
}

interface ErrorMessage {
  type: 'error'
  error: string
}

type WorkerMessage = ProgressMessage | ResultMessage | ErrorMessage

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

function parseBarRow(values: string[], headers: string[]): any {
  const row: any = {}

  headers.forEach((header, index) => {
    const value = values[index]

    switch (header) {
      case 'count':
        row[header] = parseInt(value) || 0
        break
      case 'unitValue':
      case 'discountValue':
        row[header] = parseFloat(value) || 0
        break
      case 'isRefunded':
        row[header] = value.toLowerCase() === 'true'
        break
      default:
        row[header] = value || null
    }
  })

  return row
}

function parseVendasRow(values: string[], headers: string[]): any {
  const row: any = {}

  headers.forEach((header, index) => {
    const value = values[index]

    switch (header) {
      case 'quantidade':
        row[header] = parseInt(value) || 0
        break
      case 'valor_bruto':
      case 'valor_liquido':
      case 'valor_desconto':
        row[header] = parseFloat(value) || 0
        break
      case 'cpf':
      case 'id':
        row[header] = value
        break
      default:
        row[header] = value || null
    }
  })

  return row
}

self.onmessage = (e: MessageEvent<ParseMessage>) => {
  const { type, csvText, dataType } = e.data

  if (type !== 'parse') return

  try {
    const lines = csvText.split('\n')
    const headers = parseCSVLine(lines[0])
    const data: any[] = []

    const totalLines = lines.length - 1
    const batchSize = 1000
    let processedRows = 0

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = parseCSVLine(line)

      const row = dataType === 'bar'
        ? parseBarRow(values, headers)
        : parseVendasRow(values, headers)

      data.push(row)
      processedRows++

      // Enviar progresso a cada batch
      if (processedRows % batchSize === 0) {
        const progress = Math.round((processedRows / totalLines) * 100)
        self.postMessage({
          type: 'progress',
          progress,
          rowsProcessed: processedRows,
        } as ProgressMessage)
      }
    }

    // Enviar resultado final
    self.postMessage({
      type: 'result',
      data,
      totalRows: data.length,
    } as ResultMessage)
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Erro ao processar CSV',
    } as ErrorMessage)
  }
}
