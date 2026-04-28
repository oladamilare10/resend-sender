import express from 'express'
import cors from 'cors'
import campaignRoutes from './routes/campaigns.js'
import contactRoutes from './routes/contacts.js'
import segmentRoutes from './routes/segments.js'
import settingsRoutes from './routes/settings.js'
import { readStore } from './utils/store.js'

const app = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/campaigns', campaignRoutes)
app.use('/api/contacts', contactRoutes)
app.use('/api/segments', segmentRoutes)
app.use('/api/settings', settingsRoutes)

// Stats endpoint
app.get('/api/stats', (req, res) => {
  const campaigns = readStore('campaigns')
  const contacts = readStore('contacts')
  const segments = readStore('segments')
  const logs = readStore('emailLogs')
  res.json({
    campaigns: campaigns.length,
    contacts: contacts.length,
    segments: segments.length,
    emailsSent: logs.filter((l) => l.status === 'sent').length,
    emailsFailed: logs.filter((l) => l.status === 'failed').length,
    activeCampaigns: campaigns.filter((c) => c.status === 'sending').length,
  })
})

app.listen(PORT, () => {
  console.log(`\n  Resend Sender API running at http://localhost:${PORT}\n`)
})
