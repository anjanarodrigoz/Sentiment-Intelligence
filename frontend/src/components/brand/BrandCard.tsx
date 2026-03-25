import { Globe } from 'lucide-react';
import Card from '../ui/Card';

interface BrandCardProps {
  id: string;
  name: string;
  logo: string;
  onboarding: boolean;
  selected: boolean;
  onClick: () => void;
}

export default function BrandCard({
  name,
  logo,
  onboarding,
  selected,
  onClick,
}: BrandCardProps) {
  return (
    <Card
      selected={selected}
      onClick={onboarding ? onClick : undefined}
      className={`text-center py-6 px-4 relative overflow-hidden transition-all ${
        !onboarding ? 'opacity-70 cursor-not-allowed grayscale-[0.5]' : ''
      }`}
    >
      {!onboarding && (
        <div className="absolute top-2 right-2 z-10">
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20 uppercase tracking-tighter">
            Coming Soon
          </span>
        </div>
      )}
      <div className="flex items-center justify-center h-16 mb-3">
        {logo ? (
          <img
            src={logo}
            alt={name}
            className="max-h-16 max-w-[120px] object-contain"
          />
        ) : (
          <Globe className="w-10 h-10 text-text-secondary" />
        )}
      </div>
      <p className="text-sm font-medium text-text-primary">{name}</p>
    </Card>
  );
}
