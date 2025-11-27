import React, { useState } from 'react';
import { StepWizard } from './components/StepWizard';
import { InputPhase } from './components/InputPhase';
import { StudentDetails } from './components/StudentDetails';
import { RequestManager } from './components/RequestManager';
import { SettingsPhase } from './components/SettingsPhase';
import { ResultsPhase } from './components/ResultsPhase';
import { Student, Request, AssignmentSettings, AssignmentResult } from './types';
import { runAssignmentAlgorithm } from './utils';

const STEPS = ['기본 설정 & 명단', '비고 입력', '분리/통합 요청', '배정 설정', '결과 확인'];

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Data State
  const [grade, setGrade] = useState(1);
  const [classCount, setClassCount] = useState(2);
  const [students, setStudents] = useState<Student[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [settings, setSettings] = useState<AssignmentSettings | null>(null);
  const [results, setResults] = useState<AssignmentResult[]>([]);

  const handleInputComplete = (data: Student[], g: number, c: number) => {
    setStudents(data);
    setGrade(g);
    setClassCount(c);
    setCurrentStep(1);
  };

  const handleNotesComplete = (data: Student[]) => {
    setStudents(data);
    // setCurrentStep(2); // Managed by component
  };

  const handleRun = (newSettings: AssignmentSettings) => {
    setSettings(newSettings);
    // Run Logic
    const res = runAssignmentAlgorithm(students, requests, newSettings);
    setResults(res);
    setCurrentStep(4);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">반 배정 프로그램 Pro</h1>
        </div>
      </header>

      <StepWizard 
        steps={STEPS} 
        currentStep={currentStep} 
        onStepClick={setCurrentStep}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {currentStep === 0 && (
          <InputPhase 
            onNext={handleInputComplete} 
            initialData={students.length > 0 ? { students, grade, classCount } : undefined}
          />
        )}
        {currentStep === 1 && (
          <StudentDetails
            students={students}
            onUpdate={(s) => setStudents(s)}
            onNext={() => setCurrentStep(2)}
            onBack={() => setCurrentStep(0)}
          />
        )}
        {currentStep === 2 && (
          <RequestManager
            students={students}
            requests={requests}
            onRequestUpdate={setRequests}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}
        {currentStep === 3 && (
          <SettingsPhase
            students={students}
            initialSettings={settings || undefined}
            onRun={handleRun}
            onBack={() => setCurrentStep(2)}
          />
        )}
        {currentStep === 4 && settings && (
          <ResultsPhase
            students={students}
            results={results}
            settings={settings}
            onBack={() => setCurrentStep(3)}
          />
        )}
      </main>
    </div>
  );
};

export default App;
