import { BookOpen, Compass, Heart, Home, Library, ShoppingBag, Users, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const HOME_ITEM: NavItem = { href: '/home', label: 'Home', icon: Home };
const DISCOVER: NavItem = { href: '/discover', label: 'Discover', icon: Compass };
const SCENES: NavItem = { href: '/scenes', label: 'Scenes', icon: BookOpen };
const LIBRARY: NavItem = { href: '/library', label: 'Library', icon: Library };
const STORE: NavItem = { href: '/store', label: 'Store', icon: ShoppingBag };
const SUPPORT: NavItem = { href: '/support', label: 'Support Us', icon: Heart };
const COMMUNITIES: NavItem = { href: '/communities', label: 'Communities', icon: Users };

/** The side rail's Resources section: the places that are yours wherever you are. */
export const RESOURCE_ITEMS: NavItem[] = [DISCOVER, SCENES, LIBRARY, STORE, SUPPORT];

/** The phone's bottom bar. Create sits in the middle of these four. */
export const MOBILE_ITEMS: NavItem[] = [HOME_ITEM, DISCOVER, SCENES, COMMUNITIES];

/** Reached from the account menu on a phone, where the bottom bar has no room for them. */
export const MENU_ITEMS: NavItem[] = [LIBRARY, STORE, SUPPORT];
