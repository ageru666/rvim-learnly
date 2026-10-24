import type { Role } from '@learnly/contracts/enums';
import type { ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router';
import { ExternalRedirect } from '../../shared/components/ExternalRedirect';
import { PageLoader } from '../../shared/components/PageLoader';
import { config } from '../../shared/config';
import { NotFoundPage } from '../navigation/NotFoundPage';
import { useGetMeQuery } from './authApi';
import { selectSessionExpired } from './authSlice';

interface RequireAuthProps {
  children: ReactNode;
  /** Restricts the route to these roles; other signed-in users see the not-found page. */
  roles?: Role[];
}

/** Login lives on the server-rendered site, so a guest is sent there and returns afterwards. */
export function RequireAuth({ children, roles }: RequireAuthProps) {
  const location = useLocation();
  const expired = useSelector(selectSessionExpired);
  const { data: me, isLoading, isError } = useGetMeQuery();

  if (isLoading) return <PageLoader />;
  if (expired || isError || !me) {
    const returnTo = `${config.appBasePath}${location.pathname}${location.search}`;
    return <ExternalRedirect to={`/login?returnTo=${encodeURIComponent(returnTo)}`} />;
  }
  if (roles && !roles.includes(me.role)) return <NotFoundPage />;
  return children;
}
