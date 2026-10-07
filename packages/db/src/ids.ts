import { v7 } from 'uuid';

/** Time-sortable primary key (UUID version 7), generated in the application. */
export const newId = (): string => v7();
