import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { StatusBadge } from './Dashboard'

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    axios.get('/api/campaigns').then((r) => {
      setCampaigns(r.data)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete campaign "${name}"? This cannot be undone.`)) return
    await axios.delete(`/api/campaigns/${id}`)
    load()
  }

  const handleDuplicate = async (id) => {
    const r = await axios.post(`/api/campaigns/${id}/duplicate`)
    navigate(`/campaigns/${r.data.id}/edit`)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Campaigns</h2>
          <p className="text-gray-500 text-sm mt-0.5">{campaigns.length} total campaigns</p>
        </div>
        <Link
          to="/campaigns/new"
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Campaign
        </Link>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-16 text-center">
          <p className="text-gray-400 text-sm">No campaigns yet.</p>
          <Link to="/campaigns/new" className="text-blue-400 hover:underline text-sm mt-2 inline-block">
            Create your first campaign →
          </Link>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-6 py-3">Campaign</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-right px-4 py-3">Sent</th>
                <th className="text-right px-4 py-3">Failed</th>
                <th className="text-right px-4 py-3">Rate</th>
                <th className="text-right px-6 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {campaigns.map((c) => {
                const rate = c.totalEmails > 0
                  ? Math.round((c.sentEmails / c.totalEmails) * 100)
                  : null
                return (
                  <tr key={c.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <Link to={`/campaigns/${c.id}`} className="hover:text-blue-400 transition-colors">
                        <p className="font-medium text-white">{c.name}</p>
                        <p className="text-gray-500 text-xs mt-0.5 truncate max-w-xs">{c.subject}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-4"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-4 text-right text-gray-400">{c.totalEmails || 0}</td>
                    <td className="px-4 py-4 text-right text-green-400">{c.sentEmails || 0}</td>
                    <td className="px-4 py-4 text-right text-red-400">{c.failedEmails || 0}</td>
                    <td className="px-4 py-4 text-right text-gray-300">
                      {rate !== null ? `${rate}%` : '—'}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 text-xs">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2 justify-end">
                        {c.status === 'draft' && (
                          <Link
                            to={`/campaigns/${c.id}/edit`}
                            className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-900/30"
                          >
                            Edit
                          </Link>
                        )}
                        <button
                          onClick={() => handleDuplicate(c.id)}
                          className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-700"
                        >
                          Copy
                        </button>
                        {c.status !== 'sending' && (
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
                            className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/30"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
