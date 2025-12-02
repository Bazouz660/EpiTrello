import zxcvbn from 'zxcvbn';

const MIN_SCORE = 3;
const FALLBACK_FEEDBACK =
  'Use a longer password with a mix of upper/lowercase letters, numbers, and symbols.';

export const assessPassword = (password) => {
  const result = zxcvbn(password);
  const feedback = result.feedback.warning || result.feedback.suggestions[0] || FALLBACK_FEEDBACK;

  return {
    score: result.score,
    feedback,
  };
};

export const isPasswordStrongEnough = (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    return {
      ok: false,
      feedback: 'Password must be at least 8 characters long.',
    };
  }

  const { score, feedback } = assessPassword(password);
  if (score < MIN_SCORE) {
    return {
      ok: false,
      feedback,
    };
  }

  return { ok: true, feedback: null };
};

export const PASSWORD_MIN_SCORE = MIN_SCORE;
