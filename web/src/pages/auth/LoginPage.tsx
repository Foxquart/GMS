import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-primary-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25 mb-4">
            <Wrench size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Garage Manager</h1>
          <p className="text-surface-400 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-float p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <div className="bg-danger-50 text-danger-600 text-sm font-medium px-4 py-3 rounded-xl border border-danger-500/20 animate-fade-in">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-surface-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@garage.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-surface-50
                         text-surface-900 placeholder:text-surface-400
                         focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500
                         transition-all duration-200 text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-surface-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-surface-200 bg-surface-50
                           text-surface-900 placeholder:text-surface-400
                           focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500
                           transition-all duration-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700
                       text-white font-semibold text-sm
                       hover:from-primary-700 hover:to-primary-800
                       focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2
                       disabled:opacity-60 disabled:cursor-not-allowed
                       transition-all duration-200
                       shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Dev hint */}
          <div className="mt-5 pt-4 border-t border-surface-100">
            <p className="text-xs text-surface-400 text-center">
              Default: <span className="font-mono text-surface-500">admin@garage.com</span> / <span className="font-mono text-surface-500">admin123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
