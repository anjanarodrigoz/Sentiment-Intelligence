import { useState } from 'react';
import { ImagePlus, Link, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ProductImageUploadProps {
  imageUrl: string;
  imageFile: File | null;
  onImageFileChange: (file: File | null) => void;
  onImageUrlChange: (url: string) => void;
}

export default function ProductImageUpload({
  imageUrl,
  imageFile,
  onImageFileChange,
  onImageUrlChange,
}: ProductImageUploadProps) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const previewUrl = imageFile ? URL.createObjectURL(imageFile) : imageUrl;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageFileChange(file);
      onImageUrlChange('');
    }
  };

  const clearImage = () => {
    onImageFileChange(null);
    onImageUrlChange('');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1.5">
        Product Image
      </label>
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={cn(
            'text-xs px-3 py-1 rounded-md transition-colors',
            mode === 'upload'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
          )}
        >
          <ImagePlus className="w-3 h-3 inline mr-1" />
          Upload
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={cn(
            'text-xs px-3 py-1 rounded-md transition-colors',
            mode === 'url'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
          )}
        >
          <Link className="w-3 h-3 inline mr-1" />
          URL
        </button>
      </div>

      {previewUrl ? (
        <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
          <img
            src={previewUrl}
            alt="Product preview"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ) : mode === 'upload' ? (
        <label className="block w-24 h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
          <div className="flex flex-col items-center justify-center h-full">
            <ImagePlus className="w-6 h-6 text-text-secondary" />
            <span className="text-xs text-text-secondary mt-1">Upload</span>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      ) : (
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => onImageUrlChange(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      )}
    </div>
  );
}
