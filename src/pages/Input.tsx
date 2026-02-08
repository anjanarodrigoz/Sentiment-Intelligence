import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import ProductInputPage from '../components/input/ProductInputPage';
import { useAppStore } from '../store/useAppStore';

export default function Input() {
  const navigate = useNavigate();
  const { mode, products } = useAppStore();

  useEffect(() => {
    if (!mode || products.length === 0) {
      navigate('/');
    }
  }, [mode, products.length, navigate]);

  if (!mode || products.length === 0) return null;

  return (
    <PageContainer>
      <ProductInputPage />
    </PageContainer>
  );
}
