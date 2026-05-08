'use client';

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { InterrupterForm } from '@/components/interrupter-form';
import { BottomNavigation } from '@/components/bottom-navigation';

export default function InterrupterEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const interrupter = useAppStore((s) => s.interrupters.find((i) => i.id === id));
  const updateInterrupter = useAppStore((s) => s.updateInterrupter);
  const deleteInterrupter = useAppStore((s) => s.deleteInterrupter);

  if (!interrupter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">邪魔者が見つかりません</p>
          <Link href="/interrupters" className="text-primary hover:underline">
            一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  const { id: _id, createdAt: _ca, updatedAt: _ua, ...initial } = interrupter;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-md mx-auto">
          <Link
            href="/interrupters"
            className="p-2 rounded-full hover:bg-secondary min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="戻る"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="text-lg font-bold text-foreground">邪魔者を編集</h1>
          <div className="w-11" />
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto">
        <InterrupterForm
          initial={initial}
          submitLabel="保存"
          onSubmit={(draft) => {
            updateInterrupter(id, draft);
            router.push('/interrupters');
          }}
          onDelete={() => {
            deleteInterrupter(id);
            router.push('/interrupters');
          }}
        />
      </main>

      <BottomNavigation />
    </div>
  );
}
