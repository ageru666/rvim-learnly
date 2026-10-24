import { THEMES, type Theme } from '@learnly/contracts/enums';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { DropdownMenu } from '../../shared/components/DropdownMenu';
import { DropdownMenuItem } from '../../shared/components/DropdownMenuItem';
import { useT } from '../locale/useT';
import { selectTheme, setTheme } from './themeSlice';

const ICONS: Record<Theme, LucideIcon> = { light: Sun, dark: Moon, system: Monitor };

export function ThemeToggle() {
  const { t } = useT();
  const theme = useSelector(selectTheme);
  const dispatch = useDispatch();
  const CurrentIcon = ICONS[theme];

  return (
    <DropdownMenu
      trigger={
        <button type="button" className="btn btn-ghost btn-icon" aria-label={t('site.theme.label')}>
          <CurrentIcon aria-hidden size={20} />
        </button>
      }
    >
      {THEMES.map((option) => {
        const Icon = ICONS[option];
        return (
          <DropdownMenuItem
            key={option}
            onSelect={() => dispatch(setTheme(option))}
            aria-current={option === theme || undefined}
          >
            <Icon aria-hidden size={16} />
            {t(`site.theme.${option}`)}
          </DropdownMenuItem>
        );
      })}
    </DropdownMenu>
  );
}
