import { BookHeart } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <BookHeart className="h-7 w-7 text-primary" />
      <span className="text-xl font-bold font-headline tracking-tight text-foreground">
        Syrian Student Hub
      </span>
    </div>
  );
}
