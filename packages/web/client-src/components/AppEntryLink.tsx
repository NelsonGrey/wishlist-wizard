import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { useAppOffline } from '@/hooks/useAppOffline';

interface AppEntryLinkProps {
  href: string;
  className: string;
  onClick?: () => void;
  children: ReactNode;
  wrapperClassName?: string;
  noteClassName?: string;
}

/**
 * A wouter Link into app entry flows (sign-up, sign-in) that respects the
 * app_offline Remote Config kill switch — stays visible but disabled with an
 * inline note instead of disappearing or leading to a dead end, for a
 * pre-launch window or a maintenance outage (see hooks/useAppOffline).
 */
export default function AppEntryLink({
  href,
  className,
  onClick,
  children,
  wrapperClassName = 'inline-flex flex-col items-center gap-1',
  noteClassName = 'text-xs text-gray-500',
}: AppEntryLinkProps) {
  const isOffline = useAppOffline();

  if (isOffline) {
    return (
      <span className={wrapperClassName}>
        <span
          aria-disabled="true"
          className={`${className} opacity-50 cursor-not-allowed pointer-events-none`}
        >
          {children}
        </span>
        <span className={noteClassName}>Currently unavailable</span>
      </span>
    );
  }

  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
