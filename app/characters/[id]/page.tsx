'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MessageCircle, Trash2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAppStore } from '@/lib/store';
import type { Character, CharacterImages } from '@/lib/types';
import { BottomNavigation } from '@/components/bottom-navigation';
import { CharacterImageUploader } from '@/components/character-image-uploader';

const personalities: Character['personality'][] = ['優しい', 'クール', 'ツンデレ'];
const appearances: Character['appearance'][] = ['清楚系', 'ギャル系', 'ナチュラル'];

export default function CharacterEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const getCharacter = useAppStore((state) => state.getCharacter);
  const updateCharacter = useAppStore((state) => state.updateCharacter);
  const deleteCharacter = useAppStore((state) => state.deleteCharacter);
  const setCurrentCharacter = useAppStore((state) => state.setCurrentCharacter);

  const character = getCharacter(id);

  const [name, setName] = useState('');
  const [personality, setPersonality] = useState<Character['personality']>('優しい');
  const [appearance, setAppearance] = useState<Character['appearance']>('清楚系');
  const [images, setImages] = useState<CharacterImages>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (character) {
      setName(character.name);
      setPersonality(character.personality);
      setAppearance(character.appearance);
      setImages(character.images ?? {});
    }
  }, [character]);

  if (!character) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">キャラクターが見つかりません</p>
          <Link href="/characters" className="text-primary hover:underline">
            一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);

    updateCharacter(id, {
      name: name.trim(),
      personality,
      appearance,
      images,
    });

    setIsSubmitting(false);
  };

  const handleDelete = () => {
    deleteCharacter(id);
    router.push('/characters');
  };

  const handleStartChat = () => {
    setCurrentCharacter(id);
    router.push('/chat');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-md mx-auto">
          <Link
            href="/characters"
            className="p-2 rounded-full hover:bg-secondary min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="戻る"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="text-lg font-bold text-foreground">キャラクターを編集</h1>
          <div className="w-11" />
        </div>
      </header>

      {/* Form */}
      <main className="px-4 py-6 max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Image uploader */}
          <CharacterImageUploader value={images} onChange={setImages} />

          {/* Start Chat Button */}
          <Button
            type="button"
            onClick={handleStartChat}
            className="h-12 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-medium flex items-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            チャットを始める
          </Button>

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

          {/* Appearance */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="appearance" className="text-foreground">
              見た目
            </Label>
            <Select value={appearance} onValueChange={(v) => setAppearance(v as Character['appearance'])}>
              <SelectTrigger id="appearance" className="h-12 rounded-xl bg-card border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {appearances.map((a) => (
                  <SelectItem key={a} value={a} className="rounded-lg">
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mt-4">
            <Button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-lg"
            >
              {isSubmitting ? '保存中...' : '保存'}
            </Button>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 rounded-full border-destructive text-destructive hover:bg-destructive/10 font-medium text-lg flex items-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  削除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>キャラクターを削除しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    {character.name}を削除します。この操作は取り消せません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="rounded-full bg-destructive hover:bg-destructive/90"
                  >
                    削除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </main>

      <BottomNavigation />
    </div>
  );
}
