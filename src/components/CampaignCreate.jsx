import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const EMPTY = {
  name: '',
  subject: '',
  fromName: '',
  fromEmail: '',
  html: '',
  text: '',
  segmentIds: [],
}

export default function CampaignCreate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(EMPTY)
  const [segments, setSegments] = useState([])
  const [settings, setSettings] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    axios.get('/api/segments').then((r) => setSegments(r.data))
    axios.get('/api/settings').then((r) => setSettings(r.data))
    if (isEdit) {
      axios.get(`/api/campaigns/${id}`).then((r) => {
        const { id: _id, status, createdAt, sentAt, totalEmails, sentEmails, failedEmails, ...rest } = r.data
        setForm({ ...EMPTY, ...rest })
      })
    }
  }, [id])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const toggleSegment = (segId) => {
    setForm((f) => ({
      ...f,
      segmentIds: f.segmentIds.includes(segId)
        ? f.segmentIds.filter((s) => s !== segId)
        : [...f.segmentIds, segId],
    }))
  }

  const totalContacts = segments
    .filter((s) => form.segmentIds.includes(s.id))
    .reduce((sum, s) => sum + (s.contactCount || 0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Campaign name is required')
    if (!form.subject.trim()) return setError('Subject line is required')
    if (!form.html.trim() && !form.text.trim()) return setError('Email body (HTML or plain text) is required')
    if (form.segmentIds.length === 0) return setError('Select at least one segment')
    setSaving(true)
    try {
      if (isEdit) {
        await axios.put(`/api/campaigns/${id}`, form)
      } else {
        const r = await axios.post('/api/campaigns', form)
        navigate(`/campaigns/${r.data.id}`)
        return
      }
      navigate(`/campaigns/${id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/campaigns" className="text-gray-500 hover:text-gray-300 text-sm">← Campaigns</Link>
        <span className="text-gray-700">/</span>
        <h2 className="text-2xl font-bold text-white">{isEdit ? 'Edit Campaign' : 'New Campaign'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-white text-sm uppercase tracking-wider text-gray-400">Campaign Info</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Campaign Name *</label>
              <input
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Monthly Newsletter April"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Subject Line *</label>
              <input
                value={form.subject}
                onChange={set('subject')}
                placeholder="Your email subject"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                From Name <span className="text-gray-600">(overrides Settings)</span>
              </label>
              <input
                value={form.fromName}
                onChange={set('fromName')}
                placeholder={settings.fromName || 'Your Name'}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                From Email <span className="text-gray-600">(overrides Settings)</span>
              </label>
              <input
                value={form.fromEmail}
                onChange={set('fromEmail')}
                type="email"
                placeholder={settings.fromEmail || 'you@yourdomain.com'}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Segments */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-400">Segments *</h3>
            {totalContacts > 0 && (
              <span className="text-xs text-green-400 font-medium">{totalContacts.toLocaleString()} contacts selected</span>
            )}
          </div>
          {segments.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No segments yet.{' '}
              <Link to="/segments" className="text-blue-400 hover:underline">Create segments first</Link>
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {segments.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    form.segmentIds.includes(s.id)
                      ? 'border-blue-500 bg-blue-900/30 text-white'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.segmentIds.includes(s.id)}
                    onChange={() => toggleSegment(s.id)}
                    className="accent-blue-500"
                  />
                  <span className="text-sm truncate">{s.name}</span>
                  <span className="text-xs text-gray-500 ml-auto">{s.contactCount || 0}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Email Body */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-400">Email Body *</h3>
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="text-xs text-blue-400 hover:text-blue-300 px-3 py-1 rounded border border-blue-800 hover:border-blue-600 transition-colors"
            >
              {preview ? 'Edit HTML' : 'Preview HTML'}
            </button>
          </div>

          {preview ? (
            <div className="bg-white rounded-lg overflow-hidden min-h-64">
              <iframe
                srcDoc={form.html || '<p style="color:#888;font-family:sans-serif;padding:20px">Nothing to preview yet.</p>'}
                className="w-full h-96 border-0"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">HTML Body</label>
                <textarea
                  value={form.html}
                  onChange={set('html')}
                  rows={14}
                  placeholder="<h1>Hello!</h1><p>Your email content here...</p>"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 font-mono focus:outline-none focus:border-blue-500 resize-y"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Plain Text <span className="text-gray-600">(fallback)</span>
                </label>
                <textarea
                  value={form.text}
                  onChange={set('text')}
                  rows={4}
                  placeholder="Plain text version of your email…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-y"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Campaign'}
          </button>
          <Link
            to="/campaigns"
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
