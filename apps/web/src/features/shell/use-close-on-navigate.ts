'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/** For a `<details>` menu in the shell: closes it when the route changes or a click lands outside it. */
export function useCloseOnNavigate() {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    ref.current?.removeAttribute('open');
  }, [pathname]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current?.open && !ref.current.contains(event.target as Node)) ref.current.removeAttribute('open');
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return ref;
}
