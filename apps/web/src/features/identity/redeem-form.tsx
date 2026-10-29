'use client';

import { BADGES, type BadgeKey } from '@worldroot/contracts';
import { Button, TextField } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';

/** Enter a code, such as the one sent to Kickstarter backers, to claim what it carries. */
export function RedeemForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    const code = new FormData(element).get('code');
    setPending(true);
    setDone(null);
    const result = await send<{ redeemed: { heartwood: boolean; months: number | null; badge: BadgeKey | null } }>('POST', '/api/v1/codes/redeem', { code });
    setPending(false);
    if (!result.ok || !result.data) return setError(result.message);
    setError(null);
    element.reset();
    const { heartwood, months, badge } = result.data.redeemed;
    const gifts = [heartwood ? (months ? `${months} ${months === 1 ? 'month' : 'months'} of WorldRoot Heartwood` : 'WorldRoot Heartwood') : null, badge ? `the ${BADGES[badge].label} badge` : null].filter(Boolean).join(' and ');
    setDone(`Done. Your account now has ${gifts}. Thank you for your support.`);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-3" noValidate>
      <TextField
        label="Code"
        name="code"
        placeholder="WR-XXXX-XXXX-XXXX"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={40}
        error={error ?? undefined}
        hint="Backed WorldRoot on Kickstarter? Enter the code you were sent to claim Heartwood and your backer badge. Each code works once."
      />
      {done ? (
        <p role="status" className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-text">
          {done}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Checking…' : 'Redeem'}
        </Button>
      </div>
    </form>
  );
}
