import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { StudentUploadData } from '../types';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (student: StudentUploadData) => void;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [studentNumber, setStudentNumber] = useState('');
  const [specialNeeds, setSpecialNeeds] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('학생 이름을 입력해주세요.');
      return;
    }

    const newStudent: StudentUploadData = {
      name: name.trim(),
      gender,
      studentNumber: studentNumber.trim() || undefined,
      specialNeeds: specialNeeds.trim() || undefined,
      notes: notes.trim() || undefined
    };

    onAdd(newStudent);

    // 폼 초기화
    setName('');
    setGender('male');
    setStudentNumber('');
    setSpecialNeeds('');
    setNotes('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-black shadow-neo max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-400 border-b-4 border-black p-4 flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-2">
            <UserPlus className="w-6 h-6" />
            <h2 className="neo-heading-sm">학생 추가</h2>
          </div>
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
          {/* 이름 */}
          <div>
            <label className="block font-bold mb-2">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 홍길동"
              className="w-full px-4 py-3 border-2 border-black shadow-neo font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 성별 */}
          <div>
            <label className="block font-bold mb-2">
              성별 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={gender === 'male'}
                  onChange={(e) => setGender(e.target.value as 'male')}
                  className="w-5 h-5"
                />
                <span className="font-semibold">남학생</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={gender === 'female'}
                  onChange={(e) => setGender(e.target.value as 'female')}
                  className="w-5 h-5"
                />
                <span className="font-semibold">여학생</span>
              </label>
            </div>
          </div>

          {/* 학번 */}
          <div>
            <label className="block font-bold mb-2">
              학번 (선택)
            </label>
            <input
              type="text"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              placeholder="예: 20250101"
              className="w-full px-4 py-3 border-2 border-black shadow-neo font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 특수사항 */}
          <div>
            <label className="block font-bold mb-2">
              특수사항 (선택)
            </label>
            <input
              type="text"
              value={specialNeeds}
              onChange={(e) => setSpecialNeeds(e.target.value)}
              placeholder="예: ADHD, 경계선지능"
              className="w-full px-4 py-3 border-2 border-black shadow-neo font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 비고 */}
          <div>
            <label className="block font-bold mb-2">
              비고 (선택)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="추가 정보를 입력하세요"
              rows={3}
              className="w-full px-4 py-3 border-2 border-black shadow-neo font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
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
              className="flex-1 neo-btn neo-btn-primary flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStudentModal;
