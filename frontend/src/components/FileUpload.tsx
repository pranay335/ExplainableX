import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileSpreadsheet, Loader2, AlertTriangle } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useNavigate } from 'react-router-dom';

export function FileUpload() {
  const { uploadData, warnings } = useData();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [uploadWarnings, setUploadWarnings] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setUploadWarnings([]);

    try {
      await uploadData(file);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || "Failed to upload and process data");
    } finally {
      setIsProcessing(false);
    }
  }, [uploadData, navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json']
    },
    multiple: false
  });

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
          ${isDragActive
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            {isProcessing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <UploadCloud className="h-8 w-8" />
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              {isProcessing ? 'Processing & Embedding Data...' : 'Upload your dataset'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {isProcessing
                ? 'Parsing, cleaning, storing in database, and creating embeddings for AI analysis...'
                : 'Drag and drop your CSV or JSON file. It will be preprocessed, stored in PostgreSQL, and embedded for RAG-powered analysis.'
              }
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider font-medium mt-4">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Supports CSV, JSON</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">Pipeline Warnings:</h4>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-sm text-amber-700 dark:text-amber-400">• {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
