
import React, { useState, useRef, useEffect } from 'react';

interface DocumentPreviewProps {
  htmlContent: string;
  onAiEdit: () => void;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ htmlContent: initialHtml, onAiEdit }) => {
  // We use a separate state for the rendered content to implement debounce
  const [renderedContent, setRenderedContent] = useState(initialHtml);
  const [isEditing, setIsEditing] = useState(false);
  // Track if the user has manually modified the content to prevent overwriting
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce logic: Only update the complex DOM structure every 500ms
  // CRITICAL FIX: Only sync with initialHtml if the user has NOT edited it.
  useEffect(() => {
      if (!isEditing && !hasUserEdited) {
          const timer = setTimeout(() => {
              setRenderedContent(initialHtml);
          }, 500);
          return () => clearTimeout(timer);
      }
  }, [initialHtml, isEditing, hasUserEdited]);

  // Performance Protection:
  // If content is massive (e.g. > 50MB), we prevent rendering it all in the live DOM
  // to avoid browser crashes. The FULL content is still preserved for Export.
  // Increased to 50,000,000 (50MB) to handle huge generated files (100+ MCQs).
  const CONTENT_LIMIT = 50000000; 
  const isTooLarge = renderedContent.length > CONTENT_LIMIT;
  const displayContent = isTooLarge ? renderedContent.substring(0, CONTENT_LIMIT) : renderedContent;

  const handleManualEdit = () => {
    if (isTooLarge) {
        alert("This document is too large for manual inline editing (performance protection). Please use 'AI Edit' or export to Word to make changes.");
        return;
    }
    setIsEditing(true);
    // Wait for render to enable contentEditable then focus
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.focus();
      }
    }, 50);
  };

  const handleSaveManualEdit = () => {
    if (containerRef.current) {
      setRenderedContent(containerRef.current.innerHTML);
      setHasUserEdited(true); // Mark as edited so we don't revert to original
    }
    setIsEditing(false);
  };

  const handleDiscardEdits = () => {
      if (window.confirm("Are you sure you want to discard your manual edits and revert to the original AI version?")) {
          setRenderedContent(initialHtml);
          setHasUserEdited(false);
          setIsEditing(false);
      }
  };

  // Helper to get latest content (state or live DOM if editing)
  const getCurrentContent = () => {
      if (isEditing && containerRef.current) {
          return containerRef.current.innerHTML;
      }
      return renderedContent;
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const contentToExport = getCurrentContent();
    
    const htmlDoc = `<html><head><title>Generated Document</title><script src="https://cdn.tailwindcss.com"></script><style>@media print { body { -webkit-print-color-adjust: exact; } @page { margin: 0; } } body { padding: 40px; font-family: system-ui, -apple-system, sans-serif; background: white; color: #1a202c; }</style></head><body>${contentToExport}<script>setTimeout(() => { window.print(); window.close(); }, 1000);</script></body></html>`;
    
    printWindow.document.write(htmlDoc);
    printWindow.document.close();
  };

  const handleExportWord = () => {
    const contentToExport = getCurrentContent();

    const wordExportStyles = `
      <style>
        body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.5; color: #333; }
        .bg-white { background-color: white; }
        .p-10 { padding: 20px; }
        h1, .text-3xl { font-size: 24pt; font-weight: bold; color: #2d5aff; border-bottom: 2px solid #c1d3ff; padding-bottom: 10px; margin-bottom: 20px; }
        h2, .text-xl { font-size: 18pt; font-weight: bold; color: #4338ca; margin-top: 25px; margin-bottom: 10px; }
        h3, .text-lg { font-size: 14pt; font-weight: bold; color: #3730a3; }
        p { margin-bottom: 12px; text-align: justify; }
        .bg-indigo-50 { background-color: #eef2ff; border: 1px solid #e0e7ff; padding: 15px; margin: 15px 0; }
        .border-l-4 { border-left: 4px solid #6366f1; }
        .border-indigo-500 { border-color: #6366f1; }
        .text-indigo-900 { color: #312e81; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #ddd; }
        th { background-color: #4f46e5; color: white; padding: 10px; text-align: left; font-weight: bold; }
        td { border: 1px solid #e5e7eb; padding: 10px; vertical-align: top; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .bg-blue-100 { background-color: #dbeafe; display: inline-block; padding: 2px 6px; border-radius: 4px; }
        .text-blue-800 { color: #1e40af; font-weight: bold; font-size: 10pt; }
        .text-transparent { color: #1a41f5; }
        ul, ol { margin-left: 20px; margin-bottom: 15px; }
        li { margin-bottom: 5px; }
        a { color: #2563eb; text-decoration: underline; }
      </style>
    `;

    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
        <head>
          <meta charset='utf-8'>
          <title>Export</title>
          ${wordExportStyles}
        </head>
        <body>
          ${contentToExport}
        </body>
      </html>
    `;

    const blob = new Blob([fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Generated_Document_${new Date().getTime()}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-6 group w-full max-w-4xl mx-auto transition-all duration-300">
        {/* Toolbar */}
        <div className="flex flex-wrap justify-between items-end mb-2 px-1 gap-2">
             <div className="flex items-center gap-2">
                 <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${initialHtml === renderedContent && !isEditing && !hasUserEdited ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'} ring-2 ring-white shadow-sm`}>
                     {hasUserEdited ? (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                             <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                         </svg>
                     ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                     )}
                 </span>
                 <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                     {isEditing ? 'Editing...' : hasUserEdited ? 'Modified by User' : 'Ready'}
                 </span>
                 
                 {hasUserEdited && !isEditing && (
                     <button 
                        onClick={handleDiscardEdits}
                        className="text-[10px] text-red-500 hover:text-red-700 hover:underline ml-2 border-l border-gray-300 pl-2 flex items-center gap-1"
                        title="Revert to original AI version"
                     >
                        Discard Edits
                     </button>
                 )}
             </div>

             <div className="flex gap-2">
                 {/* AI Edit Button */}
                 <button 
                    onClick={onAiEdit} 
                    className="text-xs bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 font-medium"
                    title="Ask AI to change something"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    AI Edit
                 </button>

                 {/* Manual Edit Button */}
                 {isEditing ? (
                     <button 
                        onClick={handleSaveManualEdit} 
                        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm font-bold animate-pulse"
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Save Changes
                     </button>
                 ) : (
                     <button 
                        onClick={handleManualEdit} 
                        className={`text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm font-medium ${isTooLarge ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Edit Manually
                     </button>
                 )}

                 <div className="w-px h-6 bg-gray-300 mx-1"></div>

                 {/* Exports */}
                 <button onClick={handleExportWord} className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 shadow-sm font-medium">
                    Word
                 </button>
                 <button onClick={handleExportPDF} className="text-xs bg-genius-600 hover:bg-genius-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 shadow-md hover:shadow-lg font-medium">
                    PDF
                 </button>
             </div>
        </div>
        
        {/* Content Area */}
        <div className={`border rounded-xl overflow-hidden bg-gray-100/50 shadow-md relative transition-all duration-200 ${isEditing ? 'ring-2 ring-genius-400 border-genius-400' : 'border-gray-300'}`}>
             {isEditing && (
                <div className="absolute top-0 left-0 right-0 bg-genius-50 text-genius-700 text-[10px] font-bold px-4 py-1 border-b border-genius-100 z-10 text-center">
                    EDIT MODE ACTIVE — Click inside to type. Formatting is preserved.
                </div>
             )}
             <div className="p-4 md:p-8 max-h-[600px] overflow-y-auto custom-scrollbar bg-gray-100/50">
                 {isTooLarge ? (
                     <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-lg text-center">
                         <div className="text-yellow-600 font-bold mb-2">⚠️ Large Document Preview Truncated</div>
                         <p className="text-sm text-gray-600 mb-4">
                             This document is extremely large (likely {Math.floor(renderedContent.length/1000)}k+ characters). 
                             To prevent your browser from freezing, we are showing a preview of the first section only.
                         </p>
                         <div className="bg-white p-4 rounded shadow-sm text-left opacity-75 max-h-96 overflow-hidden relative">
                              <div dangerouslySetInnerHTML={{ __html: displayContent }} />
                              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent flex items-end justify-center pb-4">
                                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">... Content Continues ...</span>
                              </div>
                         </div>
                         <p className="text-sm font-bold text-gray-700 mt-4">
                             Click "Download PDF" or "Word" to see the FULL document.
                         </p>
                     </div>
                 ) : (
                     <div 
                        ref={containerRef}
                        contentEditable={isEditing}
                        suppressContentEditableWarning={true}
                        className={`
                            bg-white shadow-lg mx-auto w-full max-w-[210mm] min-h-[297mm] p-[20mm] 
                            prose prose-indigo prose-headings:font-bold prose-h1:text-3xl prose-a:text-blue-600
                            outline-none
                            ${isEditing ? 'cursor-text' : ''}
                        `}
                        dangerouslySetInnerHTML={{ __html: displayContent }} 
                     />
                 )}
             </div>
        </div>
    </div>
  );
}

export default DocumentPreview;
