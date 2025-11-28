import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Student } from '../types';

interface EditStudentModalProps {
  isOpen: boolean;
  student: Student | null;
  allStudents: Student[];
  onClose: () => void;
  onSave: (updatedStudent: Partial<Student>) => void;
}

const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  student,
  allStudents,
  onClose,
  onSave
}) => {
  const [specialNeeds, setSpecialNeeds] = useState('');
  const [notes, setNotes] = useState('');
  const [groupWith, setGroupWith] = useState<string[]>([]);
  const [separateFrom, setSeparateFrom] = useState<string[]>([]);

  useEffect(() => {
    if (student) {
      setSpecialNeeds(student.specialNeeds || '');
      setNotes(student.notes || '');
      setGroupWith(student.groupWith || []);
      setSeparateFrom(student.separateFrom || []);
    }
  }, [student]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!student) return;

    onSave({
      ...student,
      specialNeeds: specialNeeds.trim() || undefined,
      notes: notes.trim() || undefined,
      groupWith: groupWith.length > 0 ? groupWith : undefined,
      separateFrom: separateFrom.length > 0 ? separateFrom : undefined
    });

    onClose();
  };

  const toggleGroupWith = (studentId: string) => {
    setGroupWith(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleSeparateFrom = (studentId: string) => {
    setSeparateFrom(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  if (!isOpen || !student) return null;

  const otherStudents = allStudents.filter(s => s.id !== student.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-black shadow-neo max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-purple-400 border-b-4 border-black p-4 flex items-center justify-between sticky top-0">
          <h2 className="neo-heading-sm">{student.displayName} 정보 수정</h2>
          <button
            onClick={onClose}
            className="neo-btn-secondary p-2"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 특수사항 */}
          <div>
            <label className="block font-bold mb-2">특수사항</label>
            <input
              type="text"
              value={specialNeeds}
              onChange={(e) => setSpecialNeeds(e.target.value)}
              placeholder="예: ADHD, 경계선지능"
              className="w-full px-4 py-3 border-2 border-black shadow-neo font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 비고 */}
          <div>
            <label className="block font-bold mb-2">비고</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="추가 정보를 입력하세요"
              rows={3}
              className="w-full px-4 py-3 border-2 border-black shadow-neo font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* 같은 반 희망 학생 */}
          <div>
            <label className="block font-bold mb-2">
              같은 반 희망 학생 ({groupWith.length}명 선택)
            </label>
            <div className="border-2 border-black p-4 max-h-48 overflow-y-auto bg-green-50">
              {otherStudents.length === 0 ? (
                <p className="text-gray-500 text-sm">다른 학생이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {otherStudents.map(s => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-green-100 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={groupWith.includes(s.id)}
                        onChange={() => toggleGroupWith(s.id)}
                        className="w-5 h-5"
                      />
                      <span className="font-semibold">{s.displayName}</span>
                      <span className="text-xs text-gray-600">
                        ({s.gender === 'male' ? '남' : '여'})
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 분리 희망 학생 */}
          <div>
            <label className="block font-bold mb-2">
              분리 희망 학생 ({separateFrom.length}명 선택)
            </label>
            <div className="border-2 border-black p-4 max-h-48 overflow-y-auto bg-red-50">
              {otherStudents.length === 0 ? (
                <p className="text-gray-500 text-sm">다른 학생이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {otherStudents.map(s => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-red-100 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={separateFrom.includes(s.id)}
                        onChange={() => toggleSeparateFrom(s.id)}
                        className="w-5 h-5"
                      />
                      <span className="font-semibold">{s.displayName}</span>
                      <span className="text-xs text-gray-600">
                        ({s.gender === 'male' ? '남' : '여'})
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 neo-btn-secondary"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 neo-btn bg-purple-400 hover:bg-purple-500 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStudentModal;
