import React, { useState } from 'react';
import { Student, Request, SeparationReason, IntegrationReason } from '../types';
import { Trash2, Plus } from 'lucide-react';

interface Props {
  students: Student[];
  requests: Request[];
  onRequestUpdate: (reqs: Request[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export const RequestManager: React.FC<Props> = ({ students, requests, onRequestUpdate, onNext, onBack }) => {
  const [activeTab, setActiveTab] = useState<'separation' | 'integration'>('separation');

  // Form State
  const [class1, setClass1] = useState<number>(1);
  const [student1, setStudent1] = useState<string>('');
  const [class2, setClass2] = useState<number>(1);
  const [student2, setStudent2] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const availableClasses = Array.from(new Set(students.map(s => s.currentClass))).sort((a: number, b: number) => a - b);
  
  const getStudentsInClass = (c: number) => students.filter(s => s.currentClass === c).sort((a,b) => a.number - b.number);

  const handleAdd = () => {
    if (!student1 || !student2 || !reason) return;
    if (student1 === student2) {
        alert("동일한 학생을 선택할 수 없습니다.");
        return;
    }

    const newReq: Request = {
        id: Date.now().toString(),
        type: activeTab,
        studentId1: student1,
        studentId2: student2,
        reason: reason as any
    };

    onRequestUpdate([...requests, newReq]);
    // Reset form mostly
    setStudent2('');
    setReason('');
  };

  const handleRemove = (id: string) => {
    onRequestUpdate(requests.filter(r => r.id !== id));
  };

  const reasons = activeTab === 'separation' 
    ? Object.values(SeparationReason) 
    : Object.values(SeparationReason).filter(r => r !== SeparationReason.Bullying);
    
  const currentRequests = requests.filter(r => r.type === activeTab);

  const getStudentName = (id: string) => {
      const s = students.find(st => st.id === id);
      return s ? `${s.currentClass}반 ${s.name}` : 'Unknown';
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
         <h2 className="text-xl font-semibold text-gray-800">분리/통합 요청</h2>
         <div className="space-x-2">
            <button onClick={onBack} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">이전</button>
            <button onClick={onNext} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">다음</button>
         </div>
      </div>

      <div className="flex space-x-4 border-b">
          <button 
            className={`py-2 px-4 border-b-2 font-medium ${activeTab === 'separation' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'}`}
            onClick={() => setActiveTab('separation')}
          >
            분리요청
          </button>
          <button 
            className={`py-2 px-4 border-b-2 font-medium ${activeTab === 'integration' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'}`}
            onClick={() => setActiveTab('integration')}
          >
            통합요청
          </button>
      </div>

      <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
        <h3 className="font-medium mb-3 text-gray-700">새로운 요청 추가</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            {/* Student 1 Selection */}
            <div>
                <label className="text-xs text-gray-500 block">요청 학생(반)</label>
                <select value={class1} onChange={e => { setClass1(Number(e.target.value)); setStudent1(''); }} className="w-full border rounded p-1">
                    {availableClasses.map(c => <option key={c} value={c}>{c}반</option>)}
                </select>
            </div>
            <div>
                 <label className="text-xs text-gray-500 block">이름</label>
                 <select value={student1} onChange={e => setStudent1(e.target.value)} className="w-full border rounded p-1">
                    <option value="">선택</option>
                    {getStudentsInClass(class1).map(s => <option key={s.id} value={s.id}>{s.number}. {s.name}</option>)}
                 </select>
            </div>

            {/* Student 2 Selection */}
             <div>
                <label className="text-xs text-gray-500 block">대상 학생(반)</label>
                <select value={class2} onChange={e => { setClass2(Number(e.target.value)); setStudent2(''); }} className="w-full border rounded p-1">
                    {availableClasses.map(c => <option key={c} value={c}>{c}반</option>)}
                </select>
            </div>
            <div>
                 <label className="text-xs text-gray-500 block">이름</label>
                 <select value={student2} onChange={e => setStudent2(e.target.value)} className="w-full border rounded p-1">
                    <option value="">선택</option>
                    {getStudentsInClass(class2).map(s => <option key={s.id} value={s.id}>{s.number}. {s.name}</option>)}
                 </select>
            </div>

            {/* Reason */}
            <div>
                <label className="text-xs text-gray-500 block">사유</label>
                <div className="flex gap-2">
                     <select value={reason} onChange={e => setReason(e.target.value)} className="w-full border rounded p-1">
                        <option value="">선택</option>
                        {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                     </select>
                     <button onClick={handleAdd} className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700"><Plus className="w-5 h-5"/></button>
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                  <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">요청 학생</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">대상 학생</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사유</th>
                      <th className="px-6 py-3 text-right">삭제</th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {currentRequests.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-4 text-gray-400">등록된 요청이 없습니다.</td></tr>
                  )}
                  {currentRequests.map(req => (
                      <tr key={req.id}>
                          <td className="px-6 py-2 text-sm text-gray-900">{getStudentName(req.studentId1)}</td>
                          <td className="px-6 py-2 text-sm text-gray-900">{getStudentName(req.studentId2)}</td>
                          <td className="px-6 py-2 text-sm text-gray-500">{req.reason}</td>
                          <td className="px-6 py-2 text-right">
                              <button onClick={() => handleRemove(req.id)} className="text-red-500 hover:text-red-700">
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
    </div>
  );
};