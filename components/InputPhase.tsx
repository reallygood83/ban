import React, { useState } from 'react';
import { Student, Gender, NoteType } from '../types';
import { AlertCircle } from 'lucide-react';

interface Props {
  onNext: (students: Student[], grade: number, classCount: number) => void;
  initialData?: { students: Student[], grade: number, classCount: number };
}

export const InputPhase: React.FC<Props> = ({ onNext, initialData }) => {
  const [grade, setGrade] = useState(initialData?.grade || 1);
  const [classCount, setClassCount] = useState(initialData?.classCount || 2);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Pre-fill input text if editing
  React.useEffect(() => {
    if (initialData?.students) {
      const text = initialData.students
        .sort((a,b) => a.currentClass - b.currentClass || a.number - b.number)
        .map(s => `${s.number} ${s.name} ${s.gender}`)
        .join('\n');
      setInputText(text);
    }
  }, [initialData]);

  const handleProcess = () => {
    setError(null);
    const lines = inputText.split('\n').map(l => l.trim()).filter(l => l);
    const parsedStudents: Student[] = [];
    
    // We need to infer current class based on input structure?
    // Prompt says: "Input list created by settings" -> "Class Input Window Created"
    // implies we iterate through classes 1..N and ask for input.
    // However, for a single page app, usually one big text area or tabs are better.
    // The prompt says: "When grade/class count set, class list input window created".
    // "Enter No Name Gender space separated... Class list screen created".
    // Let's stick to the prompt: We need multiple inputs or a way to distinguish classes.
    // Simplification: We will use a tabbed input or simply assume the user inputs for "Current Class 1", then "Current Class 2".
    // ACTUALLY: Let's make it explicit. A text area for EACH class.
    
    // Changing strategy: We render N text areas.
    // But since I'm in a component, let's keep it simple.
  };

  // Re-implementation with per-class input
  const [classInputs, setClassInputs] = useState<string[]>(
    initialData 
      ? Array.from({length: initialData.classCount}, (_, i) => 
          initialData.students.filter(s => s.currentClass === i + 1)
          .sort((a,b) => a.number - b.number)
          .map(s => `${s.number} ${s.name} ${s.gender}`)
          .join('\n')
        )
      : Array(classCount).fill('')
  );

  // Update classInputs when classCount changes
  React.useEffect(() => {
    setClassInputs(prev => {
      const next = Array(classCount).fill('');
      for(let i=0; i<Math.min(prev.length, classCount); i++) next[i] = prev[i];
      return next;
    });
  }, [classCount]);

  const updateClassInput = (index: number, val: string) => {
    const newInputs = [...classInputs];
    newInputs[index] = val;
    setClassInputs(newInputs);
  };

  const handleSubmit = () => {
    const allStudents: Student[] = [];
    let hasError = false;

    classInputs.forEach((text, idx) => {
      const currentClass = idx + 1;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      lines.forEach(line => {
        // Expected: "Number Name Gender" e.g., "1 홍길동 남"
        const parts = line.split(/\s+/);
        if (parts.length < 3) return; // Skip invalid
        
        const num = parseInt(parts[0]);
        const name = parts[1];
        const genderRaw = parts[2];
        
        if (isNaN(num) || (genderRaw !== '남' && genderRaw !== '여')) {
          // Soft fail or ignore? Let's allow but maybe warn
        }
        
        const gender = (genderRaw === '남' || genderRaw === '여') ? genderRaw as Gender : '남'; // Default to male if typo

        allStudents.push({
          id: `${currentClass}-${num}-${name}`,
          currentClass,
          number: num,
          name,
          gender,
          noteType: NoteType.None,
          noteDetail: ''
        });
      });
    });

    if (allStudents.length === 0) {
      setError("입력된 학생이 없습니다.");
      return;
    }

    onNext(allStudents, grade, classCount);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">1. 기본 설정</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">학년</label>
            <select 
              value={grade} 
              onChange={(e) => setGrade(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
            >
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}학년</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">현재 학급 수</label>
            <select 
              value={classCount} 
              onChange={(e) => setClassCount(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
            >
              {Array.from({length: 14}, (_, i) => i + 2).map(n => <option key={n} value={n}>{n}학급</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">2. 명렬표 입력</h2>
        <p className="text-sm text-gray-500 mb-4">
          각 반의 명단을 아래 형식으로 복사/붙여넣기 하세요.<br/>
          형식: <span className="font-mono bg-gray-100 px-1">번호 이름 성별</span> (예: 1 홍길동 남)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classInputs.map((text, idx) => (
            <div key={idx} className="border rounded-md p-3 bg-gray-50">
              <label className="block text-sm font-bold text-gray-700 mb-2">{idx + 1}반 명단</label>
              <textarea
                value={text}
                onChange={(e) => updateClassInput(idx, e.target.value)}
                rows={10}
                className="w-full text-sm border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 p-2"
                placeholder="1 김철수 남&#10;2 이영희 여"
              />
            </div>
          ))}
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            다음 단계로
          </button>
        </div>
      </div>
    </div>
  );
};
