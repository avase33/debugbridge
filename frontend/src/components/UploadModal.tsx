import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Upload } from 'lucide-react';
import { snapshotsApi } from '../lib/api';

const EXAMPLE = JSON.stringify({
  label: "My MacBook Pro",
  system: { os: "darwin", osRelease: "macOS 14.5", arch: "arm64", shell: "/bin/zsh", cpuCores: 10, memoryGB: 16, hostname: "my-mac" },
  runtimes: [{ name: "node", version: "20.11.0" }, { name: "python", version: "3.12.0" }],
  envVars: [{ key: "NODE_ENV", value: "development" }, { key: "DATABASE_URL", value: "postgres://..." }],
  packages: [{ name: "react", version: "18.3.1" }, { name: "express", version: "4.18.0" }],
  dependencyFiles: [{ filename: "package.json", content: "{}" }],
  projectName: "my-app",
  gitBranch: "main"
}, null, 2);

export default function UploadModal({ onClose }: { onClose: () => void }) {
  const [json, setJson] = useState('');
  const [label, setLabel] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: (payload: any) => snapshotsApi.create(payload),
    onSuccess: () => onClose(),
    onError: (err: any) => setError(err.response?.data?.error || 'Upload failed'),
  });

  const submit = () => {
    setError('');
    let parsed: any;
    try { parsed = JSON.parse(json || '{}'); } catch { setError('Invalid JSON'); return; }
    mut.mutate({ ...parsed, label: label || undefined, isPublic });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <h2 className="font-semibold text-white">Upload Snapshot</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>}

          <p className="text-sm text-gray-400">
            Paste a snapshot JSON payload below, or run <code className="text-sky-400">npx debugbridge capture</code> in your project to generate one automatically.
          </p>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Label (optional)</label>
            <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="My MacBook Pro" />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-400">Snapshot JSON</label>
              <button onClick={() => setJson(EXAMPLE)} className="text-xs text-sky-400 hover:underline">Load example</button>
            </div>
            <textarea
              className="input min-h-[200px] resize-y font-mono text-xs"
              value={json}
              onChange={(e) => setJson(e.target.value)}
              placeholder='{"system":{"os":"darwin",...},"runtimes":[...]}'
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="rounded" />
            <span className="text-sm text-gray-400">Make this snapshot public</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-800 px-5 py-4">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={submit} disabled={mut.isPending} className="btn-primary">
            <Upload size={15} />
            {mut.isPending ? 'Uploading…' : 'Upload & Parse'}
          </button>
        </div>
      </div>
    </div>
  );
}
