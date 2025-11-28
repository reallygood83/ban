import React, { useEffect, useState } from 'react';
import { Mail, Check, X, Calendar } from 'lucide-react';
import { ProjectInvitation } from '../../types';
import { getPendingInvitations, acceptInvitation, declineInvitation, subscribeToPendingInvitations } from '../../services/collaborationService';
import { useAuth } from '../../contexts/AuthContext';

export const PendingInvitations: React.FC = () => {
    const { currentUser } = useAuth();
    const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.email) return;

        const unsubscribe = subscribeToPendingInvitations(currentUser.email, (data) => {
            setInvitations(data);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleAccept = async (invitation: ProjectInvitation) => {
        if (!currentUser) return;
        try {
            const result = await acceptInvitation(
                invitation.id,
                currentUser.uid,
                currentUser.displayName || 'Unknown User',
                currentUser.photoURL || undefined
            );

            if (result.success) {
                alert('초대를 수락했습니다!');
                setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
                // 페이지 새로고침 또는 리다이렉트가 필요할 수 있음
                window.location.reload();
            } else {
                alert(result.message);
            }
        } catch (err) {
            console.error(err);
            alert('초대 수락 중 오류가 발생했습니다.');
        }
    };

    const handleDecline = async (invitationId: string) => {
        if (!window.confirm('정말 거절하시겠습니까?')) return;
        try {
            await declineInvitation(invitationId);
            setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        } catch (err) {
            console.error(err);
            alert('초대 거절 중 오류가 발생했습니다.');
        }
    };

    if (isLoading || invitations.length === 0) return null;

    return (
        <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
            <h3 className="neo-heading-sm mb-4 flex items-center gap-2">
                <Mail className="w-6 h-6" />
                도착한 초대장 ({invitations.length})
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
                {invitations.map((invitation) => (
                    <div key={invitation.id} className="neo-card bg-yellow-50 border-2 border-black relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-yellow-400 text-xs font-bold px-2 py-1 border-l-2 border-b-2 border-black">
                            NEW
                        </div>

                        <h4 className="font-black text-xl mb-2">{invitation.projectName}</h4>

                        <div className="space-y-2 mb-4 text-sm">
                            <p className="flex items-center gap-2">
                                <span className="font-bold bg-white border border-black px-1">보낸 사람</span>
                                {invitation.invitedByName}
                            </p>
                            <p className="flex items-center gap-2">
                                <span className="font-bold bg-white border border-black px-1">제안 역할</span>
                                {invitation.role === 'admin' ? '관리자' : invitation.role === 'member' ? '담임교사' : '뷰어'}
                            </p>
                            {invitation.role === 'member' && invitation.assignedClasses.length > 0 && (
                                <p className="flex items-center gap-2">
                                    <span className="font-bold bg-white border border-black px-1">배정 학급</span>
                                    {invitation.assignedClasses.join(', ')}반
                                </p>
                            )}
                            <p className="flex items-center gap-2 text-gray-500 text-xs">
                                <Calendar className="w-3 h-3" />
                                {invitation.expiresAt.toLocaleDateString()}까지 유효
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handleAccept(invitation)}
                                className="flex-1 bg-green-400 hover:bg-green-300 border-2 border-black font-bold py-2 flex items-center justify-center gap-1 transition-transform active:translate-y-1"
                            >
                                <Check className="w-4 h-4" /> 수락
                            </button>
                            <button
                                onClick={() => handleDecline(invitation.id)}
                                className="flex-1 bg-white hover:bg-gray-100 border-2 border-black font-bold py-2 flex items-center justify-center gap-1 transition-transform active:translate-y-1"
                            >
                                <X className="w-4 h-4" /> 거절
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
