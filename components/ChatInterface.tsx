
import React, { useEffect, useRef, useState, memo, useCallback } from 'react';
import { Message, ExecutionPlan } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PlanPreview from './PlanPreview';
import DocumentPreview from './DocumentPreview';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  currentPlan: ExecutionPlan | null;
  onApprovePlan: () => void;
  onCancelPlan: () => void;
  executionStep: number;
  totalSteps: number;
  onFocusInput: () => void;
}

// Optimized extractor that handles streaming (incomplete) blocks robustly
const extractHtml = (text: string): string | null => {
  const startMarker = "```html";
  const match = text.match(/```html\s*/);
  
  if (!match || match.index === undefined) return null;
  
  const contentStartIndex = match.index + match[0].length;
  
  // Try to find the closing tag AFTER the start index
  const endMarker = "```";
  const endIndex = text.indexOf(endMarker, contentStartIndex);
  
  if (endIndex !== -1) {
    // Closed block
    return text.substring(contentStartIndex, endIndex);
  } else {
    // Open block (streaming) - Return everything so far
    return text.substring(contentStartIndex);
  }
};

const handleExportPDF = (content: string, isHtml: boolean) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  let htmlContent = '';
  if (isHtml) {
      htmlContent = `<html><head><title>Generated Document</title><script src="https://cdn.tailwindcss.com"></script><style>@media print { body { -webkit-print-color-adjust: exact; } @page { margin: 0; } } body { padding: 40px; font-family: system-ui, -apple-system, sans-serif; background: white; color: #1a202c; }</style></head><body>${content}<script>setTimeout(() => { window.print(); window.close(); }, 1000);</script></body></html>`;
  } else {
      htmlContent = `<html><head><title>Export</title><style>body { font-family: system-ui, sans-serif; padding: 40px; white-space: pre-wrap; }</style></head><body>${content}<script>window.print(); window.close();</script></body></html>`;
  }
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

const handleExportWord = (content: string, isHtml: boolean) => {
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

  let htmlContent = isHtml ? content : `<pre>${content}</pre>`;
  
  const fullHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
      <head>
        <meta charset='utf-8'>
        <title>Export</title>
        ${isHtml ? wordExportStyles : ''}
      </head>
      <body>
        ${htmlContent}
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

// Optimized Message Component
const MessageBubble = memo(({ 
  msg, 
  onApprovePlan, 
  onCancelPlan, 
  onFocusInput 
}: { 
  msg: Message, 
  onApprovePlan: () => void, 
  onCancelPlan: () => void, 
  onFocusInput: () => void 
}) => {
  // Extract HTML content (supports incomplete streaming blocks)
  const htmlContent = msg.role === 'model' ? extractHtml(msg.text) : null;
  
  // Clean up text for Markdown rendering
  // CRITICAL: We remove the HTML block completely (even if incomplete) to prevent ReactMarkdown 
  // from choking on 50k+ chars of unclosed HTML tags during streaming.
  let displayFullText = msg.text;
  
  if (htmlContent) {
      // 1. Remove closed blocks
      displayFullText = displayFullText.replace(/```html[\s\S]*?```/, '');
      
      // 2. Remove open (streaming) blocks
      const openTag = "```html";
      const openIndex = displayFullText.indexOf(openTag);
      // If we find an open tag that hasn't been closed yet (checked by lack of closing ``` after it)
      if (openIndex !== -1 && !displayFullText.includes("```", openIndex + openTag.length)) {
          displayFullText = displayFullText.substring(0, openIndex);
      }
  }

  // Also remove JSON blocks if they exist
  displayFullText = displayFullText.replace(/```json[\s\S]*?```/, '');
  
  // Fallback safety limit (5 Million chars) just in case
  const isTextTooLarge = displayFullText.length > 5000000;
  const safeDisplayText = isTextTooLarge ? displayFullText.substring(0, 5000000) + "\n\n... (Text truncated for performance. Please Export to view full content.)" : displayFullText;

  return (
    <div className={`flex flex-col w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
      <div
        className={`
          max-w-[95%] md:max-w-[85%] rounded-2xl p-4 md:p-6 shadow-sm transition-all
          ${msg.role === 'user' 
            ? 'bg-genius-600 text-white rounded-tr-none shadow-genius-200' 
            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none prose prose-sm md:prose-base max-w-none'
          }
          ${msg.isError ? 'bg-red-50 border-red-200 text-red-600' : ''}
        `}
      >
        {msg.role === 'model' ? (
          <>
              {/* Standard Text (HTML stripped out) */}
              {safeDisplayText.trim() && (
                  <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                      table: ({node, ...props}) => <div className="overflow-x-auto my-4 border border-gray-200 rounded-lg"><table className="min-w-full divide-y divide-gray-300" {...props} /></div>,
                      thead: ({node, ...props}) => <thead className="bg-gray-50" {...props} />,
                      th: ({node, ...props}) => <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />,
                      td: ({node, ...props}) => <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 border-t border-gray-100" {...props} />,
                      code: ({node, ...props}) => <code className="bg-gray-100 text-genius-600 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-200" {...props} />
                  }}
                >
                  {safeDisplayText}
                </ReactMarkdown>
              )}

              {/* Plan Preview Card */}
              {msg.planData && (
                <PlanPreview 
                  plan={msg.planData} 
                  onApprove={onApprovePlan} 
                  onCancel={onCancelPlan} 
                />
              )}

              {/* Generated Document Preview (Editable) */}
              {htmlContent && (
                  <DocumentPreview htmlContent={htmlContent} onAiEdit={onFocusInput} />
              )}

              {/* Streaming Cursor */}
              {msg.isStreaming && (
                <span className="inline-block w-2 h-4 bg-genius-500 ml-1 animate-pulse align-middle"></span>
              )}
          </>
        ) : (
          <div className="whitespace-pre-wrap">{msg.text}</div>
        )}
      </div>
      
      {/* Footer Actions (for plain text only) */}
      {msg.role === 'model' && !msg.isError && !msg.isStreaming && !htmlContent && !msg.planData && (
            <div className="flex gap-2 mt-2 mr-1 opacity-50 hover:opacity-100 transition-opacity">
              <button onClick={() => handleExportPDF(msg.text, false)} className="text-[10px] text-gray-500 hover:text-genius-600 flex items-center gap-1 transition-colors font-medium">
                  Download PDF
              </button>
              <span className="text-gray-300">|</span>
              <button onClick={() => handleExportWord(msg.text, false)} className="text-[10px] text-gray-500 hover:text-genius-600 flex items-center gap-1 transition-colors font-medium">
                  Download Word
              </button>
            </div>
      )}
    </div>
  );
});

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  isLoading, 
  currentPlan, 
  onApprovePlan, 
  onCancelPlan,
  executionStep,
  totalSteps,
  onFocusInput
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Handle scroll events to determine if user is looking at history
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      // If user is within 50px of the bottom, enable auto-scroll. Otherwise disable it.
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setShouldAutoScroll(isAtBottom);
    }
  };

  // Auto-scroll effect
  useEffect(() => {
    if (shouldAutoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, shouldAutoScroll, executionStep]);

  // Force scroll to bottom when a new user message is added (loading starts)
  useEffect(() => {
    if (isLoading && scrollContainerRef.current) {
        setShouldAutoScroll(true);
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [isLoading]);

  return (
    <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-white/50 backdrop-blur-sm rounded-2xl shadow-inner border border-white/20 scroll-smooth custom-scrollbar"
    >
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center p-8">
          <div className="w-24 h-24 bg-gradient-to-br from-genius-100 to-white rounded-full flex items-center justify-center mb-6 shadow-xl animate-pulse-slow border border-genius-200 relative">
             <div className="absolute inset-0 bg-genius-400 rounded-full opacity-10 animate-ping"></div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-genius-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-700 mb-3 tracking-tight">PDF Master Engine 2.0</h2>
          <p className="text-gray-500 max-w-md text-sm md:text-base leading-relaxed">
            Powered by <strong>Gemini 3 Pro</strong>. <br/>
            Drop unlimited PDFs. I will plan complex courses, generate colorful A4 study notes, and provide deep analysis.
          </p>
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble 
            key={msg.id} 
            msg={msg} 
            onApprovePlan={onApprovePlan} 
            onCancelPlan={onCancelPlan} 
            onFocusInput={onFocusInput}
        />
      ))}

      {/* Execution Status Bar */}
      {executionStep > 0 && executionStep <= totalSteps && (
         <div className="sticky bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-genius-100 p-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 z-20">
            <div className="relative h-12 w-12 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 bg-genius-100 rounded-full animate-ping opacity-75"></div>
                <div className="relative bg-white p-2 rounded-full border border-genius-200">
                    <svg className="animate-spin h-6 w-6 text-genius-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-sm font-bold text-genius-700">EXECUTION IN PROGRESS</span>
                    <span className="text-xs font-mono text-genius-500 bg-genius-50 px-2 py-0.5 rounded border border-genius-100">STEP {executionStep} / {totalSteps}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                        className="bg-gradient-to-r from-genius-400 to-genius-600 h-2.5 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${(executionStep / totalSteps) * 100}%` }}
                    ></div>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Processing chunks, analyzing content, and generating output...</p>
            </div>
         </div>
      )}
    </div>
  );
};

export default ChatInterface;
