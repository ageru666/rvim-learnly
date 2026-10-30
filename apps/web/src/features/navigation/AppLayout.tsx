import { Menu } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet } from 'react-router';
import { Drawer } from '../../shared/components/Drawer';
import { IconButton } from '../../shared/components/IconButton';
import { useGetMeQuery } from '../auth/authApi';
import { useLogout } from '../auth/useLogout';
import { VerifyEmailBanner } from '../auth/VerifyEmailBanner';
import { LocaleSwitcher } from '../locale/LocaleSwitcher';
import { NotificationBell } from '../notifications/NotificationBell';
import { useT } from '../locale/useT';
import { ThemeToggle } from '../theme/ThemeToggle';
import { Logo } from './components/Logo';
import { MainNav } from './components/MainNav';
import { UserMenu } from './components/UserMenu';
import { selectMobileMenuOpen, setMobileMenuOpen } from './navigationSlice';

/**
 * Dashboard shell: the same header language as the SSR site, navigation and the page outlet. Instructors and
 * admins have six navigation items, so the inline navigation starts at `xl` and the drawer serves smaller screens.
 */
export function AppLayout() {
  const { t } = useT();
  const dispatch = useDispatch();
  const menuOpen = useSelector(selectMobileMenuOpen);
  const { data: me } = useGetMeQuery();
  const logout = useLogout();
  const closeMenu = () => dispatch(setMobileMenuOpen(false));

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="btn btn-primary sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50">
        {t('site.skipLink')}
      </a>
      <header className="border-b border-border bg-bg">
        <div className="page-container flex h-16 items-center gap-4">
          <IconButton
            className="xl:hidden"
            label={t('site.header.openMenu')}
            icon={<Menu aria-hidden size={20} />}
            onClick={() => dispatch(setMobileMenuOpen(true))}
          />
          <Logo />
          <div className="hidden xl:block">{me && <MainNav role={me.role} />}</div>
          <div className="ml-auto flex items-center gap-1">
            <div className="hidden sm:block">
              <LocaleSwitcher />
            </div>
            <ThemeToggle />
            {me && <NotificationBell />}
            {me && <UserMenu me={me} onLogout={logout} />}
          </div>
        </div>
      </header>

      <Drawer open={menuOpen} onOpenChange={(open) => dispatch(setMobileMenuOpen(open))} title={t('site.meta.brand')} closeLabel={t('site.header.closeMenu')}>
        {me && <MainNav role={me.role} vertical onNavigate={closeMenu} />}
        <LocaleSwitcher />
      </Drawer>

      <main id="main" tabIndex={-1} className="page-container flex flex-1 flex-col gap-6 py-8">
        <VerifyEmailBanner />
        <Outlet />
      </main>
    </div>
  );
}
