import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Plus, Search, Trash2, Clock } from 'lucide-react';
import { snapshotsApi } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';
import UploadModal from '../components/UploadModal';

export default function SnapshotsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['snapshots', search],
    queryFn: () => snapshotsApi.list({ search }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => snapshotsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snapshots'] }),
  });

  const snapshots = data?.snapshots || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Snapshots</h1>
          <p className="mt-1 text-sm text-gray-400">Captured environment states from your machines.</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary">
          <Plus size={16} /> New Snapshot
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          className="input pl-9"
          placeholder="Search snapshots…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-500">Loading…</div>
      ) : snapshots.length === 0 ? (
        <div className="card text-center py-16">
          <Camera size={40} className="mx-auto mb-3 text-gray-600" />
          <p className="text-sm text-gray-400 mb-4">No snapshots yet. Capture your first environment.</p>
          <pre className="inline-block rounded-lg bg-gray-950 border border-gray-800 px-4 py-2 text-xs text-sky-400 font-mono">
            npx debugbridge capture
          </pre>
        </div>
      ) : (
        <div className="space-y-3">
          {snapshots.map((s: any) => (
            <div key={s._id} className="card flex items-center gap-4 hover:border-gray-700 transition-colors">
              <Camera size={20} className="text-sky-400 shrink-0" />
              <Link to={`/snapshots/${s._id}`} className="min-w-0 flex-1">
                <p className="font-medium text-white hover:text-sky-400 transition-colors">{s.label}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{s.system?.os} {s.system?.arch}</span>
                  {s.runtimes?.length > 0 && (
                    <span>{s.runtimes.map((r: any) => `${r.name} ${r.version}`).join(' · ')}</span>
                  )}
                </div>
              </Link>
              <div className="flex items-center gap-3 shrink-0">
                {s.isPublic && <span className="text-xs text-gray-500 border border-gray-700 rounded px-2 py-0.5">public</span>}
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={11} />
                  {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                </span>
                <button
                  onClick={() => { if (confirm('Delete this snapshot?')) deleteMut.mutate(s._id); }}
                  className="text-gray-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => { setShowUpload(false); qc.invalidateQueries({ queryKey: ['snapshots'] }); }} />}
    </div>
  );
}
