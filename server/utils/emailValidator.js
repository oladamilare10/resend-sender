// RFC 5321/5322 compatible email regex
const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'throwam.com', 'trashmail.com',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.net',
  'guerrillamail.org', 'spam4.me', 'tempr.email', 'discard.email',
  'mailnesia.com', 'mailnull.com', 'spamgourmet.com', 'getairmail.com',
  'fakeinbox.com', 'tempinbox.com', 'maildrop.cc', '10minutemail.com',
  'tempmail.com', 'dispostable.com', 'mailexpire.com',
])

/**
 * Validates a single email address.
 * Returns { valid: boolean, reason: string|null }
 */
export function validateEmail(email) {
  if (typeof email !== 'string') return { valid: false, reason: 'Not a string' }
  const trimmed = email.trim()
  if (!trimmed) return { valid: false, reason: 'Empty email' }
  if (trimmed.length > 254) return { valid: false, reason: 'Email too long' }
  if (!EMAIL_RE.test(trimmed)) return { valid: false, reason: 'Invalid format' }

  const domain = trimmed.split('@')[1]?.toLowerCase()
  if (domain && DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, reason: 'Disposable email domain' }
  }

  return { valid: true, reason: null }
}

/**
 * Validates a list of email strings and returns deduped results.
 */
export function validateEmailList(emails) {
  const seen = new Set()
  return emails.map((email) => {
    const trimmed = (email || '').trim().toLowerCase()
    const result = validateEmail(email)
    if (seen.has(trimmed)) {
      return { email: email.trim(), valid: false, reason: 'Duplicate' }
    }
    if (result.valid) seen.add(trimmed)
    return { email: email.trim(), ...result }
  })
}
