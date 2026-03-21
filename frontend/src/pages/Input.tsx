import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import ProductInputPage from '../components/input/ProductInputPage';
import { useAppStore } from '../store/useAppStore';

export default function Input() {
  const navigate = useNavigate();
  const { selectedBrand, mode, products } = useAppStore();

  useEffect(() => {
    if (!selectedBrand || !mode || products.length === 0) {
      navigate('/');
    }
  }, [selectedBrand, mode, products.length, navigate]);

  if (!selectedBrand || !mode || products.length === 0) return null;

  return (
    <PageContainer>
      <ProductInputPage />
    </PageContainer>
  );
}
