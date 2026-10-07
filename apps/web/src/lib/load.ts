import 'server-only';
import { DomainError } from '@worldroot/core';
import { notFound } from 'next/navigation';

/** Runs a service read from a page, turning "not found" and "forbidden" into the 404 page. */
export async function load<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    // A resource the viewer may not see is indistinguishable from one that does not exist.
    if (error instanceof DomainError && (error.code === 'not_found' || error.code === 'forbidden')) notFound();
    throw error;
  }
}
