import { DICE_THEME_KEYS, DICE_THEMES, FREE_LIMITS, PREMIUM, PREMIUM_LIMITS } from '@worldroot/contracts';
import { getPlanUsage, getStore } from '@worldroot/core';
import { buttonClass } from '@worldroot/ui';
import { Check, Clock, Heart, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Die } from '@/features/scenes/die';
import { PageHeader } from '@/features/shell/page-header';
import { SectionHeading } from '@/features/shell/prose';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Store' };

const SAMPLE = [6, 12, 20];

/**
 * The store. For now it is a catalogue: it shows what there is and what the
 * viewer already has, and sells nothing. There are no prices and no checkout
 * until WorldRoot has chosen how items are paid for.
 */
export default async function StorePage() {
  const viewer = await requireViewer();
  const { db } = await database();
  const [{ items }, usage] = await Promise.all([getStore(db, viewer.actor), getPlanUsage(db, viewer.actor)]);
  const free = DICE_THEME_KEYS.filter((key) => DICE_THEMES[key].free);

  return (
    <>
      <PageHeader title="Store" lead="Ways to make WorldRoot look your own. Nothing here changes what you can do or what a roll comes to." />

      <p role="status" className="wr-glass mb-2 flex max-w-3xl items-start gap-3 rounded-2xl p-4 text-sm text-ink">
        <Clock className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden="true" />
        <span>
          The store is coming soon. Nothing is on sale yet, and nothing here takes a payment. What you see is what is planned.{' '}
          <Link href="/support" className="font-medium text-accent-text underline underline-offset-2 hover:no-underline">
            Support WorldRoot
          </Link>{' '}
          if you would like to help in the meantime.
        </span>
      </p>

      <SectionHeading>{PREMIUM.name}</SectionHeading>
      <div className="wr-glass max-w-3xl rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
            <Sparkles className="size-5 text-accent-text" aria-hidden="true" />
            ${PREMIUM.monthlyPrice} A Month
          </p>
          {usage.premium ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent-text">
              <Check className="size-4" aria-hidden="true" />
              Yours
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-3 py-1 text-sm font-medium text-ink-muted">
              <Clock className="size-4" aria-hidden="true" />
              Coming Soon
            </span>
          )}
        </div>
        <ul className="ml-5 mt-4 list-disc space-y-1.5 text-ink">
          <li>
            As many characters as you like. A free account keeps {FREE_LIMITS.characters}.
          </li>
          <li>
            As many communities as you like. During the beta a free account can own {FREE_LIMITS.communities}.
          </li>
          <li>Links on your profile to where else you write and draw, such as Bluesky, Fur Affinity, Toyhouse and Archive Of Our Own.</li>
          <li>A button on your profile picture that opens your own website.</li>
          <li>
            Up to {PREMIUM_LIMITS.characterImages} pictures in each character&rsquo;s gallery. A free account adds {FREE_LIMITS.characterImages}.
          </li>
          <li>The Heartwood badge on your profile.</li>
        </ul>
        <p className="mt-4 text-sm text-ink-muted">
          {usage.premium
            ? 'Your account has Heartwood. Thank you.'
            : `You have ${usage.characters.used} of ${FREE_LIMITS.characters} characters and own ${usage.communities.used} of ${FREE_LIMITS.communities} communities. Nothing you already have is ever taken away.`}
        </p>
      </div>

      <SectionHeading>Dice Styles</SectionHeading>
      {items.length === 0 ? <p className="max-w-2xl text-ink-muted">New dice designs are being made for the store. Every style there is today is free.</p> : null}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <li key={item.key} className="wr-glass flex flex-col gap-3 rounded-2xl p-4">
            <div aria-hidden="true" className={`wr-dice-${item.theme} wr-dice-tray flex items-center justify-center rounded-xl px-2 py-2`}>
              {SAMPLE.map((sides) => (
                <Die key={sides} sides={sides} value={sides} small />
              ))}
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-ink">{item.label}</h3>
              <p className="text-sm text-ink-muted">{item.note}</p>
            </div>
            {item.owned ? (
              <p className="mt-auto flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent-text">
                  <Check className="size-4" aria-hidden="true" />
                  Yours
                </span>
                <Link href="/settings/customization" className={buttonClass('secondary')}>
                  Use It
                </Link>
              </p>
            ) : (
              <p className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-sunken px-3 py-1 text-sm font-medium text-ink-muted">
                <Clock className="size-4" aria-hidden="true" />
                Coming Soon
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-8">
        <Link href="/support" className={buttonClass('secondary')}>
          <Heart className="size-4" aria-hidden="true" />
          Support WorldRoot
        </Link>
      </p>

      <SectionHeading>Already Yours</SectionHeading>
      <p className="max-w-2xl text-ink-muted">
        Everyone has {free.map((key) => DICE_THEMES[key].label).join(', ')} dice at no cost. Choose between them under{' '}
        <Link href="/settings/customization" className="font-medium text-accent-text underline underline-offset-2 hover:no-underline">
          Customization
        </Link>
        .
      </p>
    </>
  );
}
