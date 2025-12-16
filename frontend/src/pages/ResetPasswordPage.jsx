import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import zxcvbn from 'zxcvbn';

import { httpClient } from '../services/httpClient.js';

const MIN_PASSWORD_SCORE = 3;
const STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
const STRENGTH_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-lime-500',
  'bg-emerald-600',
];

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [formState, setFormState] = useState({
    password: '',
    confirmPassword: '',
  });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');
  const [passwordErrors, setPasswordErrors] = useState([]);

  const passwordStrength = useMemo(() => {
    if (!formState.password) return null;
    return zxcvbn(formState.password);
  }, [formState.password]);

  const isPasswordStrong = passwordStrength ? passwordStrength.score >= MIN_PASSWORD_SCORE : false;
  const passwordsMatch =
    !formState.confirmPassword || formState.password === formState.confirmPassword;
  const passwordStrengthFeedback = passwordStrength
    ? passwordStrength.feedback.warning || passwordStrength.feedback.suggestions[0]
    : '';
  const strengthPercent = passwordStrength ? (passwordStrength.score / 4) * 100 : 0;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    if (message) setMessage('');
    if (passwordErrors.length) setPasswordErrors([]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isPasswordStrong) {
      setStatus('error');
      setMessage('Please choose a stronger password.');
      return;
    }

    if (formState.password !== formState.confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match');
      return;
    }

    setStatus('loading');
    setMessage('');
    setPasswordErrors([]);

    try {
      await httpClient.post('/auth/reset-password', {
        token,
        password: formState.password,
      });
      setStatus('success');
      setMessage('Your password has been reset successfully!');
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      setStatus('error');
      const errorData = error.response?.data;
      setMessage(errorData?.message || 'Failed to reset password. Please try again.');
      if (errorData?.details) {
        setPasswordErrors(errorData.details);
      }
    }
  };

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';

  if (!token) {
    return (
      <section className="mx-auto max-w-md space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Invalid link</h1>
          <p className="text-sm text-slate-600">
            This password reset link is invalid or has expired.
          </p>
        </header>
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-center text-sm text-slate-600">
            <Link to="/forgot-password" className="text-primary font-medium hover:underline">
              Request a new password reset link
            </Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Reset your password</h1>
        <p className="text-sm text-slate-600">Enter your new password below.</p>
      </header>

      {isSuccess ? (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>
          <p className="text-center text-sm text-slate-600">Redirecting to login...</p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              value={formState.password}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            />
            {passwordStrength && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Strength: {STRENGTH_LABELS[passwordStrength.score]}</span>
                  <span>Score {passwordStrength.score}/4</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full ${STRENGTH_COLORS[passwordStrength.score]}`}
                    style={{ width: `${strengthPercent}%` }}
                  />
                </div>
                {!isPasswordStrong && (
                  <p className="text-xs text-amber-600">
                    {passwordStrengthFeedback ||
                      'Use a longer password with unique words, numbers, and symbols.'}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              value={formState.confirmPassword}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            />
            {formState.confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-600">Passwords do not match.</p>
            )}
          </div>

          {status === 'error' && message && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              <p>{message}</p>
              {passwordErrors.length > 0 && (
                <ul className="mt-1 list-inside list-disc">
                  {passwordErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !isPasswordStrong || !passwordsMatch}
            className="bg-primary text-primary-foreground flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-75"
          >
            {isLoading ? 'Resetting...' : 'Reset password'}
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

export default ResetPasswordPage;
