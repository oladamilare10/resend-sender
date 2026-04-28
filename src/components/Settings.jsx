import { useEffect, useState } from 'react'
import axios from 'axios'

export default function Settings() {
  const [form, setForm] = useState({
    apiKey: '',
    fromEmail: '',
    fromName: '',
    batchSize: 50,
    batchDelay: 1000,
  })
  const [current, setCurrent] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get('/api/settings').then((r) => {
      setCurrent(r.data)
      setForm({
        apiKey: '',
        fromEmail: r.data.fromEmail || '',
        fromName: r.data.fromName || '',
        batchSize: r.data.batchSize ?? 50,
        batchDelay: r.data.batchDelay ?? 1000,
      })
    })
  }, [])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.apiKey) delete payload.apiKey // don't overwrite with blank
      await axios.put('/api/settings', payload)
      setSaved(true)
      setForm((f) => ({ ...f, apiKey: '' }))
      const r = await axios.get('/api/settings')
      setCurrent(r.data)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-gray-500 text-sm mt-0.5">Configure your Resend API key and sending defaults</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {saved && (
          <div className="bg-green-900/50 border border-green-700 text-green-300 text-sm px-4 py-3 rounded-lg">
            Settings saved successfully!
          </div>
        )}

        {/* API Key */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-white text-sm uppercase tracking-wider text-gray-400">Resend API</h3>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">API Key</label>
            <input
              value={form.apiKey}
              onChange={set('apiKey')}
              type="password"
              placeholder={current.hasApiKey ? `Current: ${current.apiKeyMasked}` : 'Enter your Resend API key (re_...)'}
              autoComplete="new-password"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-xs text-gray-600 mt-1">
              Get your API key from{' '}
              <a
                href="https://resend.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline"
              >
                resend.com/api-keys
              </a>
              . Leave blank to keep the current key.
            </p>
            {current.hasApiKey && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-green-400">✓ API key configured</span>
                <span className="text-xs text-gray-600 font-mono">{current.apiKeyMasked}</span>
              </div>
            )}
          </div>
        </div>

        {/* From defaults */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-white text-sm uppercase tracking-wider text-gray-400">Sender Defaults</h3>
          <p className="text-xs text-gray-500">
            These are used when a campaign doesn't have its own from email/name.
            The email domain must be verified in Resend.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">From Name</label>
              <input
                value={form.fromName}
                onChange={set('fromName')}
                placeholder="Your Company"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">From Email</label>
              <input
                value={form.fromEmail}
                onChange={set('fromEmail')}
                type="email"
                placeholder="hello@yourdomain.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Sending config */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-white text-sm uppercase tracking-wider text-gray-400">Sending Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Batch Size <span className="text-gray-600">(1–100 emails per API call)</span>
              </label>
              <input
                value={form.batchSize}
                onChange={set('batchSize')}
                type="number"
                min={1}
                max={100}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Delay Between Batches <span className="text-gray-600">(ms)</span>
              </label>
              <input
                value={form.batchDelay}
                onChange={set('batchDelay')}
                type="number"
                min={0}
                max={60000}
                step={100}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-600">
            Resend's batch API sends up to 100 emails per call. Add a delay to stay within rate limits.
            Default: 50 emails/batch, 1000ms delay.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
