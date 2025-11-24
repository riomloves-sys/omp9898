
import React, { useState, useRef } from 'react';
import { FileData, Message, ExecutionPlan, AppState, MCQSettings } from './types';
import { QUICK_ACTIONS } from './constants';
import { streamMessage, resetSession } from './services/geminiService';
import { fileToBase64 } from './services/fileUtils';
import FileUpload from './components/FileUpload';
import ChatInterface from './components/ChatInterface';
import FeatureCard from './components/FeatureCard';
import MCQSettingsPanel from './components/MCQSettingsPanel';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [appState, setAppState] = useState<AppState>('idle');
  const [sentFileNames, setSentFileNames] = useState<Set<string>>(new Set());
  
  // Planning State
  const [currentPlan, setCurrentPlan] = useState<ExecutionPlan | null>(null);
  const [executionStep, setExecutionStep] = useState(0);

  // MCQ Settings State
  const [showMCQSettings, setShowMCQSettings] = useState(false);

  // Stop control
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Chat Attachment Input
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const focusInput = () => {
    if (textareaRef.current) {
        textareaRef.current.focus();
    }
  };

  const handleFilesSelected = (newFiles: FileData[]) => {
    // TOTAL SIZE CHECK: 
    // We set safety limit at ~500MB for Base64 data to accommodate very large PDF uploads.
    const MAX_PAYLOAD_SIZE = 500 * 1024 * 1024;
    
    const currentTotalSize = files.reduce((acc, f) => acc + f.data.length, 0);
    const newBatchSize = newFiles.reduce((acc, f) => acc + f.data.length, 0);

    if (currentTotalSize + newBatchSize > MAX_PAYLOAD_SIZE) {
        alert("Storage Limit Exceeded: The total size of all uploaded files exceeds the app safety limit (500MB). Please remove some files.");
        return;
    }

    setFiles(prev => [...prev, ...newFiles]);
    
    // Determine message based on file types
    const imageCount = newFiles.filter(f => f.mimeType.startsWith('image/')).length;
    const pdfCount = newFiles.filter(f => f.mimeType === 'application/pdf').length;
    
    let statusText = "";
    if (files.length === 0) {
        resetSession();
        setSentFileNames(new Set());
        statusText = `**Uploaded:** ${pdfCount > 0 ? `${pdfCount} PDF(s)` : ''} ${imageCount > 0 ? `${imageCount} Image(s)` : ''}.\nI am ready. I can use images for style references or content analysis.`;
        
        setMessages([{
          id: uuidv4(),
          role: 'model',
          text: statusText,
        }]);
    } else {
        statusText = `Added **${newFiles.length}** more file(s).`;
         setMessages(prev => [...prev, {
            id: uuidv4(),
            role: 'model',
            text: statusText,
         }]);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = [...files];
    const removed = newFiles.splice(index, 1)[0];
    setFiles(newFiles);
    setSentFileNames(prev => {
        const newSet = new Set(prev);
        newSet.delete(removed.name);
        return newSet;
    });
  };
  
  const handleChatAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const newFilesData: FileData[] = [];
          for (let i = 0; i < e.target.files.length; i++) {
              const file = e.target.files[i];
              // Size Check for chat attachment
              if (file.size > 200 * 1024 * 1024) {
                  alert(`Skipped "${file.name}": File too large (>200MB).`);
                  continue;
              }

              if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
                 alert(`Skipped "${file.name}": Invalid file type.`);
                 continue;
              }
              try {
                  const base64 = await fileToBase64(file);
                  newFilesData.push({
                      name: file.name,
                      data: base64,
                      mimeType: file.type
                  });
              } catch(err) {
                  console.error(err);
              }
          }
          if (newFilesData.length > 0) {
              handleFilesSelected(newFilesData);
          }
          if (chatFileInputRef.current) chatFileInputRef.current.value = '';
      }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAppState('idle');
    setMessages(prev => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.role === 'model' && lastMsg.isStreaming) {
        return [...prev.slice(0, -1), { ...lastMsg, isStreaming: false, text: lastMsg.text + "\n\n**[Stopped by User]**" }];
      }
      return prev;
    });
  };

  const handleQuickAction = (prompt: string, requiresSettings?: boolean) => {
    if (requiresSettings) {
      setShowMCQSettings(true);
    } else {
      handleSendMessage(prompt);
    }
  };

  const generateCustomMCQ = (settings: MCQSettings) => {
    setShowMCQSettings(false);
    
    // Construct option style classes logic
    let optionClasses = `block mb-2 ${settings.options.color} ${settings.options.bold ? 'font-bold' : ''} ${settings.options.italic ? 'italic' : ''} `;
    
    // Handle Background + Box Style combination
    if (settings.options.boxStyle === 'card') {
        // Card style: borders + shadow + optional bg
        optionClasses += `p-3 rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors ${settings.options.backgroundColor !== 'bg-transparent' ? settings.options.backgroundColor : 'bg-white'}`;
    } else {
        // Simple style: No border
        if (settings.options.backgroundColor !== 'bg-transparent') {
            // If user selected a color but NOT 'card', gives it a filled bar look without border
            optionClasses += `p-3 rounded-lg ${settings.options.backgroundColor}`;
        } else {
            // Truly simple text
            optionClasses += `py-1`;
        }
    }

    // Dynamic Language Logic
    const isBilingual = settings.language.includes("Bilingual");
    const targetLang = settings.language.includes("Odia") ? "ODIA" : "HINDI";
    const targetLangNormal = settings.language.includes("Odia") ? "Odia" : "Hindi";

    // Construct precise visual prompt instructions
    const prompt = `
[STRICT VISUAL INSTRUCTION: GENERATE MCQ PDF]
Generate ${settings.mcqCount} High-Quality MCQs from the attached files.
Output Format: HTML (Strictly follow the CSS rules below).

${settings.customStylePrompt ? `**SPECIAL STYLE OVERRIDE:** ${settings.customStylePrompt}\n(Use the AI style prompt to override colors and aesthetics if it conflicts with standard settings below, but keep the layout logic)\n` : ''}

**VISUAL STYLE SETTINGS (Tailwind CSS):**
- **Question Style:** ${settings.question.color} ${settings.question.fontSize} ${settings.question.bold ? 'font-bold' : ''} ${settings.question.italic ? 'italic' : ''} ${settings.question.underline ? 'underline' : ''}
- **Option Style:** ${optionClasses}
- **Layout:** ${settings.options.layout === 'inline' ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-2'}
- **Correct Answer:** ${settings.answer.color} ${settings.answer.bold ? 'font-bold' : ''} ${settings.answer.display === 'tag' ? 'inline-block px-2 py-1 bg-green-50 rounded text-xs' : settings.answer.display === 'bar' ? 'block w-full p-2 bg-green-50 border-l-4 border-green-500 rounded-r' : ''}
- **Explanation:** ${settings.explanation.color} ${settings.explanation.fontSize} ${settings.explanation.boxStyle === 'card' ? 'p-4 bg-gray-50 rounded-lg border border-gray-200 mt-2' : 'mt-1 italic'}
- **Global Divider:** ${settings.global.divider === 'dashed' ? 'border-b border-dashed border-gray-300 my-6' : settings.global.divider === 'solid' ? 'border-b border-gray-200 my-6' : 'my-6'}

**LANGUAGE MODE: ${settings.language}**
${isBilingual ? `
**CRITICAL BILINGUAL CONTENT RULES:**
1. **QUESTION:** Write the question in ENGLISH, followed by a line break, then the ${targetLang} translation.
2. **OPTIONS:** EVERY option must be bilingual. Format: "A) English Option (${targetLangNormal} Option)" or "A) English Option / ${targetLangNormal} Option".
3. **EXPLANATION:** You MUST write the explanation in ENGLISH first. Then, add a <br/> tag or line break, and write the explanation in ${targetLang}. **DO NOT** skip the ${targetLang} explanation.
` : ''}

**Task:** 
Create ${settings.mcqCount} MCQs based on the document content. 
Use the styles above. 
${isBilingual ? `ENSURE OPTIONS AND EXPLANATIONS ARE IN BOTH ENGLISH AND ${targetLang}.` : ''}
Start generating HTML now.
    `;

    handleSendMessage(prompt.trim());
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || appState === 'executing') return;
    if (files.length === 0) {
      alert("Please upload a PDF or Image first.");
      return;
    }

    abortControllerRef.current = new AbortController();

    // Determine if it's a hidden system prompt (visual override) or user typed
    const isSystemPrompt = text.includes("[STRICT VISUAL INSTRUCTION");
    const displayText = isSystemPrompt ? "**Generating Custom MCQs...** (Applying visual settings)" : text;

    const userMessage: Message = { id: uuidv4(), role: 'user', text: displayText };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setAppState('planning');

    const aiMsgId = uuidv4();
    setMessages(prev => [...prev, { id: aiMsgId, role: 'model', text: '', isStreaming: true }]);

    try {
        const filesToSend = files.filter(f => !sentFileNames.has(f.name));
        let fullResponse = '';
        let lastUpdate = Date.now();
        
        for await (const chunk of streamMessage(text, filesToSend)) {
            if (abortControllerRef.current?.signal.aborted) break;
            fullResponse += chunk;

            // PERFORMANCE FIX: Throttle state updates to 200ms
            const now = Date.now();
            if (now - lastUpdate > 200) {
                 setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: fullResponse } : m));
                 lastUpdate = now;
            }
        }

        // Final update to ensure all content is captured
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: fullResponse } : m));

        if (abortControllerRef.current?.signal.aborted) return;

        setSentFileNames(prev => {
            const newSet = new Set(prev);
            filesToSend.forEach(f => newSet.add(f.name));
            return newSet;
        });

        const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            try {
                const planData: ExecutionPlan = JSON.parse(jsonMatch[1]);
                setCurrentPlan(planData);
                setAppState('waiting_approval');
                setMessages(prev => prev.map(m => m.id === aiMsgId ? { 
                    ...m, 
                    isStreaming: false, 
                    text: fullResponse.replace(/```json[\s\S]*?```/, ''), 
                    planData: planData 
                } : m));
                return;
            } catch (e) {
                console.error("Failed to parse plan JSON", e);
            }
        }

        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false } : m));
        setAppState('idle');

    } catch (error: any) {
        console.error("Chat Error:", error);
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { 
            ...m, 
            isStreaming: false, 
            isError: true, 
            text: error.message || "Error processing request." 
        } : m));
        setAppState('idle');
    } finally {
        abortControllerRef.current = null;
    }
  };

  const executePlan = async () => {
      if (!currentPlan) return;
      setAppState('executing');
      setExecutionStep(1);
      
      abortControllerRef.current = new AbortController();

      for (let i = 0; i < currentPlan.steps.length; i++) {
          if (abortControllerRef.current?.signal.aborted) break;

          const step = currentPlan.steps[i];
          setExecutionStep(i + 1);
          
          const stepMsgId = uuidv4();
          setMessages(prev => [...prev, { 
              id: stepMsgId, 
              role: 'model', 
              text: `**Step ${i + 1}:** ${step}\n\n`, 
              isStreaming: true 
          }]);

          try {
            let stepResponse = '';
            let lastUpdate = Date.now();
            const prompt = `[SYSTEM: EXECUTION MODE] Current Plan: "${currentPlan.title}". \nTASK: Execute Step ${i + 1}: "${step}". \nOutput only the content for this step. If it involves visual data, use HTML.`;
            
            for await (const chunk of streamMessage(prompt, [])) { 
                if (abortControllerRef.current?.signal.aborted) break;
                stepResponse += chunk;
                
                // Throttled update
                const now = Date.now();
                if (now - lastUpdate > 200) {
                    setMessages(prev => prev.map(m => m.id === stepMsgId ? { ...m, text: `**Step ${i + 1}:** ${step}\n\n${stepResponse}` } : m));
                    lastUpdate = now;
                }
            }
            
            // Final update for step
            setMessages(prev => prev.map(m => m.id === stepMsgId ? { ...m, text: `**Step ${i + 1}:** ${step}\n\n${stepResponse}` } : m));

            if (abortControllerRef.current?.signal.aborted) {
                 setMessages(prev => prev.map(m => m.id === stepMsgId ? { ...m, isStreaming: false, text: m.text + " [Stopped]" } : m));
                 break;
            }

            setMessages(prev => prev.map(m => m.id === stepMsgId ? { ...m, isStreaming: false } : m));

          } catch (error: any) {
             setMessages(prev => prev.map(m => m.id === stepMsgId ? { 
                 ...m, 
                 isStreaming: false, 
                 isError: true,
                 text: m.text + `\n\n🛑 **EXECUTION STOPPED:** ${error.message || "Unknown error occurred."}`
             } : m));
             setAppState('idle');
             abortControllerRef.current = null;
             return;
          }
      }

      setAppState('completed');
      setExecutionStep(0);
      setCurrentPlan(null);
      abortControllerRef.current = null;
  };

  const cancelPlan = () => {
    setAppState('idle');
    setCurrentPlan(null);
    setMessages(prev => [...prev, { id: uuidv4(), role: 'model', text: "Plan cancelled." }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  return (
    <div className="h-screen flex flex-col md:flex-row max-w-[1600px] mx-auto p-2 md:p-4 gap-4 bg-gradient-to-br from-gray-50 to-blue-50/50">
      
      {showMCQSettings && (
        <MCQSettingsPanel onClose={() => setShowMCQSettings(false)} onGenerate={generateCustomMCQ} />
      )}

      {/* Sidebar */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col space-y-4 bg-white rounded-3xl p-4 shadow-xl border border-white/50 h-full overflow-hidden shrink-0">
        <header className="shrink-0">
          <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-genius-700 to-genius-500">
            PDF Genius
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Unlimited PDFs • Deep Planning • Auto-Execution
          </p>
        </header>

        <div className="shrink-0">
            <FileUpload 
                onFilesSelected={handleFilesSelected} 
                currentFiles={files}
                onRemoveFile={handleRemoveFile}
            />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-2 sticky top-0 bg-white pb-2 z-10">Power Actions</h2>
            <div className="grid grid-cols-1 gap-2 pb-4">
              {QUICK_ACTIONS.map((action, idx) => (
                <FeatureCard 
                    key={idx} 
                    action={action} 
                    onClick={(p) => handleQuickAction(p, action.requiresSettings)} 
                    disabled={files.length === 0 || appState !== 'idle'} 
                />
              ))}
            </div>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col h-full bg-white/60 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/60 relative">
        <div className="flex-1 overflow-hidden flex flex-col relative z-0">
             <ChatInterface 
                messages={messages} 
                isLoading={appState === 'planning' || appState === 'executing'} 
                currentPlan={currentPlan}
                onApprovePlan={executePlan}
                onCancelPlan={cancelPlan}
                executionStep={executionStep}
                totalSteps={currentPlan?.steps.length || 0}
                onFocusInput={focusInput}
             />
        </div>

        {/* Input */}
        <div className="p-4 bg-white/80 backdrop-blur-lg border-t border-white/50 z-10">
          <div className="relative flex items-center shadow-lg rounded-2xl bg-white border border-gray-100 focus-within:ring-2 focus-within:ring-genius-200 focus-within:border-genius-400 transition-all">
            
            <button
               onClick={() => chatFileInputRef.current?.click()}
               disabled={appState !== 'idle'}
               className={`
                  ml-3 p-2 rounded-xl transition-colors
                  ${appState !== 'idle' ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:bg-gray-100 hover:text-genius-600'}
               `}
               title="Attach Image or PDF"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
               </svg>
            </button>
            <input 
               type="file" 
               ref={chatFileInputRef} 
               className="hidden" 
               multiple 
               accept="application/pdf,image/png,image/jpeg,image/webp"
               onChange={handleChatAttachment}
            />

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                  appState === 'waiting_approval' ? "Approve the plan above to continue..." :
                  appState === 'executing' ? "Executing plan..." :
                  files.length > 0 ? "Ask for a 'Deep Summary' or 'Full Course'..." : "Upload PDFs or Images to start..."
              }
              disabled={files.length === 0 || (appState !== 'idle' && appState !== 'planning' && appState !== 'executing')}
              className="flex-1 bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-400 py-4 px-3 resize-none h-16 max-h-40"
              rows={1}
            />
            
            {appState !== 'idle' && appState !== 'waiting_approval' ? (
                <button
                  onClick={stopGeneration}
                  className="absolute right-3 p-2.5 rounded-xl transition-all duration-300 text-white bg-red-500 hover:bg-red-600 hover:shadow-lg hover:scale-105 active:scale-95"
                  title="Stop Generation"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                   </svg>
                </button>
            ) : (
                <button
                  onClick={() => handleSendMessage(input)}
                  disabled={!input.trim() || files.length === 0 || appState !== 'idle'}
                  className={`
                    absolute right-3 p-2.5 rounded-xl transition-all duration-300
                    ${!input.trim() || files.length === 0 || appState !== 'idle'
                      ? 'text-gray-300 bg-gray-50 cursor-not-allowed' 
                      : 'text-white bg-gradient-to-br from-genius-500 to-genius-700 hover:shadow-lg hover:scale-105 active:scale-95'
                    }
                  `}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
