import React, { useState } from 'react';
import { Link, Copy, Check, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createInvitation } from '../../services/collaborationService';
import { ProjectRole } from '../../types';

interface ShareLinkGeneratorProps {
    projectId: string;
    projectName: string;
    classCount: number;
}

export const ShareLinkGenerator: React.FC<ShareLinkGeneratorProps> = ({
    projectId,
    projectName,
    classCount,
}) => {
    const { currentUser } = useAuth();
    const [role, setRole] = useState<ProjectRole>('member');
    const [assignedClasses, setAssignedClasses] = useState<number[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        if (!currentUser) return;

        setIsGenerating(true);
        try {
            // 임시 이메일로 초대 생성 (실제로는 링크만 사용)
            const invitation = await createInvitation(
                projectId,
                projectName,
                `temp-${Date.now()}@invite.link`, // 임시 이메일
                currentUser.uid,
                currentUser.displayName || 'Unknown User',
                role,
                role === 'member' ? assignedClasses : [],
                true // 초대 코드 생성
            );

            if (invitation.inviteCode) {
                const link = `${window.location.origin}?invite=${invitation.inviteCode}`;
                setShareLink(link);
            }
        } catch (err) {
            console.error(err);
            alert('링크 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = () => {
        if (shareLink) {
            navigator.clipboard.writeText(shareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClassToggle = (classNum: number) => {
        setAssignedClasses(prev =>
            prev.includes(classNum)
                ? prev.filter(c => c !== classNum)
                : [...prev, classNum].sort((a, b) => a - b)
        );
    };

    return (
        <div className="neo-card bg-gradient-to-br from-purple-50 to-blue-50">
            <div className="flex items-center gap-3 mb-6">
                <Link className="w-8 h-8 text-purple-600" />
                <h3 className="neo-heading-sm">공유 링크 생성</h3>
            </div>

            {!shareLink ? (
                <div className="space-y-4">
                    <div>
                        <label className="block font-bold mb-2">역할 선택</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setRole('admin')}
                                className={`p-3 border-2 border-black font-bold transition-all ${role === 'admin' ? 'bg-yellow-200 shadow-neo' : 'bg-white hover:bg-gray-50'
                                    }`}
                            >
                                관리자
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('member')}
                                className={`p-3 border-2 border-black font-bold transition-all ${role === 'member' ? 'bg-yellow-200 shadow-neo' : 'bg-white hover:bg-gray-50'
                                    }`}
                            >
                                담임교사
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('viewer')}
                                className={`p-3 border-2 border-black font-bold transition-all ${role === 'viewer' ? 'bg-yellow-200 shadow-neo' : 'bg-white hover:bg-gray-50'
                                    }`}
                            >
                                뷰어
                            </button>
                        </div>
                    </div>

                    {role === 'member' && (
                        <div>
                            <label className="block font-bold mb-2">담당 반 배정</label>
                            <div className="grid grid-cols-5 gap-2">
                                {Array.from({ length: classCount }, (_, i) => i + 1).map((num) => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => handleClassToggle(num)}
                                        className={`
                                            aspect-square flex items-center justify-center border-2 border-black font-bold text-lg transition-all
                                            ${assignedClasses.includes(num) ? 'bg-blue-200 shadow-neo' : 'bg-white hover:bg-gray-50'}
                                        `}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleGenerate}
                        className="neo-btn neo-btn-primary w-full flex items-center justify-center gap-2"
                        disabled={isGenerating || (role === 'member' && assignedClasses.length === 0)}
                    >
                        {isGenerating ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                        ) : (
                            <>
                                <Link className="w-5 h-5" />
                                공유 링크 생성
                            </>
                        )}
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-white border-2 border-black p-4">
                        <p className="text-sm font-bold text-gray-500 mb-2">생성된 공유 링크</p>
                        <div className="bg-gray-50 border border-black p-3 break-all text-sm font-mono mb-3">
                            {shareLink}
                        </div>
                        <button
                            onClick={handleCopy}
                            className={`neo-btn w-full flex items-center justify-center gap-2 ${copied ? 'bg-green-200' : 'neo-btn-primary'
                                }`}
                        >
                            {copied ? (
                                <>
                                    <Check className="w-5 h-5" />
                                    복사됨!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-5 h-5" />
                                    링크 복사
                                </>
                            )}
                        </button>
                    </div>

                    <div className="bg-yellow-50 border-2 border-black p-3 text-sm">
                        <p className="font-bold mb-1">💡 사용 방법</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li>이 링크를 카카오톡, 메신저 등으로 공유하세요</li>
                            <li>링크를 받은 사람이 클릭하면 자동으로 프로젝트에 참여됩니다</li>
                            <li>역할: <strong>{role === 'admin' ? '관리자' : role === 'member' ? '담임교사' : '뷰어'}</strong></li>
                            {role === 'member' && assignedClasses.length > 0 && (
                                <li>담당 반: <strong>{assignedClasses.join(', ')}반</strong></li>
                            )}
                        </ul>
                    </div>

                    <button
                        onClick={() => {
                            setShareLink(null);
                            setAssignedClasses([]);
                        }}
                        className="neo-btn-secondary w-full"
                    >
                        새 링크 생성
                    </button>
                </div>
            )}
        </div>
    );
};
