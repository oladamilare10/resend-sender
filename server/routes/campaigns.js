import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { Resend } from 'resend'
import {
  readStore,
  writeStore,
  insertOne,
  updateOne,
  deleteOne,
  findById,
} from '../utils/store.js'
import { validateEmail } from '../utils/emailValidator.js'

const router = express.Router()

// GET /api/campaigns
router.get('/', (req, res) => {
  const campaigns = readStore('campaigns')
  const logs = readStore('emailLogs')

  const enriched = campaigns.map((c) => {
    const cLogs = logs.filter((l) => l.campaignId === c.id)
    return {
      ...c,
      totalEmails: cLogs.length || c.totalEmails || 0,
      sentEmails: cLogs.filter((l) => l.status === 'sent').length,
      failedEmails: cLogs.filter((l) => l.status === 'failed').length,
      pendingEmails: cLogs.filter((l) => l.status === 'pending').length,
    }
  })
  res.json(enriched)
})

// POST /api/campaigns
router.post('/', (req, res) => {
  const { name, subject, fromName, fromEmail, html, text, segmentIds = [] } = req.body
  if (!name || !subject) return res.status(400).json({ error: 'name and subject are required' })

  const campaign = insertOne('campaigns', {
    id: uuidv4(),
    name: name.trim(),
    subject: subject.trim(),
    fromName: (fromName || '').trim(),
    fromEmail: (fromEmail || '').trim(),
    html: html || '',
    text: text || '',
    segmentIds,
    status: 'draft',
    createdAt: new Date().toISOString(),
    sentAt: null,
    totalEmails: 0,
    sentEmails: 0,
    failedEmails: 0,
  })
  res.status(201).json(campaign)
})

// GET /api/campaigns/:id
router.get('/:id', (req, res) => {
  const campaign = findById('campaigns', req.params.id)
  if (!campaign) return res.status(404).json({ error: 'Not found' })

  const logs = readStore('emailLogs').filter((l) => l.campaignId === req.params.id)
  res.json({
    ...campaign,
    totalEmails: logs.length || campaign.totalEmails || 0,
    sentEmails: logs.filter((l) => l.status === 'sent').length,
    failedEmails: logs.filter((l) => l.status === 'failed').length,
    pendingEmails: logs.filter((l) => l.status === 'pending').length,
  })
})

// PUT /api/campaigns/:id
router.put('/:id', (req, res) => {
  const campaign = findById('campaigns', req.params.id)
  if (!campaign) return res.status(404).json({ error: 'Not found' })
  if (campaign.status === 'sending') return res.status(400).json({ error: 'Cannot edit a sending campaign' })

  const allowed = ['name', 'subject', 'fromName', 'fromEmail', 'html', 'text', 'segmentIds']
  const patch = {}
  allowed.forEach((key) => { if (req.body[key] !== undefined) patch[key] = req.body[key] })

  const updated = updateOne('campaigns', req.params.id, patch)
  res.json(updated)
})

// DELETE /api/campaigns/:id
router.delete('/:id', (req, res) => {
  const campaign = findById('campaigns', req.params.id)
  if (!campaign) return res.status(404).json({ error: 'Not found' })
  if (campaign.status === 'sending') return res.status(400).json({ error: 'Cannot delete a sending campaign' })

  deleteOne('campaigns', req.params.id)
  // Remove associated logs
  const logs = readStore('emailLogs').filter((l) => l.campaignId !== req.params.id)
  writeStore('emailLogs', logs)
  res.json({ success: true })
})

// GET /api/campaigns/:id/logs
router.get('/:id/logs', (req, res) => {
  const { page = 1, limit = 100, status } = req.query
  let logs = readStore('emailLogs').filter((l) => l.campaignId === req.params.id)
  if (status) logs = logs.filter((l) => l.status === status)
  const total = logs.length
  const start = (parseInt(page) - 1) * parseInt(limit)
  res.json({ items: logs.slice(start, start + parseInt(limit)), total })
})

// POST /api/campaigns/:id/send
router.post('/:id/send', async (req, res) => {
  const campaign = findById('campaigns', req.params.id)
  if (!campaign) return res.status(404).json({ error: 'Not found' })
  if (campaign.status === 'sending') return res.status(400).json({ error: 'Already sending' })

  const settings = readStore('settings')
  if (!settings.apiKey) return res.status(400).json({ error: 'Resend API key not configured in Settings' })

  // Resolve contacts from segments
  const segments = readStore('segments')
  const contacts = readStore('contacts')

  const campaignSegments = segments.filter((s) => (campaign.segmentIds || []).includes(s.id))
  const contactIdSet = new Set()
  campaignSegments.forEach((s) => (s.contactIds || []).forEach((id) => contactIdSet.add(id)))

  const targetContacts = contacts.filter((c) => contactIdSet.has(c.id) && c.valid)

  if (targetContacts.length === 0) {
    return res.status(400).json({ error: 'No valid contacts in selected segments' })
  }

  // Validate each email before sending
  const validContacts = targetContacts.filter((c) => {
    const { valid } = validateEmail(c.email)
    return valid
  })

  if (validContacts.length === 0) {
    return res.status(400).json({ error: 'No emails passed validation' })
  }

  const fromEmail = campaign.fromEmail || settings.fromEmail
  const fromName = campaign.fromName || settings.fromName
  if (!fromEmail) return res.status(400).json({ error: 'From email not set. Configure in Settings or campaign.' })

  // Mark campaign as sending immediately (async send)
  updateOne('campaigns', campaign.id, { status: 'sending', sentAt: new Date().toISOString(), totalEmails: validContacts.length })

  // Create pending log entries
  const existingLogs = readStore('emailLogs').filter((l) => l.campaignId !== campaign.id)
  const newLogs = validContacts.map((c) => ({
    id: uuidv4(),
    campaignId: campaign.id,
    contactId: c.id,
    email: c.email,
    name: c.name || '',
    status: 'pending',
    messageId: null,
    error: null,
    sentAt: null,
  }))
  writeStore('emailLogs', [...existingLogs, ...newLogs])

  res.json({ success: true, total: validContacts.length, message: 'Sending started in background' })

  // Background send
  sendCampaignEmails(campaign, validContacts, fromName, fromEmail, settings)
})

