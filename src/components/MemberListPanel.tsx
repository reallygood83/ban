import React, { useState, useEffect } from 'react';
import {
  Users,
  Crown,
  Shield,
  User,
  Eye,
  MoreVertical,
  Trash2,
  UserCog,
  Mail,
  Calendar,
  ChevronDown,
  AlertTriangle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { ProjectMember, ProjectRole, Project } from '../types';
import {
  getProjectMembers,
  updateMemberRole,
  updateMemberAssignedClasses,
  removeProjectMember
} from '../services/collaborationService';
import {
  canRemoveMembers,
  canChangeRole,
  getRoleDisplayName,
  getRoleColor,
  getUserRole
} from '../utils/permissions';

interface MemberListPanelProps {
  project: Project;
  currentUserId: string;
  onMemberRemoved?: () => void;
  onMemberUpdated?: () => void;
}

const ROLE_ICONS: Record<ProjectRole, React.ReactNode> = {
  owner: <Crown className="w-4 h-4 text-purple-600" />,
  admin: <Shield className="w-4 h-4 text-blue-600" />,
  member: <User className="w-4 h-4 text-green-600" />,
  viewer: <Eye className="w-4 h-4 text-gray-600" />
};

const CHANGEABLE_ROLES: ProjectRole[] = ['admin', 'member', 'viewer'];

const MemberListPanel: React.FC<MemberListPanelProps> = ({
  project,
  currentUserId,
  onMemberRemoved,
  onMemberUpdated
}) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editingClasses, setEditingClasses] = useState<string | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [processingAction, setProcessingAction] = useState(false);

  const currentUserRole = getUserRole(project, currentUserId, members);
  const classNumbers = Array.from({ length: project.classCount }, (_, i) => i + 1);

  useEffect(() => {
    loadMembers();
  }, [project.id]);

  const loadMembers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const memberList = await getProjectMembers(project.id);
      setMembers(memberList);
    } catch (err: any) {
      setError(err.message || '멤버 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: ProjectRole) => {
    setProcessingAction(true);
    try {
      await updateMemberRole(project.id, memberId, newRole);
      await loadMembers();
      setEditingRole(null);
      onMemberUpdated?.();
    } catch (err: any) {
      setError(err.message || '역할 변경에 실패했습니다.');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleClassesChange = async (memberId: string) => {
    setProcessingAction(true);
    try {
      await updateMemberAssignedClasses(project.id, memberId, selectedClasses);
      await loadMembers();
      setEditingClasses(null);
      setSelectedClasses([]);
      onMemberUpdated?.();
    } catch (err: any) {
      setError(err.message || '담당 반 변경에 실패했습니다.');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRemoveMember = async (member: ProjectMember) => {
    setProcessingAction(true);
    try {
      await removeProjectMember(project.id, member.id, member.userId);
      await loadMembers();
      setConfirmDelete(null);
      setActionMenuOpen(null);
      onMemberRemoved?.();
    } catch (err: any) {
      setError(err.message || '멤버 제거에 실패했습니다.');
    } finally {
      setProcessingAction(false);
    }
  };

  const openClassEditor = (member: ProjectMember) => {
    setSelectedClasses([...member.assignedClasses]);
    setEditingClasses(member.id);
    setActionMenuOpen(null);
  };

  const toggleClass = (classNum: number) => {
    setSelectedClasses(prev =>
      prev.includes(classNum)
        ? prev.filter(c => c !== classNum)
        : [...prev, classNum]
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="bg-white border-4 border-black shadow-neo p-6">
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-semibold">멤버 목록 불러오는 중...</span>
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
            onClick={loadMembers}
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
      <div className="bg-blue-400 border-b-4 border-black p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6" />
          <h3 className="font-bold text-lg">프로젝트 멤버</h3>
          <span className="bg-white border-2 border-black px-2 py-0.5 text-sm font-bold rounded">
            {members.length}명
          </span>
        </div>
        <button
          onClick={loadMembers}
          className="neo-btn-secondary p-2"
          title="새로고침"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Member List */}
      <div className="divide-y-2 divide-black">
        {members.map((member) => {
          const isOwner = member.role === 'owner';
          const canRemove = canRemoveMembers(project, currentUserId, member.userId, members);
          const canChange = currentUserRole && canChangeRole(currentUserRole, member.role, 'admin');

          return (
            <div key={member.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                {/* Member Info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gray-200 border-2 border-black rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {member.photoURL ? (
                      <img
                        src={member.photoURL}
                        alt={member.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-gray-500" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg truncate">
                        {member.displayName}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold border rounded ${getRoleColor(member.role)}`}>
                        {ROLE_ICONS[member.role]}
                        {getRoleDisplayName(member.role)}
                      </span>
                      {member.userId === currentUserId && (
                        <span className="text-xs text-gray-500 font-semibold">(나)</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{member.email}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Calendar className="w-4 h-4" />
                      <span>참여: {formatDate(member.joinedAt)}</span>
                    </div>

                    {/* Assigned Classes */}
                    {member.role === 'member' && member.assignedClasses.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-600">담당:</span>
                        {member.assignedClasses.sort((a, b) => a - b).map((classNum) => (
                          <span
                            key={classNum}
                            className="bg-green-100 border border-green-400 px-2 py-0.5 text-xs font-bold rounded"
                          >
                            {classNum}반
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Role Editor */}
                    {editingRole === member.id && (
                      <div className="mt-3 bg-gray-50 border-2 border-black p-3 rounded-lg">
                        <label className="block font-semibold text-sm mb-2">역할 변경</label>
                        <div className="flex flex-wrap gap-2">
                          {CHANGEABLE_ROLES.map((role) => (
                            <button
                              key={role}
                              onClick={() => handleRoleChange(member.id, role)}
                              disabled={processingAction || member.role === role}
                              className={`flex items-center gap-1 px-3 py-1.5 border-2 border-black text-sm font-bold transition-all ${
                                member.role === role
                                  ? 'bg-gray-300 cursor-not-allowed'
                                  : 'bg-white hover:shadow-neo-sm'
                              }`}
                            >
                              {ROLE_ICONS[role]}
                              {getRoleDisplayName(role)}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setEditingRole(null)}
                          className="mt-2 text-sm text-gray-600 hover:underline"
                        >
                          취소
                        </button>
                      </div>
                    )}

                    {/* Class Editor */}
                    {editingClasses === member.id && (
                      <div className="mt-3 bg-gray-50 border-2 border-black p-3 rounded-lg">
                        <label className="block font-semibold text-sm mb-2">담당 반 변경</label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                          {classNumbers.map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => toggleClass(num)}
                              className={`p-2 border-2 border-black font-bold text-sm transition-all ${
                                selectedClasses.includes(num)
                                  ? 'bg-green-400 shadow-neo-sm'
                                  : 'bg-white hover:bg-gray-100'
                              }`}
                            >
                              {num}반
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleClassesChange(member.id)}
                            disabled={processingAction}
                            className="neo-btn neo-btn-primary text-sm py-1.5 px-3"
                          >
                            {processingAction ? '저장 중...' : '저장'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingClasses(null);
                              setSelectedClasses([]);
                            }}
                            className="neo-btn-secondary text-sm py-1.5 px-3"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Menu */}
                {!isOwner && (canRemove || canChange) && (
                  <div className="relative">
                    <button
                      onClick={() => setActionMenuOpen(actionMenuOpen === member.id ? null : member.id)}
                      className="p-2 hover:bg-gray-100 rounded border-2 border-transparent hover:border-black transition-all"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {actionMenuOpen === member.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActionMenuOpen(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 bg-white border-2 border-black shadow-neo z-20 min-w-[160px]">
                          {canChange && (
                            <button
                              onClick={() => {
                                setEditingRole(member.id);
                                setActionMenuOpen(null);
                              }}
                              className="w-full px-4 py-2 text-left font-semibold hover:bg-blue-50 flex items-center gap-2 border-b border-gray-200"
                            >
                              <UserCog className="w-4 h-4" />
                              역할 변경
                            </button>
                          )}
                          {canChange && member.role === 'member' && (
                            <button
                              onClick={() => openClassEditor(member)}
                              className="w-full px-4 py-2 text-left font-semibold hover:bg-blue-50 flex items-center gap-2 border-b border-gray-200"
                            >
                              <Users className="w-4 h-4" />
                              담당 반 변경
                            </button>
                          )}
                          {canRemove && (
                            <button
                              onClick={() => {
                                setConfirmDelete(member.id);
                                setActionMenuOpen(null);
                              }}
                              className="w-full px-4 py-2 text-left font-semibold hover:bg-red-50 text-red-600 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              멤버 제거
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Delete Confirmation */}
              {confirmDelete === member.id && (
                <div className="mt-4 bg-red-50 border-2 border-red-400 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-bold">멤버 제거 확인</span>
                  </div>
                  <p className="text-red-600 mb-3">
                    <strong>{member.displayName}</strong>님을 프로젝트에서 제거하시겠습니까?
                    {member.userId === currentUserId && ' (본인을 제거하면 더 이상 프로젝트에 접근할 수 없습니다.)'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRemoveMember(member)}
                      disabled={processingAction}
                      className="neo-btn bg-red-500 text-white hover:bg-red-600 text-sm py-1.5 px-3"
                    >
                      {processingAction ? '제거 중...' : '제거'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="neo-btn-secondary text-sm py-1.5 px-3"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {members.length === 0 && (
        <div className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500 font-semibold">멤버가 없습니다.</p>
          <p className="text-gray-400 text-sm">프로젝트에 멤버를 초대해보세요.</p>
        </div>
      )}
    </div>
  );
};

export default MemberListPanel;
