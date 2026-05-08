import type {
  Character,
  ChoiceArchetype,
  GameState,
  Interrupter,
} from './types';
import { fillTemplate, pickTemplate, type FillContext } from './template-engine';
import {
  characterResponseTemplates,
  defaultSlotDictionary,
  personalityModifiers,
  standardChoices,
} from './defaults';

export { standardChoices };

export interface ChatContext {
  userName: string;
}

export function getCharacterResponse(
  affinity: number,
  character: Character,
  context: ChatContext
): string {
  const tier: 'low' | 'mid' | 'high' =
    affinity <= 30 ? 'low' : affinity <= 70 ? 'mid' : 'high';

  const template = pickTemplate(characterResponseTemplates[tier]);
  let response = fillTemplate(
    template,
    { user: context.userName, char: character.name } as FillContext,
    defaultSlotDictionary
  );

  const modifiers = personalityModifiers[character.personality] ?? [];
  if (modifiers.length > 0 && Math.random() < 0.3) {
    response += pickTemplate(modifiers);
  }
  return response;
}

interface TriggerEvalContext {
  recentText?: string;
}

function matchesTrigger(
  interrupter: Interrupter,
  gameState: GameState,
  context: TriggerEvalContext
): boolean {
  const { trigger } = interrupter;
  const checks: boolean[] = [];

  if (trigger.minJealousy !== undefined) {
    checks.push(gameState.jealousy >= trigger.minJealousy);
  }
  if (trigger.everyNTurns !== undefined && trigger.everyNTurns > 0) {
    checks.push(
      gameState.turnCount > 0 && gameState.turnCount % trigger.everyNTurns === 0
    );
  }
  if (
    trigger.keywordTriggers &&
    trigger.keywordTriggers.length > 0 &&
    context.recentText
  ) {
    const text = context.recentText;
    checks.push(trigger.keywordTriggers.some((k) => text.includes(k)));
  }
  // No explicit gating triggers configured -> always allow base probability roll
  if (checks.length === 0) return true;
  return checks.some(Boolean);
}

export function selectInterrupter(
  interrupters: Interrupter[],
  gameState: GameState,
  context: TriggerEvalContext = {}
): Interrupter | null {
  const enabled = interrupters.filter((i) => i.enabled);
  const eligible = enabled.filter((i) => matchesTrigger(i, gameState, context));
  if (eligible.length === 0) return null;

  const fired = eligible.filter(
    (i) => Math.random() < (i.trigger.baseProbability ?? 0.2)
  );
  if (fired.length === 0) return null;
  return fired[Math.floor(Math.random() * fired.length)];
}

export function getInterrupterMessage(
  interrupter: Interrupter,
  context: { user: string; char: string }
): string {
  const template = pickTemplate(interrupter.messageTemplates);
  return fillTemplate(template, context as FillContext, defaultSlotDictionary);
}

export function getModifiedChoices(interrupter: Interrupter) {
  return interrupter.modifiedChoices.map((c) => ({ ...c }));
}

export function calculateJealousyIncrease(archetype: ChoiceArchetype): number {
  switch (archetype) {
    case 'boke':
      return 5; // sweet/silly choice -> rivals get jealous
    case 'tsukkomi':
      return 2;
    case 'fujori':
      return -3; // unhinged choice -> rivals lose interest
    default:
      return 0;
  }
}
