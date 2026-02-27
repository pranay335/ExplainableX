import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { UploadCloud, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useNavigate } from 'react-router-dom';

export function FileUpload() {
  const { uploadData } = useData();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          await uploadData(file, results.data);
          navigate('/chat');
        } catch (error) {
          console.error(error);
          alert("Failed to upload data");
        } finally {
          setIsProcessing(false);
        }
      },
      error: (error) => {
        console.error(error);
        setIsProcessing(false);
        alert("Error parsing CSV");
      }
    });
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
              {isProcessing ? 'Processing Data...' : 'Upload your dataset'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Drag and drop your CSV or JSON file here, or click to browse.
              We'll automatically analyze the schema.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider font-medium mt-4">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Supports CSV, JSON</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              const sampleData = [
                { id: 1, product: 'Laptop', category: 'Electronics', price: 1200, sales: 50, date: '2023-01-01' },
                { id: 2, product: 'Phone', category: 'Electronics', price: 800, sales: 100, date: '2023-01-02' },
                { id: 3, product: 'Desk', category: 'Furniture', price: 300, sales: 20, date: '2023-01-03' },
                { id: 4, product: 'Chair', category: 'Furniture', price: 150, sales: 40, date: '2023-01-04' },
                { id: 5, product: 'Headphones', category: 'Electronics', price: 200, sales: 80, date: '2023-01-05' },
              ];
              const file = new File([JSON.stringify(sampleData)], "sample_sales_data.json", { type: "application/json" });
              setIsProcessing(true);
              uploadData(file, sampleData).then(() => {
                setIsProcessing(false);
                navigate('/chat');
              });
            }}
            className="mt-4 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors z-10"
          >
            Load Sample Data
          </button>
        </div>
      </div>
    </div>
  );
}
