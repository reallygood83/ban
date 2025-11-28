import React from 'react';
import { Check, Lock } from 'lucide-react';

interface ClassTabNavigationProps {
    classCount: number;
    activeClass: number | 'all';
    onClassChange: (classNum: number | 'all') => void;
    rosterStatus?: {
        [key: number]: {
            uploaded: boolean;
            status: 'draft' | 'confirmed';
        };
    };
    allowedClasses?: number[]; // If provided, only these classes are clickable (for members)
    showAllTab?: boolean;
}

export const ClassTabNavigation: React.FC<ClassTabNavigationProps> = ({
    classCount,
    activeClass,
    onClassChange,
    rosterStatus = {},
    allowedClasses,
    showAllTab = true,
}) => {
    const classes = Array.from({ length: classCount }, (_, i) => i + 1);

    const isClassAllowed = (classNum: number) => {
        if (!allowedClasses) return true;
        return allowedClasses.includes(classNum);
    };

    return (
        <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar">
            {showAllTab && (
                <button
                    onClick={() => onClassChange('all')}
                    className={`
            flex-shrink-0 px-6 py-3 font-bold border-2 border-black transition-all whitespace-nowrap
            ${activeClass === 'all'
                            ? 'bg-black text-white shadow-neo'
                            : 'bg-white text-black hover:bg-gray-100'}
          `}
                >
                    전체 보기
                </button>
            )}

            {classes.map((classNum) => {
                const status = rosterStatus[classNum];
                const isUploaded = status?.uploaded;
                const isConfirmed = status?.status === 'confirmed';
                const allowed = isClassAllowed(classNum);

                return (
                    <button
                        key={classNum}
                        onClick={() => allowed && onClassChange(classNum)}
                        disabled={!allowed}
                        className={`
              flex-shrink-0 px-6 py-3 font-bold border-2 border-black transition-all whitespace-nowrap flex items-center gap-2 relative
              ${activeClass === classNum
                                ? 'bg-yellow-400 shadow-neo translate-x-[-2px] translate-y-[-2px]'
                                : allowed
                                    ? 'bg-white hover:bg-yellow-50'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300'}
            `}
                    >
                        {classNum}반

                        {isUploaded && (
                            <span className={`
                flex items-center justify-center w-5 h-5 rounded-full border border-black text-xs
                ${isConfirmed ? 'bg-green-400' : 'bg-gray-200'}
              `}>
                                <Check className="w-3 h-3" />
                            </span>
                        )}

                        {!allowed && (
                            <Lock className="w-4 h-4 absolute top-1 right-1 text-gray-400" />
                        )}
                    </button>
                );
            })}
        </div>
    );
};
