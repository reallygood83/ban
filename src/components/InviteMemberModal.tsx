import React, { useState } from 'react';
import { X, UserPlus, Mail, Shield, Users, Copy, Check } from 'lucide-react';
import { ProjectRole } from '../types';
import { createInvitation } from '../services/collaborationService';
import { getRoleDisplayName, getRoleDescription } from '../utils/permissions';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  invitedBy: string;
  invitedByName: string;
  classCount: number;
  onSuccess?: () => void;
}

const AVAILABLE_ROLES: ProjectRole[] = ['admin', 'member', 'viewer'];

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  invitedBy,
  invitedByName,
  classCount,
  onSuccess
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProjectRole>('member');
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [useInviteCode, setUseInviteCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 반 번호 배열 생성
  const classNumbers = Array.from({ length: classCount }, (_, i) => i + 1);

  const handleClassToggle = (classNum: number) => {
    setSelectedClasses(prev =>
      prev.includes(classNum)
        ? prev.filter(c => c !== classNum)
        : [...prev, classNum]
    );
  };

  const handleSelectAllClasses = () => {
    if (selectedClasses.length === classCount) {
      setSelectedClasses([]);
    } else {
      setSelectedClasses(classNumbers);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!useInviteCode && !email.trim()) {
      setError('이메일 주소를 입력해주세요.');
      return;
    }

    if (!useInviteCode && !validateEmail(email)) {
      setError('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    if (role === 'member' && selectedClasses.length === 0) {
      setError('멤버 역할은 최소 1개 이상의 담당 반을 선택해야 합니다.');
      return;
    }

    setIsLoading(true);

    try {
      const invitation = await createInvitation(
        projectId,
        projectName,
        useInviteCode ? `code_${Date.now()}@invite.local` : email.trim(),
        invitedBy,
        invitedByName,
        role,
        role === 'member' ? selectedClasses : [],
        useInviteCode
      );

      if (useInviteCode && invitation.inviteCode) {
        setInviteCode(invitation.inviteCode);
      } else {
        // 이메일 초대 성공
        resetForm();
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || '초대 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;

    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  };

  const resetForm = () => {
    setEmail('');
    setRole('member');
    setSelectedClasses([]);
    setUseInviteCode(false);
    setError(null);
    setInviteCode(null);
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-black shadow-neo max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-green-400 border-b-4 border-black p-4 flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-2">
            <UserPlus className="w-6 h-6" />
            <h2 className="neo-heading-sm">멤버 초대</h2>
          </div>
          <button
            onClick={handleClose}
            className="neo-btn-secondary p-2"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 초대 코드 생성 완료 화면 */}
        {inviteCode ? (
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-bold text-xl mb-2">초대 코드가 생성되었습니다!</h3>
              <p className="text-gray-600 mb-4">
                아래 코드를 초대할 멤버에게 전달해주세요.
              </p>
            </div>

            <div className="bg-gray-100 border-2 border-black p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-mono text-3xl font-bold tracking-wider">
                  {inviteCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="neo-btn-secondary p-2 flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="text-green-600">복사됨</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>복사</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ 주의:</strong> 이 코드는 7일 동안 유효합니다.
                코드를 받은 사람은 대시보드에서 '초대 코드로 참여'를 통해 프로젝트에 참여할 수 있습니다.
              </p>
            </div>

            <div className="text-sm text-gray-600">
              <p><strong>역할:</strong> {getRoleDisplayName(role)}</p>
              {role === 'member' && selectedClasses.length > 0 && (
                <p><strong>담당 반:</strong> {selectedClasses.sort((a, b) => a - b).join(', ')}반</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={resetForm}
                className="flex-1 neo-btn-secondary"
              >
                새 초대 생성
              </button>
              <button
                onClick={handleClose}
                className="flex-1 neo-btn neo-btn-primary"
              >
                완료
              </button>
            </div>
          </div>
        ) : (
          /* 초대 폼 */
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border-2 border-red-400 p-4 rounded-lg">
                <p className="text-red-700 font-semibold">{error}</p>
              </div>
            )}

            {/* 초대 방식 선택 */}
            <div>
              <label className="block font-bold mb-3">초대 방식</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="inviteMethod"
                    checked={!useInviteCode}
                    onChange={() => setUseInviteCode(false)}
                    className="w-5 h-5"
                  />
                  <Mail className="w-5 h-5" />
                  <span className="font-semibold">이메일로 초대</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="inviteMethod"
                    checked={useInviteCode}
                    onChange={() => setUseInviteCode(true)}
                    className="w-5 h-5"
                  />
                  <Copy className="w-5 h-5" />
                  <span className="font-semibold">초대 코드 생성</span>
                </label>
              </div>
            </div>

            {/* 이메일 입력 (이메일 초대 방식일 때만) */}
            {!useInviteCode && (
              <div>
                <label className="block font-bold mb-2">
                  이메일 주소 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full pl-10 pr-4 py-3 border-2 border-black shadow-neo font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            )}

            {/* 역할 선택 */}
            <div>
              <label className="block font-bold mb-3">
                <Shield className="inline w-5 h-5 mr-1" />
                역할 선택 <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {AVAILABLE_ROLES.map((r) => (
                  <label
                    key={r}
                    className={`block p-4 border-2 border-black cursor-pointer transition-all ${
                      role === r
                        ? 'bg-green-100 shadow-neo-sm'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={role === r}
                        onChange={() => setRole(r)}
                        className="mt-1 w-5 h-5"
                      />
                      <div>
                        <span className="font-bold">{getRoleDisplayName(r)}</span>
                        <p className="text-sm text-gray-600 mt-1">
                          {getRoleDescription(r)}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 담당 반 선택 (member 역할일 때만) */}
            {role === 'member' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="font-bold">
                    <Users className="inline w-5 h-5 mr-1" />
                    담당 반 선택 <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllClasses}
                    className="text-sm text-blue-600 hover:underline font-semibold"
                  >
                    {selectedClasses.length === classCount ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {classNumbers.map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleClassToggle(num)}
                      className={`p-3 border-2 border-black font-bold transition-all ${
                        selectedClasses.includes(num)
                          ? 'bg-green-400 shadow-neo-sm'
                          : 'bg-white hover:bg-gray-100'
                      }`}
                    >
                      {num}반
                    </button>
                  ))}
                </div>
                {selectedClasses.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    선택됨: {selectedClasses.sort((a, b) => a - b).join(', ')}반
                  </p>
                )}
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 neo-btn-secondary"
                disabled={isLoading}
              >
                취소
              </button>
              <button
                type="submit"
                className="flex-1 neo-btn neo-btn-primary flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    {useInviteCode ? '코드 생성' : '초대 보내기'}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InviteMemberModal;
