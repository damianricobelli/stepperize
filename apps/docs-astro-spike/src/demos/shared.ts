import { createStepper } from '@stepperize/core';

export const steps = [
  { id: 'account', title: 'Account' },
  { id: 'done', title: 'Done' },
] as const;

/** One flow per demo instance, every framework drives this same object. */
export const createFlow = () => createStepper(steps);

export const box = 'not-prose my-4 flex items-center gap-3 rounded-lg border p-3 text-sm';
export const button = 'rounded-md border px-2 py-1 disabled:opacity-40';
