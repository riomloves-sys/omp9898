import React from 'react';
import { QuickAction } from '../types';

interface FeatureCardProps {
  action: QuickAction;
  onClick: (prompt: string) => void;
  disabled: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ action, onClick, disabled }) => {
  return (
    <button
      onClick={() => onClick(action.prompt)}
      disabled={disabled}
      className={`
        flex flex-col items-start p-4 rounded-xl text-left transition-all duration-200 border
        ${disabled 
          ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' 
          : 'bg-white border-gray-200 text-gray-700 hover:border-genius-400 hover:shadow-md hover:bg-genius-50 cursor-pointer active:scale-95'
        }
      `}
    >
      <span className={`text-xs font-bold uppercase mb-1 tracking-wider ${disabled ? 'text-gray-400' : 'text-genius-600'}`}>
        {action.category}
      </span>
      <h3 className="font-semibold text-sm md:text-base">{action.label}</h3>
    </button>
  );
};

export default FeatureCard;
