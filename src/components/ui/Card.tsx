import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

export default function Card({
  children,
  className,
  onClick,
  selected,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border border-border p-6 shadow-sm',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        selected && 'ring-2 ring-primary border-primary',
        className
      )}
    >
      {children}
    </div>
  );
}
