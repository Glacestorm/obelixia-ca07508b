/**
 * ApprovalGuard — Redirects unapproved users to pending page.
 * Allows access to: /store/*, auth page, and /pending-approval.
 */
import { useAuth } from '@/hooks/useAuth';
import { useLocation, Navigate } from 'react-router-dom';

// Routes that unapproved users can still access
const ALLOWED_PREFIXES = ['/store', '/pending-approval', '/portal-cliente'];
const ALLOWED_EXACT = ['/', '/auth'];

function isAllowedRoute(pathname: string): boolean {
  if (ALLOWED_EXACT.includes(pathname)) return true;
  return ALLOWED_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export function ApprovalGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isApproved, isSuperAdmin } = useAuth();
  const location = useLocation();

  // Still loading or not logged in — let through (auth pages handle login)
  if (loading || !user) return <>{children}</>;

  // Superadmins always have access
  if (isSuperAdmin) return <>{children}</>;

  // Approved users pass through
  if (isApproved) return <>{children}</>;

  // Unapproved user on an allowed route — let through
  if (isAllowedRoute(location.pathname)) return <>{children}</>;

  // Unapproved user on a restricted route — redirect
  return <Navigate to="/pending-approval" replace />;
}
