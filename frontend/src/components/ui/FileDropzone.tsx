import { useCallback } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { Upload, FileSpreadsheet, FileJson } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FileDropzoneProps {
  accept: Accept;
  onFileAccepted: (file: File) => void;
  label: string;
  fileName?: string;
  className?: string;
}

export default function FileDropzone({
  accept,
  onFileAccepted,
  label,
  fileName,
  className,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileAccepted(acceptedFiles[0]);
      }
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50',
        fileName && 'border-green-300 bg-green-50',
        className
      )}
    >
      <input {...getInputProps()} />
      {fileName ? (
        <div className="flex items-center justify-center gap-2 text-green-700">
          {fileName.endsWith('.json') ? (
            <FileJson className="w-5 h-5" />
          ) : (
            <FileSpreadsheet className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">{fileName}</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Upload className="w-8 h-8 text-text-secondary" />
          <p className="text-sm text-text-secondary">{label}</p>
          <p className="text-xs text-text-secondary/70">
            {isDragActive ? 'Drop the file here' : 'Drag & drop or click to browse'}
          </p>
        </div>
      )}
    </div>
  );
}
