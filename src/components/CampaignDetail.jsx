import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { StatusBadge } from './Dashboard'

export default function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [campaign, setCampaign] = useState(null)
  const [logs, setLogs] = useState([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logFilter, setLogFilter] = useState('')
  const [logPage, setLogPage] = useState(1)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const pollRef = useRef(null)

  const loadCampaign = () =>
    axios.get(`/api/campaigns/${id}`).then((r) => setCampaign(r.data))

  const loadLogs = (page = 1, status = '') => {
    axios
      .get(`/api/campaigns/${id}/logs`, { params: { page, limit: 100, status } })
      .then((r) => { setLogs(r.data.items); setLogsTotal(r.data.total) })
  }

  useEffect(() => {
    loadCampaign()
    loadLogs()
  }, [id])

  // Poll while sending
  useEffect(() => {
    if (campaign?.status === 'sending') {
      pollRef.current = setInterval(() => {
        loadCampaign()
        loadLogs(logPage, logFilter)
      }, 2500)
    } else {
      clearInterval(pollRef.current)
    }
    return () => clearInterval(pollRef.current)
  }, [campaign?.status])

  const handleSend = async () => {
    if (!confirm(`Send "${campaign.name}" to ${campaign.totalEmails || '?'} contacts? This cannot be undone.`)) return
    setError('')
    setSuccess('')
    setSending(true)
    try {
      const r = await axios.post(`/api/campaigns/${id}/send`)
      setSuccess(r.data.message)
      await loadCampaign()
      loadLogs()
    } catch (err) {
      setError(err.response?.data?.error || 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const handlePause = async () => {
    await axios.post(`/api/campaigns/${id}/pause`)
    await loadCampaign()
  }

  const handleRerun = async () => {
    if (!confirm(`Retry all failed emails for "${campaign.name}"?`)) return
    setError('')
    setSuccess('')
    setSending(true)
    try {
      const r = await axios.post(`/api/campaigns/${id}/rerun`)
      setSuccess(r.data.message)
      await loadCampaign()
      loadLogs()
    } catch (err) {
      setError(err.response?.data?.error || 'Retry failed')
    } finally {
      setSending(false)
    }
  }

  const handleFilterChange = (status) => {
    setLogFilter(status)
    setLogPage(1)
    loadLogs(1, status)
  }

  if (!campaign) return <div className="p-8 text-gray-500 text-sm">Loading…</div>

  const deliveryRate = campaign.totalEmails > 0
    ? Math.round((campaign.sentEmails / campaign.totalEmails) * 100)
    : null

  const pendingEmails = campaign.pendingEmails || 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/campaigns" className="text-gray-500 hover:text-gray-300 text-sm">← Campaigns</Link>
          </div>
          <h2 className="text-2xl font-bold text-white">{campaign.name}</h2>
          <p className="text-gray-500 text-sm mt-0.5">{campaign.subject}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={campaign.status} />
          {campaign.status === 'draft' && (
            <>
              <Link
                to={`/campaigns/${id}/edit`}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Edit
              </Link>
              <button
                onClick={handleSend}
                disabled={sending}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {sending ? 'Starting…' : '▶ Send Campaign'}
              </button>
            </>
          )}
          {campaign.status === 'sending' && (
            <button
              onClick={handlePause}
              className="bg-yellow-700 hover:bg-yellow-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              ⏸ Pause
            </button>
          )}
          {(campaign.status === 'sent' || campaign.status === 'paused') && (
            <>
              <Link
                to={`/campaigns/${id}/edit`}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                View/Edit
              </Link>
              {campaign.failedEmails > 0 && (
                <button
                  onClick={handleRerun}
                  disabled={sending}
                  className="bg-orange-700 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {sending ? 'Starting…' : `↺ Retry ${campaign.failedEmails} Failed`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-900/50 border border-green-700 text-green-300 text-sm px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total Emails', value: campaign.totalEmails || 0, color: 'text-white' },
          { label: 'Sent', value: campaign.sentEmails || 0, color: 'text-green-400' },
          { label: 'Failed', value: campaign.failedEmails || 0, color: 'text-red-400' },
          { label: 'Pending', value: pendingEmails, color: 'text-yellow-400' },
          { label: 'Delivery Rate', value: deliveryRate !== null ? `${deliveryRate}%` : '—', color: deliveryRate >= 95 ? 'text-green-400' : deliveryRate >= 80 ? 'text-yellow-400' : 'text-white' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {campaign.totalEmails > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-8">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Progress</span>
            <span>{campaign.sentEmails + campaign.failedEmails} / {campaign.totalEmails} processed</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
            <div
              className="bg-green-500 h-full transition-all duration-500"
              style={{ width: `${(campaign.sentEmails / campaign.totalEmails) * 100}%` }}
            />
            <div
              className="bg-red-500 h-full transition-all duration-500"
              style={{ width: `${(campaign.failedEmails / campaign.totalEmails) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Email Log */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold text-white">Email Log</h3>
          <div className="flex gap-2">
            {['', 'sent', 'failed', 'pending'].map((s) => (
              <button
                key={s || 'all'}
                onClick={() => handleFilterChange(s)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  logFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {s || 'All'} ({s === '' ? logsTotal : logs.filter(l => l.status === s || logFilter !== '').length})
              </button>
            ))}
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500 text-sm">
            {campaign.status === 'draft' ? 'Campaign not sent yet.' : 'No logs to display.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
                  <th className="text-left px-6 py-3">Email</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Message ID</th>
                  <th className="text-left px-4 py-3">Error</th>
                  <th className="text-right px-6 py-3">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800/30">
                    <td className="px-6 py-3 text-gray-300 font-mono text-xs">{log.email}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{log.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        log.status === 'sent' ? 'bg-green-900 text-green-300' :
                        log.status === 'failed' ? 'bg-red-900 text-red-300' :
                        'bg-yellow-900 text-yellow-300'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs truncate max-w-32">{log.messageId || '—'}</td>
                    <td className="px-4 py-3 text-red-400 text-xs truncate max-w-48">{log.error || '—'}</td>
                    <td className="px-6 py-3 text-right text-gray-500 text-xs">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
