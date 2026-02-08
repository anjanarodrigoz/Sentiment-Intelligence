import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'positive' | 'negative' | 'mixed';
  className?: string;
}

export default function Badge({
  children,
  variant = 'default',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variant === 'default' && 'bg-gray-100 text-gray-700',
        variant === 'positive' &&
          'bg-green-100 text-green-700',
        variant === 'negative' && 'bg-red-100 text-red-700',
        variant === 'mixed' &&
          'bg-orange-100 text-orange-700',
        className
      )}
    >
      {children}
    </span>
  );
}
