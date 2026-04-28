import express from 'express'
import { readStore, writeStore } from '../utils/store.js'

const router = express.Router()

// GET /api/settings
router.get('/', (req, res) => {
  const settings = readStore('settings')
  // Never expose the full API key – mask it
  const masked = settings.apiKey
    ? settings.apiKey.slice(0, 7) + '•'.repeat(Math.max(0, settings.apiKey.length - 11)) + settings.apiKey.slice(-4)
    : ''
  res.json({ ...settings, apiKeyMasked: masked, hasApiKey: !!settings.apiKey })
})

// PUT /api/settings
router.put('/', (req, res) => {
  const current = readStore('settings')
  const { apiKey, fromEmail, fromName, batchSize, batchDelay } = req.body
  const patch = { ...current }
  if (apiKey !== undefined && apiKey !== '') patch.apiKey = apiKey
  if (fromEmail !== undefined) patch.fromEmail = fromEmail.trim()
  if (fromName !== undefined) patch.fromName = fromName.trim()
  if (batchSize !== undefined) patch.batchSize = Math.max(1, Math.min(parseInt(batchSize) || 50, 100))
  if (batchDelay !== undefined) patch.batchDelay = Math.max(0, parseInt(batchDelay) || 1000)
  writeStore('settings', patch)
  const masked = patch.apiKey
    ? patch.apiKey.slice(0, 7) + '•'.repeat(Math.max(0, patch.apiKey.length - 11)) + patch.apiKey.slice(-4)
    : ''
  res.json({ ...patch, apiKeyMasked: masked, apiKey: undefined, hasApiKey: !!patch.apiKey })
})

export default router
