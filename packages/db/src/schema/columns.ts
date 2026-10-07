import { timestamp, uuid } from 'drizzle-orm/pg-core';
import { newId } from '../ids';

export const id = () => uuid('id').primaryKey().$defaultFn(newId);

export const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const createdAt = () => timestamptz('created_at').notNull().defaultNow();

export const updatedAt = () =>
  timestamptz('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date());
