import React from 'react';
import { Users, Shield, Eye } from 'lucide-react';
import { ProjectRole } from '../../types';

interface CollaborationStatusProps {
    isCollaborative: boolean;
    memberCount: number;
    myRole?: ProjectRole;
    className?: string;
}

export const CollaborationStatus: React.FC<CollaborationStatusProps> = ({
    isCollaborative,
    memberCount,
    myRole,
    className = '',
}) => {
    if (!isCollaborative) return null;

    const getRoleIcon = () => {
        switch (myRole) {
            case 'owner':
            case 'admin':
                return <Shield className="w-3 h-3" />;
            case 'member':
                return <Users className="w-3 h-3" />;
            case 'viewer':
                return <Eye className="w-3 h-3" />;
            default:
                return null;
        }
    };

    const getRoleLabel = () => {
        switch (myRole) {
            case 'owner': return '소유자';
            case 'admin': return '관리자';
            case 'member': return '담임교사';
            case 'viewer': return '뷰어';
            default: return '';
        }
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="bg-blue-100 border border-black px-2 py-1 text-xs font-bold flex items-center gap-1 rounded-full">
                <Users className="w-3 h-3" />
                협업 중 ({memberCount}명)
            </div>

            {myRole && (
                <div className="bg-yellow-100 border border-black px-2 py-1 text-xs font-bold flex items-center gap-1 rounded-full">
                    {getRoleIcon()}
                    {getRoleLabel()}
                </div>
            )}
        </div>
    );
};
