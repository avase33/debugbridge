import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, Download, MessageCircle, CheckCircle2, AlertTriangle, Minus } from 'lucide-react';
import { sessionsApi, snapshotsApi } from '../lib/api';
import { useAuth } from '../store/auth';
import { formatDistanceToNow } from 'date-fns';

function DiffRow({ item, category }: { item: any; category: string }) {
  const severityColor = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-green-400' }[item.severity as string] || 'text-gray-400';
  const statusIcon = item.status === 'missing_in_a' || item.status === 'missing_in_b'
    ? <AlertTriangle size={13} className={severityColor} />
    : <Minus size={13} className={severityColor} />;

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-900/50">
      <td className="px-3 py-2 text-xs font-mono text-gray-300">{item.field || item.name || item.key}</td>
      <td className="px-3 py-2 text-xs font-mono">{item.a || item.aVersion || (item.status === 'missing_in_a' ? <span className="text-gray-600">—</span> : null)}</td>
      <td className="px-3 py-2 text-xs font-mono">{item.b || item.bVersion || (item.status === 'missing_in_b' ? <span className="text-gray-600">—</span> : null)}</td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          {statusIcon}
          <span className={`text-xs ${severityColor}`}>{item.severity}</span>
        </div>
      </td>
    </tr>
  );
}

