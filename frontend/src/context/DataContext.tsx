import React, { createContext, useContext, useState, ReactNode } from 'react';
import api from '@/lib/api';

export interface ColumnInfo {
  originalName: string;
  safeName: string;
  sqlType: string;
  nullCount: number;
  uniqueCount: number;
  min?: number | string;
  max?: number | string;
  sampleValues: any[];
}

interface DataContextType {
  isDataLoaded: boolean;
  schema: string | null;
  fileName: string | null;
  rowCount: number;
  columns: ColumnInfo[];
  warnings: string[];
  uploadData: (file: File) => Promise<void>;
  fetchSchema: () => Promise<void>;
  resetData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [schema, setSchema] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const uploadData = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/data/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.data.success) {
      setIsDataLoaded(true);
      setSchema(response.data.schema);
      setFileName(response.data.fileName);
      setRowCount(response.data.rowCount);
      setColumns(response.data.columns || []);
      setWarnings(response.data.warnings || []);
    }
  };

  const fetchSchema = async () => {
    try {
      const response = await api.get('/api/data/schema');
      if (response.data.loaded) {
        setIsDataLoaded(true);
        setSchema(response.data.summaryText);
        setFileName(response.data.fileName);
        setRowCount(response.data.rowCount);
        setColumns(response.data.columns || []);
        setWarnings(response.data.warnings || []);
      }
    } catch (err) {
      console.error('Failed to fetch schema', err);
    }
  };

  const resetData = () => {
    setIsDataLoaded(false);
    setSchema(null);
    setFileName(null);
    setRowCount(0);
    setColumns([]);
    setWarnings([]);
  };

  return (
    <DataContext.Provider value={{ isDataLoaded, schema, fileName, rowCount, columns, warnings, uploadData, fetchSchema, resetData }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};
