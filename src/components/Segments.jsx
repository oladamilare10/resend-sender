import { useEffect, useState } from 'react'
import axios from 'axios'

export default function Segments() {
  const [segments, setSegments] = useState([])
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [activeSegment, setActiveSegment] = useState(null)
  const [segContacts, setSegContacts] = useState([])
  const [allContacts, setAllContacts] = useState([])
  const [contactSearch, setContactSearch] = useState('')
  const [addSearch, setAddSearch] = useState('')
  const [bulkSelection, setBulkSelection] = useState(new Set())
  const [bulkAdding, setBulkAdding] = useState(false)

  const loadSegments = () => {
    axios.get('/api/segments').then((r) => {
      setSegments(r.data)
      setLoading(false)
    })
  }

  useEffect(() => {
    loadSegments()
    axios.get('/api/contacts', { params: { limit: 5000 } }).then((r) => setAllContacts(r.data.items))
  }, [])

  const openSegment = (seg) => {
    setActiveSegment(seg)
    setContactSearch('')
    setAddSearch('')
    setBulkSelection(new Set())
    axios.get(`/api/segments/${seg.id}`).then((r) => setSegContacts(r.data.contacts || []))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setCreateError('')
    try {
      await axios.post('/api/segments', { name: newName.trim() })
      setNewName('')
      loadSegments()
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Error creating segment')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete segment "${name}"?`)) return
    await axios.delete(`/api/segments/${id}`)
    if (activeSegment?.id === id) setActiveSegment(null)
    loadSegments()
  }

  const handleAddContact = async (contactId) => {
    await axios.post(`/api/segments/${activeSegment.id}/contacts`, { contactIds: [contactId] })
    const r = await axios.get(`/api/segments/${activeSegment.id}`)
    setSegContacts(r.data.contacts || [])
    loadSegments()
  }

  const handleBulkAdd = async () => {
    if (bulkSelection.size === 0) return
    setBulkAdding(true)
    try {
      await axios.post(`/api/segments/${activeSegment.id}/contacts`, { contactIds: [...bulkSelection] })
      const r = await axios.get(`/api/segments/${activeSegment.id}`)
      setSegContacts(r.data.contacts || [])
      setBulkSelection(new Set())
      loadSegments()
    } finally {
      setBulkAdding(false)
    }
  }

  const handleRemoveContact = async (contactId) => {
    await axios.delete(`/api/segments/${activeSegment.id}/contacts`, { data: { contactIds: [contactId] } })
    setSegContacts((prev) => prev.filter((c) => c.id !== contactId))
    loadSegments()
  }

  const segContactIds = new Set(segContacts.map((c) => c.id))
  const filteredSegContacts = segContacts.filter(
    (c) => !contactSearch || c.email.includes(contactSearch) || (c.name || '').toLowerCase().includes(contactSearch.toLowerCase())
  )
  const availableContacts = allContacts.filter(
    (c) =>
      !segContactIds.has(c.id) &&
      (!addSearch || c.email.includes(addSearch) || (c.name || '').toLowerCase().includes(addSearch.toLowerCase()))
  )

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Segments</h2>
        <p className="text-gray-500 text-sm mt-0.5">Group contacts into segments for targeted campaigns</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left – segment list + create */}
        <div className="space-y-4">
          {/* Create segment */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="font-semibold text-white text-sm mb-3">New Segment</h3>
            <form onSubmit={handleCreate} className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Segment name…"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={creating}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
              >
                +
              </button>
            </form>
            {createError && <p className="text-red-400 text-xs mt-2">{createError}</p>}
          </div>

          {/* Segment list */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
            {loading ? (
              <div className="px-5 py-4 text-gray-500 text-sm">Loading…</div>
            ) : segments.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-500 text-sm">No segments yet.</div>
            ) : (
              segments.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors ${
                    activeSegment?.id === s.id ? 'bg-blue-900/30 border-l-2 border-blue-500' : 'hover:bg-gray-800/50'
                  }`}
                  onClick={() => openSegment(s)}
                >
                  <div>
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.contactCount || 0} contacts</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(s.id, s.name) }}
                    className="text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded hover:bg-red-900/30"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right – segment contacts */}
        <div className="lg:col-span-2">
          {!activeSegment ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-16 text-center text-gray-500 text-sm">
              Select a segment to manage its contacts
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl">
                <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="font-semibold text-white">
                    {activeSegment.name}
                    <span className="text-gray-500 font-normal text-sm ml-2">({segContacts.length} contacts)</span>
                  </h3>
                  <input
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Filter…"
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 w-40"
                  />
                </div>

                {filteredSegContacts.length === 0 ? (
                  <div className="px-5 py-8 text-center text-gray-500 text-sm">No contacts in this segment yet.</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-800">
                    {filteredSegContacts.map((c) => (
                      <div key={c.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-800/40">
                        <div>
                          <p className="text-xs font-mono text-gray-300">{c.email}</p>
                          {c.name && <p className="text-xs text-gray-500">{c.name}</p>}
                        </div>
                        <button
                          onClick={() => handleRemoveContact(c.id)}
                          className="text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded hover:bg-red-900/30"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add contacts */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl">
                <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-3 flex-wrap">
                  <h3 className="font-semibold text-white text-sm flex-1">Add Contacts</h3>
                  {bulkSelection.size > 0 && (
                    <button
                      onClick={handleBulkAdd}
                      disabled={bulkAdding}
                      className="text-xs bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {bulkAdding ? 'Adding…' : `+ Add Selected (${bulkSelection.size})`}
                    </button>
                  )}
                  <input
                    value={addSearch}
                    onChange={(e) => { setAddSearch(e.target.value); setBulkSelection(new Set()) }}
                    placeholder="Search contacts…"
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 w-40"
                  />
                </div>
                {availableContacts.length === 0 ? (
                  <div className="px-5 py-6 text-center text-gray-500 text-sm">
                    All contacts are already in this segment.
                  </div>
                ) : (
                  <>
                    {/* Select all row */}
                    <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-800 bg-gray-800/30">
                      <input
                        type="checkbox"
                        className="accent-blue-500"
                        checked={availableContacts.slice(0, 500).every((c) => bulkSelection.has(c.id))}
                        onChange={(e) => {
                          const shown = availableContacts.slice(0, 500).map((c) => c.id)
                          setBulkSelection(e.target.checked ? new Set(shown) : new Set())
                        }}
                      />
                      <span className="text-xs text-gray-400">
                        {bulkSelection.size > 0
                          ? `${bulkSelection.size} selected`
                          : `Select all ${Math.min(availableContacts.length, 500).toLocaleString()} shown`}
                      </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-800">
                      {availableContacts.slice(0, 500).map((c) => (
                        <label
                          key={c.id}
                          className={`flex items-center gap-3 px-5 py-2.5 cursor-pointer transition-colors ${
                            bulkSelection.has(c.id) ? 'bg-blue-900/20' : 'hover:bg-gray-800/40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="accent-blue-500 flex-shrink-0"
                            checked={bulkSelection.has(c.id)}
                            onChange={(e) => {
                              setBulkSelection((prev) => {
                                const next = new Set(prev)
                                e.target.checked ? next.add(c.id) : next.delete(c.id)
                                return next
                              })
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-mono text-gray-300 truncate">{c.email}</p>
                            {c.name && <p className="text-xs text-gray-500">{c.name}</p>}
                          </div>
                          <button
                            onClick={(e) => { e.preventDefault(); handleAddContact(c.id) }}
                            className="text-xs text-green-400 hover:text-green-300 px-2 py-1 rounded hover:bg-green-900/30 flex-shrink-0"
                          >
                            + Add
                          </button>
                        </label>
                      ))}
                      {availableContacts.length > 500 && (
                        <div className="px-5 py-2 text-xs text-gray-600 text-center">
                          +{availableContacts.length - 500} more — use search to filter
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
