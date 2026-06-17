import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Copy, CheckCircle, Monitor, Package, Key, FileCode, GitBranch } from 'lucide-react';
import { snapshotsApi } from '../lib/api';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={copy} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200">
      {copied ? <><CheckCircle size={12} className="text-green-400" /> Copied</> : <><Copy size={12} /> Copy</>}
    </button>
  );
}

function CodeBlock({ content, title, downloadUrl }: { content: string; title: string; downloadUrl?: string }) {
  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between bg-gray-900 px-4 py-2.5 border-b border-gray-800">
        <span className="text-xs font-mono text-gray-400">{title}</span>
        <div className="flex items-center gap-3">
          <CopyButton text={content} />
          {downloadUrl && (
            <a href={downloadUrl} download className="flex items-center gap-1 text-xs text-sky-400 hover:underline">
              <Download size={12} /> Download
            </a>
          )}
        </div>
      </div>
      <pre className="code-block rounded-none text-gray-300 text-xs overflow-x-auto max-h-96">{content}</pre>
    </div>
  );
}

function RiskTag({ level }: { level?: string }) {
  if (!level) return null;
  return <span className={`badge-risk-${level}`}>{level} risk</span>;
}

export default function SnapshotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'bridge'>('overview');

  const { data, isLoading, error } = useQuery({
    queryKey: ['snapshot', id],
    queryFn: () => snapshotsApi.get(id!),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading…</div>;
  if (error || !data) return <div className="p-6 text-red-400">Snapshot not found.</div>;

  const s = data.snapshot;
  const b = s.bridge;
  const BASE = import.meta.env.VITE_API_URL || '/api';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <Link to="/snapshots" className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-3">
          <ArrowLeft size={13} /> Back to Snapshots
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{s.label}</h1>
            <p className="mt-1 text-sm text-gray-400">
              {s.system?.os} {s.system?.arch} · {s.system?.hostname} · captured {new Date(s.capturedAt || s.createdAt).toLocaleDateString()}
            </p>
          </div>
          {s.gitBranch && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 border border-gray-700 rounded-lg px-3 py-1.5">
              <GitBranch size={13} className="text-sky-400" />
              <span className="font-mono">{s.gitBranch}</span>
              {s.gitCommit && <span className="text-gray-600 font-mono">{s.gitCommit.slice(0, 7)}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800">
        {(['overview', 'bridge'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize -mb-px ${
              activeTab === tab
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'bridge' ? '🔧 Bridge Artifacts' : '📋 Overview'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System */}
          <div className="card space-y-3">
            <h3 className="flex items-center gap-2 font-semibold text-white"><Monitor size={16} className="text-sky-400" /> System Info</h3>
            <div className="space-y-1.5 text-sm">
              {Object.entries(s.system || {}).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                  <span className="text-gray-200 font-mono text-xs">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Runtimes */}
          <div className="card space-y-3">
            <h3 className="flex items-center gap-2 font-semibold text-white"><FileCode size={16} className="text-violet-400" /> Runtimes</h3>
            {s.runtimes?.length === 0 ? <p className="text-sm text-gray-500">No runtimes detected</p> : (
              <div className="space-y-2">
                {s.runtimes?.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-gray-950 px-3 py-2">
                    <span className="text-sm font-medium text-gray-200">{r.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-sky-400">{r.version}</span>
                      {r.manager && <span className="text-xs text-gray-500">{r.manager}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Packages */}
          {s.packages?.length > 0 && (
            <div className="card space-y-3 lg:col-span-2">
              <h3 className="flex items-center gap-2 font-semibold text-white"><Package size={16} className="text-amber-400" /> Packages ({s.packages.length})</h3>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
                {s.packages.slice(0, 40).map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded bg-gray-950 px-2 py-1">
                    <span className="text-xs text-gray-300 truncate">{p.name}</span>
                    <span className="text-xs font-mono text-gray-500 ml-2 shrink-0">{p.version}</span>
                  </div>
                ))}
                {s.packages.length > 40 && (
                  <div className="flex items-center justify-center rounded bg-gray-950 px-2 py-1">
                    <span className="text-xs text-gray-600">+{s.packages.length - 40} more</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Env Vars */}
          {s.envVars?.length > 0 && (
            <div className="card space-y-3 lg:col-span-2">
              <h3 className="flex items-center gap-2 font-semibold text-white"><Key size={16} className="text-green-400" /> Environment Variables ({s.envVars.length})</h3>
              <div className="space-y-1">
                {s.envVars.map((e: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 rounded bg-gray-950 px-3 py-1.5">
                    <span className="text-xs font-mono text-gray-400 w-48 truncate shrink-0">{e.key}</span>
                    <span className={`text-xs font-mono ${e.masked ? 'text-amber-600 italic' : 'text-gray-300'}`}>
                      {e.masked ? '••••••••' : e.value || '(empty)'}
                    </span>
                    {e.masked && <span className="text-xs text-amber-600 bg-amber-900/20 px-1.5 py-0.5 rounded">masked</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bridge' && b && (
        <div className="space-y-5">
          <p className="text-sm text-gray-400">
            These files were auto-generated from the snapshot. Use them to reproduce this exact environment on any machine.
          </p>
          <CodeBlock
            title="Dockerfile"
            content={b.dockerfile}
            downloadUrl={snapshotsApi.bridgeDownloadUrl(s._id, 'dockerfile')}
          />
          <CodeBlock
            title="setup.sh"
            content={b.setupSh}
            downloadUrl={snapshotsApi.bridgeDownloadUrl(s._id, 'setup.sh')}
          />
          <CodeBlock
            title=".env.template"
            content={b.envTemplate}
            downloadUrl={snapshotsApi.bridgeDownloadUrl(s._id, 'env.template')}
          />
          <CodeBlock
            title="docker-compose.yml"
            content={b.dockerCompose}
            downloadUrl={snapshotsApi.bridgeDownloadUrl(s._id, 'docker-compose.yml')}
          />
        </div>
      )}

      {activeTab === 'bridge' && !b && (
        <div className="card text-center py-12 text-gray-500">No bridge artifacts available for this snapshot.</div>
      )}
    </div>
  );
}
