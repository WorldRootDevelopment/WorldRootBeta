import type { ReactNode } from 'react';

export function PageHeader({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <header className="mb-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">{title}</h1>
      {lead ? <p className="mt-2 max-w-2xl text-ink-muted">{lead}</p> : null}
    </header>
  );
}
