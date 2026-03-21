import FileDropzone from '../ui/FileDropzone';

interface ReviewFileUploadProps {
  reviewFile: File | null;
  reviewFileName: string;
  reviewCount: number;
  onFileChange: (file: File, name: string, count: number) => void;
}

export default function ReviewFileUpload({
  reviewFileName,
  reviewCount,
  onFileChange,
}: ReviewFileUploadProps) {
  const handleFile = async (file: File) => {
    let count = 0;

    if (file.name.endsWith('.json')) {
      const text = await file.text();
      const data = JSON.parse(text);
      const reviews = Array.isArray(data) ? data : data.reviews || [];
      count = reviews.length;
    } else {
      // For Excel, use read-excel-file to count rows
      const readXlsxFile = (await import('read-excel-file')).default;
      const rows = await readXlsxFile(file);
      count = Math.max(0, rows.length - 1); // subtract header row
    }

    onFileChange(file, file.name, count);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1.5">
        Review Data File
      </label>
      <FileDropzone
        accept={{
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          'application/vnd.ms-excel': ['.xls'],
          'application/json': ['.json'],
        }}
        onFileAccepted={handleFile}
        label="Upload Excel (.xlsx) or JSON file"
        fileName={
          reviewFileName
            ? `${reviewFileName} — ${reviewCount} reviews detected`
            : undefined
        }
      />
    </div>
  );
}
