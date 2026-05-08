'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  Choice,
  ChoiceArchetype,
  Interrupter,
  InterrupterArchetype,
  InterrupterTrigger,
} from '@/lib/types';

type FormDraft = Omit<Interrupter, 'id' | 'createdAt' | 'updatedAt'>;

const archetypes: { value: InterrupterArchetype; label: string }[] = [
  { value: 'tsukkomi', label: 'ツッコミ系' },
  { value: 'yandere', label: '束縛系' },
  { value: 'meta', label: 'メタ系' },
  { value: 'custom', label: 'カスタム' },
];

const choiceArchetypes: { value: ChoiceArchetype; label: string }[] = [
  { value: 'boke', label: 'ボケ' },
  { value: 'tsukkomi', label: 'ツッコミ' },
  { value: 'fujori', label: '不条理' },
];

interface InterrupterFormProps {
  initial?: FormDraft;
  submitLabel: string;
  onSubmit: (draft: FormDraft) => void;
  onDelete?: () => void;
}

const blankDraft: FormDraft = {
  name: '',
  archetype: 'custom',
  description: '',
  messageTemplates: [
    'おい、{user}、{topic}の話してる場合じゃないよ',
  ],
  trigger: {
    minJealousy: undefined,
    everyNTurns: undefined,
    keywordTriggers: [],
    baseProbability: 0.2,
  },
  modifiedChoices: [
    { label: '謝る (-5)', value: 'positive', archetype: 'boke', affinityChange: -5 },
    { label: '無視する (±0)', value: 'neutral', archetype: 'tsukkomi', affinityChange: 0 },
    { label: '言い返す (+5)', value: 'negative', archetype: 'fujori', affinityChange: 5 },
  ],
  enabled: true,
};

export function InterrupterForm({
  initial,
  submitLabel,
  onSubmit,
  onDelete,
}: InterrupterFormProps) {
  const [draft, setDraft] = useState<FormDraft>(initial ?? blankDraft);
  const [templatesText, setTemplatesText] = useState(
    (initial ?? blankDraft).messageTemplates.join('\n')
  );
  const [keywordsText, setKeywordsText] = useState(
    ((initial ?? blankDraft).trigger.keywordTriggers ?? []).join(', ')
  );

  const updateTrigger = (patch: Partial<InterrupterTrigger>) =>
    setDraft((d) => ({ ...d, trigger: { ...d.trigger, ...patch } }));

  const updateChoice = (idx: number, patch: Partial<Choice>) =>
    setDraft((d) => ({
      ...d,
      modifiedChoices: d.modifiedChoices.map((c, i) =>
        i === idx ? { ...c, ...patch } : c
      ),
    }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    const templates = templatesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (templates.length === 0) return;
    const keywords = keywordsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    onSubmit({
      ...draft,
      name: draft.name.trim(),
      messageTemplates: templates,
      trigger: {
        ...draft.trigger,
        keywordTriggers: keywords.length > 0 ? keywords : undefined,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Name */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">名前</Label>
        <Input
          id="name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="例）ツッコミ部長"
          required
          className="h-12 rounded-xl"
        />
      </div>

      {/* Archetype */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="archetype">タイプ</Label>
        <Select
          value={draft.archetype}
          onValueChange={(v) =>
            setDraft({ ...draft, archetype: v as InterrupterArchetype })
          }
        >
          <SelectTrigger id="archetype" className="h-12 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {archetypes.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">説明（任意）</Label>
        <Input
          id="description"
          value={draft.description ?? ''}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder="例）会話の論理破綻を見逃さない"
          className="h-12 rounded-xl"
        />
      </div>

      {/* Templates */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="templates">
          メッセージテンプレ（1行=1テンプレ、{`{char} {user} {topic}`} が使える）
        </Label>
        <Textarea
          id="templates"
          value={templatesText}
          onChange={(e) => setTemplatesText(e.target.value)}
          rows={6}
          className="rounded-xl font-mono text-sm"
          placeholder={'例）\nおいおい、{topic}の話で何盛り上がってんの？\n{char}のセリフ、伏線回収できてないよ'}
        />
      </div>

      {/* Trigger */}
      <fieldset className="flex flex-col gap-3 border border-border rounded-xl p-4">
        <legend className="px-2 text-sm font-medium">出現条件 (OR)</legend>

        <div className="flex flex-col gap-2">
          <Label htmlFor="minJealousy">嫉妬度しきい値（空欄で無効）</Label>
          <Input
            id="minJealousy"
            type="number"
            min={0}
            max={100}
            value={draft.trigger.minJealousy ?? ''}
            onChange={(e) =>
              updateTrigger({
                minJealousy:
                  e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            className="h-11 rounded-xl"
            placeholder="例）50"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="everyN">Nターンごと（空欄で無効）</Label>
          <Input
            id="everyN"
            type="number"
            min={0}
            value={draft.trigger.everyNTurns ?? ''}
            onChange={(e) =>
              updateTrigger({
                everyNTurns:
                  e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            className="h-11 rounded-xl"
            placeholder="例）5"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="keywords">キーワード（カンマ区切り）</Label>
          <Input
            id="keywords"
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
            className="h-11 rounded-xl"
            placeholder="例）好き, 付き合, デート"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="baseProb">
            出現確率: {Math.round((draft.trigger.baseProbability ?? 0.2) * 100)}%
          </Label>
          <Input
            id="baseProb"
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round((draft.trigger.baseProbability ?? 0.2) * 100)}
            onChange={(e) =>
              updateTrigger({ baseProbability: Number(e.target.value) / 100 })
            }
          />
        </div>
      </fieldset>

      {/* Modified choices */}
      <fieldset className="flex flex-col gap-3 border border-border rounded-xl p-4">
        <legend className="px-2 text-sm font-medium">乱入時の選択肢</legend>
        {draft.modifiedChoices.map((c, idx) => (
          <div key={idx} className="flex flex-col gap-2 pb-3 border-b border-border last:border-0 last:pb-0">
            <Label>選択肢 {idx + 1}</Label>
            <Input
              value={c.label}
              onChange={(e) => updateChoice(idx, { label: e.target.value })}
              placeholder="例）謝る (-5)"
              className="h-10 rounded-xl"
            />
            <div className="flex gap-2">
              <Select
                value={c.archetype}
                onValueChange={(v) =>
                  updateChoice(idx, { archetype: v as ChoiceArchetype })
                }
              >
                <SelectTrigger className="h-10 rounded-xl flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {choiceArchetypes.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={c.affinityChange}
                onChange={(e) =>
                  updateChoice(idx, {
                    affinityChange: Number(e.target.value),
                  })
                }
                className="h-10 rounded-xl w-24"
                placeholder="±0"
              />
            </div>
          </div>
        ))}
      </fieldset>

      {/* Enabled */}
      <div className="flex items-center justify-between">
        <Label htmlFor="enabled">有効化</Label>
        <Switch
          id="enabled"
          checked={draft.enabled}
          onCheckedChange={(checked) =>
            setDraft({ ...draft, enabled: checked })
          }
        />
      </div>

      <div className="flex flex-col gap-3 mt-2">
        <Button
          type="submit"
          disabled={!draft.name.trim()}
          className="h-12 rounded-full bg-primary text-primary-foreground font-medium"
        >
          {submitLabel}
        </Button>
        {onDelete && (
          <Button
            type="button"
            variant="outline"
            onClick={onDelete}
            className="h-12 rounded-full border-destructive text-destructive hover:bg-destructive/10"
          >
            削除
          </Button>
        )}
      </div>
    </form>
  );
}
