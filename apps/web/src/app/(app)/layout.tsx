import type { ReactNode } from 'react';
import { AppShell } from '@/features/shell/app-shell';
import { requireViewer } from '@/lib/session';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewer();
  return <AppShell profile={viewer.profile}>{children}</AppShell>;
}
