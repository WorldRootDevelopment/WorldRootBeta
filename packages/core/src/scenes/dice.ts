import { randomInt } from 'node:crypto';
import { DomainError } from '../platform/errors';

export const MAX_DICE = 20;
export const MAX_SIDES = 1_000;
export const MAX_MODIFIER = 1_000;

export interface DiceSpec {
  count: number;
  sides: number;
  modifier: number;
}

export interface DiceResult extends DiceSpec {
  /** The roll as written, tidied: `2d6+3`. */
  notation: string;
  rolls: number[];
  total: number;
}

const refuse = (message: string) => new DomainError('invalid_input', message, { fields: { notation: message } });

/** Reads dice notation: `d20`, `2d6`, `3d8+2`, `1d100-5`. Spaces and capitals are ignored. */
export function parseDice(input: unknown): DiceSpec {
  const match = typeof input === 'string' ? /^(\d{1,3})?d(\d{1,4})([+-]\d{1,4})?$/.exec(input.replace(/\s+/g, '').toLowerCase()) : null;
  if (!match) throw refuse('Write a roll like d20, 2d6 or 3d8+2.');
  const spec = { count: Number(match[1] ?? 1), sides: Number(match[2]), modifier: Number(match[3] ?? 0) };
  if (spec.count < 1 || spec.count > MAX_DICE) throw refuse(`Roll between 1 and ${MAX_DICE} dice at a time.`);
  if (spec.sides < 2 || spec.sides > MAX_SIDES) throw refuse(`A die has between 2 and ${MAX_SIDES.toLocaleString('en')} sides.`);
  if (Math.abs(spec.modifier) > MAX_MODIFIER) throw refuse(`Add or subtract at most ${MAX_MODIFIER.toLocaleString('en')}.`);
  return spec;
}

/**
 * Rolls dice on the server, from the operating system's random source. The
 * `roll` parameter exists so tests can supply known numbers.
 */
export function rollDice(input: unknown, roll: (sides: number) => number = (sides) => randomInt(1, sides + 1)): DiceResult {
  const spec = parseDice(input);
  const rolls = Array.from({ length: spec.count }, () => roll(spec.sides));
  const modifier = spec.modifier === 0 ? '' : spec.modifier > 0 ? `+${spec.modifier}` : String(spec.modifier);
  return { ...spec, notation: `${spec.count}d${spec.sides}${modifier}`, rolls, total: rolls.reduce((sum, value) => sum + value, 0) + spec.modifier };
}

/** The working shown beside a total: `4 + 5 + 3`. Empty for a single die with nothing added. */
export function diceWorking(result: DiceResult): string {
  if (result.rolls.length === 1 && result.modifier === 0) return '';
  const modifier = result.modifier === 0 ? '' : result.modifier > 0 ? ` + ${result.modifier}` : ` − ${Math.abs(result.modifier)}`;
  return `${result.rolls.join(' + ')}${modifier}`;
}
