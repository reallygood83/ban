import React from 'react';
import { clsx } from 'clsx';
import { CheckCircle, Circle } from 'lucide-react';

interface Props {
  steps: string[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export const StepWizard: React.FC<Props> = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="w-full bg-white border-b border-gray-200 mb-6 sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <button
                key={step}
                onClick={() => index <= currentStep && onStepClick(index)}
                disabled={index > currentStep}
                className={clsx(
                  isCurrent
                    ? 'border-indigo-500 text-indigo-600'
                    : isCompleted
                    ? 'border-transparent text-gray-900 hover:text-gray-700 hover:border-gray-300'
                    : 'border-transparent text-gray-400 cursor-not-allowed',
                  'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2'
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Circle className={clsx("w-4 h-4", isCurrent ? "fill-indigo-100" : "")} />
                )}
                {index + 1}. {step}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
