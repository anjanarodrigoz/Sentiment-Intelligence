import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import BrandCard from './BrandCard';
import Button from '../ui/Button';

interface Brand {
  id: string;
  name: string;
  logo: string;
}

export default function BrandSelectionPage() {
  const navigate = useNavigate();
  const { selectedBrand, setBrand } = useAppStore();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/brands')
      .then((res) => res.json())
      .then((data: Brand[]) => {
        setBrands(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleContinue = () => {
    if (!selectedBrand) return;
    navigate('/mode');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-text-primary mb-3">
          Consumer Sentiment Intelligence
        </h1>
        <p className="text-text-secondary text-lg">
          Select a brand to analyze
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : brands.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {brands.map((brand) => (
            <BrandCard
              key={brand.id}
              id={brand.id}
              name={brand.name}
              logo={brand.logo}
              selected={selectedBrand === brand.id}
              onClick={() => setBrand(brand.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-text-secondary">
          <p>Could not load brands. Make sure the server is running.</p>
        </div>
      )}

      <div className="flex justify-center">
        <Button size="lg" disabled={!selectedBrand} onClick={handleContinue}>
          Continue to Analysis
        </Button>
      </div>
    </div>
  );
}
