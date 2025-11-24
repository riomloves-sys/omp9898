import React from 'react';
import { ExecutionPlan } from '../types';

interface PlanPreviewProps {
  plan: ExecutionPlan;
  onApprove: () => void;
  onCancel: () => void;
}

const PlanPreview: React.FC<PlanPreviewProps> = ({ plan, onApprove, onCancel }) => {
  return (
    <div className="mt-4 bg-white border-2 border-genius-200 rounded-xl overflow-hidden shadow-lg animate-pulse-slow">
      <div className="bg-genius-50 p-4 border-b border-genius-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-genius-600 text-white text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
              AI Strategy
            </span>
            <h3 className="font-bold text-genius-900">{plan.title}</h3>
          </div>
        </div>
        <p className="text-xs text-genius-600 mt-1">
          I have analyzed the request. Here is my execution plan to handle this large task:
        </p>
      </div>
      
      <div className="p-4 bg-white">
        <ul className="space-y-3">
          {plan.steps.map((step, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-genius-100 text-genius-600 flex items-center justify-center text-xs font-bold border border-genius-200">
                {idx + 1}
              </div>
              <span className="text-sm text-gray-700 font-medium leading-tight pt-0.5">
                {step}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-gray-50 p-3 flex gap-3 justify-end border-t border-gray-100">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onApprove}
          className="px-4 py-2 text-sm font-bold text-white bg-genius-600 hover:bg-genius-700 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <span>Approve & Start Execution</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default PlanPreview;
