
export interface FileData {
  name: string;
  data: string; // Base64 string
  mimeType: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
  isLoading?: boolean;
  isStreaming?: boolean; // For live typing effect
  planData?: ExecutionPlan; // If this message contains a plan to approve
}

export interface ExecutionPlan {
  title: string;
  steps: string[];
}

export enum FeatureCategory {
  CORE = 'Core Capabilities',
  SUMMARY = 'Summaries',
  CONVERT = 'Convert Content',
  QUESTIONS = 'Question Generator',
  UTILITY = 'Utility',
  PLANNER = 'Study Planner',
  ANALYSIS = 'Analysis Mode',
  REWRITE = 'Rewrite',
}

export interface QuickAction {
  label: string;
  prompt: string;
  category: FeatureCategory;
  icon?: string;
  requiresSettings?: boolean; // Trigger for settings panel
}

export type AppState = 'idle' | 'planning' | 'waiting_approval' | 'executing' | 'completed';

export interface MCQSettings {
  mcqCount: number;
  customStylePrompt: string;
  question: {
    color: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    fontSize: string;
  };
  options: {
    color: string;
    backgroundColor: string; // New field for option background
    bold: boolean;
    italic: boolean;
    layout: 'inline' | 'stacked';
    boxStyle: 'card' | 'simple';
  };
  answer: {
    color: string;
    bold: boolean;
    icon: boolean; // Checkmark
    display: 'bar' | 'tag' | 'inline';
  };
  explanation: {
    color: string;
    boxStyle: 'card' | 'simple';
    boldHeading: boolean;
    fontSize: string;
  };
  global: {
    divider: 'dashed' | 'dotted' | 'solid' | 'none';
    spacing: 'space-y-4' | 'space-y-8' | 'space-y-12';
  };
  language: 'English Only' | 'Hindi Only' | 'Odia Only' | 'Bilingual (Hindi + English)' | 'Bilingual (Odia + English)';
}
