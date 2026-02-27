import React, { createContext, useContext, useState, ReactNode } from 'react';
import axios from 'axios';

interface DataContextType {
  isDataLoaded: boolean;
  schema: string | null;
  fileName: string | null;
  rowCount: number;
  uploadData: (file: File, data: any[]) => Promise<void>;
  resetData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [schema, setSchema] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState(0);

  const uploadData = async (file: File, data: any[]) => {
    try {
      // Send to backend
      const response = await axios.post('/api/data/init', {
        tableName: 'dataset',
        data: data
      });
      
      if (response.data.success) {
        setIsDataLoaded(true);
        setSchema(response.data.schema);
        setFileName(file.name);
        setRowCount(response.data.rowCount);
      }
    } catch (error) {
      console.error("Upload failed", error);
      throw error;
    }
  };

  const resetData = () => {
    setIsDataLoaded(false);
    setSchema(null);
    setFileName(null);
    setRowCount(0);
  };

  return (
    <DataContext.Provider value={{ isDataLoaded, schema, fileName, rowCount, uploadData, resetData }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};
