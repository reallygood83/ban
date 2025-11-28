import React, { useEffect, useState } from 'react';
import { MoreVertical, Shield, Users, Eye, Trash2, UserCog } from 'lucide-react';
import { ProjectMember, ProjectRole } from '../../types';
import { getProjectMembers, removeProjectMember, updateMemberRole, subscribeToProjectMembers } from '../../services/collaborationService';
import { useAuth } from '../../contexts/AuthContext';

interface MemberListPanelProps {
    projectId: string;
    currentUserRole: ProjectRole;
}

export const MemberListPanel: React.FC<MemberListPanelProps> = ({
    projectId,
    currentUserRole,
}) => {
    const { currentUser } = useAuth();
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

    const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

    useEffect(() => {
        const unsubscribe = subscribeToProjectMembers(projectId, (data) => {
            setMembers(data);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [projectId]);

    const handleRoleChange = async (memberId: string, newRole: ProjectRole) => {
        try {
            await updateMemberRole(projectId, memberId, newRole);
            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
            setEditingMemberId(null);
        } catch (err) {
            console.error(err);
            alert('역할 변경에 실패했습니다.');
        }
    };

    const handleRemoveMember = async (memberId: string, userId: string, memberName: string) => {
        if (!window.confirm(`${memberName}님을 프로젝트에서 내보내시겠습니까?`)) return;

        try {
            await removeProjectMember(projectId, memberId, userId);
            setMembers(prev => prev.filter(m => m.id !== memberId));
        } catch (err) {
            console.error(err);
            alert('멤버 제거에 실패했습니다.');
        }
    };

    const getRoleBadge = (role: ProjectRole) => {
        switch (role) {
            case 'owner':
                return <span className="bg-purple-100 text-purple-800 border border-black px-2 py-0.5 text-xs font-bold flex items-center gap-1"><Shield className="w-3 h-3" /> 소유자</span>;
            case 'admin':
                return <span className="bg-yellow-100 text-yellow-800 border border-black px-2 py-0.5 text-xs font-bold flex items-center gap-1"><Shield className="w-3 h-3" /> 관리자</span>;
            case 'member':
                return <span className="bg-blue-100 text-blue-800 border border-black px-2 py-0.5 text-xs font-bold flex items-center gap-1"><Users className="w-3 h-3" /> 담임교사</span>;
            case 'viewer':
                return <span className="bg-gray-100 text-gray-800 border border-black px-2 py-0.5 text-xs font-bold flex items-center gap-1"><Eye className="w-3 h-3" /> 뷰어</span>;
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center">멤버 목록을 불러오는 중...</div>;
    }

    if (error) {
        return <div className="p-4 bg-red-100 border-2 border-black text-red-800 font-bold">{error}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="neo-heading-sm">참여 멤버 ({members.length})</h3>
            </div>

            <div className="grid gap-4">
                {members.map((member) => (
                    <div key={member.id} className="neo-card p-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-black overflow-hidden flex-shrink-0">
                                {member.photoURL ? (
                                    <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold text-xl text-gray-400">
                                        {member.displayName.charAt(0)}
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-lg">{member.displayName}</span>
                                    {getRoleBadge(member.role)}
                                </div>
                                <div className="text-sm text-gray-500">{member.email}</div>
                                {member.role === 'member' && member.assignedClasses.length > 0 && (
                                    <div className="mt-2 flex gap-1 flex-wrap">
                                        {member.assignedClasses.map(cls => (
                                            <span key={cls} className="bg-gray-100 border border-black px-1.5 py-0.5 text-xs font-bold">
                                                {cls}반
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {canManageMembers && member.role !== 'owner' && currentUser?.uid !== member.userId && (
                            <div className="relative">
                                <button
                                    onClick={() => setEditingMemberId(editingMemberId === member.id ? null : member.id)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <MoreVertical className="w-5 h-5" />
                                </button>

                                {editingMemberId === member.id && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-black shadow-neo z-10 animate-in fade-in zoom-in duration-100">
                                        <div className="p-1">
                                            <p className="px-3 py-2 text-xs font-bold text-gray-500 border-b border-gray-200 mb-1">역할 변경</p>
                                            <button
                                                onClick={() => handleRoleChange(member.id, 'admin')}
                                                className={`w-full text-left px-3 py-2 text-sm font-bold hover:bg-yellow-100 flex items-center gap-2 ${member.role === 'admin' ? 'bg-yellow-50' : ''}`}
                                            >
                                                <Shield className="w-4 h-4" /> 관리자
                                            </button>
                                            <button
                                                onClick={() => handleRoleChange(member.id, 'member')}
                                                className={`w-full text-left px-3 py-2 text-sm font-bold hover:bg-blue-100 flex items-center gap-2 ${member.role === 'member' ? 'bg-blue-50' : ''}`}
                                            >
                                                <Users className="w-4 h-4" /> 담임교사
                                            </button>
                                            <button
                                                onClick={() => handleRoleChange(member.id, 'viewer')}
                                                className={`w-full text-left px-3 py-2 text-sm font-bold hover:bg-gray-100 flex items-center gap-2 ${member.role === 'viewer' ? 'bg-gray-50' : ''}`}
                                            >
                                                <Eye className="w-4 h-4" /> 뷰어
                                            </button>

                                            <div className="border-t border-gray-200 my-1"></div>

                                            <button
                                                onClick={() => handleRemoveMember(member.id, member.userId, member.displayName)}
                                                className="w-full text-left px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" /> 내보내기
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