async function sendCampaignEmails(campaign, contacts, fromName, fromEmail, settings) {
  const resend = new Resend(settings.apiKey)
  const batchSize = Math.max(1, Math.min(settings.batchSize || 50, 100))
  const batchDelay = Math.max(0, settings.batchDelay || 1000)
  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail

  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize)
    const batchEmails = batch.map((contact) => ({
      from,
      to: [contact.email],
      subject: campaign.subject,
      html: campaign.html || undefined,
      text: campaign.text || undefined,
    }))

    let batchResults = []
    try {
      const response = await resend.batch.send(batchEmails)
      // Resend SDK v3: response = { data: { data: [...] }, error: null }
      if (response.error) {
        throw new Error(response.error.message || JSON.stringify(response.error))
      }
      batchResults = response.data?.data || []
    } catch (err) {
      // Mark all in batch as failed
      batch.forEach((contact) => {
        updateLogStatus(campaign.id, contact.id, 'failed', null, err.message)
      })
      continue
    }

    // Update individual log statuses
    batch.forEach((contact, idx) => {
      const result = batchResults[idx]
      if (result && result.id) {
        updateLogStatus(campaign.id, contact.id, 'sent', result.id, null)
      } else {
        updateLogStatus(campaign.id, contact.id, 'failed', null, 'No message ID returned')
      }
    })

    if (i + batchSize < contacts.length && batchDelay > 0) {
      await sleep(batchDelay)
    }
  }

  // Update campaign status
  const allLogs = readStore('emailLogs').filter((l) => l.campaignId === campaign.id)
  const sent = allLogs.filter((l) => l.status === 'sent').length
  const failed = allLogs.filter((l) => l.status === 'failed').length
  updateOne('campaigns', campaign.id, {
    status: 'sent',
    sentEmails: sent,
    failedEmails: failed,
  })
}

function updateLogStatus(campaignId, contactId, status, messageId, error) {
  const logs = readStore('emailLogs')
  const idx = logs.findIndex((l) => l.campaignId === campaignId && l.contactId === contactId)
  if (idx !== -1) {
    logs[idx] = { ...logs[idx], status, messageId, error, sentAt: new Date().toISOString() }
    writeStore('emailLogs', logs)
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// POST /api/campaigns/:id/rerun – retry only failed emails
router.post('/:id/rerun', async (req, res) => {
  const campaign = findById('campaigns', req.params.id)
  if (!campaign) return res.status(404).json({ error: 'Not found' })
  if (campaign.status === 'sending') return res.status(400).json({ error: 'Campaign is already sending' })

  const settings = readStore('settings')
  if (!settings.apiKey) return res.status(400).json({ error: 'Resend API key not configured in Settings' })

  const fromEmail = campaign.fromEmail || settings.fromEmail
  const fromName = campaign.fromName || settings.fromName
  if (!fromEmail) return res.status(400).json({ error: 'From email not set. Configure in Settings or campaign.' })

  // Find failed log entries
  const allLogs = readStore('emailLogs')
  const failedLogs = allLogs.filter((l) => l.campaignId === campaign.id && l.status === 'failed')
  if (failedLogs.length === 0) return res.status(400).json({ error: 'No failed emails to retry' })

  // Reset failed logs to pending
  const resetLogs = allLogs.map((l) =>
    l.campaignId === campaign.id && l.status === 'failed'
      ? { ...l, status: 'pending', messageId: null, error: null, sentAt: null }
      : l
  )
  writeStore('emailLogs', resetLogs)

  // Build contact list from failed log entries
  const contacts = readStore('contacts')
  const retryContacts = failedLogs.map((l) => {
    const c = contacts.find((c) => c.id === l.contactId)
    return c || { id: l.contactId, email: l.email, name: l.name || '' }
  }).filter((c) => c.email)

  updateOne('campaigns', campaign.id, { status: 'sending' })

  res.json({ success: true, total: retryContacts.length, message: `Retrying ${retryContacts.length} failed emails` })

  sendCampaignEmails(campaign, retryContacts, fromName, fromEmail, settings)
})

// POST /api/campaigns/:id/pause
router.post('/:id/pause', (req, res) => {
  const campaign = findById('campaigns', req.params.id)
  if (!campaign) return res.status(404).json({ error: 'Not found' })
  if (campaign.status !== 'sending') return res.status(400).json({ error: 'Campaign is not sending' })
  updateOne('campaigns', campaign.id, { status: 'paused' })
  res.json({ success: true })
})

// POST /api/campaigns/:id/duplicate
router.post('/:id/duplicate', (req, res) => {
  const campaign = findById('campaigns', req.params.id)
  if (!campaign) return res.status(404).json({ error: 'Not found' })
  const copy = insertOne('campaigns', {
    ...campaign,
    id: uuidv4(),
    name: `${campaign.name} (Copy)`,
    status: 'draft',
    createdAt: new Date().toISOString(),
    sentAt: null,
    totalEmails: 0,
    sentEmails: 0,
    failedEmails: 0,
  })
  res.status(201).json(copy)
})

export default router
