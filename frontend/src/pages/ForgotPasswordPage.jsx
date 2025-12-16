import { useState } from 'react';
import { Link } from 'react-router-dom';

import { httpClient } from '../services/httpClient.js';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email) return;

    setStatus('loading');
    setMessage('');

    try {
      const { data } = await httpClient.post('/auth/forgot-password', { email });
      setStatus('success');
      setMessage(
        data.message || 'If an account with that email exists, we sent a password reset link.',
      );
    } catch (error) {
      setStatus('error');
      // For security reasons, we show a generic message even on errors
      // to prevent email enumeration attacks
      setMessage(
        error.response?.data?.message ||
          'If an account with that email exists, we sent a password reset link.',
      );
    }
  };

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';

  return (
    <section className="mx-auto max-w-md space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Forgot your password?</h1>
        <p className="text-sm text-slate-600">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </header>

      {isSuccess ? (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>
          <p className="text-center text-sm text-slate-600">
            <Link to="/login" className="text-primary font-medium hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {status === 'error' && message && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="bg-primary text-primary-foreground flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-75"
          >
            {isLoading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-slate-600">
        Remember your password?{' '}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Log in
        </Link>
      </p>
    </section>
  );
};

export default ForgotPasswordPage;
