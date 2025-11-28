import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Check, AlertCircle, X, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { saveClassRoster } from '../../services/collaborationService';
import { encryptStudentDataBatch } from '../../services/studentService';
import { StudentUploadData } from '../../types';

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
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            setError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
            return;
        }

        setFile(file);
        setError(null);
        setUploadSuccess(false);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                const parsedData: StudentUploadData[] = jsonData.map((row: any) => ({
                    name: row['이름'] || row['Name'] || row['name'],
                    gender: row['성별'] || row['Gender'] || row['gender'],
                    studentNumber: row['학번'] || row['Student Number'] || row['student_number'],
                    specialNeeds: row['특이사항'] || row['Special Needs'] || row['special_needs'],
                    notes: row['비고'] || row['Notes'] || row['notes'],
                })).filter(item => item.name && item.gender);

                if (parsedData.length === 0) {
                    setError('유효한 데이터가 없습니다. 엑셀 파일의 컬럼명(이름, 성별)을 확인해주세요.');
                    setFile(null);
                } else {
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
            // 1. 데이터 암호화
            const encryptedStudents = await encryptStudentDataBatch(previewData, currentUser.uid);

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
                        accept=".xlsx, .xls"
                        onChange={handleFileSelect}
                    />
                    <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-xl font-bold mb-2">엑셀 파일을 이곳에 드래그하거나 클릭하세요</p>
                    <p className="text-gray-500">지원 형식: .xlsx, .xls</p>
                    <div className="mt-6 text-sm text-gray-500 bg-white border border-black p-4 inline-block text-left">
                        <p className="font-bold mb-1">📝 필수 컬럼:</p>
                        <ul className="list-disc list-inside">
                            <li>이름 (Name)</li>
                            <li>성별 (Gender) - 남/여 또는 male/female</li>
                        </ul>
                        <p className="mt-2 font-bold mb-1">ℹ️ 선택 컬럼:</p>
                        <ul className="list-disc list-inside">
                            <li>학번, 특이사항, 비고</li>
                        </ul>
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

                    <div className="max-h-60 overflow-y-auto border-2 border-black">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 border-b-2 border-black font-bold">이름</th>
                                    <th className="p-3 border-b-2 border-black font-bold">성별</th>
                                    <th className="p-3 border-b-2 border-black font-bold">학번</th>
                                    <th className="p-3 border-b-2 border-black font-bold">특이사항</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.map((student, idx) => (
                                    <tr key={idx} className="border-b border-gray-200 hover:bg-yellow-50">
                                        <td className="p-3">{student.name}</td>
                                        <td className="p-3">
                                            <span className={`
                        px-2 py-1 text-xs font-bold border border-black
                        ${student.gender === 'male' || student.gender === '남' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}
                      `}>
                                                {student.gender}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-600">{student.studentNumber || '-'}</td>
                                        <td className="p-3 text-gray-600 truncate max-w-[200px]">{student.specialNeeds || '-'}</td>
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
