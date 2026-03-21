import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import LandingPage from '../components/landing/LandingPage';
import { useAppStore } from '../store/useAppStore';

export default function Mode() {
  const navigate = useNavigate();
  const { selectedBrand } = useAppStore();

  useEffect(() => {
    if (!selectedBrand) {
      navigate('/');
    }
  }, [selectedBrand, navigate]);

  if (!selectedBrand) return null;

  return (
    <PageContainer>
      <LandingPage />
    </PageContainer>
  );
}
