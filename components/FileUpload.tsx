
import React, { useState, useRef } from 'react';
import { FileData } from '../types';
import { fileToBase64 } from '../services/fileUtils';

interface FileUploadProps {
  onFilesSelected: (files: FileData[]) => void;
  currentFiles: FileData[];
  onRemoveFile: (index: number) => void;
}

// Max safe size. We now support File API uploads for large files, so we can allow up to 200MB.
const MAX_FILE_SIZE_MB = 200.0;

const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, currentFiles, onRemoveFile }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFiles = async (files: FileList | File[]) => {
    const newFilesData: FileData[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Size Check
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`Skipped "${file.name}": File is too large (> ${MAX_FILE_SIZE_MB}MB). Please compress this PDF.`);
        continue;
      }

      // Accept PDFs and Images
      if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
        alert(`Skipped "${file.name}": Please upload valid PDF or Image files (PNG, JPG, WEBP).`);
        continue;
      }
      try {
        const base64 = await fileToBase64(file);
        newFilesData.push({
          name: file.name,
          data: base64,
          mimeType: file.type,
        });
      } catch (error) {
        console.error('Error reading file:', error);
      }
    }

    if (newFilesData.length > 0) {
      onFilesSelected(newFilesData);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to estimate size from base64
  const getEstimatedSize = (base64Length: number) => {
    const sizeInBytes = base64Length * 0.75;
    if (sizeInBytes < 1024 * 1024) {
      return (sizeInBytes / 1024).toFixed(1) + ' KB';
    }
    return (sizeInBytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full space-y-3">
      <div
        className={`
          relative w-full rounded-2xl border-2 border-dashed transition-all duration-300 p-6 flex flex-col items-center justify-center
          ${isDragging ? 'border-genius-500 bg-genius-50' : 'border-gray-300 bg-white/50 hover:border-genius-400 hover:bg-white'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          accept="application/pdf,image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
        />

        <div className="text-center cursor-pointer">
          <div className="mx-auto h-10 w-10 text-genius-500 mb-2">
            {/* Upload Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            Upload PDFs or Images
          </p>
          <p className="text-xs text-gray-400 mt-1">Max {MAX_FILE_SIZE_MB}MB per file</p>
        </div>
      </div>

      {/* File List */}
      {currentFiles.length > 0 && (
        <div className="flex flex-col space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
          {currentFiles.map((file, idx) => {
            const isImage = file.mimeType.startsWith('image/');
            return (
              <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm border border-gray-100 text-sm group">
                <div className="flex items-center space-x-2 truncate flex-1">
                  <div className={`${isImage ? 'bg-purple-100 text-purple-500' : 'bg-red-100 text-red-500'} p-1.5 rounded shrink-0`}>
                    {isImage ? (
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                       </svg>
                    ) : (
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                       </svg>
                    )}
                  </div>
                  <div className="flex flex-col truncate">
                     <span className="text-gray-700 font-medium truncate">{file.name}</span>
                     <span className="text-[10px] text-gray-400">{getEstimatedSize(file.data.length)}</span>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(idx);
                  }}
                  className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
