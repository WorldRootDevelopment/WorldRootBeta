'use client';

import { cn } from '@worldroot/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface NavLinkProps {
  href: string;
  /** Match only this exact path, not the routes beneath it. */
  exact?: boolean;
  className?: string;
  activeClassName?: string;
  children: ReactNode;
}

/** A link that marks itself as the current page, by default for any route beneath it. */
export function NavLink({ href, exact = false, className, activeClassName, children }: NavLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || (!exact && pathname.startsWith(`${href}/`));
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={cn(className, active && activeClassName)}>
      {children}
    </Link>
  );
}
