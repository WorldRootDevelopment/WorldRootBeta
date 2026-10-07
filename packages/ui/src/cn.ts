/** Joins class names, skipping empty values. */
export const cn = (...classes: Array<string | false | null | undefined>): string => classes.filter(Boolean).join(' ');
