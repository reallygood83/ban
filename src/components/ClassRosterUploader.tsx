import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Eye,
  Save,
  CheckCircle2,
  Download,
  Trash2,
  Users,
  Clock,
  RefreshCw,
  Edit2
} from 'lucide-react';
import { Project, Student, StudentUploadData, ClassRoster } from '../types';
import {
  saveClassRoster,
  getClassRoster,
  confirmClassRoster,
  subscribeToClassRosters,
  updateStudentInfo
} from '../services/collaborationService';
import { encryptStudentName, maskName } from '../lib/encryption';
import * as XLSX from 'xlsx';

interface ClassRosterUploaderProps {
  project: Project;
  currentUserId: string;
  currentUserName: string;
  assignedClasses: number[]; // 담당 반 목록
  onRosterSaved?: () => void;
}

type UploadStep = 'select' | 'preview' | 'saved';

const ClassRosterUploader: React.FC<ClassRosterUploaderProps> = ({
  project,
  currentUserId,
  currentUserName,
  assignedClasses,
  onRosterSaved
}) => {
  const [selectedClass, setSelectedClass] = useState<number | null>(
    assignedClasses.length === 1 ? assignedClasses[0] : null
  );
  const [step, setStep] = useState<UploadStep>('select');
  const [uploadedStudents, setUploadedStudents] = useState<StudentUploadData[]>([]);
  const [existingRoster, setExistingRoster] = useState<ClassRoster | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    gender: 'male' | 'female';
    specialNeeds: string;
    notes: string;
  }>({
    gender: 'male',
    specialNeeds: '',
    notes: ''
  });

  // 기존 명단 로드
  useEffect(() => {
    if (selectedClass) {
      loadExistingRoster(selectedClass);
    }
  }, [selectedClass, project.id]);

  const loadExistingRoster = async (classNumber: number) => {
    try {
      const roster = await getClassRoster(project.id, classNumber);
      setExistingRoster(roster);

      // 기존 명단이 있으면 미리보기로 표시
      if (roster) {
        setStep('saved');
      } else {
        setStep('select');
      }
    } catch (error) {
      console.error('기존 명단 로드 실패:', error);
    }
  };

  // 파일 업로드 처리
  const handleFileUpload = async (file: File) => {
    setError(null);
    setIsLoading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      // 데이터 검증 및 변환
      const students: StudentUploadData[] = jsonData.map((row, index) => {
        // 이름 컬럼 감지 (NEIS 형식: "성명", 일반: "이름", "name", "학생이름")
        const name = row['성명'] || row['이름'] || row['name'] || row['학생이름'];

        if (!name) {
          throw new Error(`${index + 1}번째 행: 이름이 없습니다.`);
        }

        // 성별 컬럼 감지 (선택적)
        let genderRaw = row['성별'] || row['gender'];
        let gender: 'male' | 'female' | undefined;

        // 성별 정규화 (성별 컬럼이 있는 경우에만)
        if (genderRaw) {
          if (genderRaw === '남' || genderRaw === 'M' || genderRaw === 'male') {
            gender = 'male';
          } else if (genderRaw === '여' || genderRaw === 'F' || genderRaw === 'female') {
            gender = 'female';
          } else {
            throw new Error(`${index + 1}번째 행: 성별이 올바르지 않습니다. (남/여 또는 male/female)`);
          }
        }
        // 성별 컬럼이 없으면 undefined로 설정 (나중에 수동 입력)

        return {
          name: String(name).trim(),
          gender: gender as any, // undefined일 수도 있음
          studentNumber: row['학번'] || row['번호'] || row['studentNumber'] ? String(row['학번'] || row['번호'] || row['studentNumber']) : undefined,
          specialNeeds: row['비고'] || row['특수사항'] || row['specialNeeds'] ? String(row['비고'] || row['특수사항'] || row['specialNeeds']) : undefined,
          notes: row['참고사항'] || row['notes'] ? String(row['참고사항'] || row['notes']) : undefined,
        };
      });

      if (students.length === 0) {
        throw new Error('학생 데이터가 없습니다.');
      }

      setUploadedStudents(students);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || '파일 읽기에 실패했습니다.');
      console.error('파일 업로드 오류:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 드래그 앤 드롭
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const excelFile = files.find(f =>
      f.name.endsWith('.xlsx') ||
      f.name.endsWith('.xls') ||
      f.name.endsWith('.csv')
    );

    if (excelFile) {
      handleFileUpload(excelFile);
    } else {
      setError('Excel 파일(.xlsx, .xls, .csv)만 업로드 가능합니다.');
    }
  };

  // 파일 선택
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // 명단 저장 (draft)
  const handleSave = async () => {
    if (!selectedClass) {
      setError('반을 선택해주세요.');
      return;
    }

    // 성별 정보가 없는 학생 확인
    const missingGenderStudents = uploadedStudents.filter(s => !s.gender);
    if (missingGenderStudents.length > 0) {
      setError(`${missingGenderStudents.length}명의 학생에게 성별 정보가 없습니다. 성별 컬럼을 추가하거나 수동으로 입력해주세요.`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // StudentUploadData를 Student로 변환 (암호화)
      const encryptedStudents: Student[] = await Promise.all(
        uploadedStudents.map(async (student) => {
          const id = `${selectedClass}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const encryptedName = await encryptStudentName(student.name, currentUserId);
          const displayName = maskName(student.name);

          // 성별은 이미 파싱 단계에서 'male' | 'female'로 정규화됨
          // 이 시점에서는 validation 통과했으므로 student.gender가 항상 존재함
          const gender = student.gender!; // Non-null assertion since validation passed

          return {
            id,
            encryptedName,
            displayName,
            gender,
            maskedStudentNumber: student.studentNumber,
            specialNeeds: student.specialNeeds,
            notes: student.notes,
            sourceClass: selectedClass,
            uploadedBy: currentUserId,
          };
        })
      );

      await saveClassRoster(
        project.id,
        selectedClass,
        encryptedStudents,
        currentUserId,
        currentUserName
      );

      // 성공 시 명단 다시 로드
      await loadExistingRoster(selectedClass);
      setUploadedStudents([]);
      setStep('saved');
      onRosterSaved?.();
    } catch (err: any) {
      setError(err.message || '명단 저장에 실패했습니다.');
      console.error('저장 오류:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 명단 확정
  const handleConfirm = async () => {
    if (!selectedClass) return;

    setIsLoading(true);
    setError(null);

    try {
      await confirmClassRoster(project.id, selectedClass);
      await loadExistingRoster(selectedClass);
      onRosterSaved?.();
    } catch (err: any) {
      setError(err.message || '명단 확정에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 명단 수정 (재업로드)
  const handleEdit = () => {
    setStep('select');
    setUploadedStudents([]);
  };

  // 학생 정보 편집 시작
  const handleStartEdit = (student: Student) => {
    setEditingStudentId(student.id);
    setEditForm({
      gender: student.gender,
      specialNeeds: student.specialNeeds || '',
      notes: student.notes || ''
    });
  };

  // 학생 정보 저장
  const handleSaveEdit = async () => {
    if (!editingStudentId || !selectedClass) return;

    setIsLoading(true);
    setError(null);

    try {
      await updateStudentInfo(project.id, selectedClass, editingStudentId, editForm);
      await loadExistingRoster(selectedClass);
      setEditingStudentId(null);
    } catch (err: any) {
      setError(err.message || '학생 정보 수정에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 학생 정보 편집 취소
  const handleCancelEdit = () => {
    setEditingStudentId(null);
    setEditForm({
      gender: 'male',
      specialNeeds: '',
      notes: ''
    });
  };

  // 미리보기 취소
  const handleCancelPreview = () => {
    setUploadedStudents([]);
    setStep(existingRoster ? 'saved' : 'select');
  };

  // 통계 계산
  const getStats = (students: StudentUploadData[] | Student[]) => {
    const total = students.length;
    const male = students.filter(s => s.gender === 'male').length;
    const female = students.filter(s => s.gender === 'female').length;
    return { total, male, female };
  };

  return (
    <div className="bg-white border-4 border-black shadow-neo">
      {/* Header */}
      <div className="bg-green-400 border-b-4 border-black p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6" />
            <h3 className="font-bold text-lg">반별 명단 업로드</h3>
          </div>
          {existingRoster && (
            <button
              onClick={() => loadExistingRoster(selectedClass!)}
              className="neo-btn-secondary p-2"
              title="새로고침"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-400 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 반 선택 */}
        {assignedClasses.length > 1 && (
          <div>
            <label className="block font-bold mb-2">
              담당 반 선택 <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClass || ''}
              onChange={(e) => {
                const classNum = parseInt(e.target.value);
                setSelectedClass(classNum);
                setUploadedStudents([]);
              }}
              className="w-full px-4 py-3 border-2 border-black shadow-neo font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">반을 선택하세요</option>
              {assignedClasses.map(num => (
                <option key={num} value={num}>{num}반</option>
              ))}
            </select>
          </div>
        )}

        {selectedClass && (
          <>
            {/* Step 1: File Upload */}
            {step === 'select' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border-2 border-blue-300 p-4 rounded-lg">
                  <h4 className="font-bold mb-2 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                    Excel 파일 형식 안내
                  </h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>• <strong>필수 열</strong>: 이름, 성별</p>
                    <p>• <strong>선택 열</strong>: 학번, 비고, 참고사항</p>
                    <p>• <strong>성별 표기</strong>: 남/여 또는 male/female</p>
                    <p>• <strong>지원 형식</strong>: .xlsx, .xls, .csv</p>
                  </div>
                </div>

                {/* Drag & Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-4 border-dashed rounded-lg p-8 text-center transition-all ${
                    isDragging
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 bg-gray-50 hover:border-green-400'
                  }`}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-green-100 border-2 border-black rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-lg mb-1">
                        파일을 드래그하거나 클릭하여 선택하세요
                      </p>
                      <p className="text-sm text-gray-600">
                        Excel 파일 (.xlsx, .xls, .csv)
                      </p>
                    </div>
                    <label className="neo-btn neo-btn-primary cursor-pointer">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Upload className="w-5 h-5 mr-2" />
                      파일 선택
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Preview */}
            {step === 'preview' && uploadedStudents.length > 0 && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  {(() => {
                    const stats = getStats(uploadedStudents);
                    return (
                      <>
                        <div className="bg-blue-50 border-2 border-blue-300 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-blue-800">{stats.total}</div>
                          <div className="text-sm text-blue-600">전체</div>
                        </div>
                        <div className="bg-cyan-50 border-2 border-cyan-300 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-cyan-800">{stats.male}</div>
                          <div className="text-sm text-cyan-600">남학생</div>
                        </div>
                        <div className="bg-pink-50 border-2 border-pink-300 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-pink-800">{stats.female}</div>
                          <div className="text-sm text-pink-600">여학생</div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* 일괄 성별 설정 버튼 */}
                <div className="flex gap-3 items-center">
                  <span className="font-bold text-gray-700">성별 일괄 설정:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newStudents = uploadedStudents.map(student => ({
                        ...student,
                        gender: 'male' as const
                      }));
                      setUploadedStudents(newStudents);
                    }}
                    className="neo-btn bg-cyan-200 border-cyan-400 hover:bg-cyan-300 flex items-center gap-2"
                  >
                    <span>👦</span>
                    <span>모두 남학생으로 설정</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newStudents = uploadedStudents.map(student => ({
                        ...student,
                        gender: 'female' as const
                      }));
                      setUploadedStudents(newStudents);
                    }}
                    className="neo-btn bg-pink-200 border-pink-400 hover:bg-pink-300 flex items-center gap-2"
                  >
                    <span>👧</span>
                    <span>모두 여학생으로 설정</span>
                  </button>
                </div>

                {/* Preview Table - Editable */}
                <div className="border-2 border-black rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b-2 border-black sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-bold">#</th>
                          <th className="px-4 py-2 text-left font-bold">이름</th>
                          <th className="px-4 py-2 text-left font-bold">성별</th>
                          <th className="px-4 py-2 text-left font-bold">학번</th>
                          <th className="px-4 py-2 text-left font-bold">특수학급</th>
                          <th className="px-4 py-2 text-left font-bold">비고</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadedStudents.map((student, index) => (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2">{index + 1}</td>
                            <td className="px-4 py-2 font-semibold">{student.name}</td>
                            <td className="px-4 py-2">
                              <select
                                value={student.gender || ''}
                                onChange={(e) => {
                                  const newStudents = [...uploadedStudents];
                                  newStudents[index] = {
                                    ...newStudents[index],
                                    gender: e.target.value as 'male' | 'female'
                                  };
                                  setUploadedStudents(newStudents);
                                }}
                                className={`px-2 py-1 border-2 rounded font-semibold text-sm ${
                                  !student.gender
                                    ? 'border-red-500 bg-red-50 text-red-700'
                                    : 'border-black'
                                }`}
                              >
                                <option value="" disabled>성별 선택</option>
                                <option value="male">남</option>
                                <option value="female">여</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {student.studentNumber || '-'}
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={student.specialNeeds || ''}
                                onChange={(e) => {
                                  const newStudents = [...uploadedStudents];
                                  newStudents[index] = {
                                    ...newStudents[index],
                                    specialNeeds: e.target.value
                                  };
                                  setUploadedStudents(newStudents);
                                }}
                                placeholder="특수학급 정보"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={student.notes || ''}
                                onChange={(e) => {
                                  const newStudents = [...uploadedStudents];
                                  newStudents[index] = {
                                    ...newStudents[index],
                                    notes: e.target.value
                                  };
                                  setUploadedStudents(newStudents);
                                }}
                                placeholder="비고"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelPreview}
                    className="flex-1 neo-btn-secondary py-3"
                    disabled={isLoading}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex-2 neo-btn neo-btn-primary flex items-center justify-center gap-2 py-3"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        임시저장 ({uploadedStudents.length}명)
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Saved Roster */}
            {step === 'saved' && existingRoster && (
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {existingRoster.status === 'confirmed' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-bold bg-green-100 text-green-800 border-2 border-green-400 rounded">
                        <CheckCircle2 className="w-4 h-4" />
                        확정됨
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-bold bg-yellow-100 text-yellow-800 border-2 border-yellow-400 rounded">
                        <Clock className="w-4 h-4" />
                        임시저장
                      </span>
                    )}
                    <span className="text-sm text-gray-600">
                      업로드: {new Date(existingRoster.uploadedAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  {existingRoster.status === 'draft' && (
                    <button
                      onClick={handleEdit}
                      className="neo-btn-secondary text-sm"
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      재업로드
                    </button>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 border-2 border-blue-300 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-800">{existingRoster.studentCount}</div>
                    <div className="text-sm text-blue-600">전체</div>
                  </div>
                  <div className="bg-cyan-50 border-2 border-cyan-300 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-cyan-800">{existingRoster.maleCount}</div>
                    <div className="text-sm text-cyan-600">남학생</div>
                  </div>
                  <div className="bg-pink-50 border-2 border-pink-300 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-pink-800">{existingRoster.femaleCount}</div>
                    <div className="text-sm text-pink-600">여학생</div>
                  </div>
                </div>

                {/* Student List with Edit Capability */}
                <div className="border-2 border-black rounded-lg overflow-hidden">
                  <div className="bg-gray-100 border-b-2 border-black p-3">
                    <h4 className="font-bold flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      학생 목록 {existingRoster.status === 'draft' && '(클릭하여 편집)'}
                    </h4>
                  </div>
                  <div className="p-4 space-y-3">
                    {existingRoster.students.map((student) => (
                      <div
                        key={student.id}
                        className="border-2 border-gray-300 rounded-lg p-3 bg-white"
                      >
                        {editingStudentId === student.id ? (
                          // 편집 모드
                          <div className="space-y-3">
                            <div className="font-bold text-lg mb-2">{student.displayName}</div>

                            {/* 성별 선택 */}
                            <div>
                              <label className="block text-sm font-semibold mb-1">성별</label>
                              <select
                                value={editForm.gender}
                                onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as 'male' | 'female' })}
                                className="w-full px-3 py-2 border-2 border-black rounded font-semibold"
                              >
                                <option value="male">남</option>
                                <option value="female">여</option>
                              </select>
                            </div>

                            {/* 특수학급 */}
                            <div>
                              <label className="block text-sm font-semibold mb-1">특수학급</label>
                              <input
                                type="text"
                                value={editForm.specialNeeds}
                                onChange={(e) => setEditForm({ ...editForm, specialNeeds: e.target.value })}
                                placeholder="특수학급 정보 (선택사항)"
                                className="w-full px-3 py-2 border-2 border-black rounded"
                              />
                            </div>

                            {/* 비고 */}
                            <div>
                              <label className="block text-sm font-semibold mb-1">비고</label>
                              <textarea
                                value={editForm.notes}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                placeholder="특기사항 입력 (선택사항)"
                                rows={3}
                                className="w-full px-3 py-2 border-2 border-black rounded resize-none"
                              />
                            </div>

                            {/* 저장/취소 버튼 */}
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveEdit}
                                disabled={isLoading}
                                className="flex-1 neo-btn bg-green-400 hover:bg-green-500 flex items-center justify-center gap-1"
                              >
                                {isLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="w-4 h-4" />
                                    저장
                                  </>
                                )}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={isLoading}
                                className="flex-1 neo-btn-secondary flex items-center justify-center gap-1"
                              >
                                <X className="w-4 h-4" />
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          // 보기 모드
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-lg">{student.displayName}</span>
                                <span className={`text-sm font-semibold px-2 py-0.5 rounded ${
                                  student.gender === 'male'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                    : 'bg-pink-100 text-pink-700 border border-pink-300'
                                }`}>
                                  {student.gender === 'male' ? '남' : '여'}
                                </span>
                              </div>
                              {student.specialNeeds && (
                                <div className="text-sm text-gray-600 mb-1">
                                  <span className="font-semibold">특수학급:</span> {student.specialNeeds}
                                </div>
                              )}
                              {student.notes && (
                                <div className="text-sm text-gray-600">
                                  <span className="font-semibold">비고:</span> {student.notes}
                                </div>
                              )}
                            </div>
                            {existingRoster.status === 'draft' && (
                              <button
                                onClick={() => handleStartEdit(student)}
                                className="neo-btn-secondary text-sm flex items-center gap-1 ml-2"
                              >
                                <Edit2 className="w-4 h-4" />
                                편집
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confirm Button */}
                {existingRoster.status === 'draft' && (
                  <button
                    onClick={handleConfirm}
                    disabled={isLoading}
                    className="w-full neo-btn neo-btn-primary flex items-center justify-center gap-2 py-3"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        확정 중...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        명단 확정하기
                      </>
                    )}
                  </button>
                )}

                {existingRoster.status === 'confirmed' && (
                  <div className="bg-green-50 border-2 border-green-400 p-4 rounded-lg text-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="font-bold text-green-800">
                      {selectedClass}반 명단이 확정되었습니다.
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      수정이 필요한 경우 프로젝트 관리자에게 문의하세요.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!selectedClass && assignedClasses.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <p className="font-bold text-lg">담당 반이 없습니다</p>
            <p className="text-gray-600 mt-2">
              프로젝트 관리자가 반을 배정하지 않았습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassRosterUploader;
