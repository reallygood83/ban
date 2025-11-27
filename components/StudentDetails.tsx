import React, { useState } from 'react';
import { Student, NoteType } from '../types';

interface Props {
  students: Student[];
  onUpdate: (students: Student[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StudentDetails: React.FC<Props> = ({ students, onUpdate, onNext, onBack }) => {
  const [localStudents, setLocalStudents] = useState<Student[]>(students);

  const handleNoteChange = (id: string, note: NoteType) => {
    setLocalStudents(prev => prev.map(s => 
      s.id === id ? { ...s, noteType: note, noteDetail: note === NoteType.Other ? s.noteDetail : '' } : s
    ));
  };

  const handleDetailChange = (id: string, detail: string) => {
    setLocalStudents(prev => prev.map(s => 
      s.id === id ? { ...s, noteDetail: detail } : s
    ));
  };

  const saveAndContinue = () => {
    onUpdate(localStudents);
    onNext();
  };

  // Group by class for display
  const classes = Array.from(new Set(localStudents.map(s => s.currentClass))).sort((a: number, b: number) => a - b);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h2 className="text-xl font-semibold text-gray-800">비고 입력</h2>
         <div className="space-x-2">
            <button onClick={onBack} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">이전</button>
            <button onClick={saveAndContinue} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">다음</button>
         </div>
      </div>

      <div className="bg-white shadow border border-gray-200 rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
            {classes.map(cNum => (
                <div key={cNum} className="border-b last:border-b-0">
                    <div className="bg-gray-50 px-4 py-2 font-bold text-gray-700 sticky top-0 border-b">
                        {cNum}반
                    </div>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">번호</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">이름</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">성별</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">비고</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {localStudents
                                .filter(s => s.currentClass === cNum)
                                .sort((a,b) => a.number - b.number)
                                .map(student => (
                                <tr key={student.id}>
                                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">{student.number}</td>
                                    <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">{student.gender}</td>
                                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 flex items-center gap-2">
                                        <select
                                            value={student.noteType}
                                            onChange={(e) => handleNoteChange(student.id, e.target.value as NoteType)}
                                            className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-1"
                                        >
                                            <option value="">(없음)</option>
                                            {Object.values(NoteType).filter(t => t !== '').map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                        {student.noteType === NoteType.Other && (
                                            <input
                                                type="text"
                                                value={student.noteDetail}
                                                onChange={(e) => handleDetailChange(student.id, e.target.value)}
                                                placeholder="내용 입력"
                                                className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-1"
                                            />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};