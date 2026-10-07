import { buttonClass, Wordmark } from '@worldroot/ui';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/session';

const PILLARS = [
  { title: 'Create characters', body: 'Rich profiles that live in your own library and travel with you.' },
  { title: 'Build worlds', body: 'Settings, locations and lore in one place, for any genre.' },
  { title: 'Find each other', body: 'Communities and partners, discovered by what they write.' },
  { title: 'Write together', body: 'Scenes made for long-form prose, kept as living history.' },
];

export default async function LandingPage() {
  if (await getViewer()) redirect('/home');

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 md:px-8">
      <header className="flex h-16 items-center justify-between">
        <Wordmark />
        <Link href="/sign-in" className={buttonClass('ghost')}>
          Sign in
        </Link>
      </header>

      <main className="flex flex-1 flex-col justify-center py-16">
        <h1 className="max-w-3xl font-serif text-5xl font-semibold leading-tight tracking-tight text-ink md:text-6xl">
          Where stories take root.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted">
          WorldRoot is a home for text roleplay and collaborative storytelling. Characters, worlds, communities and the
          scenes you write together, in one place built for writing.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/sign-up" className={buttonClass('primary', 'lg')}>
            Create an account
          </Link>
          <Link href="/sign-in" className={buttonClass('secondary', 'lg')}>
            Sign in
          </Link>
        </div>

        <ul className="mt-20 grid gap-8 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map(({ title, body }) => (
            <li key={title}>
              <h2 className="font-serif text-lg font-semibold text-ink">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
