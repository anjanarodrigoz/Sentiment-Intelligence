import type { LucideIcon } from 'lucide-react';
import Card from '../ui/Card';
import { cn } from '../../lib/utils';

interface ModeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

export default function ModeCard({
  icon: Icon,
  title,
  description,
  selected,
  onClick,
}: ModeCardProps) {
  return (
    <Card selected={selected} onClick={onClick} className="text-center">
      <div
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4',
          selected ? 'bg-primary/10' : 'bg-gray-100'
        )}
      >
        <Icon
          className={cn(
            'w-7 h-7',
            selected ? 'text-primary' : 'text-text-secondary'
          )}
        />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </Card>
  );
}
