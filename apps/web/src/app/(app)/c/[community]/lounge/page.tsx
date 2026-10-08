import type { Metadata } from 'next';
import { SpacePage } from '@/features/messaging/space-page';

export const metadata: Metadata = { title: 'Lounge' };

interface Props {
  params: Promise<{ community: string }>;
  searchParams: Promise<{ before?: string }>;
}

export default async function LoungePage({ params, searchParams }: Props) {
  return <SpacePage slug={(await params).community} spaceKey="lounge" before={(await searchParams).before} />;
}
