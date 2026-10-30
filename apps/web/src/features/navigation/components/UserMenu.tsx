import type { Me } from '@learnly/contracts/me';
import { ChevronDown, LogOut, Settings, Shield, UserRound } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar } from '../../../shared/components/Avatar';
import { DropdownMenu } from '../../../shared/components/DropdownMenu';
import { DropdownMenuItem } from '../../../shared/components/DropdownMenuItem';
import { useT } from '../../locale/useT';

interface UserMenuProps {
  me: Me;
  onLogout: () => void;
}

export function UserMenu({ me, onLogout }: UserMenuProps) {
  const { t } = useT();
  return (
    <DropdownMenu
      trigger={
        <button type="button" className="btn btn-ghost gap-2" aria-label={t('site.header.userMenu')}>
          <Avatar name={me.name} src={me.avatarUrl} />
          <span className="hidden max-w-32 truncate text-sm 2xl:inline">{me.name}</span>
          <ChevronDown aria-hidden size={16} />
        </button>
      }
    >
      <DropdownMenuItem asChild>
        <Link to="/profile">
          <UserRound aria-hidden size={16} />
          {t('app.profile.title')}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/settings">
          <Settings aria-hidden size={16} />
          {t('app.settings.title')}
        </Link>
      </DropdownMenuItem>
      {me.role === 'admin' && (
        <DropdownMenuItem asChild>
          <a href="/admin">
            <Shield aria-hidden size={16} />
            {t('site.header.admin')}
          </a>
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onSelect={onLogout}>
        <LogOut aria-hidden size={16} />
        {t('site.header.logout')}
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
