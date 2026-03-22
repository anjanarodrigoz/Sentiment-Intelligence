import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import UrlReviewInput from './UrlReviewInput';
import type { RawReview } from '../../types/review';

interface ScrapeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScrapeComplete: (data: {
    title: string;
    imageUrl: string;
    overallRating: number;
    overallReviewCount: number;
    scrapedReviews: RawReview[];
    productUrl: string;
    scrapeMetadata?: {
      cached: boolean;
      version: number;
      scrapedAt: Date;
    };
  }) => void;
}

export default function ScrapeDialog({ isOpen, onClose, onScrapeComplete }: ScrapeDialogProps) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUrl('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Dialog */}
      <div className="relative bg-white border border-border shadow-2xl rounded-3xl w-full max-w-2xl flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gray-50/50">
          <div>
            <h3 className="text-xl font-bold text-text-primary">Scrape New URL</h3>
            <p className="text-sm text-text-secondary mt-0.5">
              Paste a URL to fetch reviews and add it to your database.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 sm:p-8">
          <UrlReviewInput
            productUrl={url}
            scrapedReviews={null}
            onUrlChange={setUrl}
            onScrapeComplete={(data) => {
              // We pass it up, which will trigger the master page to open the ProductSetupDialog
              onScrapeComplete(data);
            }}
          />
        </div>
      </div>
    </div>
  );
}
