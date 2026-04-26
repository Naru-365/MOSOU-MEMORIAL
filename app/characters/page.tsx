'use client';

import Link from 'next/link';
import { Plus, Heart } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { BottomNavigation } from '@/components/bottom-navigation';
import { Card } from '@/components/ui/card';

export default function CharacterListPage() {
  const characters = useAppStore((state) => state.characters);

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

      {/* Character Grid */}
      <main className="px-4 py-6 max-w-md mx-auto">
        {characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">
              まだキャラクターがいません
            </p>
            <Link
              href="/characters/new"
              className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium min-h-[44px] flex items-center"
            >
              キャラクターを作成
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {characters.map((character) => (
              <Link key={character.id} href={`/characters/${character.id}`}>
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
                      <Heart className="w-3 h-3 text-primary fill-primary" />
                      <span className="text-xs text-muted-foreground">
                        50
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}

            {/* Add New Card */}
            <Link href="/characters/new">
              <Card className="overflow-hidden hover:shadow-lg transition-shadow border-dashed">
                <div className="aspect-square bg-secondary/50 flex items-center justify-center">
                  <Plus className="w-10 h-10 text-muted-foreground" />
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-muted-foreground text-center">
                    追加
                  </h3>
                </div>
              </Card>
            </Link>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
