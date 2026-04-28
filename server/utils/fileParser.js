import { parse as csvParse } from 'csv-parse/sync'

/**
 * Extract contacts from CSV file content.
 * Accepts: email only, or email + name columns (in any order).
 * Supports comma, semicolon, tab, and pipe delimiters.
 */
export function parseCSV(content) {
  const delimiters = [',', ';', '\t', '|']
  let records = null

  for (const delimiter of delimiters) {
    try {
      const parsed = csvParse(content, {
        delimiter,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true,
      })
      if (parsed.length > 0 && parsed[0].length >= 1) {
        records = parsed
        break
      }
    } catch {
      // Try next delimiter
    }
  }

  if (!records) return []

  // Detect if first row is a header
  const firstRow = records[0].map((v) => (v || '').toLowerCase())
  const hasHeader =
    firstRow.some((c) => ['email', 'e-mail', 'mail', 'address'].includes(c)) ||
    firstRow.some((c) => ['name', 'firstname', 'first_name', 'full_name', 'fullname'].includes(c))

  const dataRows = hasHeader ? records.slice(1) : records

  // Try to find email and name column indices
  let emailIdx = 0
  let nameIdx = -1

  if (hasHeader) {
    firstRow.forEach((col, i) => {
      if (['email', 'e-mail', 'mail', 'address', 'email_address'].includes(col)) emailIdx = i
      if (['name', 'fullname', 'full_name', 'firstname', 'first_name'].includes(col)) nameIdx = i
    })
  } else {
    // Heuristic: find which column looks like emails
    const emailColCounts = records.slice(0, 5).reduce((acc, row) => {
      row.forEach((cell, i) => {
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((cell || '').trim())) {
          acc[i] = (acc[i] || 0) + 1
        }
      })
      return acc
    }, {})
    const bestEmailCol = Object.entries(emailColCounts).sort((a, b) => b[1] - a[1])[0]
    if (bestEmailCol) {
      emailIdx = parseInt(bestEmailCol[0])
      nameIdx = emailIdx === 0 ? 1 : 0
    }
  }

  return dataRows
    .map((row) => ({
      email: (row[emailIdx] || '').trim(),
      name: nameIdx >= 0 ? (row[nameIdx] || '').trim() : '',
    }))
    .filter((r) => r.email)
}

/**
 * Extract emails/contacts from plain text file.
 * Supports: one per line, "Name <email>" format, space/comma separated.
 */
export function parseTXT(content) {
  const contacts = []
  const lines = content.split(/[\r\n]+/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue

    // "Name <email>" format
    const angleMatch = trimmed.match(/^(.+?)\s*<([^>]+)>/)
    if (angleMatch) {
      contacts.push({ email: angleMatch[2].trim(), name: angleMatch[1].trim() })
      continue
    }

    // "email Name" or "email" format – split by common separators
    const parts = trimmed.split(/[\s,;|]+/)
    const emailPart = parts.find((p) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p))
    if (emailPart) {
      const namePart = parts.filter((p) => p !== emailPart).join(' ').trim()
      contacts.push({ email: emailPart.trim(), name: namePart })
    }
  }

  return contacts
}

/**
 * Unified parser – picks CSV or TXT based on filename extension.
 */
export function parseFile(filename, content) {
  const ext = (filename || '').split('.').pop()?.toLowerCase()
  if (ext === 'csv') return parseCSV(content)
  return parseTXT(content)
}
