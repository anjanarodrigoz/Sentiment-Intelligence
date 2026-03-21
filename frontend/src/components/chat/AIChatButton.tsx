import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import AIChatPanel from './AIChatPanel';

export default function AIChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary hover:bg-primary-dark text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-40"
        title="AI Assistant"
      >
        <Sparkles className="w-6 h-6" />
      </button>
      <AIChatPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
