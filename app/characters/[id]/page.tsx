'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MessageCircle, Trash2, Heart, Swords, Camera } from 'lucide-react';
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
import type { Character, CharacterRole } from '@/lib/types';
import { BottomNavigation } from '@/components/bottom-navigation';

const personalities: Character['personality'][] = ['優しい', 'クール', 'ツンデレ'];
const appearances: Character['appearance'][] = ['清楚系', 'ギャル系', 'ナチュラル'];

export default function CharacterEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCharacter    = useAppStore((s) => s.getCharacter);
  const updateCharacter = useAppStore((s) => s.updateCharacter);
  const deleteCharacter = useAppStore((s) => s.deleteCharacter);
  const setCurrentCharacter = useAppStore((s) => s.setCurrentCharacter);

  const character = getCharacter(id);

  const [name,        setName]        = useState('');
  const [role,        setRole]        = useState<CharacterRole>('恋愛相手');
  const [personality, setPersonality] = useState<Character['personality']>('優しい');
  const [appearance,  setAppearance]  = useState<Character['appearance']>('清楚系');
  const [imageUrl,    setImageUrl]    = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (character) {
      setName(character.name);
      setRole(character.role ?? '恋愛相手');
      setPersonality(character.personality);
      setAppearance(character.appearance);
      setImageUrl(character.imageUrl ?? '');
    }
  }, [character]);

  if (!character) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">キャラクターが見つかりません</p>
          <Link href="/characters" className="text-primary hover:underline">一覧に戻る</Link>
        </div>
      </div>
    );
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    updateCharacter(id, { name: name.trim(), role, personality, appearance, imageUrl });
    setIsSubmitting(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = () => {
    deleteCharacter(id);
    router.push('/characters');
  };

  const handleStartChat = () => {
    setCurrentCharacter(id);
    router.push('/chat');
  };

  const hasRealImage = imageUrl && !imageUrl.startsWith('/images/');

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-md mx-auto">
          <Link href="/characters"
            className="p-2 rounded-full hover:bg-secondary min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="text-lg font-bold text-foreground">キャラクターを編集</h1>
          <div className="w-11" />
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* 画像アップロード */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-32 h-32 rounded-full bg-secondary overflow-hidden hover:opacity-90 transition-opacity group"
            >
              {hasRealImage ? (
                <img src={imageUrl} alt={character.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl text-muted-foreground absolute inset-0 flex items-center justify-center">
                  {character.name.charAt(0)}
                </span>
              )}
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
            <p className="text-xs text-muted-foreground">タップして画像を変更</p>
          </div>

          {/* 役割バッジ */}
          <div className="flex justify-center">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
              role === '恋愛相手'
                ? 'bg-primary/10 text-primary'
                : 'bg-destructive/10 text-destructive'
            }`}>
              {role === '恋愛相手'
                ? <Heart className="w-3.5 h-3.5 fill-current" />
                : <Swords className="w-3.5 h-3.5" />}
              {role}
            </span>
          </div>

          {/* チャットボタン（恋愛相手のみ） */}
          {role === '恋愛相手' && (
            <Button
              type="button"
              onClick={handleStartChat}
              className="h-12 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-medium flex items-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              チャットを始める
            </Button>
          )}

          {/* 役割選択 */}
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">役割</Label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRole('恋愛相手')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  role === '恋愛相手'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}>
                <Heart className={`w-6 h-6 ${role === '恋愛相手' ? 'fill-primary' : ''}`} />
                <span className="text-sm font-medium">恋愛相手</span>
              </button>
              <button type="button" onClick={() => setRole('邪魔者')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  role === '邪魔者'
                    ? 'border-destructive bg-destructive/5 text-destructive'
                    : 'border-border text-muted-foreground hover:border-destructive/50'
                }`}>
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
              placeholder="例）咲良"
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

          {/* アクションボタン */}
          <div className="flex flex-col gap-3 mt-4">
            <Button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className={`h-14 rounded-full font-medium text-lg transition-colors ${
                saved
                  ? 'bg-green-600 text-white'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }`}
            >
              {saved ? '保存しました！' : isSubmitting ? '保存中...' : '保存'}
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
