import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bug, Camera, Globe, Eye } from 'lucide-react';
import { snapshotsApi, sessionsApi } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function ExplorePage() {
  const { data: snapData } = useQuery({ queryKey: ['explore-snaps'], queryFn: () => snapshotsApi.listPublic({ limit: 12 }) });
  const { data: sessData } = useQuery({ queryKey: ['explore-sessions'], queryFn: () => sessionsApi.listPublic({ limit: 12 }) });

  const snapshots = snapData?.snapshots || [];
  const sessions = sessData?.sessions || [];

  return (
    <div className="p-6 space-y-10">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-900/40">
          <Globe size={18} className="text-sky-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Explore</h1>
          <p className="text-sm text-gray-400">Public snapshots and debug sessions from the community.</p>
        </div>
      </div>

      {/* Public Snapshots */}
      <section>
        <h2 className="mb-4 font-semibold text-white flex items-center gap-2">
          <Camera size={16} className="text-sky-400" /> Public Snapshots
        </h2>
        {snapshots.length === 0 ? (
          <p className="text-sm text-gray-500">No public snapshots yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {snapshots.map((s: any) => (
              <Link key={s._id} to={`/snapshots/${s._id}`} className="card hover:border-gray-700 transition-colors space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-white text-sm">{s.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">by {s.owner?.username}</p>
                  </div>
                  <Camera size={15} className="text-sky-400 shrink-0" />
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>{s.system?.os} {s.system?.arch}</p>
                  {s.runtimes?.length > 0 && <p>{s.runtimes.map((r: any) => `${r.name} ${r.version}`).join(' · ')}</p>}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Eye size={11} /> {s.views || 0}</span>
                  <span>{formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Public Sessions */}
      <section>
        <h2 className="mb-4 font-semibold text-white flex items-center gap-2">
          <Bug size={16} className="text-violet-400" /> Public Debug Sessions
        </h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-500">No public sessions yet.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s: any) => (
              <Link key={s._id} to={`/sessions/${s._id}`} className="card flex items-center gap-4 hover:border-gray-700 transition-colors">
                <Bug size={18} className="text-violet-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-white text-sm">{s.title}</p>
                    <span className={`badge-status-${s.status}`}>{s.status}</span>
                  </div>
                  <p className="text-xs text-gray-500">by {s.owner?.username} · {s.tags?.join(', ')}</p>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
                  <Eye size={11} /> {s.views || 0}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
