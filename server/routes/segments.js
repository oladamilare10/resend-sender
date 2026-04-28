import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { readStore, writeStore, insertOne, updateOne, deleteOne, findById } from '../utils/store.js'

const router = express.Router()

// GET /api/segments
router.get('/', (req, res) => {
  const segments = readStore('segments')
  const contacts = readStore('contacts')
  const enriched = segments.map((s) => ({
    ...s,
    contactCount: (s.contactIds || []).length,
  }))
  res.json(enriched)
})

// POST /api/segments
router.post('/', (req, res) => {
  const { name, contactIds = [] } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const segment = insertOne('segments', {
    id: uuidv4(),
    name: name.trim(),
    contactIds,
    createdAt: new Date().toISOString(),
  })
  res.status(201).json({ ...segment, contactCount: contactIds.length })
})

// GET /api/segments/:id
router.get('/:id', (req, res) => {
  const segment = findById('segments', req.params.id)
  if (!segment) return res.status(404).json({ error: 'Not found' })

  const contacts = readStore('contacts')
  const segContacts = contacts.filter((c) => (segment.contactIds || []).includes(c.id))
  res.json({ ...segment, contacts: segContacts })
})

// PUT /api/segments/:id
router.put('/:id', (req, res) => {
  const { name, contactIds } = req.body
  const patch = {}
  if (name !== undefined) patch.name = name.trim()
  if (contactIds !== undefined) patch.contactIds = contactIds
  const updated = updateOne('segments', req.params.id, patch)
  if (!updated) return res.status(404).json({ error: 'Not found' })
  res.json({ ...updated, contactCount: (updated.contactIds || []).length })
})

// DELETE /api/segments/:id
router.delete('/:id', (req, res) => {
  const deleted = deleteOne('segments', req.params.id)
  if (!deleted) return res.status(404).json({ error: 'Not found' })
  res.json({ success: true })
})

// POST /api/segments/:id/contacts – add contacts to segment
router.post('/:id/contacts', (req, res) => {
  const { contactIds } = req.body
  if (!Array.isArray(contactIds)) return res.status(400).json({ error: 'contactIds array required' })

  const segment = findById('segments', req.params.id)
  if (!segment) return res.status(404).json({ error: 'Not found' })

  const existing = new Set(segment.contactIds || [])
  contactIds.forEach((id) => existing.add(id))
  const updated = updateOne('segments', req.params.id, { contactIds: [...existing] })
  res.json({ ...updated, contactCount: updated.contactIds.length })
})

// DELETE /api/segments/:id/contacts – remove contacts from segment
router.delete('/:id/contacts', (req, res) => {
  const { contactIds } = req.body
  if (!Array.isArray(contactIds)) return res.status(400).json({ error: 'contactIds array required' })

  const segment = findById('segments', req.params.id)
  if (!segment) return res.status(404).json({ error: 'Not found' })

  const toRemove = new Set(contactIds)
  const updated = updateOne('segments', req.params.id, {
    contactIds: (segment.contactIds || []).filter((id) => !toRemove.has(id)),
  })
  res.json({ ...updated, contactCount: updated.contactIds.length })
})

export default router
