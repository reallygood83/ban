import React, { useState } from 'react';
import {
  X,
  Key,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Shield,
  Users,
  Calendar,
  Clock,
  UserPlus
} from 'lucide-react';
import { ProjectInvitation, ProjectRole } from '../types';
import {
  getInvitationByCode,
  acceptInvitation
} from '../services/collaborationService';
import { getRoleDisplayName, getRoleColor, getRoleDescription } from '../utils/permissions';

interface JoinByCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  displayName: string;
  photoURL?: string;
  onSuccess?: (projectId: string) => void;
}

const ROLE_ICONS: Record<ProjectRole, React.ReactNode> = {
  owner: <Shield className="w-5 h-5 text-purple-600" />,
  admin: <Shield className="w-5 h-5 text-blue-600" />,
  member: <Users className="w-5 h-5 text-green-600" />,
  viewer: <Users className="w-5 h-5 text-gray-600" />
};

type ModalStep = 'input' | 'preview' | 'success';

const JoinByCodeModal: React.FC<JoinByCodeModalProps> = ({
  isOpen,
  onClose,
  userId,
  displayName,
  photoURL,
  onSuccess
}) => {
  const [code, setCode] = useState('');
  const [step, setStep] = useState<ModalStep>('input');
  const [invitation, setInvitation] = useState<ProjectInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinedProjectId, setJoinedProjectId] = useState<string | null>(null);

  const formatCode = (value: string): string => {
    // 알파벳과 숫자만 허용, 대문자로 변환
    return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setCode(formatted);
    setError(null);
  };

  const handleSearch = async () => {
    if (code.length < 6) {
      setError('초대 코드는 최소 6자리입니다.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const foundInvitation = await getInvitationByCode(code);

      if (!foundInvitation) {
        setError('유효하지 않거나 만료된 초대 코드입니다.');
        return;
      }

      setInvitation(foundInvitation);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || '초대 코드 확인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!invitation) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await acceptInvitation(
        invitation.id,
        userId,
        displayName,
        photoURL
      );

      if (result.success) {
        setJoinedProjectId(result.projectId || invitation.projectId);
        setStep('success');
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || '프로젝트 참여에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    if (joinedProjectId) {
      onSuccess?.(joinedProjectId);
    }
    handleClose();
  };

  const handleClose = () => {
    setCode('');
    setStep('input');
    setInvitation(null);
    setError(null);
    setJoinedProjectId(null);
    onClose();
  };

  const handleBack = () => {
    setStep('input');
    setInvitation(null);
    setError(null);
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
    return 'text-green-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-black shadow-neo max-w-md w-full">
        {/* Header */}
        <div className="bg-cyan-400 border-b-4 border-black p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-6 h-6" />
            <h2 className="neo-heading-sm">초대 코드로 참여</h2>
          </div>
          <button
            onClick={handleClose}
            className="neo-btn-secondary p-2"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border-2 border-red-400 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            </div>
          )}

          {/* Step 1: Code Input */}
          {step === 'input' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-cyan-100 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-cyan-600" />
                </div>
                <p className="text-gray-600">
                  프로젝트 관리자로부터 받은 초대 코드를 입력하세요.
                </p>
              </div>

              <div>
                <label className="block font-bold mb-2">
                  초대 코드 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={code}
                    onChange={handleCodeChange}
                    placeholder="ABCD1234"
                    maxLength={8}
                    className="w-full px-4 py-4 text-center text-2xl font-mono font-bold tracking-widest border-2 border-black shadow-neo focus:outline-none focus:ring-2 focus:ring-cyan-500 uppercase"
                    autoFocus
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 text-center">
                  영문과 숫자 조합 6-8자리
                </p>
              </div>

              <button
                onClick={handleSearch}
                disabled={isLoading || code.length < 6}
                className="w-full neo-btn neo-btn-primary flex items-center justify-center gap-2 py-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    확인 중...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    코드 확인
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Preview Invitation */}
          {step === 'preview' && invitation && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-bold text-xl mb-2">초대 정보 확인</h3>
                <p className="text-gray-600">
                  아래 프로젝트에 참여하시겠습니까?
                </p>
              </div>

              {/* Invitation Details Card */}
              <div className="bg-gray-50 border-2 border-black p-4 rounded-lg space-y-4">
                {/* Project Name */}
                <div>
                  <span className="text-sm text-gray-500">프로젝트</span>
                  <p className="font-bold text-xl">{invitation.projectName}</p>
                </div>

                {/* Role */}
                <div>
                  <span className="text-sm text-gray-500">부여될 역할</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold border-2 rounded ${getRoleColor(invitation.role)}`}>
                      {ROLE_ICONS[invitation.role]}
                      {getRoleDisplayName(invitation.role)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {getRoleDescription(invitation.role)}
                  </p>
                </div>

                {/* Assigned Classes */}
                {invitation.assignedClasses.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-500">담당 반</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {invitation.assignedClasses.sort((a, b) => a - b).map((classNum) => (
                        <span
                          key={classNum}
                          className="bg-green-100 border border-green-400 px-3 py-1 text-sm font-bold rounded"
                        >
                          {classNum}반
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inviter Info */}
                <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t border-gray-200">
                  <Calendar className="w-4 h-4" />
                  <span>{invitation.invitedByName}님이 초대</span>
                </div>

                {/* Expiration */}
                <div className={`flex items-center gap-2 text-sm ${getExpirationColor(invitation.expiresAt)}`}>
                  <Clock className="w-4 h-4" />
                  <span>{getDaysRemaining(invitation.expiresAt)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 neo-btn-secondary py-3"
                  disabled={isLoading}
                >
                  뒤로
                </button>
                <button
                  onClick={handleJoin}
                  disabled={isLoading}
                  className="flex-1 neo-btn neo-btn-primary flex items-center justify-center gap-2 py-3"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      참여 중...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      참여하기
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && invitation && (
            <div className="space-y-6 text-center">
              <div>
                <div className="w-20 h-20 bg-green-100 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="font-bold text-2xl mb-2">참여 완료!</h3>
                <p className="text-gray-600">
                  <strong>{invitation.projectName}</strong> 프로젝트에
                  <br />
                  성공적으로 참여했습니다.
                </p>
              </div>

              <div className="bg-green-50 border-2 border-green-400 p-4 rounded-lg">
                <div className="flex items-center justify-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold border-2 rounded ${getRoleColor(invitation.role)}`}>
                    {ROLE_ICONS[invitation.role]}
                    {getRoleDisplayName(invitation.role)}
                  </span>
                  {invitation.assignedClasses.length > 0 && (
                    <span className="text-sm text-gray-600">
                      ({invitation.assignedClasses.sort((a, b) => a - b).join(', ')}반 담당)
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleComplete}
                className="w-full neo-btn neo-btn-primary py-3"
              >
                프로젝트로 이동
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinByCodeModal;
