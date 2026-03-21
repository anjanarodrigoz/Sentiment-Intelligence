import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import AnalysisDashboard from '../components/analysis/AnalysisDashboard';
import AIChatButton from '../components/chat/AIChatButton';
import { useAppStore } from '../store/useAppStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { mode, analyses } = useAppStore();

  useEffect(() => {
    if (!mode || analyses.length === 0) {
      navigate('/');
    }
  }, [mode, analyses.length, navigate]);

  if (!mode || analyses.length === 0) return null;

  return (
    <PageContainer>
      <AnalysisDashboard />
      <AIChatButton />
    </PageContainer>
  );
}
