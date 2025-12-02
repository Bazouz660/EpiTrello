export const serializeUser = (user) => {
  if (!user) return null;

  const id = typeof user._id === 'object' && user._id !== null ? user._id.toString() : user.id;

  return {
    id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt ? user.createdAt.toISOString() : null,
    updatedAt: user.updatedAt ? user.updatedAt.toISOString() : null,
  };
};
