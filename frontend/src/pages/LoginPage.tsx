import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GitBranch } from 'lucide-react';
import { useAuth } from '../store/auth';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
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
          <p className="mt-1 text-sm text-gray-400">Solve "It works on my machine" forever</p>
        </div>

        <form onSubmit={submit} className="card space-y-4">
          <h2 className="text-lg font-semibold">Sign in</h2>
          {error && <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" required />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Password</label>
            <div className="relative">
              <input className="input pr-10" type={showPw ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center">
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-xs text-gray-500">
            No account?{' '}
            <Link to="/register" className="text-sky-400 hover:underline">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
