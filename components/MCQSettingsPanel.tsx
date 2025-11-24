
import React, { useState } from 'react';
import { MCQSettings } from '../types';

interface MCQSettingsPanelProps {
  onClose: () => void;
  onGenerate: (settings: MCQSettings) => void;
}

const MCQSettingsPanel: React.FC<MCQSettingsPanelProps> = ({ onClose, onGenerate }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'question' | 'options' | 'answer' | 'explanation' | 'layout'>('general');
  
  const [settings, setSettings] = useState<MCQSettings>({
    mcqCount: 20,
    customStylePrompt: '',
    question: { color: 'text-blue-900', bold: true, italic: false, underline: false, fontSize: 'text-lg' },
    options: { color: 'text-gray-800', backgroundColor: 'bg-transparent', bold: false, italic: false, layout: 'stacked', boxStyle: 'card' },
    answer: { color: 'text-green-600', bold: true, icon: true, display: 'bar' },
    explanation: { color: 'text-orange-600', boxStyle: 'card', boldHeading: true, fontSize: 'text-sm' },
    global: { divider: 'dashed', spacing: 'space-y-8' },
    language: 'Bilingual (Hindi + English)'
  });

  const colors = [
    { label: 'Black', value: 'text-gray-900' },
    { label: 'Gray', value: 'text-gray-600' },
    { label: 'Dark Blue', value: 'text-blue-900' },
    { label: 'Bright Blue', value: 'text-blue-600' },
    { label: 'Soft Purple', value: 'text-purple-600' },
    { label: 'Deep Purple', value: 'text-purple-900' },
    { label: 'Bright Green', value: 'text-green-600' },
    { label: 'Teal', value: 'text-teal-600' },
    { label: 'Orange', value: 'text-orange-600' },
    { label: 'Red', value: 'text-red-600' },
  ];
  
  const bgColors = [
      { label: 'None', value: 'bg-transparent' },
      { label: 'White', value: 'bg-white' },
      { label: 'Light Gray', value: 'bg-gray-50' },
      { label: 'Soft Blue', value: 'bg-blue-50' },
      { label: 'Soft Green', value: 'bg-green-50' },
      { label: 'Soft Yellow', value: 'bg-yellow-50' },
      { label: 'Soft Purple', value: 'bg-purple-50' },
      { label: 'Soft Red', value: 'bg-red-50' },
      { label: 'Dark (Gray)', value: 'bg-gray-800 text-white' },
  ];

  const handleSave = () => {
    onGenerate(settings);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-genius-50 to-white">
          <div>
             <h2 className="text-xl font-bold text-genius-800">MCQ Studio</h2>
             <p className="text-xs text-gray-500">Customize count, logic, and pixel-perfect styles</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
          {[
            { id: 'general', label: 'General & AI' },
            { id: 'question', label: 'Question' },
            { id: 'options', label: 'Options' },
            { id: 'answer', label: 'Answer Key' },
            { id: 'explanation', label: 'Explanation' },
            { id: 'layout', label: 'Layout' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap
                ${activeTab === tab.id 
                  ? 'text-genius-600 border-b-2 border-genius-600 bg-genius-50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

          {/* GENERAL SETTINGS (New) */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-xl border border-indigo-100">
                 <label className="flex items-center gap-2 text-sm font-bold text-indigo-900 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI Auto-Styler (Optional)
                 </label>
                 <textarea
                    placeholder="e.g. Make it space-themed with dark backgrounds and neon text..."
                    className="w-full p-3 rounded-lg border border-indigo-200 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white/80"
                    rows={2}
                    value={settings.customStylePrompt}
                    onChange={(e) => setSettings({...settings, customStylePrompt: e.target.value})}
                 />
                 <p className="text-[10px] text-indigo-500 mt-1.5">
                   *Typing here will let AI override manual colors and styles based on your creative prompt.
                 </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Total Questions</label>
                    <div className="flex items-center gap-3">
                       <input 
                         type="range" 
                         min="1" 
                         max="1000" 
                         value={settings.mcqCount}
                         onChange={(e) => setSettings({...settings, mcqCount: parseInt(e.target.value)})}
                         className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-genius-600"
                       />
                       <input 
                         type="number" 
                         min="1" 
                         max="1000" 
                         value={settings.mcqCount}
                         onChange={(e) => setSettings({...settings, mcqCount: parseInt(e.target.value)})}
                         className="w-20 text-center font-bold text-genius-700 bg-genius-50 py-1 px-2 rounded-lg border border-genius-100 focus:ring-2 focus:ring-genius-400 focus:outline-none"
                       />
                    </div>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Language Mode</label>
                    <select
                       className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                       value={settings.language}
                       onChange={(e) => setSettings({...settings, language: e.target.value as any})}
                    >
                        <option value="English Only">English Only</option>
                        <option value="Hindi Only">Hindi Only</option>
                        <option value="Odia Only">Odia Only</option>
                        <option value="Bilingual (Hindi + English)">Bilingual (Hindi + English)</option>
                        <option value="Bilingual (Odia + English)">Bilingual (Odia + English)</option>
                    </select>
                 </div>
              </div>
            </div>
          )}
          
          {/* QUESTION SETTINGS */}
          {activeTab === 'question' && (
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Text Color</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                      value={settings.question.color}
                      onChange={(e) => setSettings({...settings, question: {...settings.question, color: e.target.value}})}
                    >
                      {colors.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Font Size</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                      value={settings.question.fontSize}
                      onChange={(e) => setSettings({...settings, question: {...settings.question, fontSize: e.target.value}})}
                    >
                      <option value="text-sm">Small</option>
                      <option value="text-base">Medium</option>
                      <option value="text-lg">Large</option>
                      <option value="text-xl">Extra Large</option>
                    </select>
                  </div>
               </div>
               <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Typography</label>
                  <div className="flex gap-3">
                      <button 
                        onClick={() => setSettings({...settings, question: {...settings.question, bold: !settings.question.bold}})}
                        className={`px-4 py-2 rounded-lg border text-sm font-bold ${settings.question.bold ? 'bg-genius-100 border-genius-400 text-genius-700' : 'bg-white border-gray-300'}`}
                      >
                        Bold
                      </button>
                      <button 
                        onClick={() => setSettings({...settings, question: {...settings.question, italic: !settings.question.italic}})}
                        className={`px-4 py-2 rounded-lg border text-sm italic ${settings.question.italic ? 'bg-genius-100 border-genius-400 text-genius-700' : 'bg-white border-gray-300'}`}
                      >
                        Italic
                      </button>
                      <button 
                        onClick={() => setSettings({...settings, question: {...settings.question, underline: !settings.question.underline}})}
                        className={`px-4 py-2 rounded-lg border text-sm underline ${settings.question.underline ? 'bg-genius-100 border-genius-400 text-genius-700' : 'bg-white border-gray-300'}`}
                      >
                        Underline
                      </button>
                  </div>
               </div>
            </div>
          )}

          {/* OPTIONS SETTINGS */}
          {activeTab === 'options' && (
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Text Color</label>
                     <select 
                       className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                       value={settings.options.color}
                       onChange={(e) => setSettings({...settings, options: {...settings.options, color: e.target.value}})}
                     >
                       {colors.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Layout</label>
                     <select 
                       className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                       value={settings.options.layout}
                       onChange={(e) => setSettings({...settings, options: {...settings.options, layout: e.target.value as any}})}
                     >
                       <option value="stacked">Stacked (One per line)</option>
                       <option value="inline">Inline (Two per line)</option>
                     </select>
                   </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Background Color</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {bgColors.map((bg) => (
                             <button
                                key={bg.value}
                                onClick={() => setSettings({...settings, options: {...settings.options, backgroundColor: bg.value}})}
                                className={`
                                    p-2 rounded-lg border text-xs flex items-center gap-2 transition-all
                                    ${settings.options.backgroundColor === bg.value 
                                        ? 'border-genius-500 ring-2 ring-genius-100 bg-white shadow-sm' 
                                        : 'border-gray-200 hover:bg-gray-50 bg-white'}
                                `}
                             >
                                <div className={`w-4 h-4 rounded-full border border-gray-200 shadow-sm ${bg.value === 'bg-transparent' ? 'bg-white' : bg.value.replace('text-white', '')}`}></div>
                                <span className="truncate">{bg.label}</span>
                             </button>
                        ))}
                    </div>
                </div>

                <div>
                   <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Box Style (Borders)</label>
                   <div className="grid grid-cols-2 gap-3">
                       <div 
                         onClick={() => setSettings({...settings, options: {...settings.options, boxStyle: 'simple'}})}
                         className={`p-3 border rounded-lg cursor-pointer text-sm ${settings.options.boxStyle === 'simple' ? 'border-genius-500 bg-genius-50 ring-1 ring-genius-500' : 'border-gray-200 hover:bg-gray-50'}`}
                       >
                          No Border (Clean)
                       </div>
                       <div 
                         onClick={() => setSettings({...settings, options: {...settings.options, boxStyle: 'card'}})}
                         className={`p-3 border rounded-lg cursor-pointer text-sm bg-white shadow-sm ${settings.options.boxStyle === 'card' ? 'border-genius-500 ring-1 ring-genius-500' : 'border-gray-200 hover:bg-gray-50'}`}
                       >
                          Card (Border + Shadow)
                       </div>
                   </div>
                </div>
             </div>
          )}

          {/* ANSWER SETTINGS */}
          {activeTab === 'answer' && (
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Highlight Color</label>
                     <select 
                       className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                       value={settings.answer.color}
                       onChange={(e) => setSettings({...settings, answer: {...settings.answer, color: e.target.value}})}
                     >
                       {colors.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Display Style</label>
                     <select 
                       className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                       value={settings.answer.display}
                       onChange={(e) => setSettings({...settings, answer: {...settings.answer, display: e.target.value as any}})}
                     >
                       <option value="tag">Small Tag</option>
                       <option value="bar">Full Width Bar</option>
                       <option value="inline">Inline Text</option>
                     </select>
                   </div>
                </div>
                <div className="flex gap-4 items-center mt-2">
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settings.answer.icon}
                          onChange={() => setSettings({...settings, answer: {...settings.answer, icon: !settings.answer.icon}})}
                          className="rounded border-gray-300 text-genius-600 focus:ring-genius-500"
                        />
                        <span className="text-sm text-gray-700">Show Checkmark Icon</span>
                     </label>
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settings.answer.bold}
                          onChange={() => setSettings({...settings, answer: {...settings.answer, bold: !settings.answer.bold}})}
                          className="rounded border-gray-300 text-genius-600 focus:ring-genius-500"
                        />
                        <span className="text-sm text-gray-700">Bold Text</span>
                     </label>
                </div>
             </div>
          )}

          {/* EXPLANATION SETTINGS */}
          {activeTab === 'explanation' && (
              <div className="space-y-6">
                 <div>
                     <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Container Style</label>
                     <div className="grid grid-cols-2 gap-3">
                       <div 
                         onClick={() => setSettings({...settings, explanation: {...settings.explanation, boxStyle: 'simple'}})}
                         className={`p-3 border rounded-lg cursor-pointer text-sm ${settings.explanation.boxStyle === 'simple' ? 'border-genius-500 bg-genius-50' : 'border-gray-200'}`}
                       >
                          Simple Paragraph
                       </div>
                       <div 
                         onClick={() => setSettings({...settings, explanation: {...settings.explanation, boxStyle: 'card'}})}
                         className={`p-3 border rounded-lg cursor-pointer text-sm ${settings.explanation.boxStyle === 'card' ? 'border-genius-500 bg-genius-50' : 'border-gray-200'}`}
                       >
                          Highlighted Box
                       </div>
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Text Color</label>
                      <select 
                       className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                       value={settings.explanation.color}
                       onChange={(e) => setSettings({...settings, explanation: {...settings.explanation, color: e.target.value}})}
                     >
                       {colors.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                     </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Font Size</label>
                       <select 
                       className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                       value={settings.explanation.fontSize}
                       onChange={(e) => setSettings({...settings, explanation: {...settings.explanation, fontSize: e.target.value}})}
                     >
                       <option value="text-xs">Small (XS)</option>
                       <option value="text-sm">Regular (SM)</option>
                     </select>
                    </div>
                 </div>
              </div>
          )}

          {/* LAYOUT */}
          {activeTab === 'layout' && (
             <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Spacing</label>
                      <select 
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        value={settings.global.spacing}
                        onChange={(e) => setSettings({...settings, global: {...settings.global, spacing: e.target.value as any}})}
                      >
                        <option value="space-y-4">Tight</option>
                        <option value="space-y-8">Medium</option>
                        <option value="space-y-12">Wide</option>
                      </select>
                    </div>
                    <div>
                       <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Divider</label>
                       <select 
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        value={settings.global.divider}
                        onChange={(e) => setSettings({...settings, global: {...settings.global, divider: e.target.value as any}})}
                      >
                        <option value="dashed">Dashed Line</option>
                        <option value="dotted">Dotted Line</option>
                        <option value="solid">Solid Line</option>
                        <option value="none">No Divider</option>
                      </select>
                    </div>
                 </div>
                 <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600 text-center">
                    Layout follows a clean "Boxed Options" approach. No global card wrappers will be used.
                 </div>
             </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
           <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
             Cancel
           </button>
           <button onClick={handleSave} className="px-6 py-2 text-sm font-bold text-white bg-genius-600 hover:bg-genius-700 rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-95">
             Generate {settings.mcqCount} MCQs
           </button>
        </div>

      </div>
    </div>
  );
};

export default MCQSettingsPanel;
