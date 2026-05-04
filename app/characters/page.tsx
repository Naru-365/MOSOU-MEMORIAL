'use client';

import Link from 'next/link';
import { Plus, Heart, Swords } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { BottomNavigation } from '@/components/bottom-navigation';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { Character } from '@/lib/types';

function CharacterCard({ character }: { character: Character }) {
  return (
    <Link href={`/characters/${character.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="aspect-square bg-secondary relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl text-muted-foreground">
              {character.name.charAt(0)}
            </span>
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-medium text-foreground truncate">
            {character.name}
          </h3>
          <div className="flex items-center gap-1 mt-1">
            {character.role === '恋愛相手' ? (
              <Heart className="w-3 h-3 text-primary fill-primary" />
            ) : (
              <Swords className="w-3 h-3 text-destructive" />
            )}
            <span className="text-xs text-muted-foreground">
              {character.personality}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function EmptyState({ role }: { role: '恋愛相手' | '邪魔者' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
        {role === '恋愛相手' ? (
          <Heart className="w-10 h-10 text-muted-foreground" />
        ) : (
          <Swords className="w-10 h-10 text-muted-foreground" />
        )}
      </div>
      <p className="text-muted-foreground mb-4">
        {role === '恋愛相手'
          ? 'まだ恋愛相手がいません'
          : 'まだ邪魔者がいません'}
      </p>
      <Link
        href="/characters/new"
        className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium min-h-[44px] flex items-center"
      >
        キャラクターを作成
      </Link>
    </div>
  );
}

export default function CharacterListPage() {
  const characters = useAppStore((state) => state.characters);

  const lovers = characters.filter((c) => c.role === '恋愛相手');
  const interrupters = characters.filter((c) => c.role === '邪魔者');

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-md mx-auto">
          <h1 className="text-lg font-bold text-foreground">キャラクター一覧</h1>
          <Link
            href="/characters/new"
            className="p-2 rounded-full bg-primary text-primary-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="新規作成"
          >
            <Plus className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <main className="px-4 py-4 max-w-md mx-auto">
        <Tabs defaultValue="lover">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="lover" className="flex-1 gap-1.5">
              <Heart className="w-4 h-4" />
              恋愛相手
              {lovers.length > 0 && (
                <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5">
                  {lovers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="interrupter" className="flex-1 gap-1.5">
              <Swords className="w-4 h-4" />
              邪魔者
              {interrupters.length > 0 && (
                <span className="ml-1 text-xs bg-destructive/10 text-destructive rounded-full px-1.5">
                  {interrupters.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lover">
            {lovers.length === 0 ? (
              <EmptyState role="恋愛相手" />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {lovers.map((character) => (
                  <CharacterCard key={character.id} character={character} />
                ))}
                <Link href="/characters/new">
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow border-dashed">
                    <div className="aspect-square bg-secondary/50 flex items-center justify-center">
                      <Plus className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-muted-foreground text-center">追加</h3>
                    </div>
                  </Card>
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="interrupter">
            {interrupters.length === 0 ? (
              <EmptyState role="邪魔者" />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {interrupters.map((character) => (
                  <CharacterCard key={character.id} character={character} />
                ))}
                <Link href="/characters/new">
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow border-dashed">
                    <div className="aspect-square bg-secondary/50 flex items-center justify-center">
                      <Plus className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-muted-foreground text-center">追加</h3>
                    </div>
                  </Card>
                </Link>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation />
    </div>
  );
}
