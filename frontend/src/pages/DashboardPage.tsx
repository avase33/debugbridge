import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bug, Camera, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../store/auth';
import { snapshotsApi, sessionsApi } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const cls = {
    high: 'badge-risk-high',
    medium: 'badge-risk-medium',
    low: 'badge-risk-low',
    none: 'badge-risk-none',
  }[level] || 'badge-risk-none';
  return <span className={cls}>{level}</span>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: snapsData } = useQuery({ queryKey: ['snapshots-dash'], queryFn: () => snapshotsApi.list({ limit: 5 }) });
  const { data: sessData } = useQuery({ queryKey: ['sessions-dash'], queryFn: () => sessionsApi.list({ limit: 5 }) });

  const snapshots = snapsData?.snapshots || [];
  const sessions = sessData?.sessions || [];
  const openCount = sessions.filter((s: any) => s.status === 'open').length;

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Good {getGreeting()}, {user?.fullName?.split(' ')[0] || user?.username} 👋</h1>
        <p className="mt-1 text-sm text-gray-400">Here's what's happening in your debug workspace.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Snapshots" value={user?.snapshotsUploaded || 0} icon={Camera} color="bg-sky-700" />
        <StatCard label="Debug Sessions" value={user?.sessionsCreated || 0} icon={Bug} color="bg-violet-700" />
        <StatCard label="Open Issues" value={openCount} icon={AlertTriangle} color="bg-amber-700" />
        <StatCard label="Resolved" value={sessions.filter((s: any) => s.status === 'resolved').length} icon={CheckCircle} color="bg-green-700" />
      </div>

      {/* Recent snapshots */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-white">Recent Snapshots</h2>
          <Link to="/snapshots" className="text-xs text-sky-400 hover:underline">View all →</Link>
        </div>
        {snapshots.length === 0 ? (
          <div className="card text-center py-10 text-gray-500">
            <Camera size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No snapshots yet. Run <code className="text-sky-400">npx debugbridge capture</code> to start.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {snapshots.map((s: any) => (
              <Link key={s._id} to={`/snapshots/${s._id}`} className="card flex items-center gap-4 hover:border-gray-700 transition-colors">
                <Camera size={16} className="text-sky-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{s.label}</p>
                  <p className="text-xs text-gray-500">{s.system?.os} · {s.runtimes?.map((r: any) => `${r.name} ${r.version}`).join(', ')}</p>
                </div>
                <span className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                  <Clock size={12} />
                  {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent sessions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-white">Recent Debug Sessions</h2>
          <Link to="/sessions" className="text-xs text-sky-400 hover:underline">View all →</Link>
        </div>
        {sessions.length === 0 ? (
          <div className="card text-center py-10 text-gray-500">
            <Bug size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No sessions yet. Create one to start investigating a bug.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s: any) => (
              <Link key={s._id} to={`/sessions/${s._id}`} className="card flex items-center gap-4 hover:border-gray-700 transition-colors">
                <Bug size={16} className="text-violet-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{s.title}</p>
                  {s.errorMessage && <p className="truncate text-xs text-gray-500">{s.errorMessage}</p>}
                </div>
                <span className={`shrink-0 badge-status-${s.status}`}>{s.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
