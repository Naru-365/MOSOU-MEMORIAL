'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { InterrupterForm } from '@/components/interrupter-form';
import { BottomNavigation } from '@/components/bottom-navigation';

export default function InterrupterNewPage() {
  const router = useRouter();
  const addInterrupter = useAppStore((s) => s.addInterrupter);

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
          <h1 className="text-lg font-bold text-foreground">邪魔者を作成</h1>
          <div className="w-11" />
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto">
        <InterrupterForm
          submitLabel="作成する"
          onSubmit={(draft) => {
            const created = addInterrupter(draft);
            router.push(`/interrupters/${created.id}`);
          }}
        />
      </main>

      <BottomNavigation />
    </div>
  );
}
