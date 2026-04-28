import { useEffect, useState, useRef } from 'react'
import axios from 'axios'

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [addEmail, setAddEmail] = useState('')
  const [addName, setAddName] = useState('')
  const [addError, setAddError] = useState('')
  const [selected, setSelected] = useState(new Set())
  const fileRef = useRef()

  const load = (p = page, q = search) => {
    setLoading(true)
    axios
      .get('/api/contacts', { params: { page: p, limit: 50, search: q } })
      .then((r) => {
        setContacts(r.data.items)
        setTotal(r.data.total)
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [])

  const handleSearch = (e) => {
    setSearch(e.target.value)
    setPage(1)
    load(1, e.target.value)
  }

  const handleAddSingle = async (e) => {
    e.preventDefault()
    setAddError('')
    try {
      await axios.post('/api/contacts', { email: addEmail, name: addName })
      setAddEmail('')
      setAddName('')
      load(1, search)
    } catch (err) {
      setAddError(err.response?.data?.error || 'Error adding contact')
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadResult(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const r = await axios.post('/api/contacts/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadResult(r.data)
      load(1, search)
    } catch (err) {
      setUploadResult({ error: err.response?.data?.error || 'Upload failed' })
    } finally {
      setUploading(false)
      fileRef.current.value = ''
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this contact?')) return
    await axios.delete(`/api/contacts/${id}`)
    load(page, search)
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} contacts?`)) return
    await axios.delete('/api/contacts', { data: { ids: [...selected] } })
    setSelected(new Set())
    load(1, search)
  }

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === contacts.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(contacts.map((c) => c.id)))
    }
  }

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Contacts</h2>
          <p className="text-gray-500 text-sm mt-0.5">{total.toLocaleString()} total contacts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Add single contact */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="font-semibold text-white text-sm mb-4">Add Single Contact</h3>
          <form onSubmit={handleAddSingle} className="space-y-3">
            <input
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              type="email"
              placeholder="email@example.com"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            <input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Full name (optional)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            {addError && <p className="text-red-400 text-xs">{addError}</p>}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              Add Contact
            </button>
          </form>
        </div>

        {/* Upload file */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="font-semibold text-white text-sm mb-4">Upload CSV or TXT File</h3>
          <p className="text-xs text-gray-500 mb-3">
            Supports CSV (with email/name columns) and plain TXT (one email per line, or "Name &lt;email&gt;" format).
            Emails are validated and deduplicated automatically.
          </p>
          <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-8 cursor-pointer transition-colors ${
            uploading ? 'border-blue-700 bg-blue-900/20' : 'border-gray-700 hover:border-blue-600 hover:bg-gray-800/50'
          }`}>
            <span className="text-3xl mb-2">📎</span>
            <span className="text-sm text-gray-400">
              {uploading ? 'Uploading…' : 'Click to upload or drag and drop'}
            </span>
            <span className="text-xs text-gray-600 mt-1">.csv, .txt files up to 10MB</span>
            <input
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              onChange={handleFileUpload}
              ref={fileRef}
              className="hidden"
              disabled={uploading}
            />
          </label>

          {uploadResult && !uploadResult.error && (
            <div className="mt-3 bg-gray-800 rounded-lg p-3">
              <div className="flex gap-4 text-xs mb-2">
                <span className="text-green-400">✓ {uploadResult.added} added</span>
                <span className="text-red-400">✗ {uploadResult.invalid} invalid</span>
                <span className="text-yellow-400">⊘ {uploadResult.duplicates} duplicates</span>
                <span className="text-gray-400">— {uploadResult.skipped} skipped</span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {uploadResult.entries?.filter(e => e.status !== 'added').slice(0, 50).map((e, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className={e.status === 'invalid' ? 'text-red-400' : 'text-yellow-400'}>{e.email}</span>
                    <span className="text-gray-600">{e.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {uploadResult?.error && (
            <p className="mt-2 text-red-400 text-xs">{uploadResult.error}</p>
          )}
        </div>
      </div>

      {/* Search + table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-4">
          <input
            value={search}
            onChange={handleSearch}
            placeholder="Search contacts…"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="text-xs text-red-400 hover:text-red-300 px-3 py-2 rounded border border-red-800 hover:border-red-600 transition-colors"
            >
              Delete {selected.size} selected
            </button>
          )}
        </div>

        {loading ? (
          <div className="px-6 py-8 text-gray-500 text-sm">Loading…</div>
        ) : contacts.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500 text-sm">
            {search ? 'No contacts match your search.' : 'No contacts yet. Add one above or upload a file.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
                    <th className="px-4 py-3">
                      <input type="checkbox" checked={selected.size === contacts.length} onChange={toggleAll} className="accent-blue-500" />
                    </th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Added</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {contacts.map((c) => (
                    <tr key={c.id} className={`hover:bg-gray-800/40 transition-colors ${selected.has(c.id) ? 'bg-blue-900/10' : ''}`}>
                      <td className="px-4 py-3 text-center">
                        <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="accent-blue-500" />
                      </td>
                      <td className="px-4 py-3 text-gray-300 font-mono text-xs">{c.email}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{c.name || <span className="text-gray-700">—</span>}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded hover:bg-red-900/30"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between text-sm">
                <span className="text-gray-500 text-xs">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPage(page - 1); load(page - 1, search) }}
                    disabled={page === 1}
                    className="text-xs text-gray-400 hover:text-white disabled:opacity-30 px-3 py-1 rounded bg-gray-800 hover:bg-gray-700"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => { setPage(page + 1); load(page + 1, search) }}
                    disabled={page === totalPages}
                    className="text-xs text-gray-400 hover:text-white disabled:opacity-30 px-3 py-1 rounded bg-gray-800 hover:bg-gray-700"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
