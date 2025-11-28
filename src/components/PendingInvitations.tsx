import React, { useState, useEffect } from 'react';
import {
  Mail,
  UserPlus,
  Check,
  X,
  Clock,
  Shield,
  Users,
  Calendar,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Inbox,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ProjectInvitation, ProjectRole } from '../types';
import {
  getPendingInvitations,
  acceptInvitation,
  declineInvitation
} from '../services/collaborationService';
import { getRoleDisplayName, getRoleColor, getRoleDescription } from '../utils/permissions';

interface PendingInvitationsProps {
  userEmail: string;
  userId: string;
  displayName: string;
  photoURL?: string;
  onInvitationAccepted?: (projectId: string) => void;
  onInvitationDeclined?: () => void;
}

const ROLE_ICONS: Record<ProjectRole, React.ReactNode> = {
  owner: <Shield className="w-4 h-4 text-purple-600" />,
  admin: <Shield className="w-4 h-4 text-blue-600" />,
  member: <Users className="w-4 h-4 text-green-600" />,
  viewer: <Users className="w-4 h-4 text-gray-600" />
};

const PendingInvitations: React.FC<PendingInvitationsProps> = ({
  userEmail,
  userId,
  displayName,
  photoURL,
  onInvitationAccepted,
  onInvitationDeclined
}) => {
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    loadInvitations();
  }, [userEmail]);

  const loadInvitations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const invitationList = await getPendingInvitations(userEmail);
      setInvitations(invitationList);
    } catch (err: any) {
      setError(err.message || '초대 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (invitation: ProjectInvitation) => {
    setProcessingId(invitation.id);
    try {
      const result = await acceptInvitation(
        invitation.id,
        userId,
        displayName,
        photoURL
      );

      if (result.success) {
        setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
        onInvitationAccepted?.(result.projectId!);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || '초대 수락에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitation: ProjectInvitation) => {
    setProcessingId(invitation.id);
    try {
      const result = await declineInvitation(invitation.id);

      if (result.success) {
        setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
        onInvitationDeclined?.();
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || '초대 거절에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getDaysRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days}일 ${hours}시간 남음`;
    } else if (hours > 0) {
      return `${hours}시간 남음`;
    } else {
      return '곧 만료됨';
    }
  };

  const getExpirationColor = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days <= 1) return 'text-red-600';
    if (days <= 3) return 'text-yellow-600';
    return 'text-gray-600';
  };

  // 초대가 없으면 컴포넌트 자체를 렌더링하지 않음
  if (!isLoading && invitations.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-white border-4 border-black shadow-neo p-6 mb-6">
        <div className="flex items-center justify-center gap-3 py-4">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-semibold">초대 목록 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-4 border-black shadow-neo mb-6">
      {/* Header */}
      <div
        className="bg-pink-400 border-b-4 border-black p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Mail className="w-6 h-6" />
          <h3 className="font-bold text-lg">받은 초대</h3>
          <span className="bg-white border-2 border-black px-2 py-0.5 text-sm font-bold rounded">
            {invitations.length}개
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              loadInvitations();
            }}
            className="neo-btn-secondary p-2"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronUp className="w-5 h-5" />
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-b-2 border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
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

      {/* Invitation List */}
      {!isCollapsed && (
        <div className="divide-y-2 divide-gray-200">
          {invitations.map((invitation) => {
            const isProcessing = processingId === invitation.id;
            const isExpanded = expandedId === invitation.id;

            return (
              <div
                key={invitation.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                {/* Main Row */}
                <div className="flex items-start justify-between gap-4">
                  {/* Invitation Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <UserPlus className="w-5 h-5 text-pink-600 flex-shrink-0" />
                      <span className="font-bold text-lg truncate">
                        {invitation.projectName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold border rounded ${getRoleColor(invitation.role)}`}>
                        {ROLE_ICONS[invitation.role]}
                        {getRoleDisplayName(invitation.role)} 역할
                      </span>

                      {invitation.assignedClasses.length > 0 && (
                        <span className="text-xs bg-green-100 border border-green-400 px-2 py-0.5 rounded font-semibold">
                          {invitation.assignedClasses.sort((a, b) => a - b).join(', ')}반 담당
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{invitation.invitedByName}님이 초대</span>
                      </div>
                      <div className={`flex items-center gap-1 ${getExpirationColor(invitation.expiresAt)}`}>
                        <Clock className="w-4 h-4" />
                        <span>{getDaysRemaining(invitation.expiresAt)}</span>
                      </div>
                    </div>

                    {/* Expandable Details */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : invitation.id)}
                      className="mt-2 text-sm text-blue-600 hover:underline font-semibold"
                    >
                      {isExpanded ? '상세 정보 접기' : '상세 정보 보기'}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 bg-gray-50 border-2 border-gray-200 p-3 rounded-lg space-y-2 text-sm">
                        <div>
                          <span className="font-semibold text-gray-700">역할 설명:</span>
                          <p className="text-gray-600 mt-1">
                            {getRoleDescription(invitation.role)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-700">초대 일시:</span>
                          <span className="text-gray-600">{formatDate(invitation.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-700">만료 일시:</span>
                          <span className={getExpirationColor(invitation.expiresAt)}>
                            {formatDate(invitation.expiresAt)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleDecline(invitation)}
                      disabled={isProcessing}
                      className="neo-btn-secondary p-2 text-red-600 hover:bg-red-50"
                      title="거절"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <X className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleAccept(invitation)}
                      disabled={isProcessing}
                      className="neo-btn neo-btn-primary flex items-center gap-2 py-2 px-4"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          처리 중...
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          수락
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State (when collapsed but has invitations) */}
      {isCollapsed && invitations.length > 0 && (
        <div className="p-4 text-center text-gray-600">
          <p className="font-semibold">
            {invitations.length}개의 초대가 대기 중입니다. 클릭하여 확인하세요.
          </p>
        </div>
      )}
    </div>
  );
};

export default PendingInvitations;
