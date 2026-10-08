import type { Metadata } from 'next';
import { SpacePage } from '@/features/messaging/space-page';

export const metadata: Metadata = { title: 'Announcements' };

interface Props {
  params: Promise<{ community: string }>;
  searchParams: Promise<{ before?: string }>;
}

export default async function AnnouncementsPage({ params, searchParams }: Props) {
  return <SpacePage slug={(await params).community} spaceKey="announcements" before={(await searchParams).before} />;
}
