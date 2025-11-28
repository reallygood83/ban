import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Check, AlertCircle, X, Save, Trash2, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { saveClassRoster } from '../../services/collaborationService';
import { encryptStudentDataBatch } from '../../services/studentService';
import { StudentUploadData } from '../../types';

// 특수 태그 옵션 정의
const SPECIAL_TAG_OPTIONS = [
    { value: 'special_class', label: '특수학급', color: 'bg-purple-100 text-purple-800' },
    { value: 'multicultural', label: '다문화', color: 'bg-green-100 text-green-800' },
    { value: 'basic_learning', label: '기초학력', color: 'bg-orange-100 text-orange-800' },
    { value: 'gifted', label: '영재', color: 'bg-blue-100 text-blue-800' },
    { value: 'health_issue', label: '건강유의', color: 'bg-red-100 text-red-800' },
    { value: 'twins', label: '쌍생아', color: 'bg-pink-100 text-pink-800' },
    { value: 'transfer', label: '전학', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'other', label: '기타', color: 'bg-gray-100 text-gray-800' },
];

interface ClassRosterUploaderProps {
    projectId: string;
    classNumber: number;
    onUploadSuccess?: () => void;
    currentRosterCount?: number;
}

export const ClassRosterUploader: React.FC<ClassRosterUploaderProps> = ({
    projectId,
    classNumber,
    onUploadSuccess,
    currentRosterCount = 0,
}) => {
    const { currentUser } = useAuth();
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<StudentUploadData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = async (file: File) => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!['xlsx', 'xls', 'csv'].includes(extension || '')) {
            setError('엑셀 파일(.xlsx, .xls) 또는 CSV 파일(.csv)만 업로드 가능합니다.');
            return;
        }

        setFile(file);
        setError(null);
        setUploadSuccess(false);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                let jsonData: any[];

                if (extension === 'csv') {
                    // CSV 파일 처리
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    jsonData = XLSX.utils.sheet_to_json(sheet);
                } else {
                    // Excel 파일 처리
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    jsonData = XLSX.utils.sheet_to_json(sheet);
                }

                // 🔍 디버그: Excel 파일의 컬럼명 확인
                if (jsonData.length > 0) {
                    const excelColumns = Object.keys(jsonData[0]);
                    console.log('[ClassRosterUploader] Excel 컬럼명:', excelColumns);
                    console.log('[ClassRosterUploader] 첫 번째 행 원본 데이터:', jsonData[0]);
                }

                const parsedData: StudentUploadData[] = jsonData.map((row: any, idx: number) => {
                    // 다양한 컬럼명 지원 (공백 포함, trim 적용)
                    const rowKeys = Object.keys(row);

                    // 컬럼명에서 공백 제거 후 매칭을 위한 헬퍼 함수
                    const findColumn = (variants: string[]): string | undefined => {
                        for (const variant of variants) {
                            // 정확히 일치하는 키 찾기
                            const exactMatch = rowKeys.find(key => key === variant);
                            if (exactMatch && row[exactMatch] !== undefined && row[exactMatch] !== '') {
                                return row[exactMatch];
                            }
                            // 공백 제거 후 일치하는 키 찾기
                            const trimmedMatch = rowKeys.find(key => key.trim() === variant.trim());
                            if (trimmedMatch && row[trimmedMatch] !== undefined && row[trimmedMatch] !== '') {
                                return row[trimmedMatch];
                            }
                        }
                        return undefined;
                    };

                    const name = findColumn(['이름', '성명', 'Name', 'name', '학생명']);
                    const rawGender = findColumn(['성별', 'Gender', 'gender']);
                    const studentNumber = findColumn(['학번', '번호', 'Student Number', 'student_number', 'No', '출석번호']);
                    const specialNeeds = findColumn(['특이사항', 'Special Needs', 'special_needs', '특수사항', '비고']);
                    const notes = findColumn(['비고', 'Notes', 'notes', '특기사항', '메모']);

                    // 성별 정규화: 다양한 형식 지원
                    const normalizeGender = (g: string | undefined): 'male' | 'female' | undefined => {
                        if (!g) return undefined;
                        const lower = g.toLowerCase().trim();
                        if (['남', '남자', 'male', 'm', '남성'].includes(lower)) return 'male';
                        if (['여', '여자', 'female', 'f', '여성'].includes(lower)) return 'female';
                        return undefined;
                    };
                    const gender = normalizeGender(rawGender);

                    // 🔍 디버그: 첫 5개 학생의 파싱 결과 확인
                    if (idx < 5) {
                        console.log(`[ClassRosterUploader] 학생 ${idx + 1} 파싱:`, {
                            rawRow: row,
                            parsed: { name, rawGender, gender, studentNumber, specialNeeds, notes }
                        });
                    }

                    return {
                        name: name || '',
                        gender,
                        studentNumber,
                        specialNeeds,
                        notes,
                    };
                }).filter(item => item.name); // 이름만 있으면 일단 포함

                if (parsedData.length === 0) {
                    setError('유효한 데이터가 없습니다. 파일에 "이름" 또는 "성명" 컬럼이 있는지 확인해주세요.');
                    setFile(null);
                } else {
                    // 성별이 없는 학생들 확인
                    const noGenderCount = parsedData.filter(s => !s.gender).length;
                    if (noGenderCount > 0) {
                        setError(`${noGenderCount}명의 학생에게 성별 정보가 없습니다. 성별 컬럼을 추가하거나 수동으로 입력해주세요.`);
                    }
                    setPreviewData(parsedData);
                }
            } catch (err) {
                console.error(err);
                setError('파일을 읽는 중 오류가 발생했습니다.');
                setFile(null);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleUpload = async () => {
        if (!currentUser || !file || previewData.length === 0) return;

        setIsUploading(true);
        setError(null);

        try {
            // 성별이 없는 학생들은 기본값 설정, specialNeeds, specialTags, customTag 모두 명시적 포함
            const dataToUpload = previewData.map(student => ({
                ...student,
                gender: student.gender || 'male', // 기본값 (나중에 수정 가능)
                specialNeeds: student.specialNeeds || undefined, // 엑셀에서 파싱된 특이사항 (필수!)
                specialTags: student.specialTags || [], // UI에서 선택한 특수태그
                customTag: student.customTag || undefined // 기타 태그 (사용자 직접 입력)
            }));

            // 디버그 로그: 업로드 전 데이터 확인 (specialNeeds 포함!)
            console.log('[ClassRosterUploader] 업로드할 데이터:', dataToUpload.map(s => ({
                name: s.name,
                specialNeeds: s.specialNeeds,  // 엑셀에서 파싱된 특이사항
                specialTags: s.specialTags,
                customTag: s.customTag
            })));

            // 1. 데이터 암호화
            const encryptedStudents = await encryptStudentDataBatch(dataToUpload, currentUser.uid);

            // 2. 서버에 저장
            const result = await saveClassRoster(
                projectId,
                classNumber,
                encryptedStudents,
                currentUser.uid,
                currentUser.displayName || 'Unknown User'
            );

            if (result.success) {
                setUploadSuccess(true);
                setFile(null);
                setPreviewData([]);
                if (onUploadSuccess) onUploadSuccess();
            } else {
                setError(result.message || '업로드에 실패했습니다.');
            }
        } catch (err) {
            console.error(err);
            setError('업로드 중 오류가 발생했습니다.');
        } finally {
            setIsUploading(false);
        }
    };

    const clearFile = () => {
        setFile(null);
        setPreviewData([]);
        setError(null);
        setUploadSuccess(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="neo-card w-full max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="neo-heading-sm flex items-center gap-2">
                    <FileSpreadsheet className="w-8 h-8" />
                    {classNumber}반 명단 업로드
                </h2>
                {currentRosterCount > 0 && (
                    <span className="bg-green-100 border-2 border-black px-3 py-1 font-bold text-sm">
                        현재 등록된 학생: {currentRosterCount}명
                    </span>
                )}
            </div>

            {!file && !uploadSuccess ? (
                <div
                    className={`
            border-4 border-dashed border-black p-12 text-center transition-all cursor-pointer
            ${isDragging ? 'bg-yellow-100 scale-[1.02]' : 'bg-gray-50 hover:bg-gray-100'}
          `}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileSelect}
                    />
                    <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-xl font-bold mb-2">파일을 이곳에 드래그하거나 클릭하세요</p>
                    <p className="text-gray-500">지원 형식: .xlsx, .xls, .csv</p>
                    <div className="mt-6 text-sm text-gray-500 bg-white border border-black p-4 inline-block text-left">
                        <p className="font-bold mb-1">📝 필수 컬럼:</p>
                        <ul className="list-disc list-inside">
                            <li>이름 (Name) 또는 성명</li>
                        </ul>
                        <p className="mt-2 font-bold mb-1">ℹ️ 선택 컬럼:</p>
                        <ul className="list-disc list-inside">
                            <li>성별 (Gender) - 없으면 기본값으로 설정됨</li>
                            <li>학번, 번호, 특이사항, 비고</li>
                        </ul>
                        <p className="mt-2 text-xs text-yellow-700 bg-yellow-50 p-2 border border-yellow-300">
                            💡 나이스 명렬표를 그대로 업로드하세요!<br />
                            성별은 나중에 수정할 수 있습니다.
                        </p>
                    </div>
                </div>
            ) : uploadSuccess ? (
                <div className="text-center py-12 bg-green-50 border-2 border-black">
                    <Check className="w-16 h-16 mx-auto mb-4 text-green-600" />
                    <h3 className="text-2xl font-bold mb-2">업로드 완료!</h3>
                    <p className="mb-6">{classNumber}반 명단이 성공적으로 저장되었습니다.</p>
                    <button
                        onClick={() => setUploadSuccess(false)}
                        className="neo-btn neo-btn-secondary"
                    >
                        다른 파일 업로드하기
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center justify-between bg-blue-50 p-4 border-2 border-black">
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                            <div>
                                <p className="font-bold text-lg">{file?.name}</p>
                                <p className="text-sm text-gray-600">
                                    {previewData.length}명의 학생 데이터가 감지되었습니다.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={clearFile}
                            className="p-2 hover:bg-red-100 border-2 border-transparent hover:border-black transition-all"
                            title="취소"
                        >
                            <X className="w-6 h-6 text-red-500" />
                        </button>
                    </div>

                    {/* 성별 일괄 선택 버튼 */}
                    <div className="bg-blue-50 border-2 border-black p-4 mb-4">
                        <div className="flex items-center gap-4 flex-wrap">
                            <span className="font-bold flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                성별 일괄 선택:
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setPreviewData(prev => prev.map(s => ({ ...s, gender: 'male' })));
                                }}
                                className="neo-btn bg-blue-200 hover:bg-blue-300 text-sm py-2 px-4"
                            >
                                👦 전체 남자
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setPreviewData(prev => prev.map(s => ({ ...s, gender: 'female' })));
                                }}
                                className="neo-btn bg-pink-200 hover:bg-pink-300 text-sm py-2 px-4"
                            >
                                👧 전체 여자
                            </button>
                            <span className="text-sm text-gray-600">
                                또는 아래 표에서 개별 수정
                            </span>
                        </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto border-2 border-black">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 border-b-2 border-black font-bold">이름</th>
                                    <th className="p-3 border-b-2 border-black font-bold">성별</th>
                                    <th className="p-3 border-b-2 border-black font-bold">학번</th>
                                    <th className="p-3 border-b-2 border-black font-bold min-w-[300px]">특수태그</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.map((student, idx) => (
                                    <tr key={idx} className="border-b border-gray-200 hover:bg-yellow-50">
                                        <td className="p-3 font-medium">{student.name}</td>
                                        <td className="p-3">
                                            <select
                                                value={student.gender || ''}
                                                onChange={(e) => {
                                                    const newData = [...previewData];
                                                    newData[idx] = { ...newData[idx], gender: e.target.value as 'male' | 'female' };
                                                    setPreviewData(newData);
                                                }}
                                                className={`px-2 py-1 text-sm font-bold border-2 border-black cursor-pointer ${
                                                    student.gender === 'male' ? 'bg-blue-100' :
                                                    student.gender === 'female' ? 'bg-pink-100' : 'bg-yellow-100'
                                                }`}
                                            >
                                                <option value="">선택</option>
                                                <option value="male">👦 남</option>
                                                <option value="female">👧 여</option>
                                            </select>
                                        </td>
                                        <td className="p-3 text-gray-600">{student.studentNumber || '-'}</td>
                                        <td className="p-3">
                                            <div className="flex flex-wrap gap-1 items-center">
                                                {SPECIAL_TAG_OPTIONS.map((tag) => {
                                                    const isSelected = student.specialTags?.includes(tag.value);
                                                    return (
                                                        <label
                                                            key={tag.value}
                                                            className={`
                                                                inline-flex items-center gap-1 px-2 py-1 text-xs font-bold
                                                                border-2 border-black cursor-pointer transition-all
                                                                ${isSelected ? tag.color + ' shadow-neo-sm' : 'bg-gray-50 hover:bg-gray-100'}
                                                            `}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected || false}
                                                                onChange={(e) => {
                                                                    const newData = [...previewData];
                                                                    const currentTags = newData[idx].specialTags || [];
                                                                    if (e.target.checked) {
                                                                        newData[idx] = {
                                                                            ...newData[idx],
                                                                            specialTags: [...currentTags, tag.value]
                                                                        };
                                                                    } else {
                                                                        newData[idx] = {
                                                                            ...newData[idx],
                                                                            specialTags: currentTags.filter(t => t !== tag.value),
                                                                            // '기타' 해제 시 customTag도 초기화
                                                                            ...(tag.value === 'other' ? { customTag: undefined } : {})
                                                                        };
                                                                    }
                                                                    setPreviewData(newData);
                                                                }}
                                                                className="w-3 h-3"
                                                            />
                                                            {tag.label}
                                                        </label>
                                                    );
                                                })}
                                                {/* 기타 선택 시 텍스트 입력 필드 표시 */}
                                                {student.specialTags?.includes('other') && (
                                                    <input
                                                        type="text"
                                                        value={student.customTag || ''}
                                                        onChange={(e) => {
                                                            const newData = [...previewData];
                                                            newData[idx] = {
                                                                ...newData[idx],
                                                                customTag: e.target.value
                                                            };
                                                            setPreviewData(newData);
                                                        }}
                                                        placeholder="직접 입력"
                                                        className="px-2 py-1 text-xs border-2 border-black w-24 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                                    />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={clearFile}
                            className="neo-btn neo-btn-secondary flex items-center gap-2"
                            disabled={isUploading}
                        >
                            <Trash2 className="w-4 h-4" />
                            취소
                        </button>
                        <button
                            onClick={handleUpload}
                            className="neo-btn neo-btn-primary flex items-center gap-2"
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                                    업로드 중...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    저장하기
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-4 p-4 bg-red-100 border-2 border-black flex items-start gap-3 text-red-800">
                    <AlertCircle className="w-6 h-6 flex-shrink-0" />
                    <p className="font-bold">{error}</p>
                </div>
            )}
        </div>
    );
};
