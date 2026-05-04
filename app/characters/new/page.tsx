'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, User, Heart, Swords, Camera } from 'lucide-react';
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
import type { Character, CharacterRole } from '@/lib/types';

const personalities: Character['personality'][] = ['優しい', 'クール', 'ツンデレ'];
const appearances: Character['appearance'][] = ['清楚系', 'ギャル系', 'ナチュラル'];

export default function CharacterCreatePage() {
  const router = useRouter();
  const addCharacter = useAppStore((state) => state.addCharacter);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [role, setRole] = useState<CharacterRole>('恋愛相手');
  const [personality, setPersonality] = useState<Character['personality']>('優しい');
  const [appearance, setAppearance] = useState<Character['appearance']>('清楚系');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);

    const newCharacter = addCharacter({
      name: name.trim(),
      role,
      personality,
      appearance,
      imageUrl: imageUrl || undefined,
    });

    router.push(`/characters/${newCharacter.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-md mx-auto">
          <h1 className="text-lg font-bold text-foreground">新しいキャラクターを作成</h1>
          <Link
            href="/characters"
            className="p-2 rounded-full hover:bg-secondary min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </Link>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* 画像アップロード */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-32 h-32 rounded-full bg-secondary overflow-hidden hover:opacity-90 transition-opacity group"
            >
              {imageUrl ? (
                <img src={imageUrl} alt="キャラクター画像" className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-muted-foreground absolute inset-0 m-auto" />
              )}
              {/* オーバーレイ */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center -mt-4">
            タップして画像を選択
          </p>

          {/* 役割 */}
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">役割</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('恋愛相手')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  role === '恋愛相手'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                <Heart className={`w-6 h-6 ${role === '恋愛相手' ? 'fill-primary' : ''}`} />
                <span className="text-sm font-medium">恋愛相手</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('邪魔者')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  role === '邪魔者'
                    ? 'border-destructive bg-destructive/5 text-destructive'
                    : 'border-border text-muted-foreground hover:border-destructive/50'
                }`}
              >
                <Swords className="w-6 h-6" />
                <span className="text-sm font-medium">邪魔者</span>
              </button>
            </div>
          </div>

          {/* 名前 */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="text-foreground">名前</Label>
            <Input
              id="name"
              type="text"
              placeholder={role === '恋愛相手' ? '例）咲良' : '例）陽菜'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl bg-card border-border text-foreground placeholder:text-muted-foreground"
              required
            />
          </div>

          {/* 性格 */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="personality" className="text-foreground">性格</Label>
            <Select value={personality} onValueChange={(v) => setPersonality(v as Character['personality'])}>
              <SelectTrigger id="personality" className="h-12 rounded-xl bg-card border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {personalities.map((p) => (
                  <SelectItem key={p} value={p} className="rounded-lg">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 見た目 */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="appearance" className="text-foreground">見た目</Label>
            <Select value={appearance} onValueChange={(v) => setAppearance(v as Character['appearance'])}>
              <SelectTrigger id="appearance" className="h-12 rounded-xl bg-card border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {appearances.map((a) => (
                  <SelectItem key={a} value={a} className="rounded-lg">{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-lg mt-4"
          >
            {isSubmitting ? '作成中...' : '作成する'}
          </Button>
        </form>
      </main>
    </div>
  );
}
