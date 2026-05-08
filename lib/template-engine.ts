export type SlotDictionary = Record<string, string[]>;

export interface FillContext {
  char?: string;
  user?: string;
  topic?: string;
  recent?: string;
  [key: string]: string | undefined;
}

const pickFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function fillTemplate(
  template: string,
  context: FillContext,
  dict: SlotDictionary = {}
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const fromContext = context[key];
    if (fromContext) return fromContext;
    const bank = dict[key];
    if (bank && bank.length > 0) return pickFrom(bank);
    return match;
  });
}

export function pickTemplate(templates: string[]): string {
  if (templates.length === 0) return '';
  return pickFrom(templates);
}
