import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Download, Users, TrendingUp, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getProject, updateProject } from '../services/projectService';
import { assignStudentsToClasses, calculateBalanceScore, generateAssignmentSummary } from '../services/classAssignmentService';
import { exportToExcelHTML, exportToCSV } from '../lib/excelExport';
import { Project, ClassAssignment, Student } from '../types';

const ClassAssignmentPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [balanceScore, setBalanceScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  // 프로젝트 데이터 로드
  useEffect(() => {
    const loadProject = async () => {
      if (!currentUser || !projectId) {
        navigate('/');
        return;
      }

      try {
        const projectData = await getProject(projectId);
        if (!projectData) {
          alert('프로젝트를 찾을 수 없습니다.');
          navigate('/dashboard');
          return;
        }

        if (projectData.userId !== currentUser.uid) {
          alert('권한이 없습니다.');
          navigate('/dashboard');
          return;
        }

        setProject(projectData);

        // 이미 배정 결과가 있으면 표시
        if (projectData.assignments && projectData.assignments.length > 0) {
          setAssignments(projectData.assignments);
          const score = calculateBalanceScore(projectData.assignments);
          setBalanceScore(score);
        }
      } catch (error) {
        console.error('프로젝트 로드 오류:', error);
        alert('프로젝트를 불러오는데 실패했습니다.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [currentUser, projectId, navigate]);

  // 반 배정 실행
  const handleAssignClasses = async () => {
    if (!project || !project.students || project.students.length === 0) {
      alert('학생 명단이 없습니다. 먼저 학생을 추가해주세요.');
      return;
    }

    setAssigning(true);

    try {
      console.log('반 배정 시작...');
      const result = assignStudentsToClasses(project.students, project.classCount);

      setAssignments(result.assignments);
      setWarnings(result.warnings);

      const score = calculateBalanceScore(result.assignments);
      setBalanceScore(score);

      // Firebase에 결과 저장
      await updateProject(projectId!, {
        assignments: result.assignments,
        status: 'completed'
      });

      console.log('반 배정 완료!');
      alert('반 배정이 완료되었습니다!');
    } catch (error) {
      console.error('반 배정 오류:', error);
      alert('반 배정 중 오류가 발생했습니다.');
    } finally {
      setAssigning(false);
    }
  };

  // 재배정
  const handleReassign = () => {
    if (window.confirm('반 배정을 다시 하시겠습니까? 현재 결과는 사라집니다.')) {
      handleAssignClasses();
    }
  };

  // Excel HTML 다운로드
  const handleDownloadExcel = () => {
    if (!project || assignments.length === 0) {
      alert('다운로드할 배정 결과가 없습니다.');
      return;
    }

    exportToExcelHTML(
      assignments,
      project.name,
      project.grade.toString(),
      balanceScore
    );
  };

  // CSV 다운로드
  const handleDownloadCSV = () => {
    if (!project || assignments.length === 0) {
      alert('다운로드할 배정 결과가 없습니다.');
      return;
    }

    exportToCSV(assignments, project.name);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-bold">로딩 중...</div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const summary = assignments.length > 0 ? generateAssignmentSummary(assignments) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b-4 border-black shadow-neo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/project/${projectId}/students`)}
              className="neo-btn-secondary flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              학생 명단으로 돌아가기
            </button>

            <h1 className="neo-heading-md">반 배정 결과</h1>

            <div className="w-48"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* 프로젝트 정보 */}
          <div className="neo-card bg-white">
            <h2 className="neo-heading-sm mb-4">{project.name}</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">학년</p>
                <p className="text-2xl font-black text-blue-600">{project.grade}학년</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">반 수</p>
                <p className="text-2xl font-black text-green-600">{project.classCount}개</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">학생 수</p>
                <p className="text-2xl font-black text-purple-600">
                  {project.students?.length || 0}명
                </p>
              </div>
            </div>
          </div>

          {/* 배정 실행 버튼 또는 통계 */}
          {assignments.length === 0 ? (
            <div className="neo-card bg-yellow-50 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-yellow-600" />
              <h3 className="neo-heading-sm mb-4">반 배정을 시작하세요</h3>
              <p className="text-gray-700 mb-6">
                학생들을 {project.classCount}개 반에 균형있게 배정합니다.
              </p>
              <button
                onClick={handleAssignClasses}
                disabled={assigning || !project.students || project.students.length === 0}
                className="neo-btn neo-btn-primary flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${assigning ? 'animate-spin' : ''}`} />
                {assigning ? '배정 중...' : '반 배정 실행'}
              </button>
            </div>
          ) : (
            <>
              {/* 통계 섹션 */}
              <div className="neo-card bg-green-50">
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp className="w-6 h-6" />
                  <h2 className="neo-heading-sm">배정 통계</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white border-2 border-black p-4 text-center">
                    <p className="text-3xl font-black text-blue-600">{summary?.totalStudents}</p>
                    <p className="text-sm font-bold mt-1">전체 학생</p>
                  </div>

                  <div className="bg-white border-2 border-black p-4 text-center">
                    <p className="text-3xl font-black text-green-600">
                      {summary?.averagePerClass.toFixed(1)}
                    </p>
                    <p className="text-sm font-bold mt-1">반당 평균</p>
                  </div>

                  <div className="bg-white border-2 border-black p-4 text-center">
                    <p className="text-3xl font-black text-purple-600">{balanceScore}</p>
                    <p className="text-sm font-bold mt-1">균형 점수</p>
                  </div>

                  <div className="bg-white border-2 border-black p-4 text-center">
                    <p className="text-lg font-black text-gray-700">{summary?.genderBalance}</p>
                    <p className="text-sm font-bold mt-1">성별 비율</p>
                  </div>
                </div>

                <div className="bg-white border-2 border-black p-4">
                  <p className="font-bold mb-2">균형도 평가</p>
                  <div className="w-full bg-gray-200 h-8 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center font-bold text-white"
                      style={{ width: `${balanceScore}%` }}
                    >
                      {balanceScore}점
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {balanceScore >= 80 && '매우 균형잡힌 배정입니다!'}
                    {balanceScore >= 60 && balanceScore < 80 && '양호한 배정입니다.'}
                    {balanceScore < 60 && '재배정을 고려해보세요.'}
                  </p>
                </div>
              </div>

              {/* 경고 메시지 */}
              {warnings.length > 0 && (
                <div className="neo-card bg-yellow-50">
                  <h3 className="neo-heading-sm mb-4">⚠️ 주의사항</h3>
                  <ul className="space-y-2">
                    {warnings.map((warning, idx) => (
                      <li key={idx} className="text-sm text-yellow-800">
                        • {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 반별 결과 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignments.map((classData) => (
                  <div key={classData.classNumber} className="neo-card bg-white">
                    <h3 className="neo-heading-sm mb-4">{classData.classNumber}반</h3>

                    <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                      <div className="bg-blue-50 border-2 border-blue-300 p-2 rounded">
                        <p className="text-2xl font-black text-blue-600">
                          {classData.students.length}
                        </p>
                        <p className="text-xs font-bold">전체</p>
                      </div>
                      <div className="bg-green-50 border-2 border-green-300 p-2 rounded">
                        <p className="text-2xl font-black text-green-600">
                          {classData.maleCount}
                        </p>
                        <p className="text-xs font-bold">남</p>
                      </div>
                      <div className="bg-pink-50 border-2 border-pink-300 p-2 rounded">
                        <p className="text-2xl font-black text-pink-600">
                          {classData.femaleCount}
                        </p>
                        <p className="text-xs font-bold">여</p>
                      </div>
                    </div>

                    {classData.specialNeedsCount > 0 && (
                      <div className="mb-4 bg-purple-50 border-2 border-purple-300 p-2 rounded text-center">
                        <p className="text-sm font-bold text-purple-700">
                          특수사항: {classData.specialNeedsCount}명
                        </p>
                      </div>
                    )}

                    <div className="max-h-64 overflow-y-auto border-2 border-gray-200 rounded p-2">
                      <ul className="space-y-1">
                        {classData.students.map((student) => (
                          <li
                            key={student.id}
                            className="text-sm flex items-center justify-between p-1 hover:bg-gray-50"
                          >
                            <span className="font-semibold">{student.displayName}</span>
                            <span className="text-xs text-gray-600">
                              {student.gender === 'male' ? '남' : '여'}
                              {student.specialNeeds && ' ⭐'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {/* 액션 버튼 */}
              <div className="flex justify-between items-center">
                <button
                  onClick={handleReassign}
                  disabled={assigning}
                  className="neo-btn-secondary flex items-center gap-2"
                >
                  <RefreshCw className={`w-5 h-5 ${assigning ? 'animate-spin' : ''}`} />
                  재배정
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={handleDownloadCSV}
                    className="neo-btn bg-blue-400 hover:bg-blue-500 flex items-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    CSV 다운로드
                  </button>

                  <button
                    onClick={handleDownloadExcel}
                    className="neo-btn bg-green-400 hover:bg-green-500 flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Excel 다운로드
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ClassAssignmentPage;
