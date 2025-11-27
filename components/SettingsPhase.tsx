import React, { useState } from 'react';
import { Student, AssignmentSettings, AssignmentMethod, NoteType, CLASS_NAMES } from '../types';
import { getStartConfigKey } from '../utils';
import { Check, GripVertical } from 'lucide-react';

interface Props {
  students: Student[];
  initialSettings?: AssignmentSettings;
  onRun: (settings: AssignmentSettings) => void;
  onBack: () => void;
}

export const SettingsPhase: React.FC<Props> = ({ students, initialSettings, onRun, onBack }) => {
  // Default states
  const [targetClassCount, setTargetClassCount] = useState(initialSettings?.targetClassCount || 2);
  const [method, setMethod] = useState(initialSettings?.method || AssignmentMethod.Loop);
  const [sameNameStrategy, setSameNameStrategy] = useState<'distribute' | 'ignore'>(initialSettings?.sameNameStrategy || 'distribute');
  const [specialNeedsReduction, setSpecialNeedsReduction] = useState(initialSettings?.specialNeedsReduction || -1);
  
  // Note Priority State: User selects THEN orders.
  // Initially all relevant note types are available.
  const availableNoteTypes = Object.values(NoteType).filter(n => n !== NoteType.None && n !== NoteType.Other && n !== NoteType.Special);
  // Default selection if not provided
  const [notePriority, setNotePriority] = useState<NoteType[]>(initialSettings?.notePriority || []);
  
  // Start Configs
  const [startConfig, setStartConfig] = useState<Record<string, string>>(initialSettings?.startConfig || {});
  
  // Start Target Class: Key is now "classNum_gender" e.g. "1_남" -> 0
  const [startTargetClass, setStartTargetClass] = useState<Record<string, number>>(initialSettings?.startTargetClass || {});

  const currentClasses = Array.from<number>(new Set(students.map(s => s.currentClass))).sort((a, b) => a - b);

  const handleRun = () => {
    onRun({
        targetClassCount,
        method,
        sameNameStrategy,
        specialNeedsReduction,
        notePriority,
        startConfig,
        startTargetClass
    });
  };

  const updateStartStudent = (c: number, gender: string, sId: string) => {
      setStartConfig(prev => ({ ...prev, [getStartConfigKey(c, gender)]: sId }));
  };
  
  const updateStartTarget = (c: number, gender: string, tIdx: number) => {
      setStartTargetClass(prev => ({ ...prev, [getStartConfigKey(c, gender)]: tIdx }));
  };

  // Toggle Note Selection
  const toggleNoteSelection = (note: NoteType) => {
      if (notePriority.includes(note)) {
          setNotePriority(notePriority.filter(n => n !== note));
      } else {
          setNotePriority([...notePriority, note]);
      }
  };

  // Reordering Note Priority
  const movePriority = (idx: number, dir: -1 | 1) => {
      if (idx + dir < 0 || idx + dir >= notePriority.length) return;
      const newP = [...notePriority];
      const temp = newP[idx];
      newP[idx] = newP[idx+dir];
      newP[idx+dir] = temp;
      setNotePriority(newP);
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
         <h2 className="text-xl font-semibold text-gray-800">배정 설정</h2>
         <div className="space-x-2">
            <button onClick={onBack} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">이전</button>
            <button onClick={handleRun} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">최종 확인 및 배정</button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Settings */}
        <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4">
            <h3 className="font-bold text-gray-700 border-b pb-2">기본 규칙</h3>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">배정 학급 수</label>
                    <select value={targetClassCount} onChange={e => setTargetClassCount(Number(e.target.value))} className="mt-1 block w-full border rounded p-2">
                        {Array.from({length: 14}, (_, i) => i + 2).map(n => <option key={n} value={n}>{n}학급</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">배정 방식</label>
                    <select value={method} onChange={e => setMethod(e.target.value as AssignmentMethod)} className="mt-1 block w-full border rounded p-2">
                        {Object.values(AssignmentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">동명이인 처리</label>
                    <select value={sameNameStrategy} onChange={e => setSameNameStrategy(e.target.value as any)} className="mt-1 block w-full border rounded p-2">
                        <option value="distribute">분산 (가능한 다른 반 배정)</option>
                        <option value="ignore">고려 안함</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">특수학생 포함 학급 인원 감축</label>
                    <select value={specialNeedsReduction} onChange={e => setSpecialNeedsReduction(Number(e.target.value))} className="mt-1 block w-full border rounded p-2">
                        <option value={-1}>-1명</option>
                        <option value={-2}>-2명</option>
                        <option value={-3}>-3명</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">비고 반영 (체크 후 순서 조정)</label>
                <div className="grid grid-cols-2 gap-4">
                    {/* Selection Column */}
                    <div className="border rounded p-2 bg-gray-50 h-64 overflow-y-auto">
                        <div className="text-xs text-gray-500 mb-2 font-bold">반영할 비고 선택</div>
                        {availableNoteTypes.map(note => (
                            <label key={note} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-gray-100 rounded px-1">
                                <input 
                                    type="checkbox" 
                                    checked={notePriority.includes(note)} 
                                    onChange={() => toggleNoteSelection(note)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm">{note}</span>
                            </label>
                        ))}
                    </div>

                    {/* Ordering Column */}
                    <div className="border rounded p-2 bg-white h-64 overflow-y-auto">
                        <div className="text-xs text-gray-500 mb-2 font-bold">우선순위 (위쪽이 1순위)</div>
                        {notePriority.length === 0 && <div className="text-xs text-gray-400 text-center mt-10">선택된 항목이 없습니다</div>}
                        {notePriority.map((note, idx) => (
                            <div key={note} className="flex justify-between items-center py-2 px-2 border-b last:border-0 bg-gray-50 mb-1 rounded">
                                <span className="text-sm font-medium">{idx + 1}. {note}</span>
                                <div className="space-x-1 flex">
                                    <button onClick={() => movePriority(idx, -1)} disabled={idx === 0} className="text-xs p-1 bg-white border rounded hover:bg-gray-100 disabled:opacity-30">▲</button>
                                    <button onClick={() => movePriority(idx, 1)} disabled={idx === notePriority.length - 1} className="text-xs p-1 bg-white border rounded hover:bg-gray-100 disabled:opacity-30">▼</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Start Settings */}
        <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4">
            <h3 className="font-bold text-gray-700 border-b pb-2">학급별 배정 시작 설정</h3>
            {method !== AssignmentMethod.Random && (
                <div className="max-h-[600px] overflow-y-auto space-y-6">
                    {currentClasses.map(cNum => {
                        const classStudents = students.filter(s => s.currentClass === cNum).sort((a,b) => a.number - b.number);
                        const boys = classStudents.filter(s => s.gender === '남');
                        const girls = classStudents.filter(s => s.gender === '여');
                        
                        return (
                            <div key={cNum} className="border p-3 rounded bg-gray-50">
                                <h4 className="font-bold text-sm text-gray-800 mb-2 bg-indigo-50 p-1 rounded border-l-4 border-indigo-500">{cNum}반 설정</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Boys Settings */}
                                    <div className="space-y-2">
                                        <div className="text-xs font-bold text-blue-600 border-b pb-1">남학생</div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-gray-500">배정 시작 반:</span>
                                            <select 
                                                value={startTargetClass[getStartConfigKey(cNum, '남')] ?? 0}
                                                onChange={e => updateStartTarget(cNum, '남', Number(e.target.value))}
                                                className="text-sm border rounded p-1 w-full"
                                            >
                                                {Array.from({length: targetClassCount}, (_, i) => (
                                                    <option key={i} value={i}>{CLASS_NAMES[i]}반</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-gray-500">시작 학생:</span>
                                            <select 
                                                value={startConfig[getStartConfigKey(cNum, '남')] || ''}
                                                onChange={e => updateStartStudent(cNum, '남', e.target.value)}
                                                className="text-sm border rounded p-1 w-full"
                                            >
                                                <option value="">1번 (기본)</option>
                                                {boys.map(s => <option key={s.id} value={s.id}>{s.number}번 {s.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Girls Settings */}
                                    <div className="space-y-2">
                                        <div className="text-xs font-bold text-pink-600 border-b pb-1">여학생</div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-gray-500">배정 시작 반:</span>
                                            <select 
                                                 value={startTargetClass[getStartConfigKey(cNum, '여')] ?? 0}
                                                 onChange={e => updateStartTarget(cNum, '여', Number(e.target.value))}
                                                 className="text-sm border rounded p-1 w-full"
                                            >
                                                {Array.from({length: targetClassCount}, (_, i) => (
                                                    <option key={i} value={i}>{CLASS_NAMES[i]}반</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-gray-500">시작 학생:</span>
                                            <select 
                                                 value={startConfig[getStartConfigKey(cNum, '여')] || ''}
                                                 onChange={e => updateStartStudent(cNum, '여', e.target.value)}
                                                 className="text-sm border rounded p-1 w-full"
                                            >
                                                <option value="">1번 (기본)</option>
                                                {girls.map(s => <option key={s.id} value={s.id}>{s.number}번 {s.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {method === AssignmentMethod.Random && (
                <p className="text-gray-500 text-sm italic p-4 text-center">랜덤 배정은 시작 학생 및 학급 설정을 사용하지 않습니다.</p>
            )}
        </div>
      </div>
    </div>
  );
};