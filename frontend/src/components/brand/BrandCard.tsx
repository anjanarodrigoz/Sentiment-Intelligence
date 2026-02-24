import { Globe } from 'lucide-react';
import Card from '../ui/Card';

interface BrandCardProps {
  id: string;
  name: string;
  logo: string;
  selected: boolean;
  onClick: () => void;
}

export default function BrandCard({
  name,
  logo,
  selected,
  onClick,
}: BrandCardProps) {
  return (
    <Card selected={selected} onClick={onClick} className="text-center py-6 px-4">
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
