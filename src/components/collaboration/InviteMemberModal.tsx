import React, { useState } from 'react';
import { Mail, UserPlus, X, Check, AlertCircle, Shield, Users, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createInvitation } from '../../services/collaborationService';
import { ProjectRole } from '../../types';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    projectName: string;
    classCount: number;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
    isOpen,
    onClose,
    projectId,
    projectName,
    classCount,
}) => {
    const { currentUser } = useAuth();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<ProjectRole>('member');
    const [assignedClasses, setAssignedClasses] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [inviteCode, setInviteCode] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleClassToggle = (classNum: number) => {
        setAssignedClasses(prev =>
            prev.includes(classNum)
                ? prev.filter(c => c !== classNum)
                : [...prev, classNum].sort((a, b) => a - b)
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !email) return;

        setIsLoading(true);
        setError(null);

        try {
            const invitation = await createInvitation(
                projectId,
                projectName,
                email,
                currentUser.uid,
                currentUser.displayName || 'Unknown User',
                role,
                role === 'member' ? assignedClasses : [],
                true // Generate invite code as well
            );

            setSuccess(true);
            setInviteCode(invitation.inviteCode || null);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : '초대 발송 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setRole('member');
        setAssignedClasses([]);
        setError(null);
        setSuccess(false);
        setInviteCode(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="neo-card w-full max-w-md relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <h2 className="neo-heading-sm mb-6 flex items-center gap-2">
                    <UserPlus className="w-8 h-8" />
                    멤버 초대하기
                </h2>

                {success ? (
                    <div className="text-center py-6">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-black">
                            <Check className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">초대 발송 완료!</h3>
                        <p className="text-gray-600 mb-6">
                            <span className="font-bold">{email}</span>님에게 초대장을 보냈습니다.
                        </p>

                        {inviteCode && (
                            <>
                                <div className="bg-yellow-50 border-2 border-black p-4 mb-4 text-left">
                                    <p className="text-sm font-bold text-gray-500 mb-1">초대 코드</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-2xl font-black tracking-widest">{inviteCode}</span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(inviteCode);
                                                alert('코드가 복사되었습니다!');
                                            }}
                                            className="text-sm underline hover:text-blue-600 font-bold"
                                        >
                                            복사
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        * 이 코드를 직접 전달하여 초대할 수도 있습니다.
                                    </p>
                                </div>

                                <div className="bg-blue-50 border-2 border-black p-4 mb-6 text-left">
                                    <p className="text-sm font-bold text-gray-500 mb-1">초대 링크</p>
                                    <div className="bg-white border border-black p-2 mb-2 break-all text-xs font-mono">
                                        {`${window.location.origin}?invite=${inviteCode}`}
                                    </div>
                                    <button
                                        onClick={() => {
                                            const link = `${window.location.origin}?invite=${inviteCode}`;
                                            navigator.clipboard.writeText(link);
                                            alert('링크가 복사되었습니다!');
                                        }}
                                        className="neo-btn-secondary w-full text-sm"
                                    >
                                        링크 복사
                                    </button>
                                    <p className="text-xs text-gray-500 mt-2">
                                        * 이 링크를 공유하면 누구나 프로젝트에 참여할 수 있습니다.
                                    </p>
                                </div>
                            </>
                        )}

                        <button onClick={handleClose} className="neo-btn neo-btn-primary w-full">
                            확인
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block font-bold mb-2">이메일 주소</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="neo-input pl-10"
                                    placeholder="teacher@school.edu"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-bold mb-2">역할 선택</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setRole('admin')}
                                    className={`p-3 border-2 border-black flex flex-col items-center gap-2 transition-all ${role === 'admin' ? 'bg-yellow-200 shadow-neo' : 'bg-white hover:bg-gray-50'
                                        }`}
                                >
                                    <Shield className="w-6 h-6" />
                                    <span className="font-bold text-sm">관리자</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('member')}
                                    className={`p-3 border-2 border-black flex flex-col items-center gap-2 transition-all ${role === 'member' ? 'bg-yellow-200 shadow-neo' : 'bg-white hover:bg-gray-50'
                                        }`}
                                >
                                    <Users className="w-6 h-6" />
                                    <span className="font-bold text-sm">담임교사</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('viewer')}
                                    className={`p-3 border-2 border-black flex flex-col items-center gap-2 transition-all ${role === 'viewer' ? 'bg-yellow-200 shadow-neo' : 'bg-white hover:bg-gray-50'
                                        }`}
                                >
                                    <Eye className="w-6 h-6" />
                                    <span className="font-bold text-sm">뷰어</span>
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {role === 'admin' && '모든 반의 명단을 관리하고 멤버를 초대할 수 있습니다.'}
                                {role === 'member' && '배정된 반의 명단만 업로드하고 관리할 수 있습니다.'}
                                {role === 'viewer' && '프로젝트 내용을 조회만 할 수 있습니다.'}
                            </p>
                        </div>

                        {role === 'member' && (
                            <div className="animate-in slide-in-from-top-2 duration-200">
                                <label className="block font-bold mb-2">담당 반 배정</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {Array.from({ length: classCount }, (_, i) => i + 1).map((num) => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => handleClassToggle(num)}
                                            className={`
                        aspect-square flex items-center justify-center border-2 border-black font-bold text-lg transition-all
                        ${assignedClasses.includes(num) ? 'bg-blue-200 shadow-neo translate-x-[-2px] translate-y-[-2px]' : 'bg-white hover:bg-gray-50'}
                      `}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                                {assignedClasses.length === 0 && (
                                    <p className="text-xs text-red-500 mt-2 font-bold flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        최소 1개 이상의 반을 선택해주세요.
                                    </p>
                                )}
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-100 border-2 border-black flex items-start gap-2 text-red-800 text-sm">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p className="font-bold">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="neo-btn neo-btn-secondary flex-1"
                                disabled={isLoading}
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                className="neo-btn neo-btn-primary flex-1 flex items-center justify-center gap-2"
                                disabled={isLoading || (role === 'member' && assignedClasses.length === 0)}
                            >
                                {isLoading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                                ) : (
                                    <>
                                        <Mail className="w-5 h-5" />
                                        초대하기
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
