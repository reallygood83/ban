import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Download, Users, TrendingUp, FileText, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getProject, updateProject } from '../services/projectService';
import { assignStudentsToClasses as runAIAssignment } from '../services/aiClassAssignmentService';
import { calculateBalanceScore, generateAssignmentSummary } from '../services/classAssignmentService';
import { exportToExcelHTML, exportToCSV } from '../lib/excelExport';
import { Project, Student, AssignmentResult, AssignmentWarning, AIClassAssignment } from '../types';

const ClassAssignmentPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [assignments, setAssignments] = useState<AIClassAssignment[]>([]);
  const [allWarnings, setAllWarnings] = useState<AssignmentWarning[]>([]);
  const [assignmentResult, setAssignmentResult] = useState<AssignmentResult | null>(null);
  const [balanceScore, setBalanceScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [studentsNeedingReview, setStudentsNeedingReview] = useState<Set<string>>(new Set());

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
          // ClassAssignment를 AIClassAssignment로 변환
          const aiAssignments: AIClassAssignment[] = projectData.assignments.map(assignment => {
            // 이미 AIClassAssignment 형식이면 그대로 반환
            if ('warnings' in assignment && 'balance' in assignment) {
              return assignment as AIClassAssignment;
            }

            // ClassAssignment를 AIClassAssignment로 변환
            return {
              ...assignment,
              warnings: [],
              balance: {
                classNumber: assignment.classNumber,
                totalStudents: assignment.students.length,
                maleCount: assignment.maleCount,
                femaleCount: assignment.femaleCount,
                specialNeedsCount: assignment.specialNeedsCount,
                genderRatio: assignment.students.length > 0 ? assignment.maleCount / assignment.students.length : 0,
                balanceScore: 0,
              },
              constraintsSatisfied: 0,
              constraintsViolated: 0,
            };
          });

          setAssignments(aiAssignments);
          const score = calculateBalanceScore(aiAssignments);
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
      console.log('🚀 AI 반 배정 시작...');
      console.log(`📊 학생 수: ${project.students.length}명, 반 수: ${project.classCount}개`);

      // AI 기반 반 배정 실행
      const result: AssignmentResult = runAIAssignment(project.students, project.classCount);

      console.log('✅ AI 배정 완료!');
      console.log(`📋 전체 경고: ${result.allWarnings.length}개`);
      console.log(`🎯 동명이인 그룹: ${result.sameNameGroups.length}개`);
      console.log(`⚖️ 균형 점수: ${result.overallBalance.toFixed(1)}`);
      console.log(`✔️ 제약조건: ${result.satisfiedConstraints}/${result.totalConstraints} 만족`);

      // 결과 저장
      setAssignmentResult(result);
      setAssignments(result.assignments);
      setAllWarnings(result.allWarnings);
      setBalanceScore(Math.round(result.overallBalance));

      // 수정 필요 학생 식별 (critical 또는 high severity)
      const needsReview = new Set(
        result.allWarnings
          .filter(w => w.severity === 'critical' || w.severity === 'high')
          .map(w => w.studentId)
      );
      setStudentsNeedingReview(needsReview);

      console.log(`⚠️ 수정 검토 필요 학생: ${needsReview.size}명`);

      // Firebase에 결과 저장
      await updateProject(projectId!, {
        assignments: result.assignments as any, // AIClassAssignment를 ClassAssignment로 호환
        status: 'completed'
      });

      console.log('💾 Firebase 저장 완료!');

      // 경고가 많을 경우 알림
      if (result.allWarnings.length > 0) {
        alert(
          `반 배정이 완료되었습니다!\n\n` +
          `⚠️ ${result.allWarnings.length}개의 경고가 있습니다.\n` +
          `핑크색으로 표시된 학생들을 확인해주세요.`
        );
      } else {
        alert('✅ 반 배정이 완료되었습니다! 경고 사항이 없습니다.');
      }
    } catch (error) {
      console.error('❌ 반 배정 오류:', error);
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

              {/* 경고 메시지 - 심각도별 표시 */}
              {allWarnings.length > 0 && (
                <div className="neo-card bg-yellow-50">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                    <h3 className="neo-heading-sm">⚠️ 배정 경고 및 주의사항</h3>
                  </div>

                  {/* 심각도별 경고 그룹 */}
                  <div className="space-y-4">
                    {/* Critical 경고 */}
                    {allWarnings.filter(w => w.severity === 'critical').length > 0 && (
                      <div className="bg-red-50 border-2 border-red-400 p-4 rounded">
                        <p className="font-bold text-red-800 mb-2">🚨 즉시 수정 필요 ({allWarnings.filter(w => w.severity === 'critical').length}건)</p>
                        <ul className="space-y-1">
                          {allWarnings.filter(w => w.severity === 'critical').map((warning, idx) => (
                            <li key={idx} className="text-sm text-red-700">
                              • <span className="font-semibold">{warning.studentName}</span>: {warning.message}
                              {warning.suggestion && <span className="text-red-600"> → {warning.suggestion}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* High 경고 */}
                    {allWarnings.filter(w => w.severity === 'high').length > 0 && (
                      <div className="bg-orange-50 border-2 border-orange-400 p-4 rounded">
                        <p className="font-bold text-orange-800 mb-2">⚠️ 수정 권장 ({allWarnings.filter(w => w.severity === 'high').length}건)</p>
                        <ul className="space-y-1">
                          {allWarnings.filter(w => w.severity === 'high').map((warning, idx) => (
                            <li key={idx} className="text-sm text-orange-700">
                              • <span className="font-semibold">{warning.studentName}</span>: {warning.message}
                              {warning.suggestion && <span className="text-orange-600"> → {warning.suggestion}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Medium 경고 */}
                    {allWarnings.filter(w => w.severity === 'medium').length > 0 && (
                      <div className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded">
                        <p className="font-bold text-yellow-800 mb-2">ℹ️ 확인 필요 ({allWarnings.filter(w => w.severity === 'medium').length}건)</p>
                        <ul className="space-y-1">
                          {allWarnings.filter(w => w.severity === 'medium').map((warning, idx) => (
                            <li key={idx} className="text-sm text-yellow-700">
                              • <span className="font-semibold">{warning.studentName}</span>: {warning.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 동명이인 그룹 별도 표시 */}
                    {assignmentResult?.sameNameGroups && assignmentResult.sameNameGroups.length > 0 && (
                      <div className="bg-purple-50 border-2 border-purple-400 p-4 rounded">
                        <p className="font-bold text-purple-800 mb-2">👥 동명이인 감지 ({assignmentResult.sameNameGroups.length}그룹)</p>
                        <ul className="space-y-1">
                          {assignmentResult.sameNameGroups.map((group, idx) => (
                            <li key={idx} className="text-sm text-purple-700">
                              • <span className="font-semibold">{group.name}</span> ({group.count}명) - 자동으로 다른 반에 배정됨
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* 핑크색 하이라이트 안내 */}
                  {studentsNeedingReview.size > 0 && (
                    <div className="mt-4 bg-pink-50 border-2 border-pink-400 p-3 rounded">
                      <p className="text-sm font-bold text-pink-800">
                        💡 핑크색으로 표시된 학생 ({studentsNeedingReview.size}명)은 배정을 재검토해야 할 수 있습니다.
                      </p>
                    </div>
                  )}
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
                        {classData.students.map((student) => {
                          const needsReview = studentsNeedingReview.has(student.id);
                          return (
                            <li
                              key={student.id}
                              className={`text-sm flex items-center justify-between p-2 rounded transition-colors ${
                                needsReview
                                  ? 'bg-pink-100 border-2 border-pink-400 font-bold'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <span className="font-semibold flex items-center gap-1">
                                {needsReview && <AlertTriangle className="w-4 h-4 text-pink-600" />}
                                {student.displayName}
                              </span>
                              <span className="text-xs text-gray-600">
                                {student.gender === 'male' ? '남' : '여'}
                                {student.specialNeeds && ' ⭐'}
                              </span>
                            </li>
                          );
                        })}
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
