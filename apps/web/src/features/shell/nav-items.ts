import { BookOpen, Compass, Home, Inbox, Library, Users, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom bar. The rest live in the account menu on small screens. */
  mobile: boolean;
}

/** The six destinations. Create sits beside them as an action, not a destination. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/home', label: 'Home', icon: Home, mobile: true },
  { href: '/discover', label: 'Discover', icon: Compass, mobile: true },
  { href: '/scenes', label: 'Scenes', icon: BookOpen, mobile: true },
  { href: '/communities', label: 'Communities', icon: Users, mobile: false },
  { href: '/library', label: 'Library', icon: Library, mobile: false },
  { href: '/inbox', label: 'Inbox', icon: Inbox, mobile: true },
];