function DiffSection({ title, items, category }: { title: string; items: any[]; category: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center justify-between bg-gray-900 px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-xs text-gray-500">{items.length} difference(s)</span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-950">
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Field</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Machine A</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Machine B</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Severity</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => <DiffRow key={i} item={item} category={category} />)}
        </tbody>
      </table>
    </div>
  );
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState<'diff' | 'bridge' | 'comments'>('diff');
  const [selectedSnap, setSelectedSnap] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => sessionsApi.get(id!),
  });

  const { data: diffData, refetch: runDiff } = useQuery({
    queryKey: ['session-diff', id],
    queryFn: () => sessionsApi.getDiff(id!),
    enabled: false,
  });

  const { data: snapsData } = useQuery({
    queryKey: ['snapshots-list'],
    queryFn: () => snapshotsApi.list({ limit: 50 }),
  });

  const attachMut = useMutation({
    mutationFn: ({ snapshotId, role }: { snapshotId: string; role: 'reporter' | 'compare' }) =>
      sessionsApi.attachSnapshot(id!, snapshotId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session', id] }),
  });

  const commentMut = useMutation({
    mutationFn: (text: string) => sessionsApi.comment(id!, text),
    onSuccess: () => { setComment(''); qc.invalidateQueries({ queryKey: ['session', id] }); },
  });

  const statusMut = useMutation({
    mutationFn: (status: string) => sessionsApi.update(id!, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session', id] }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading…</div>;
  if (!data) return <div className="p-6 text-red-400">Session not found.</div>;

  const s = data.session;
  const diff = diffData;
  const mySnaps = snapsData?.snapshots || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <Link to="/sessions" className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-3">
          <ArrowLeft size={13} /> Back to Sessions
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-white">{s.title}</h1>
              <span className={`badge-status-${s.status}`}>{s.status}</span>
            </div>
            {s.errorMessage && <p className="text-sm font-mono text-red-400">{s.errorMessage}</p>}
          </div>
          <div className="flex items-center gap-2">
            {s.status !== 'resolved' && (
              <button onClick={() => statusMut.mutate('resolved')} className="btn-primary text-xs py-1.5 px-3 bg-green-700 hover:bg-green-600">
                <CheckCircle2 size={13} /> Mark Resolved
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Attach snapshot */}
      <div className="card flex items-center gap-3">
        <Camera size={16} className="text-sky-400 shrink-0" />
        <p className="text-sm text-gray-400 flex-1">Attach snapshots to compare environments:</p>
        <select className="input w-48 text-xs" value={selectedSnap} onChange={(e) => setSelectedSnap(e.target.value)}>
          <option value="">Select snapshot…</option>
          {mySnaps.map((snap: any) => <option key={snap._id} value={snap._id}>{snap.label}</option>)}
        </select>
        <button
          disabled={!selectedSnap}
          onClick={() => { attachMut.mutate({ snapshotId: selectedSnap, role: s.reporterSnapshot ? 'compare' : 'reporter' }); setSelectedSnap(''); }}
          className="btn-secondary text-xs py-1.5 px-3"
        >
          {s.reporterSnapshot ? 'Add Compare' : 'Set as Reporter'}
        </button>
        {s.reporterSnapshot && s.compareSnapshots?.length > 0 && (
          <button onClick={() => { runDiff(); setActiveTab('diff'); }} className="btn-primary text-xs py-1.5 px-3">
            Run Diff →
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800">
        {(['diff', 'bridge', 'comments'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize -mb-px ${
              activeTab === tab ? 'border-sky-500 text-sky-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'diff' && '🔍 Diff'}
            {tab === 'bridge' && '🔧 Bridge'}
            {tab === 'comments' && `💬 Comments (${s.comments?.length || 0})`}
          </button>
        ))}
      </div>

      {/* Diff tab */}
      {activeTab === 'diff' && (
        <div className="space-y-4">
          {!diff ? (
            <div className="card text-center py-12 text-gray-500">
              <p className="text-sm mb-3">Attach a reporter and compare snapshot, then click "Run Diff" to see differences.</p>
            </div>
          ) : diff.diffs?.map((d: any, i: number) => (
            <div key={i} className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-white">vs <span className="text-sky-400">{d.label}</span></h3>
                <span className={`badge-risk-${d.diff.riskLevel}`}>{d.diff.riskLevel} risk</span>
                <span className="text-xs text-gray-500">{d.diff.summary}</span>
              </div>
              <DiffSection title="Runtime Differences" items={d.diff.runtimes} category="runtimes" />
              <DiffSection title="System Differences" items={d.diff.system} category="system" />
              <DiffSection title="Package Differences" items={d.diff.packages} category="packages" />
              <DiffSection title="Environment Variable Differences" items={d.diff.envVars} category="env" />
            </div>
          ))}
        </div>
      )}

      {/* Bridge tab */}
      {activeTab === 'bridge' && (
        <div className="space-y-4">
          {diff?.resolvedBridge ? (
            <>
              <p className="text-sm text-gray-400">Auto-generated bridge to reproduce the environment causing this bug:</p>
              {['dockerfile', 'setupSh', 'envTemplate', 'dockerCompose'].map((key) => (
                diff.resolvedBridge[key] && (
                  <div key={key} className="rounded-xl border border-gray-800 overflow-hidden">
                    <div className="bg-gray-900 px-4 py-2.5 border-b border-gray-800 text-xs font-mono text-gray-400">
                      {key === 'setupSh' ? 'setup.sh' : key === 'envTemplate' ? '.env.template' : key === 'dockerCompose' ? 'docker-compose.yml' : 'Dockerfile'}
                    </div>
                    <pre className="code-block rounded-none text-gray-300 text-xs max-h-72">{diff.resolvedBridge[key]}</pre>
                  </div>
                )
              ))}
            </>
          ) : (
            <div className="card text-center py-12 text-gray-500">Run a diff first to auto-generate bridge artifacts.</div>
          )}
        </div>
      )}

      {/* Comments tab */}
      {activeTab === 'comments' && (
        <div className="space-y-4">
          {s.comments?.map((c: any) => (
            <div key={c._id} className="card flex items-start gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-xs font-bold text-gray-300 shrink-0">
                {c.author?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white">{c.author?.username}</span>
                  <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                </div>
                <p className="text-sm text-gray-300">{c.text}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-3">
            <textarea
              className="input flex-1 min-h-[80px] resize-y"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment…"
            />
            <button
              disabled={!comment.trim() || commentMut.isPending}
              onClick={() => commentMut.mutate(comment)}
              className="btn-primary self-end"
            >
              <MessageCircle size={15} /> Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
