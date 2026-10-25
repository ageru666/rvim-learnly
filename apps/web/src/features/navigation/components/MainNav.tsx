import type { Role } from '@learnly/contracts/enums';
import { Award, BookOpen, GraduationCap, LayoutDashboard, MessageSquare, Search, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';
import type { MessageKey } from '@learnly/i18n/keys';
import { cx } from '../../../shared/utils/cx';
import { useT } from '../../locale/useT';

interface NavItem {
  to: string;
  label: MessageKey;
  icon: LucideIcon;
  roles?: Role[];
  /** Links to the server-rendered site leave the SPA. */
  external?: boolean;
}

const ITEMS: NavItem[] = [
  { to: '/', label: 'site.header.dashboard', icon: LayoutDashboard },
  { to: '/courses', label: 'site.header.myCourses', icon: BookOpen },
  { to: '/certificates', label: 'app.certificates.title', icon: Award },
  { to: '/teach', label: 'site.header.teaching', icon: GraduationCap, roles: ['instructor', 'admin'] },
  { to: '/teach/reviews', label: 'app.teachReviews.navLabel', icon: MessageSquare, roles: ['instructor', 'admin'] },
  { to: '/courses', label: 'site.header.catalog', icon: Search, external: true },
];

const LINK_CLASS = 'btn btn-ghost justify-start';

interface MainNavProps {
  role: Role;
  vertical?: boolean;
  onNavigate?: () => void;
}

export function MainNav({ role, vertical = false, onNavigate }: MainNavProps) {
  const { t, translate } = useT();
  const items = ITEMS.filter((item) => !item.roles || item.roles.includes(role));
  return (
    <nav aria-label={t('app.layout.dashboard')}>
      <ul className={cx('flex gap-1', vertical ? 'flex-col' : 'items-center')}>
        {items.map(({ to, label, icon: Icon, external }) => (
          <li key={label}>
            {external ? (
              <a href={to} className={LINK_CLASS}>
                <Icon aria-hidden size={16} />
                {translate(label)}
              </a>
            ) : (
              <NavLink
                to={to}
                end
                onClick={onNavigate}
                className={({ isActive }) => cx(LINK_CLASS, isActive && 'bg-surface-selected font-bold')}
              >
                <Icon aria-hidden size={16} />
                {translate(label)}
              </NavLink>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
