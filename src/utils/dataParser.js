import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export function inferType(values) {
  let numCount = 0
  let dateCount = 0
  const total = values.length
  for (const v of values) {
    if (v === '' || v == null) continue
    const s = String(v).trim()
    if (s === '') continue
    if (!isNaN(Number(s)) && s !== '') numCount++
    else if (!isNaN(Date.parse(s))) dateCount++
  }
  if (numCount / total > 0.7) return 'number'
  if (dateCount / total > 0.7) return 'date'
  return 'string'
}

export function inferTypes(headers, rows) {
  const types = {}
  headers.forEach((h, i) => {
    const col = rows.map(r => r[i])
    types[h] = inferType(col)
  })
  return types
}

export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data
        if (data.length < 2) return reject(new Error('数据行数不足'))
        const headers = data[0].map(h => String(h).trim())
        const rows = data.slice(1).map(r => {
          return headers.map((_, i) => {
            const v = r[i]
            if (v === '' || v == null) return ''
            const s = String(v).trim()
            const n = Number(s)
            return !isNaN(n) && s !== '' ? n : s
          })
        })
        resolve({ headers, rows, types: inferTypes(headers, rows) })
      },
      error: (err) => reject(err)
    })
  })
}

export function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '', cellDates: true })
        if (json.length < 2) return reject(new Error('数据行数不足'))
        const headers = json[0].map(h => String(h).trim())
        const rows = json.slice(1).map(r => {
          return headers.map((_, i) => {
            const v = r[i]
            if (v === '' || v == null) return ''
            if (typeof v === 'number') return v
            const s = String(v).trim()
            const n = Number(s)
            return !isNaN(n) && s !== '' ? n : s
          })
        })
        resolve({ headers, rows, types: inferTypes(headers, rows) })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export function parseJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const arr = JSON.parse(e.target.result)
        if (!Array.isArray(arr) || arr.length === 0) return reject(new Error('JSON 应为对象数组'))
        const headers = Object.keys(arr[0])
        const rows = arr.map(obj => headers.map(h => {
          const v = obj[h]
          if (v === '' || v == null) return ''
          if (typeof v === 'number') return v
          const s = String(v).trim()
          const n = Number(s)
          return !isNaN(n) && s !== '' ? n : s
        }))
        resolve({ headers, rows, types: inferTypes(headers, rows) })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export function parseText(text) {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('内容为空')

  // Try JSON
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      const arr = JSON.parse(trimmed)
      const data = Array.isArray(arr) ? arr : [arr]
      if (data.length === 0) throw new Error('空数组')
      const headers = Object.keys(data[0])
      const rows = data.map(obj => headers.map(h => {
        const v = obj[h]
        if (v === '' || v == null) return ''
        if (typeof v === 'number') return v
        const s = String(v).trim()
        const n = Number(s)
        return !isNaN(n) && s !== '' ? n : s
      }))
      return { headers, rows, types: inferTypes(headers, rows) }
    } catch { /* ignore, try csv */ }
  }

  // Try CSV/TSV
  const results = Papa.parse(trimmed, { header: false, skipEmptyLines: true })
  const data = results.data
  if (data.length < 2) throw new Error('无法解析数据，至少需要两行（表头+数据）')
  const headers = data[0].map(h => String(h).trim())
  const rows = data.slice(1).map(r => {
    return headers.map((_, i) => {
      const v = r[i]
      if (v === '' || v == null) return ''
      const s = String(v).trim()
      const n = Number(s)
      return !isNaN(n) && s !== '' ? n : s
    })
  })
  return { headers, rows, types: inferTypes(headers, rows) }
}

export function getNumericColumns(headers, rows, types) {
  return headers.filter((h, i) => {
    if (types[h] === 'number') return true
    // fallback: sample first 10 rows
    const sample = rows.slice(0, 10).map(r => r[i])
    return inferType(sample) === 'number'
  })
}

export function getStringColumns(headers, rows, types) {
  return headers.filter((h, i) => {
    if (types[h] !== 'number') return true
    const sample = rows.slice(0, 10).map(r => r[i])
    return inferType(sample) !== 'number'
  })
}
