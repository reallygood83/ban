import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Users, Settings, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createProject } from '../services/projectService';
import { downloadExcelHTMLTemplate, downloadCSVTemplate } from '../lib/excelTemplate';

const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [projectName, setProjectName] = useState('');
  const [grade, setGrade] = useState('');
  const [classCount, setClassCount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      alert('로그인이 필요합니다.');
      navigate('/');
      return;
    }

    setLoading(true);

    try {
      const projectId = await createProject(currentUser.uid, {
        name: projectName,
        grade,
        classCount: parseInt(classCount)
      });

      console.log('프로젝트 생성 성공:', projectId);
      alert('프로젝트가 성공적으로 생성되었습니다! 학생 명단을 업로드해주세요.');
      navigate(`/project/${projectId}/students`);
    } catch (error) {
      console.error('프로젝트 생성 오류:', error);
      alert('프로젝트 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

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

            <h1 className="neo-heading-md">새 프로젝트 만들기</h1>

            <div className="w-40"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 기본 정보 섹션 */}
          <div className="neo-card bg-white">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-6 h-6" />
              <h2 className="neo-heading-sm">기본 정보</h2>
            </div>

            <div className="space-y-6">
              {/* 프로젝트 이름 */}
              <div>
                <label className="block font-bold mb-2">
                  프로젝트 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="예: 2025년 3학년 반 배정"
                  className="w-full px-4 py-3 border-2 border-black shadow-neo font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* 학년 */}
              <div>
                <label className="block font-bold mb-2">
                  학년 <span className="text-red-500">*</span>
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-black shadow-neo font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">선택하세요</option>
                  <option value="1">1학년</option>
                  <option value="2">2학년</option>
                  <option value="3">3학년</option>
                  <option value="4">4학년</option>
                  <option value="5">5학년</option>
                  <option value="6">6학년</option>
                </select>
              </div>

              {/* 반 수 */}
              <div>
                <label className="block font-bold mb-2">
                  반 수 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={classCount}
                  onChange={(e) => setClassCount(e.target.value)}
                  placeholder="예: 4"
                  min="1"
                  max="20"
                  className="w-full px-4 py-3 border-2 border-black shadow-neo font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-sm text-gray-600 mt-2">
                  💡 배정할 반의 개수를 입력하세요 (1-20개)
                </p>
              </div>
            </div>
          </div>

          {/* 학생 명단 섹션 */}
          <div className="neo-card bg-yellow-50">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6" />
              <h2 className="neo-heading-sm">학생 명단</h2>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700 font-semibold">
                다음 단계에서 학생 명단을 업로드하거나 직접 입력할 수 있습니다.
              </p>

              <div className="bg-white border-2 border-black p-4">
                <h3 className="font-bold mb-2">📊 지원하는 형식:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>엑셀 파일 (.xlsx, .xls)</li>
                  <li>CSV 파일 (.csv)</li>
                  <li>직접 입력</li>
                </ul>
              </div>

              {/* 템플릿 다운로드 버튼 */}
              <div className="bg-green-50 border-2 border-black p-4 space-y-3">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  📥 템플릿 다운로드
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  학생 명단 입력을 위한 템플릿을 다운로드하세요. 템플릿에는 개인정보 보호 안내가 포함되어 있습니다.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => downloadExcelHTMLTemplate(grade || '3', parseInt(classCount) || 1)}
                    className="neo-btn bg-green-400 hover:bg-green-500 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Excel 템플릿 (.xls)
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadCSVTemplate(grade || '3', parseInt(classCount) || 1)}
                    className="neo-btn bg-blue-400 hover:bg-blue-500 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    CSV 템플릿 (.csv)
                  </button>
                </div>

                <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 mt-3">
                  <p className="text-sm font-semibold text-yellow-800">
                    🔒 <strong>개인정보 보호:</strong> 입력하신 학생 이름과 학번은 자동으로 암호화되어 안전하게 저장됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="neo-btn-secondary"
            >
              취소
            </button>

            <button
              type="submit"
              disabled={loading}
              className="neo-btn neo-btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {loading ? '생성 중...' : '프로젝트 생성하기'}
            </button>
          </div>
        </form>

        {/* 도움말 */}
        <div className="mt-8 bg-blue-50 border-2 border-black shadow-neo p-6">
          <h3 className="font-bold text-lg mb-3">💡 프로젝트 생성 가이드</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li className="font-semibold">기본 정보를 입력하세요</li>
            <li className="font-semibold">프로젝트를 생성하면 학생 명단을 추가할 수 있습니다</li>
            <li className="font-semibold">학생 정보, 분리/통합 조건을 설정하세요</li>
            <li className="font-semibold">AI 추천 또는 수동으로 배정 방법을 선택하세요</li>
            <li className="font-semibold">최종 결과를 확인하고 Excel/PDF로 내보내세요</li>
          </ol>
        </div>
      </main>
    </div>
  );
};

export default CreateProject;
