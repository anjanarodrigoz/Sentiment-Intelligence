import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BrandSelect from './pages/BrandSelect';
import Mode from './pages/Mode';
import Input from './pages/Input';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Mode />} />
        <Route path="/brand" element={<BrandSelect />} />
        <Route path="/input" element={<Input />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
