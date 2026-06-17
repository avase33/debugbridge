import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GitBranch } from 'lucide-react';
import { useAuth } from '../store/auth';

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', username: '', fullName: '', password: '' });
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600">
            <GitBranch size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">DebugBridge</h1>
          <p className="mt-1 text-sm text-gray-400">Create your account</p>
        </div>

        <form onSubmit={submit} className="card space-y-4">
          {error && <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Full name</label>
            <input className="input" value={form.fullName} onChange={set('fullName')} placeholder="Ada Lovelace" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Username</label>
            <input className="input" value={form.username} onChange={set('username')} placeholder="adalovelace" required minLength={3} maxLength={32} pattern="[a-zA-Z0-9]+" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Email</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="ada@company.com" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Password</label>
            <input className="input" type="password" value={form.password} onChange={set('password')} placeholder="min 8 characters" required minLength={8} />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center">
            {isLoading ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-center text-xs text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-sky-400 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
