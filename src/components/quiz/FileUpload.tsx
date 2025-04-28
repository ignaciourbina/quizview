"use client";

import type React from 'react';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, XCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploadProps {
  onFileAccepted: (fileContent: string, fileName: string) => void;
  onFileRejected?: (reason: string) => void;
  isLoading?: boolean;
}

export function FileUpload({ onFileAccepted, onFileRejected, isLoading = false }: FileUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0); // Progress simulation

  const handleFileRead = (file: File) => {
      setError(null);
      setUploadedFile(file);
      setProgress(0); // Reset progress

      const reader = new FileReader();

      reader.onprogress = (event) => {
          if (event.lengthComputable) {
              const percentage = Math.round((event.loaded * 100) / event.total);
              setProgress(percentage);
          }
      };

      reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) {
            onFileAccepted(content, file.name);
            setProgress(100); // Ensure progress hits 100 on completion
          } else {
             const rejectionError = "Failed to read file content.";
             setError(rejectionError);
             if (onFileRejected) onFileRejected(rejectionError);
             setUploadedFile(null);
             setProgress(0);
          }
      };

      reader.onerror = () => {
          const rejectionError = "Error reading file.";
          setError(rejectionError);
          if (onFileRejected) onFileRejected(rejectionError);
          setUploadedFile(null);
          setProgress(0);
      };

      reader.readAsText(file, 'UTF-8'); // Specify UTF-8 encoding
  };


  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setError(null); // Clear previous errors
    setUploadedFile(null); // Clear previous file
    setProgress(0);

    if (fileRejections.length > 0) {
      const rejectionError = fileRejections[0].errors[0].message || "Invalid file type or size.";
      setError(rejectionError);
      if(onFileRejected) onFileRejected(rejectionError);
      return;
    }

    if (acceptedFiles.length > 0) {
       handleFileRead(acceptedFiles[0]);
    }
  }, [onFileAccepted, onFileRejected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
    maxSize: 5 * 1024 * 1024, // 5MB limit
  });

  const removeFile = () => {
    setUploadedFile(null);
    setError(null);
    setProgress(0);
    // Optionally call a handler if parent needs to know file was removed
    // onFileRemoved?.();
  };

  return (
    <Card className="w-full border-2 border-dashed border-primary/50 hover:border-primary transition-colors duration-200 bg-secondary/30 shadow-inner">
        <CardContent className="p-6 text-center">
         <div {...getRootProps()} className={`cursor-pointer p-10 rounded-lg ${isDragActive ? 'bg-primary/10' : ''}`}>
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto h-12 w-12 text-primary" />
            {isDragActive ? (
              <p className="mt-4 text-lg font-semibold text-primary">Drop the CSV file here...</p>
            ) : (
              <p className="mt-4 text-lg font-semibold text-foreground">
                Drag & drop your Brightspace quiz CSV file here, or click to select file
              </p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">CSV files only, max 5MB</p>
          </div>

           {error && (
            <div className="mt-4 flex items-center justify-center text-destructive">
              <XCircle className="h-4 w-4 mr-2" />
              <span>{error}</span>
            </div>
          )}

          {isLoading && !uploadedFile && (
              <p className="mt-4 text-sm text-primary animate-pulse">Processing...</p>
          )}

          {uploadedFile && !error && (
            <div className="mt-6 p-4 border rounded-md bg-background text-left relative">
              <div className="flex items-center space-x-3">
                 <FileText className="h-6 w-6 text-primary" />
                 <div className='flex-1'>
                     <p className="text-sm font-medium text-foreground truncate">{uploadedFile.name}</p>
                     <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                 </div>
                 <Button variant="ghost" size="icon" onClick={removeFile} className="absolute top-1 right-1 h-6 w-6" aria-label="Remove file">
                     <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                 </Button>
              </div>
               {progress > 0 && progress < 100 && !isLoading &&(
                 <Progress value={progress} className="w-full h-2 mt-2" />
               )}
               {progress === 100 && !isLoading && (
                   <p className="text-xs text-green-600 font-medium mt-2">Upload complete!</p>
               )}
               {isLoading && progress === 100 && (
                    <p className="mt-2 text-sm text-primary animate-pulse">Parsing quiz...</p>
               )}

            </div>
          )}
        </CardContent>
    </Card>
  );
}
