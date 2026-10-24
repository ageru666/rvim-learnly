import type { Me } from '@learnly/contracts/me';
import { ChevronDown, LogOut, Shield } from 'lucide-react';
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
          <span className="hidden max-w-32 truncate text-sm md:inline">{me.name}</span>
          <ChevronDown aria-hidden size={16} />
        </button>
      }
    >
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
