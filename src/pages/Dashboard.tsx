import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUserProjectListItems, deleteProject } from '../services/projectService';
import { ProjectListItem } from '../types';
import { Pencil, Trash2, FolderOpen, KeyRound } from 'lucide-react';
import { PendingInvitations, CollaborationStatus, JoinByCodeModal } from '../components/collaboration';

const Dashboard: React.FC = () => {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [autoInviteCode, setAutoInviteCode] = useState<string | null>(null);

  // URL에서 초대 코드 확인
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('invite');
    if (inviteCode) {
      setAutoInviteCode(inviteCode);
      setIsJoinModalOpen(true);
      // URL에서 파라미터 제거
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // 프로젝트 목록 로드
  useEffect(() => {
    const loadProjects = async () => {
      if (!currentUser) return;

      try {
        const userProjects = await getUserProjectListItems(currentUser.uid);
        setProjects(userProjects);
      } catch (error) {
        console.error('프로젝트 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [currentUser]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!window.confirm(`"${projectName}" 프로젝트를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      await deleteProject(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
      alert('프로젝트가 삭제되었습니다.');
    } catch (error) {
      console.error('프로젝트 삭제 오류:', error);
      alert('프로젝트 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleOpenProject = (projectId: string) => {
    navigate(`/project/${projectId}/students`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b-4 border-black shadow-neo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-yellow-400 border-2 border-black flex items-center justify-center font-black text-2xl">
                반
              </div>
              <h1 className="neo-heading-sm">GoodBye!</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {currentUser?.photoURL && (
                  <img
                    src={currentUser.photoURL}
                    alt="프로필"
                    className="w-10 h-10 rounded-full border-2 border-black"
                  />
                )}
                <span className="font-medium">{currentUser?.displayName}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="neo-btn neo-btn-secondary"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PendingInvitations />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 새 프로젝트 시작 */}
          <div
            className="neo-card-hover cursor-pointer"
            onClick={() => navigate('/project/create')}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-2">새 프로젝트 시작</h3>
              <p className="text-gray-600">반 배정을 새로 시작합니다</p>
            </div>
          </div>

          {/* 저장된 프로젝트 */}
          <div className="neo-card-hover cursor-pointer">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-400 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-2">저장된 프로젝트</h3>
              <p className="text-gray-600">이전 작업을 불러옵니다</p>
            </div>
          </div>

          {/* 템플릿 가져오기 */}
          <div className="neo-card-hover cursor-pointer">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-400 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-2">템플릿 가져오기</h3>
              <p className="text-gray-600">Excel 파일을 불러옵니다</p>
            </div>
          </div>
          {/* 초대 코드로 참여 */}
          <div
            className="neo-card-hover cursor-pointer"
            onClick={() => setIsJoinModalOpen(true)}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-400 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-xl mb-2">초대 코드로 참여</h3>
              <p className="text-gray-600">코드를 입력하여 참여합니다</p>
            </div>
          </div>
        </div>

        {/* 최근 프로젝트 */}
        <div className="mt-12">
          <h2 className="neo-heading-md mb-6">최근 프로젝트</h2>
          {loading ? (
            <div className="neo-card">
              <div className="text-center text-gray-500 py-12">
                <div className="w-16 h-16 mx-auto mb-4 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-lg">프로젝트 불러오는 중...</p>
              </div>
            </div>
          ) : projects.length === 0 ? (
            <div className="neo-card">
              <div className="text-center text-gray-500 py-12">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg">아직 프로젝트가 없습니다</p>
                <p className="text-sm mt-2">위의 버튼을 클릭하여 시작하세요</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div key={project.id} className="neo-card bg-white hover:shadow-neo-lg transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-xl mb-2">{project.name}</h3>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">학년:</span> {project.grade}학년
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">반 수:</span> {project.classCount}개
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">학생 수:</span> {project.studentCount}명
                        </p>
                      </div>

                      <CollaborationStatus
                        isCollaborative={project.isCollaborative}
                        memberCount={project.memberCount}
                        myRole={project.myRole}
                        className="mt-2"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenProject(project.id)}
                        className="neo-btn-secondary p-2"
                        title="프로젝트 열기"
                      >
                        <FolderOpen className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id, project.name)}
                        className="neo-btn-secondary p-2 hover:bg-red-100"
                        title="삭제"
                      >
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  </div>

                  <div className="border-t-2 border-gray-200 pt-3 mt-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className={`px-3 py-1 rounded-full font-semibold ${project.status === 'completed' ? 'bg-green-100 text-green-700' :
                        project.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                        {project.status === 'completed' ? '완료' :
                          project.status === 'in-progress' ? '진행중' : '대기'}
                      </span>
                      <span className="text-gray-500">
                        {new Date(project.updatedAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 도움말 */}
        <div className="mt-12 bg-yellow-50 border-2 border-black shadow-neo p-6">
          <h3 className="font-bold text-xl mb-4">💡 시작 가이드</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li className="font-medium">학년과 반 수를 설정하세요</li>
            <li className="font-medium">학생 명단을 입력하거나 Excel 파일로 업로드하세요</li>
            <li className="font-medium">특수학급, 학습부진 등 비고사항을 입력하세요</li>
            <li className="font-medium">분리/통합 요청사항을 추가하세요</li>
            <li className="font-medium">AI 추천을 받거나 직접 배정 방법을 선택하세요</li>
          </ol>
        </div>
      </main>
      <JoinByCodeModal
        isOpen={isJoinModalOpen}
        onClose={() => {
          setIsJoinModalOpen(false);
          setAutoInviteCode(null);
        }}
        initialCode={autoInviteCode || undefined}
      />
    </div>
  );
};

export default Dashboard;
