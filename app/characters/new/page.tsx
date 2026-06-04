'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, User } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import type { Character } from '@/lib/types';

const personalities: Character['personality'][] = ['優しい', 'クール', 'ツンデレ'];

export default function CharacterCreatePage() {
  const router = useRouter();
  const addCharacter = useAppStore((state) => state.addCharacter);
  const startSession = useAppStore((state) => state.startSession);

  const [name, setName] = useState('');
  const [personality, setPersonality] = useState<Character['personality']>('優しい');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);

    const c = addCharacter({
      name: name.trim(),
      personality,
      appearance: '清楚系',
    });
    startSession(c.id);
    router.push('/chat');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-md mx-auto">
          <h1 className="text-lg font-bold text-foreground">新しい子と出会う</h1>
          <Link
            href="/characters"
            className="p-2 rounded-full hover:bg-secondary min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="閉じる"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </Link>
        </div>
      </header>

      {/* Form */}
      <main className="px-4 py-6 max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Image Placeholder */}
          <div className="flex justify-center">
            <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-16 h-16 text-muted-foreground" />
            </div>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="text-foreground">
              名前
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="例）咲良"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl bg-card border-border text-foreground placeholder:text-muted-foreground"
              required
            />
          </div>

          {/* Personality */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="personality" className="text-foreground">
              性格
            </Label>
            <Select value={personality} onValueChange={(v) => setPersonality(v as Character['personality'])}>
              <SelectTrigger id="personality" className="h-12 rounded-xl bg-card border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {personalities.map((p) => (
                  <SelectItem key={p} value={p} className="rounded-lg">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Appearance hearing note */}
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            見た目は会話の中で（約10ラリーのヒアリングで）決めていきます
          </p>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-lg mt-4"
          >
            {isSubmitting ? '作成中...' : '出会う'}
          </Button>
        </form>
      </main>
    </div>
  );
}
