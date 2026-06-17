import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bug, Plus, Search, Trash2, Clock } from 'lucide-react';
import { sessionsApi } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';
import NewSessionModal from '../components/NewSessionModal';

export default function SessionsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['sessions', search, statusFilter],
    queryFn: () => sessionsApi.list({ search, status: statusFilter || undefined }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => sessionsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const sessions = data?.sessions || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Debug Sessions</h1>
          <p className="mt-1 text-sm text-gray-400">Track and resolve environment-related bugs with collaborators.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus size={16} /> New Session
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="input pl-9" placeholder="Search sessions…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          className="input w-36"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All status</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-500">Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="card text-center py-16">
          <Bug size={40} className="mx-auto mb-3 text-gray-600" />
          <p className="text-sm text-gray-400 mb-4">No debug sessions yet. Create one to start investigating a bug.</p>
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus size={15} /> Create Session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s: any) => (
            <div key={s._id} className="card flex items-start gap-4 hover:border-gray-700 transition-colors">
              <Bug size={20} className="text-violet-400 shrink-0 mt-0.5" />
              <Link to={`/sessions/${s._id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-white hover:text-sky-400 transition-colors">{s.title}</p>
                  <span className={`badge-status-${s.status}`}>{s.status}</span>
                </div>
                {s.errorMessage && <p className="text-xs text-red-400 font-mono truncate mb-1">{s.errorMessage}</p>}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{s.owner?.username}</span>
                  {s.reporterSnapshot && <span className="text-sky-400">{s.compareSnapshots?.length + 1} snapshot(s)</span>}
                  {s.tags?.map((t: string) => <span key={t} className="border border-gray-700 rounded px-1.5 py-0.5">{t}</span>)}
                </div>
              </Link>
              <div className="flex items-center gap-3 shrink-0">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={11} /> {formatDistanceToNow(new Date(s.updatedAt), { addSuffix: true })}
                </span>
                <button
                  onClick={() => { if (confirm('Delete this session?')) deleteMut.mutate(s._id); }}
                  className="text-gray-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && <NewSessionModal onClose={() => { setShowNew(false); qc.invalidateQueries({ queryKey: ['sessions'] }); }} />}
    </div>
  );
}
