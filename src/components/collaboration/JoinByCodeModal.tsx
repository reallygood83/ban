import React, { useState } from 'react';
import { KeyRound, Search, Check, X, ArrowRight } from 'lucide-react';
import { getInvitationByCode, acceptInvitation } from '../../services/collaborationService';
import { useAuth } from '../../contexts/AuthContext';
import { ProjectInvitation } from '../../types';

interface JoinByCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialCode?: string;
}

export const JoinByCodeModal: React.FC<JoinByCodeModalProps> = ({ isOpen, onClose, initialCode }) => {
    const { currentUser } = useAuth();
    const [code, setCode] = useState('');
    const [step, setStep] = useState<'input' | 'confirm'>('input');
    const [foundInvitation, setFoundInvitation] = useState<ProjectInvitation | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // initialCode가 있으면 자동으로 검색
    React.useEffect(() => {
        if (initialCode && isOpen) {
            setCode(initialCode);
            // 자동 검색
            const autoSearch = async () => {
                setIsLoading(true);
                try {
                    const invitation = await getInvitationByCode(initialCode);
                    if (invitation) {
                        setFoundInvitation(invitation);
                        setStep('confirm');
                    } else {
                        setError('유효하지 않거나 만료된 초대 코드입니다.');
                    }
                } catch (err) {
                    console.error(err);
                    setError('초대 코드 조회 중 오류가 발생했습니다.');
                } finally {
                    setIsLoading(false);
                }
            };
            autoSearch();
        }
    }, [initialCode, isOpen]);

    if (!isOpen) return null;

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length < 6) return;

        setIsLoading(true);
        setError(null);

        try {
            const invitation = await getInvitationByCode(code);
            if (invitation) {
                setFoundInvitation(invitation);
                setStep('confirm');
            } else {
                setError('유효하지 않거나 만료된 초대 코드입니다.');
            }
        } catch (err) {
            console.error(err);
            setError('초대 코드 조회 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!currentUser || !foundInvitation) return;

        setIsLoading(true);
        try {
            const result = await acceptInvitation(
                foundInvitation.id,
                currentUser.uid,
                currentUser.displayName || 'Unknown User',
                currentUser.photoURL || undefined
            );

            if (result.success) {
                alert('프로젝트에 참여했습니다!');
                window.location.reload();
            } else {
                setError(result.message);
            }
        } catch (err) {
            console.error(err);
            setError('참여 처리 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setCode('');
        setStep('input');
        setFoundInvitation(null);
        setError(null);
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
                    <KeyRound className="w-8 h-8" />
                    초대 코드로 참여
                </h2>

                {step === 'input' ? (
                    <form onSubmit={handleSearch} className="space-y-6">
                        <div>
                            <label className="block font-bold mb-2">초대 코드 6자리</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                className="neo-input text-center text-2xl font-black tracking-[0.5em]"
                                placeholder="ABC123"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-2 text-center">
                                초대받은 이메일이나 메시지에 포함된 코드를 입력하세요.
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-100 border-2 border-black text-red-800 text-sm font-bold text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="neo-btn neo-btn-primary w-full flex items-center justify-center gap-2"
                            disabled={isLoading || code.length < 6}
                        >
                            {isLoading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                            ) : (
                                <>
                                    <Search className="w-5 h-5" />
                                    코드 확인
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border-2 border-black p-6 text-center">
                            <p className="text-gray-500 font-bold mb-1">프로젝트</p>
                            <h3 className="text-2xl font-black mb-4">{foundInvitation?.projectName}</h3>

                            <div className="flex justify-center gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500 font-bold">초대자</p>
                                    <p>{foundInvitation?.invitedByName}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 font-bold">역할</p>
                                    <p>
                                        {foundInvitation?.role === 'admin' ? '관리자' :
                                            foundInvitation?.role === 'member' ? '담임교사' : '뷰어'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('input')}
                                className="neo-btn neo-btn-secondary flex-1"
                                disabled={isLoading}
                            >
                                뒤로
                            </button>
                            <button
                                onClick={handleJoin}
                                className="neo-btn neo-btn-primary flex-1 flex items-center justify-center gap-2"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                                ) : (
                                    <>
                                        <ArrowRight className="w-5 h-5" />
                                        참여하기
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
