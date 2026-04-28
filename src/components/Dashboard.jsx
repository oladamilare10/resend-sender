import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

function StatCard({ label, value, sub, color }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-5`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color || 'text-white'}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([axios.get('/api/stats'), axios.get('/api/campaigns')]).then(([s, c]) => {
      setStats(s.data)
      setCampaigns(c.data.slice(0, 5))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const deliveryRate = stats && stats.emailsSent + stats.emailsFailed > 0
    ? Math.round((stats.emailsSent / (stats.emailsSent + stats.emailsFailed)) * 100)
    : null

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-0.5">Overview of your email campaigns</p>
        </div>
        <Link
          to="/campaigns/new"
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Campaign
        </Link>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading stats…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <StatCard label="Campaigns" value={stats?.campaigns} color="text-blue-400" />
            <StatCard label="Contacts" value={stats?.contacts} color="text-purple-400" />
            <StatCard label="Segments" value={stats?.segments} color="text-indigo-400" />
            <StatCard label="Emails Sent" value={stats?.emailsSent} color="text-green-400" />
            <StatCard label="Emails Failed" value={stats?.emailsFailed} color="text-red-400" />
            <StatCard
              label="Delivery Rate"
              value={deliveryRate !== null ? `${deliveryRate}%` : 'N/A'}
              color={deliveryRate >= 95 ? 'text-green-400' : deliveryRate >= 80 ? 'text-yellow-400' : 'text-red-400'}
            />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-white">Recent Campaigns</h3>
              <Link to="/campaigns" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
            </div>
            {campaigns.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500 text-sm">
                No campaigns yet.{' '}
                <Link to="/campaigns/new" className="text-blue-400 hover:underline">Create your first campaign</Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {campaigns.map((c) => (
                  <Link
                    key={c.id}
                    to={`/campaigns/${c.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-800/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{c.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{c.subject}</p>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div className="hidden sm:block">
                        <p className="text-xs text-gray-500">Sent</p>
                        <p className="text-sm text-white font-medium">{c.sentEmails || 0}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = {
    draft: 'bg-gray-700 text-gray-300',
    sending: 'bg-blue-900 text-blue-300 animate-pulse',
    sent: 'bg-green-900 text-green-300',
    failed: 'bg-red-900 text-red-300',
    paused: 'bg-yellow-900 text-yellow-300',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${map[status] || 'bg-gray-700 text-gray-300'}`}>
      {status}
    </span>
  )
}
