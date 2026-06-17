import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { sessionsApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function NewSessionModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', errorMessage: '', reproSteps: '', isPublic: false, tags: '' });
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const mut = useMutation({
    mutationFn: (data: any) => sessionsApi.create(data),
    onSuccess: (data) => { onClose(); navigate(`/sessions/${data.session._id}`); },
    onError: (err: any) => setError(err.response?.data?.error || 'Failed'),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mut.mutate({
      ...form,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <h2 className="font-semibold text-white">New Debug Session</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Title *</label>
            <input className="input" value={form.title} onChange={set('title')} placeholder="Login fails on Windows but not Mac" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Error message</label>
            <input className="input font-mono text-xs" value={form.errorMessage} onChange={set('errorMessage')} placeholder="TypeError: Cannot read property 'x' of undefined" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Description</label>
            <textarea className="input min-h-[80px] resize-y" value={form.description} onChange={set('description')} placeholder="What's happening? When did it start?" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Steps to reproduce</label>
            <textarea className="input min-h-[60px] resize-y" value={form.reproSteps} onChange={set('reproSteps')} placeholder="1. Clone repo&#10;2. Run npm install&#10;3. Run npm dev" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Tags (comma-separated)</label>
            <input className="input" value={form.tags} onChange={set('tags')} placeholder="node, docker, windows" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))} className="rounded" />
            <span className="text-sm text-gray-400">Make this session public</span>
          </label>
        </form>
        <div className="flex justify-end gap-3 border-t border-gray-800 px-5 py-4">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={submit as any} disabled={mut.isPending} className="btn-primary">
            {mut.isPending ? 'Creating…' : 'Create Session'}
          </button>
        </div>
      </div>
    </div>
  );
}
