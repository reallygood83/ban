import React, { useState, useEffect } from 'react';
import { X, Users, Check, AlertCircle } from 'lucide-react';
import { StudentRosterData } from '../lib/fileParser';

interface GenderInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  rosterData: StudentRosterData[];
  onConfirm: (genderMap: Map<string, 'male' | 'female'>, specialNeedsMap: Map<string, string>) => void;
}

const GenderInputModal: React.FC<GenderInputModalProps> = ({
  isOpen,
  onClose,
  rosterData,
  onConfirm
}) => {
  const [genderMap, setGenderMap] = useState<Map<string, 'male' | 'female'>>(new Map());
  const [specialNeedsMap, setSpecialNeedsMap] = useState<Map<string, string>>(new Map());
  const [currentClassIndex, setCurrentClassIndex] = useState(0);

  // 반별 그룹
  const [classGroups, setClassGroups] = useState<Map<string, StudentRosterData[]>>(new Map());
  const [classKeys, setClassKeys] = useState<string[]>([]);

  useEffect(() => {
    if (rosterData.length > 0) {
      // 반별 그룹화
      const groups = new Map<string, StudentRosterData[]>();
      rosterData.forEach(student => {
        const key = `${student.grade}-${student.classNumber}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(student);
      });
      setClassGroups(groups);
      setClassKeys(Array.from(groups.keys()).sort((a, b) => {
        const [aGrade, aClass] = a.split('-').map(Number);
        const [bGrade, bClass] = b.split('-').map(Number);
        if (aGrade !== bGrade) return aGrade - bGrade;
        return aClass - bClass;
      }));
    }
  }, [rosterData]);

  const handleGenderChange = (studentKey: string, gender: 'male' | 'female') => {
    const newMap = new Map(genderMap);
    newMap.set(studentKey, gender);
    setGenderMap(newMap);
  };

  const handleSpecialNeedsChange = (studentKey: string, value: string) => {
    const newMap = new Map(specialNeedsMap);
    if (value && value !== '해당없음') {
      newMap.set(studentKey, value);
    } else {
      newMap.delete(studentKey);
    }
    setSpecialNeedsMap(newMap);
  };

  const handleSelectAllGender = (classKey: string, gender: 'male' | 'female') => {
    const newMap = new Map(genderMap);
    const students = classGroups.get(classKey) || [];
    students.forEach(student => {
      const key = `${student.grade}-${student.classNumber}-${student.number}`;
      newMap.set(key, gender);
    });
    setGenderMap(newMap);
  };

  const isAllGenderSet = (): boolean => {
    return rosterData.every(student => {
      const key = `${student.grade}-${student.classNumber}-${student.number}`;
      return genderMap.has(key);
    });
  };

  const getCompletionStats = () => {
    let completed = 0;
    rosterData.forEach(student => {
      const key = `${student.grade}-${student.classNumber}-${student.number}`;
      if (genderMap.has(key)) completed++;
    });
    return { completed, total: rosterData.length };
  };

  const handleConfirm = () => {
    if (!isAllGenderSet()) {
      alert('모든 학생의 성별을 선택해주세요.');
      return;
    }
    onConfirm(genderMap, specialNeedsMap);
  };

  if (!isOpen) return null;

  const currentClassKey = classKeys[currentClassIndex];
  const currentStudents = classGroups.get(currentClassKey) || [];
  const stats = getCompletionStats();

  const SPECIAL_NEEDS_OPTIONS = ['해당없음', '쌍둥이', '학습부진', '건강문제', '교우관계', '기타(직접입력)'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-black shadow-neo-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="bg-yellow-400 border-b-4 border-black p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6" />
            <h2 className="text-xl font-black">학생 정보 입력 (성별 및 특이사항)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-yellow-500 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 진행 상태 */}
        <div className="bg-blue-50 border-b-2 border-black p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold">성별 입력 진행 상황</span>
            <span className="font-mono">{stats.completed} / {stats.total} 명 완료</span>
          </div>
          <div className="w-full bg-gray-200 h-4 border-2 border-black rounded">
            <div
              className="bg-green-500 h-full transition-all duration-300 rounded-l"
              style={{ width: `${(stats.completed / stats.total) * 100}%` }}
            />
          </div>

          {/* 반 탭 */}
          {classKeys.length > 1 && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {classKeys.map((key, idx) => {
                const [grade, classNum] = key.split('-');
                const students = classGroups.get(key) || [];
                const classCompleted = students.filter(s => {
                  const k = `${s.grade}-${s.classNumber}-${s.number}`;
                  return genderMap.has(k);
                }).length;
                const isComplete = classCompleted === students.length;

                return (
                  <button
                    key={key}
                    onClick={() => setCurrentClassIndex(idx)}
                    className={`px-4 py-2 border-2 border-black font-bold transition-all ${currentClassIndex === idx
                        ? 'bg-yellow-400 shadow-neo'
                        : 'bg-white hover:bg-gray-50'
                      }`}
                  >
                    {grade}학년 {classNum}반
                    {isComplete && <Check className="w-4 h-4 inline ml-1 text-green-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 학생 목록 */}
        <div className="flex-1 overflow-auto p-4">
          {currentClassKey && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">
                  {currentClassKey.replace('-', '학년 ')}반 학생 목록
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelectAllGender(currentClassKey, 'male')}
                    className="neo-btn-secondary px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200"
                  >
                    전체 남학생
                  </button>
                  <button
                    onClick={() => handleSelectAllGender(currentClassKey, 'female')}
                    className="neo-btn-secondary px-3 py-1 text-sm bg-pink-100 hover:bg-pink-200"
                  >
                    전체 여학생
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {/* 헤더 행 */}
                <div className="grid grid-cols-12 gap-2 font-bold bg-gray-100 p-2 border-2 border-black text-center items-center">
                  <div className="col-span-2">이름</div>
                  <div className="col-span-2">성별</div>
                  <div className="col-span-1">학번</div>
                  <div className="col-span-7">특이사항 (중복 선택 가능)</div>
                </div>

                {currentStudents.map((student) => {
                  const studentKey = `${student.grade}-${student.classNumber}-${student.number}`;
                  const gender = genderMap.get(studentKey);
                  const specialNeedsStr = specialNeedsMap.get(studentKey) || '';
                  const selectedTags = specialNeedsStr ? specialNeedsStr.split(',').filter(Boolean) : [];

                  const toggleTag = (tag: string) => {
                    let newTags;
                    if (selectedTags.includes(tag)) {
                      newTags = selectedTags.filter(t => t !== tag);
                    } else {
                      newTags = [...selectedTags, tag];
                    }
                    handleSpecialNeedsChange(studentKey, newTags.join(','));
                  };

                  return (
                    <div
                      key={studentKey}
                      className={`grid grid-cols-12 gap-2 p-2 border-2 border-black items-center ${gender ? 'bg-white' : 'bg-yellow-50'
                        }`}
                    >
                      <div className="col-span-2 font-bold text-center flex items-center justify-center gap-1">
                        {student.name}
                        {!gender && <AlertCircle className="w-4 h-4 text-red-500" />}
                      </div>

                      {/* 성별 선택 */}
                      <div className="col-span-2 flex gap-1">
                        <button
                          onClick={() => handleGenderChange(studentKey, 'male')}
                          className={`flex-1 py-1 text-sm border-2 border-black font-bold transition-all ${gender === 'male'
                              ? 'bg-blue-200 shadow-neo-sm'
                              : 'bg-white hover:bg-gray-50 opacity-50'
                            }`}
                        >
                          남
                        </button>
                        <button
                          onClick={() => handleGenderChange(studentKey, 'female')}
                          className={`flex-1 py-1 text-sm border-2 border-black font-bold transition-all ${gender === 'female'
                              ? 'bg-pink-200 shadow-neo-sm'
                              : 'bg-white hover:bg-gray-50 opacity-50'
                            }`}
                        >
                          여
                        </button>
                      </div>

                      <div className="col-span-1 text-center text-gray-500">
                        {student.number}
                      </div>

                      {/* 특이사항 태그 선택 */}
                      <div className="col-span-7 flex flex-wrap gap-1">
                        {['쌍생아', '특수학급', '다문화', '기초학력', '영재', '건강유의'].map((tag) => (
                          <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={`px-2 py-1 text-xs border border-black transition-all ${selectedTags.includes(tag)
                                ? 'bg-yellow-300 font-bold shadow-neo-sm'
                                : 'bg-white hover:bg-gray-50 text-gray-500'
                              }`}
                          >
                            {tag}
                          </button>
                        ))}
                        {/* 직접 입력 필드 */}
                        <input
                          type="text"
                          placeholder="기타 입력"
                          className="px-2 py-1 text-xs border border-black min-w-[80px] flex-1"
                          value={selectedTags.find(t => !['쌍생아', '특수학급', '다문화', '기초학력', '영재', '건강유의'].includes(t)) || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const standardTags = selectedTags.filter(t => ['쌍생아', '특수학급', '다문화', '기초학력', '영재', '건강유의'].includes(t));
                            if (val.trim()) {
                              handleSpecialNeedsChange(studentKey, [...standardTags, val].join(','));
                            } else {
                              handleSpecialNeedsChange(studentKey, standardTags.join(','));
                            }
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="bg-gray-100 border-t-2 border-black p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {!isAllGenderSet() && (
              <span className="text-yellow-600 font-semibold">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                모든 학생의 성별을 선택해주세요
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="neo-btn neo-btn-secondary"
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isAllGenderSet()}
              className={`neo-btn ${isAllGenderSet()
                  ? 'neo-btn-primary'
                  : 'bg-gray-300 cursor-not-allowed'
                }`}
            >
              <Check className="w-5 h-5 inline mr-2" />
              확인 ({stats.completed}명)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenderInputModal;
