import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Users, Check, AlertCircle, Download, UserPlus, Edit, FileSpreadsheet, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updateProject } from '../services/projectService';
import {
  parseStudentFile,
  validateStudentData,
  detectCSVFormat,
  parseRosterCSVFile,
  validateRosterData,
  convertRosterToStudentData,
  getRosterSummary,
  StudentRosterData
} from '../lib/fileParser';
import { encryptStudentDataBatch, generateStudentStats } from '../services/studentService';
import { Student, StudentUploadData } from '../types';
import AddStudentModal from '../components/AddStudentModal';
import EditStudentModal from '../components/EditStudentModal';
import GenderInputModal from '../components/GenderInputModal';
import {
  ClassTabNavigation,
  ClassRosterUploader,
  InviteMemberModal,
  MemberListPanel,
  CollaborationStatus
} from '../components/collaboration';
import { getProjectWithAccess } from '../services/projectService';
import { getAllClassRosters, saveMergedStudentsToProject, subscribeToClassRosters } from '../services/collaborationService';
import { ProjectRole, ClassRoster, Project } from '../types';

const ManageStudents: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // 명렬표 업로드 관련 상태
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [pendingRosterData, setPendingRosterData] = useState<StudentRosterData[]>([]);
  const [rosterSummary, setRosterSummary] = useState<ReturnType<typeof getRosterSummary> | null>(null);

  // 협업 모드 관련 상태
  const [project, setProject] = useState<Project | null>(null);
  const [userRole, setUserRole] = useState<ProjectRole | null>(null);
  const [activeClass, setActiveClass] = useState<number | 'all'>('all');
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);

  // 프로젝트 데이터 로드
  useEffect(() => {
    let unsubscribeRosters: (() => void) | undefined;
    const loadProjectData = async () => {
      if (!currentUser || !projectId) return;

      try {
        const result = await getProjectWithAccess(projectId, currentUser.uid);
        if (!result) {
          alert('프로젝트에 접근할 수 없습니다.');
          navigate('/dashboard');
          return;
        }

        setProject(result.project);
        setUserRole(result.role);
        setStudents(result.project.students || []);

        // 협업 모드인 경우 반별 명단 로드 (실시간 구독)
        if (result.project.isCollaborative) {
          unsubscribeRosters = subscribeToClassRosters(projectId, (rosterData) => {
            setRosters(rosterData);
          });
        }
      } catch (error) {
        console.error('프로젝트 로드 오류:', error);
        navigate('/dashboard');
      }
    };

    loadProjectData();

    return () => {
      if (unsubscribeRosters) {
        unsubscribeRosters();
      }
    };
  }, [projectId, currentUser, navigate]);

  const handleRosterUploadSuccess = async () => {
    if (!projectId) return;
    const rosterData = await getAllClassRosters(projectId);
    setRosters(rosterData);

    // 프로젝트 정보도 업데이트 (상태 변경 반영)
    if (currentUser) {
      const result = await getProjectWithAccess(projectId, currentUser.uid);
      if (result) setProject(result.project);
    }
  };

  const handleMergeAndContinue = async () => {
    if (!projectId) return;
    if (!window.confirm('모든 반의 명단을 통합하여 배정을 진행하시겠습니까?')) return;

    try {
      setUploading(true);
      await saveMergedStudentsToProject(projectId);
      navigate(`/project/${projectId}/assign`);
    } catch (error) {
      console.error('명단 통합 오류:', error);
      alert('명단 통합 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  // 파일 업로드 핸들러
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !projectId) return;

    setUploading(true);
    setUploadError(null);
    setUploadWarnings([]);
    setUploadSuccess(false);

    try {
      // CSV 파일인 경우 형식 감지
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'csv') {
        const format = await detectCSVFormat(file);

        if (format === 'roster') {
          // 명렬표 형식 (학년, 반, 번호, 성명, 비고) - 성별 입력 필요
          console.log('나이스 명렬표 형식 감지');
          const rosterData = await parseRosterCSVFile(file);

          // 검증
          const validation = validateRosterData(rosterData);
          if (!validation.valid) {
            setUploadError(validation.errors.join('\n'));
            setUploading(false);
            e.target.value = '';
            return;
          }

          if (validation.warnings.length > 0) {
            setUploadWarnings(validation.warnings);
          }

          // 요약 정보 설정
          const summary = getRosterSummary(rosterData);
          setRosterSummary(summary);

          // 성별 입력 모달 표시
          setPendingRosterData(rosterData);
          setShowGenderModal(true);
          setUploading(false);
          e.target.value = '';
          return;
        }
      }

      // 기존 형식 처리 (이름, 성별, 학번 등)
      console.log('파일 파싱 시작:', file.name);
      const uploadData: StudentUploadData[] = await parseStudentFile(file);
      console.log('파싱된 학생 수:', uploadData.length);

      // 2. 데이터 검증
      const validation = validateStudentData(uploadData);
      if (!validation.valid) {
        setUploadError(validation.errors.join('\n'));
        setUploading(false);
        return;
      }

      if (validation.warnings.length > 0) {
        setUploadWarnings(validation.warnings);
      }

      // 3. 데이터 암호화
      console.log('학생 데이터 암호화 시작...');
      const encryptedStudents = await encryptStudentDataBatch(uploadData, currentUser.uid);
      console.log('암호화 완료:', encryptedStudents.length);

      // 4. Firebase에 저장
      console.log('Firebase 저장 시작...');
      await updateProject(projectId, {
        students: encryptedStudents,
        status: 'in-progress'
      });

      setStudents(encryptedStudents);
      setUploadSuccess(true);

      // 성공 메시지 표시 후 3초 뒤에 사라짐
      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);

      console.log('업로드 완료!');
    } catch (error) {
      console.error('파일 업로드 오류:', error);

      // 명렬표 형식 감지 에러 처리
      if (error instanceof Error && error.message === 'ROSTER_FORMAT_DETECTED') {
        setUploadError('명렬표 형식이 감지되었습니다. CSV 파일을 다시 업로드해주세요.');
      } else {
        setUploadError(
          error instanceof Error
            ? error.message
            : '파일 업로드 중 오류가 발생했습니다.'
        );
      }
    } finally {
      setUploading(false);
      // 파일 input 초기화
      e.target.value = '';
    }
  };

  // 명렬표 성별 입력 완료 핸들러
  const handleGenderConfirm = async (genderMap: Map<string, 'male' | 'female'>) => {
    if (!currentUser || !projectId) return;

    setShowGenderModal(false);
    setUploading(true);

    try {
      // 명렬표 데이터를 StudentUploadData로 변환
      const uploadData = convertRosterToStudentData(pendingRosterData, genderMap);
      console.log('변환된 학생 수:', uploadData.length);

      // 데이터 검증
      const validation = validateStudentData(uploadData);
      if (validation.warnings.length > 0) {
        setUploadWarnings(prev => [...prev, ...validation.warnings]);
      }

      // 데이터 암호화
      console.log('학생 데이터 암호화 시작...');
      const encryptedStudents = await encryptStudentDataBatch(uploadData, currentUser.uid);
      console.log('암호화 완료:', encryptedStudents.length);

      // Firebase에 저장
      console.log('Firebase 저장 시작...');
      await updateProject(projectId, {
        students: encryptedStudents,
        status: 'in-progress'
      });

      setStudents(encryptedStudents);
      setUploadSuccess(true);
      setPendingRosterData([]);
      setRosterSummary(null);

      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);

      console.log('업로드 완료!');
    } catch (error) {
      console.error('명렬표 업로드 오류:', error);
      setUploadError(
        error instanceof Error
          ? error.message
          : '명렬표 업로드 중 오류가 발생했습니다.'
      );
    } finally {
      setUploading(false);
    }
  };

  // 학생 수동 추가
  const handleAddStudent = async (studentData: StudentUploadData) => {
    if (!currentUser || !projectId) return;

    try {
      const encryptedStudents = await encryptStudentDataBatch([studentData], currentUser.uid);
      const updatedStudents = [...students, ...encryptedStudents];

      await updateProject(projectId, {
        students: updatedStudents,
        status: 'in-progress'
      });

      setStudents(updatedStudents);
      setShowAddModal(false);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error) {
      console.error('학생 추가 오류:', error);
      alert('학생 추가 중 오류가 발생했습니다.');
    }
  };

  // 학생 정보 수정
  const handleEditStudent = async (updatedStudent: Partial<Student>) => {
    if (!projectId || !selectedStudent) return;

    try {
      const updatedStudents = students.map(s =>
        s.id === selectedStudent.id ? { ...s, ...updatedStudent } : s
      );

      await updateProject(projectId, {
        students: updatedStudents
      });

      setStudents(updatedStudents);
      setShowEditModal(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error('학생 정보 수정 오류:', error);
      alert('학생 정보 수정 중 오류가 발생했습니다.');
    }
  };

  // 학생 편집 열기
  const handleOpenEditModal = (student: Student) => {
    setSelectedStudent(student);
    setShowEditModal(true);
  };

  // 학생 통계 계산
  const stats = students.length > 0 ? generateStudentStats(students) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b-4 border-black shadow-neo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="neo-btn-secondary flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              대시보드로 돌아가기
            </button>

            <h1 className="neo-heading-md">학생 명단 관리</h1>

            <div className="w-40"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {project?.isCollaborative ? (
          <div className="space-y-8">
            {/* 협업 헤더 */}
            <div className="flex justify-between items-center bg-white p-4 border-2 border-black shadow-neo">
              <CollaborationStatus
                isCollaborative={true}
                memberCount={project.memberCount || 1}
                myRole={userRole || undefined}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMembersPanel(!showMembersPanel)}
                  className="neo-btn-secondary flex items-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  멤버 관리
                </button>
                {(userRole === 'owner' || userRole === 'admin') && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="neo-btn neo-btn-primary flex items-center gap-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    초대
                  </button>
                )}
              </div>
            </div>

            {/* 멤버 패널 (토글) */}
            {showMembersPanel && (
              <div className="animate-in slide-in-from-top-2">
                <MemberListPanel projectId={projectId!} currentUserRole={userRole!} />
              </div>
            )}

            {/* 탭 네비게이션 */}
            <ClassTabNavigation
              classCount={project.classCount}
              activeClass={activeClass}
              onClassChange={setActiveClass}
              rosterStatus={project.classRosterStatus}
            />

            {/* 탭 컨텐츠 */}
            {activeClass === 'all' ? (
              <div className="space-y-8">
                <div className="neo-card bg-blue-50">
                  <h3 className="neo-heading-sm mb-4">전체 현황</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-white border-2 border-black p-4">
                      <p className="text-sm font-bold text-gray-500">전체 학생</p>
                      <p className="text-3xl font-black">{rosters.reduce((acc, r) => acc + r.studentCount, 0)}명</p>
                    </div>
                    <div className="bg-white border-2 border-black p-4">
                      <p className="text-sm font-bold text-gray-500">업로드 완료</p>
                      <p className="text-3xl font-black text-green-600">
                        {Object.values(project.classRosterStatus || {}).filter(s => s.uploaded).length} / {project.classCount}반
                      </p>
                    </div>
                  </div>
                </div>

                {(userRole === 'owner' || userRole === 'admin') && (
                  <div className="flex justify-end p-4 bg-yellow-50 border-2 border-black">
                    <div className="flex items-center gap-4">
                      <p className="font-bold text-sm">
                        모든 반의 명단이 취합되었나요?
                      </p>
                      <button
                        onClick={handleMergeAndContinue}
                        className="neo-btn neo-btn-primary flex items-center gap-2"
                      >
                        명단 통합 및 배정 시작
                        <ArrowLeft className="w-5 h-5 rotate-180" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                <ClassRosterUploader
                  projectId={projectId!}
                  classNumber={activeClass}
                  onUploadSuccess={handleRosterUploadSuccess}
                  currentRosterCount={rosters.find(r => r.classNumber === activeClass)?.studentCount}
                />

                {/* 해당 반 명단 미리보기 */}
                {rosters.find(r => r.classNumber === activeClass) && (
                  <div className="neo-card bg-white">
                    <h3 className="font-bold text-lg mb-4">{activeClass}반 등록된 학생 목록</h3>
                    <div className="max-h-60 overflow-y-auto border-2 border-black">
                      <table className="w-full text-left">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="p-2 border-b-2 border-black">이름</th>
                            <th className="p-2 border-b-2 border-black">성별</th>
                            <th className="p-2 border-b-2 border-black">학번</th>
                            <th className="p-2 border-b-2 border-black">특이사항</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rosters.find(r => r.classNumber === activeClass)?.students.map((s, i) => (
                            <tr key={i} className="border-b border-gray-200">
                              <td className="p-2">{s.displayName}</td>
                              <td className="p-2">{s.gender === 'male' ? '남' : '여'}</td>
                              <td className="p-2">{s.maskedStudentNumber || '-'}</td>
                              <td className="p-2 truncate max-w-[150px]">{s.specialNeeds || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* 파일 업로드 섹션 */}
            <div className="neo-card bg-white">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Upload className="w-6 h-6" />
                  <h2 className="neo-heading-sm">파일 업로드 또는 직접 입력</h2>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="neo-btn neo-btn-primary flex items-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  학생 직접 추가
                </button>
              </div>

              <div className="space-y-4">
                {/* 업로드 영역 */}
                <div className="border-2 border-dashed border-gray-400 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    accept=".csv,.xls,.xlsx,.html"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mb-4" />
                    <p className="font-bold text-lg mb-2">
                      {uploading ? '업로드 중...' : '파일을 선택하거나 드래그하세요'}
                    </p>
                    <p className="text-sm text-gray-600">
                      지원 형식: CSV, Excel HTML (.xls, .xlsx, .html)
                    </p>
                  </label>
                </div>

                {/* 성공 메시지 */}
                {uploadSuccess && (
                  <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 flex items-center gap-3">
                    <Check className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-bold text-green-800">업로드 성공!</p>
                      <p className="text-sm text-green-700">
                        {students.length}명의 학생 데이터가 암호화되어 저장되었습니다.
                      </p>
                    </div>
                  </div>
                )}

                {/* 경고 메시지 */}
                {uploadWarnings.length > 0 && (
                  <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-yellow-800 mb-2">주의사항</p>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          {uploadWarnings.map((warning, idx) => (
                            <li key={idx}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 오류 메시지 */}
                {uploadError && (
                  <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-red-800 mb-2">업로드 실패</p>
                        <p className="text-sm text-red-700 whitespace-pre-line">{uploadError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 나이스 명렬표 안내 */}
                <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-green-800 mb-2">📋 나이스(NEIS) 명렬표 업로드 안내</p>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• <strong>나이스 학생 명렬표</strong>를 그대로 업로드하면 자동으로 인식됩니다.</li>
                        <li>• 명렬표 형식: <code className="bg-green-100 px-1 rounded">학년, 반, 번호, 성명, 비고</code></li>
                        <li>• 업로드 후 <strong>성별만 추가 입력</strong>하면 됩니다. (반별 일괄 선택 가능)</li>
                        <li>• 여러 학급을 <strong>하나의 파일</strong>로 업로드하거나, <strong>반별로 따로</strong> 업로드할 수 있습니다.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 보안 안내 */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                  <p className="text-sm font-semibold text-blue-800">
                    🔒 <strong>개인정보 보호:</strong> 업로드된 학생 이름과 학번은 AES-GCM 256-bit 암호화되어 안전하게 저장됩니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 학생 통계 섹션 */}
            {stats && (
              <div className="neo-card bg-yellow-50">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-6 h-6" />
                  <h2 className="neo-heading-sm">학생 통계</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border-2 border-black p-4 text-center">
                    <p className="text-3xl font-black text-blue-600">{stats.total}</p>
                    <p className="text-sm font-bold mt-1">전체 학생</p>
                  </div>

                  <div className="bg-white border-2 border-black p-4 text-center">
                    <p className="text-3xl font-black text-green-600">{stats.maleCount}</p>
                    <p className="text-sm font-bold mt-1">남학생</p>
                  </div>

                  <div className="bg-white border-2 border-black p-4 text-center">
                    <p className="text-3xl font-black text-pink-600">{stats.femaleCount}</p>
                    <p className="text-sm font-bold mt-1">여학생</p>
                  </div>

                  <div className="bg-white border-2 border-black p-4 text-center">
                    <p className="text-3xl font-black text-purple-600">{stats.specialNeedsCount}</p>
                    <p className="text-sm font-bold mt-1">특수사항</p>
                  </div>
                </div>

                <div className="mt-4 bg-white border-2 border-black p-4">
                  <p className="font-bold mb-2">성별 비율</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-green-200 h-8 flex items-center justify-center font-bold rounded-l">
                      남 {stats.maleCount}명
                    </div>
                    <div className="flex-1 bg-pink-200 h-8 flex items-center justify-center font-bold rounded-r">
                      여 {stats.femaleCount}명
                    </div>
                  </div>
                  <p className="text-center text-sm mt-2 font-semibold">{stats.genderRatio}</p>
                </div>
              </div>
            )}

            {/* 학생 목록 */}
            {students.length > 0 && (
              <div className="neo-card bg-white">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6" />
                    <h2 className="neo-heading-sm">학생 목록</h2>
                  </div>

                  <p className="text-sm text-gray-600">
                    총 <strong className="text-blue-600">{students.length}</strong>명
                  </p>
                </div>

                {/* 테이블 */}
                <div className="overflow-x-auto">
                  <table className="w-full border-2 border-black">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border-2 border-black px-4 py-3 text-left font-bold">번호</th>
                        <th className="border-2 border-black px-4 py-3 text-left font-bold">이름</th>
                        <th className="border-2 border-black px-4 py-3 text-left font-bold">성별</th>
                        <th className="border-2 border-black px-4 py-3 text-left font-bold">학번</th>
                        <th className="border-2 border-black px-4 py-3 text-left font-bold">특수사항</th>
                        <th className="border-2 border-black px-4 py-3 text-left font-bold">비고</th>
                        <th className="border-2 border-black px-4 py-3 text-center font-bold">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => (
                        <tr key={student.id} className="hover:bg-yellow-50">
                          <td className="border-2 border-black px-4 py-3">{index + 1}</td>
                          <td className="border-2 border-black px-4 py-3 font-semibold">
                            {student.displayName}
                          </td>
                          <td className="border-2 border-black px-4 py-3">
                            {student.gender === 'male' ? '남' : '여'}
                          </td>
                          <td className="border-2 border-black px-4 py-3 font-mono text-sm">
                            {student.maskedStudentNumber || '-'}
                          </td>
                          <td className="border-2 border-black px-4 py-3 text-sm">
                            {student.specialNeeds || '-'}
                          </td>
                          <td className="border-2 border-black px-4 py-3 text-sm">
                            {student.notes || '-'}
                          </td>
                          <td className="border-2 border-black px-4 py-3 text-center">
                            <button
                              onClick={() => handleOpenEditModal(student)}
                              className="neo-btn-secondary px-3 py-1 text-sm flex items-center gap-1 mx-auto"
                            >
                              <Edit className="w-4 h-4" />
                              수정
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 개인정보 안내 */}
                <div className="mt-4 bg-yellow-100 border-l-4 border-yellow-500 p-3">
                  <p className="text-sm font-semibold text-yellow-800">
                    🔐 표시되는 이름은 마스킹 처리된 것입니다. 실제 이름은 암호화되어 안전하게 보관됩니다.
                  </p>
                </div>
              </div>
            )}

            {/* 다음 단계 버튼 */}
            {students.length > 0 && (
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="neo-btn-secondary"
                >
                  나중에 계속하기
                </button>

                <button
                  onClick={() => navigate(`/project/${projectId}/assign`)}
                  className="neo-btn neo-btn-primary flex items-center gap-2"
                >
                  다음: 반 배정하기
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 학생 추가 모달 */}
      <AddStudentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddStudent}
      />

      {/* 학생 편집 모달 */}
      <EditStudentModal
        isOpen={showEditModal}
        student={selectedStudent}
        allStudents={students}
        onClose={() => {
          setShowEditModal(false);
          setSelectedStudent(null);
        }}
        onSave={handleEditStudent}
      />

      {/* 명렬표 성별 입력 모달 */}
      <GenderInputModal
        isOpen={showGenderModal}
        onClose={() => {
          setShowGenderModal(false);
          setPendingRosterData([]);
          setRosterSummary(null);
        }}
        rosterData={pendingRosterData}
        onConfirm={handleGenderConfirm}
      />

      {/* 멤버 초대 모달 */}
      {project && (
        <InviteMemberModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          projectId={projectId!}
          projectName={project.name}
          classCount={project.classCount}
        />
      )}
    </div>
  );
};

export default ManageStudents;
