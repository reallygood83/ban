import React, { useState, useEffect } from 'react';
import {
  Users,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2,
  BarChart3,
  Upload,
  UserCheck,
  FileCheck,
  AlertTriangle
} from 'lucide-react';
import { Project, ClassRoster, ProjectMember } from '../types';
import { getAllClassRosters, getProjectMembers } from '../services/collaborationService';

interface CollaborationStatusProps {
  project: Project;
  currentUserId: string;
  onRefresh?: () => void;
}

interface ClassStatus {
  classNumber: number;
  hasRoster: boolean;
  status: 'draft' | 'confirmed' | 'pending';
  studentCount: number;
  maleCount: number;
  femaleCount: number;
  uploadedBy?: string;
  uploadedAt?: Date;
}

const CollaborationStatus: React.FC<CollaborationStatusProps> = ({
  project,
  currentUserId,
  onRefresh
}) => {
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 반별 상태 계산
  const classStatuses: ClassStatus[] = Array.from(
    { length: project.classCount },
    (_, i) => {
      const classNumber = i + 1;
      const roster = rosters.find(r => r.classNumber === classNumber);

      if (roster) {
        return {
          classNumber,
          hasRoster: true,
          status: roster.status,
          studentCount: roster.studentCount,
          maleCount: roster.maleCount,
          femaleCount: roster.femaleCount,
          uploadedBy: roster.uploadedByName,
          uploadedAt: roster.uploadedAt
        };
      }

      return {
        classNumber,
        hasRoster: false,
        status: 'pending' as const,
        studentCount: 0,
        maleCount: 0,
        femaleCount: 0
      };
    }
  );

  // 통계 계산
  const stats = {
    totalClasses: project.classCount,
    uploadedClasses: rosters.length,
    confirmedClasses: rosters.filter(r => r.status === 'confirmed').length,
    draftClasses: rosters.filter(r => r.status === 'draft').length,
    pendingClasses: project.classCount - rosters.length,
    totalStudents: rosters.reduce((sum, r) => sum + r.studentCount, 0),
    totalMale: rosters.reduce((sum, r) => sum + r.maleCount, 0),
    totalFemale: rosters.reduce((sum, r) => sum + r.femaleCount, 0),
    memberCount: members.length,
    uploadProgress: Math.round((rosters.length / project.classCount) * 100),
    confirmProgress: Math.round(
      (rosters.filter(r => r.status === 'confirmed').length / project.classCount) * 100
    )
  };

  useEffect(() => {
    loadData();
  }, [project.id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [rosterList, memberList] = await Promise.all([
        getAllClassRosters(project.id),
        getProjectMembers(project.id)
      ]);

      setRosters(rosterList);
      setMembers(memberList);
    } catch (err: any) {
      setError(err.message || '데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
    onRefresh?.();
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusIcon = (status: ClassStatus['status']) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'draft':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ClassStatus['status']) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-green-100 text-green-800 border border-green-400 rounded">
            <CheckCircle2 className="w-3 h-3" />
            확정
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-400 rounded">
            <Clock className="w-3 h-3" />
            임시저장
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-gray-100 text-gray-600 border border-gray-300 rounded">
            <AlertCircle className="w-3 h-3" />
            미업로드
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border-4 border-black shadow-neo p-6">
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-semibold">협업 상태 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-4 border-black shadow-neo p-6">
        <div className="bg-red-50 border-2 border-red-400 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-bold">오류 발생</span>
          </div>
          <p className="text-red-600">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-3 neo-btn-secondary text-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-4 border-black shadow-neo">
      {/* Header */}
      <div className="bg-cyan-400 border-b-4 border-black p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          <h3 className="font-bold text-lg">협업 현황</h3>
        </div>
        <button
          onClick={handleRefresh}
          className="neo-btn-secondary p-2"
          title="새로고침"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-b-2 border-gray-200">
        {/* 멤버 수 */}
        <div className="bg-purple-50 border-2 border-purple-300 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-purple-700">
            <Users className="w-5 h-5" />
            <span className="text-sm font-semibold">참여 멤버</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-purple-800">
            {stats.memberCount}명
          </div>
        </div>

        {/* 총 학생 수 */}
        <div className="bg-blue-50 border-2 border-blue-300 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700">
            <UserCheck className="w-5 h-5" />
            <span className="text-sm font-semibold">등록 학생</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-blue-800">
            {stats.totalStudents}명
          </div>
          <div className="text-xs text-blue-600 mt-0.5">
            남 {stats.totalMale} / 여 {stats.totalFemale}
          </div>
        </div>

        {/* 업로드 진행률 */}
        <div className="bg-green-50 border-2 border-green-300 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <Upload className="w-5 h-5" />
            <span className="text-sm font-semibold">업로드</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-green-800">
            {stats.uploadedClasses}/{stats.totalClasses}반
          </div>
          <div className="mt-1 w-full bg-green-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.uploadProgress}%` }}
            />
          </div>
        </div>

        {/* 확정 진행률 */}
        <div className="bg-yellow-50 border-2 border-yellow-300 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-700">
            <FileCheck className="w-5 h-5" />
            <span className="text-sm font-semibold">확정</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-yellow-800">
            {stats.confirmedClasses}/{stats.totalClasses}반
          </div>
          <div className="mt-1 w-full bg-yellow-200 rounded-full h-2">
            <div
              className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.confirmProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Class Status Grid */}
      <div className="p-4">
        <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          반별 명단 현황
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {classStatuses.map((classStatus) => (
            <div
              key={classStatus.classNumber}
              className={`border-2 p-3 rounded-lg transition-all ${
                classStatus.status === 'confirmed'
                  ? 'border-green-400 bg-green-50'
                  : classStatus.status === 'draft'
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg">{classStatus.classNumber}반</span>
                {getStatusIcon(classStatus.status)}
              </div>

              {getStatusBadge(classStatus.status)}

              {classStatus.hasRoster && (
                <div className="mt-2 text-xs text-gray-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>학생 수:</span>
                    <span className="font-semibold">{classStatus.studentCount}명</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>남/여:</span>
                    <span className="font-semibold">
                      {classStatus.maleCount}/{classStatus.femaleCount}
                    </span>
                  </div>
                  {classStatus.uploadedBy && (
                    <div className="pt-1 border-t border-gray-200 truncate">
                      <span className="text-gray-500">by </span>
                      <span className="font-medium">{classStatus.uploadedBy}</span>
                    </div>
                  )}
                  {classStatus.uploadedAt && (
                    <div className="text-gray-400">
                      {formatDate(classStatus.uploadedAt)}
                    </div>
                  )}
                </div>
              )}

              {!classStatus.hasRoster && (
                <div className="mt-2 text-xs text-gray-400">
                  아직 명단이 업로드되지 않았습니다.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status Legend */}
      <div className="border-t-2 border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-400 border border-green-600 rounded" />
            <span>확정 ({stats.confirmedClasses}반)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400 border border-yellow-600 rounded" />
            <span>임시저장 ({stats.draftClasses}반)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 border border-gray-400 rounded" />
            <span>미업로드 ({stats.pendingClasses}반)</span>
          </div>
        </div>
      </div>

      {/* Completion Message */}
      {stats.uploadProgress === 100 && stats.confirmProgress === 100 && (
        <div className="border-t-2 border-green-400 bg-green-50 p-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold">
              모든 반 명단이 확정되었습니다! 반 배정을 진행할 수 있습니다.
            </span>
          </div>
        </div>
      )}

      {stats.uploadProgress === 100 && stats.confirmProgress < 100 && (
        <div className="border-t-2 border-yellow-400 bg-yellow-50 p-4">
          <div className="flex items-center gap-2 text-yellow-700">
            <Clock className="w-5 h-5" />
            <span className="font-bold">
              모든 반 명단이 업로드되었습니다. 임시저장 상태의 명단을 확정해주세요.
            </span>
          </div>
        </div>
      )}

      {stats.uploadProgress < 100 && (
        <div className="border-t-2 border-gray-300 bg-gray-50 p-4">
          <div className="flex items-center gap-2 text-gray-600">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">
              {stats.pendingClasses}개 반의 명단이 아직 업로드되지 않았습니다.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborationStatus;
