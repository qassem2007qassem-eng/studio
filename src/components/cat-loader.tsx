
'use client';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

export const CatLoader = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex items-center justify-center", className)}>
        <span className="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
};
