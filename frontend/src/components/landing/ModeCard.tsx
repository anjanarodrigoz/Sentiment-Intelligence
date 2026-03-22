import type { LucideIcon } from 'lucide-react';
import Card from '../ui/Card';
import { cn } from '../../lib/utils';

interface ModeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export default function ModeCard({
  icon: Icon,
  title,
  description,
  selected,
  onClick,
  disabled,
}: ModeCardProps) {
  return (
    <Card 
      selected={selected} 
      onClick={disabled ? undefined : onClick} 
      className={cn(
        "text-center relative transition-all duration-300", 
        !disabled && "hover:-translate-y-1 hover:shadow-xl",
        selected && "animate-pulse-glow border-primary ring-0 bg-primary/5",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      {disabled && (
        <div className="absolute top-3 right-3 bg-gray-200 text-gray-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
          Coming Soon
        </div>
      )}
      <div
        className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-colors duration-300',
          selected ? 'bg-primary/20' : 'bg-gray-100 group-hover:bg-gray-200'
        )}
      >
        <Icon
          className={cn(
            'w-8 h-8 transition-colors duration-300',
            selected ? 'text-primary' : 'text-text-secondary'
          )}
        />
      </div>
      <h3 className={cn("text-xl font-bold mb-3", selected && "text-primary")}>{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
    </Card>
  );
}
