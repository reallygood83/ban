import React, { useState } from 'react';
import { Link, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
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
    const [isExpanded, setIsExpanded] = useState(false);
    const [role, setRole] = useState<ProjectRole>('member');
    const [assignedClasses, setAssignedClasses] = useState<number[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        if (!currentUser) return;

        setIsGenerating(true);
        try {
            // 임시 이메일로 초대 생성
            const invitation = await createInvitation(
                projectId,
                projectName,
                `invite-${Date.now()}@temp.link`,
                currentUser.uid,
                currentUser.displayName || 'Unknown User',
                role,
                role === 'member' ? assignedClasses : [],
                true
            );

            if (invitation.inviteCode) {
                const link = `${window.location.origin}?invite=${invitation.inviteCode}`;
                setShareLink(link);
            }
        } catch (err) {
            console.error('링크 생성 실패:', err);
            alert('링크 생성에 실패했습니다. Firebase 인덱스를 생성해주세요.');
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
        <div className="border-2 border-black bg-white">
            {/* 헤더 (항상 표시) */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Link className="w-5 h-5 text-purple-600" />
                    <span className="font-bold">공유 링크 생성</span>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {/* 확장 가능한 컨텐츠 */}
            {isExpanded && (
                <div className="p-4 pt-0 border-t-2 border-black animate-in slide-in-from-top-2">
                    {!shareLink ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block font-bold mb-2 text-sm">역할 선택</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['admin', 'member', 'viewer'] as ProjectRole[]).map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setRole(r)}
                                            className={`p-2 border-2 border-black font-bold text-sm transition-all ${role === r ? 'bg-yellow-200 shadow-neo' : 'bg-white hover:bg-gray-50'
                                                }`}
                                        >
                                            {r === 'admin' ? '관리자' : r === 'member' ? '담임교사' : '뷰어'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {role === 'member' && (
                                <div>
                                    <label className="block font-bold mb-2 text-sm">담당 반</label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {Array.from({ length: classCount }, (_, i) => i + 1).map((num) => (
                                            <button
                                                key={num}
                                                type="button"
                                                onClick={() => handleClassToggle(num)}
                                                className={`aspect-square flex items-center justify-center border-2 border-black font-bold transition-all ${assignedClasses.includes(num) ? 'bg-blue-200 shadow-neo' : 'bg-white hover:bg-gray-50'
                                                    }`}
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
                                        링크 생성
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="bg-gray-50 border-2 border-black p-3 break-all text-xs font-mono">
                                {shareLink}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopy}
                                    className={`neo-btn flex-1 flex items-center justify-center gap-2 ${copied ? 'bg-green-200' : 'neo-btn-primary'
                                        }`}
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            복사됨!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            복사
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setShareLink(null);
                                        setAssignedClasses([]);
                                    }}
                                    className="neo-btn-secondary"
                                >
                                    새로 만들기
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
