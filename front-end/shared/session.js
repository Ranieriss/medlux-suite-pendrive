export const SESSION_USER_ID = 'medlux_user_id';
export const SESSION_ROLE = 'medlux_role';

export function setSession(user) {
  sessionStorage.setItem(SESSION_USER_ID, user.user_id);
  sessionStorage.setItem(SESSION_ROLE, user.role);
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_USER_ID);
  sessionStorage.removeItem(SESSION_ROLE);
}

export function getSession() {
  const userId = sessionStorage.getItem(SESSION_USER_ID);
  const role = sessionStorage.getItem(SESSION_ROLE);
  if (!userId || !role) {
    return null;
  }
  return { user_id: userId, role };
}

export function requireAuth(redirectPath) {
  const session = getSession();
  if (!session) {
    window.location.href = redirectPath;
  }
  return session;
}
