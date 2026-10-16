import { redirect } from 'next/navigation';

/** The Lounge is now the first of a community's chat channels. Old links to it land on the chat. */
export default async function LoungePage({ params }: { params: Promise<{ community: string }> }) {
  redirect(`/c/${(await params).community}/chat`);
}
