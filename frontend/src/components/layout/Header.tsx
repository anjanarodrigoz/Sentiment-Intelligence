import { RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import Logo from '../ui/Logo';

const BRAND_NAMES: Record<string, string> = {
  nike: 'Nike',
  'under-armour': 'Under Armour',
  nordstrom: 'Nordstrom',
  'the-north-face': 'The North Face',
  columbia: 'Columbia',
  'new-balance': 'New Balance',
  lululemon: 'Lululemon',
  allbirds: 'Allbirds',
  gymshark: 'Gymshark',
  adidas: 'Adidas',
  jcpenney: 'JCPenney',
  other: 'Other',
};

const BRAND_URLS: Record<string, string> = {
  nike: 'https://www.nike.com',
  'under-armour': 'https://www.underarmour.com',
  nordstrom: 'https://www.nordstrom.com',
  'the-north-face': 'https://www.thenorthface.com',
  columbia: 'https://www.columbia.com',
  'new-balance': 'https://www.newbalance.com',
  lululemon: 'https://www.lululemon.com',
  allbirds: 'https://www.allbirds.com',
  gymshark: 'https://www.gymshark.com',
  adidas: 'https://www.adidas.com',
  jcpenney: 'https://www.jcpenney.com',
};

export default function Header() {
  const navigate = useNavigate();
  const { selectedBrand, mode, reset } = useAppStore();

  const handleReset = () => {
    reset();
    navigate('/');
  };

  const brandName = BRAND_NAMES[selectedBrand] || '';

  return (
    <header className="bg-surface-alt/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-4">
          {selectedBrand && selectedBrand !== 'other' && (
            <a
              href={BRAND_URLS[selectedBrand]}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <img
                src={`/brands/${selectedBrand}.png`}
                alt={brandName}
                className="h-8 max-w-[120px] object-contain"
              />
            </a>
          )}
          {selectedBrand === 'other' && (
            <span className="text-sm font-medium text-primary">
              Other
            </span>
          )}
          {mode && (
            <span className="text-sm text-text-secondary capitalize">
              {mode === 'single'
                ? 'Single Product'
                : mode === 'comparison'
                ? 'Comparison'
                : 'Aggregate'}{' '}
              Analysis
            </span>
          )}
          {(selectedBrand || mode) && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              New Analysis
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
