import React, { useState, useRef } from 'react';
import { Student, AssignmentResult, AssignmentSettings, CLASS_NAMES } from '../types';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  students: Student[];
  results: AssignmentResult[];
  settings: AssignmentSettings;
  onBack: () => void;
}

export const ResultsPhase: React.FC<Props> = ({ students, results, settings, onBack }) => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(3);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const getStudent = (id: string) => students.find(s => s.id === id)!;

  // Use the global XLSX variable from the CDN
  const XLSX = (window as any).XLSX;
  const html2canvas = (window as any).html2canvas;
  const jsPDF = (window as any).jspdf?.jsPDF;

  const handleDownload = (mode: 'by_new_class' | 'by_old_class') => {
    if (!XLSX) {
        alert("Excel export library not loaded. Please refresh the page.");
        return;
    }

    const wb = XLSX.utils.book_new();
    const step = activeStep;

    if (mode === 'by_new_class') {
        // Mode 1: Tabs are New Classes (Ga, Na, Da...)
        // Content: Students assigned to this class
        const assignedClasses: Record<number, AssignmentResult[]> = {};
        
        // Group data
        results.forEach(r => {
            const cIdx = step === 1 ? r.step1ClassIndex : step === 2 ? r.step2ClassIndex : r.step3ClassIndex;
            if (!assignedClasses[cIdx]) assignedClasses[cIdx] = [];
            assignedClasses[cIdx].push(r);
        });

        // Create sheets
        for(let i=0; i<settings.targetClassCount; i++) {
            const list = assignedClasses[i] || [];
            // Sort: Gender (Male first), then Name - or just Name? "Number(Any gender Name sort)"
            // The requirement says: "display assigned number (alphabetical order)"
            const sortedList = list.map(r => {
                const s = getStudent(r.studentId);
                const log = step === 3 ? [...r.log, ...(r.highlightStep3 ? ['인원조정'] : [])] : (step === 2 ? r.log : []);
                return {
                    'raw_name': s.name, // For sorting
                    '이름': s.name,
                    '성별': s.gender,
                    '기존반': `${s.currentClass}반`,
                    '비고': s.noteType + (s.noteDetail ? `(${s.noteDetail})` : ''),
                    '이동사유': log.join(' | ')
                };
            }).sort((a,b) => a['raw_name'].localeCompare(b['raw_name'])); // Sort by name to generate correct "Assigned Number"

            // Add auto-increment number for the new class
            // This '번호' becomes the "Assigned Number"
            const dataWithIndex = sortedList.map((item, idx) => {
                const { raw_name, ...rest } = item;
                return { '번호': idx + 1, ...rest };
            });

            const ws = XLSX.utils.json_to_sheet(dataWithIndex);
            XLSX.utils.book_append_sheet(wb, ws, `${CLASS_NAMES[i]}반`);
        }

        XLSX.writeFile(wb, `배정결과_${step}단계_학급별.xlsx`);

    } else {
        // Mode 2: Tabs are Old Classes (1 Class, 2 Class...)
        // Content: Where did they go?
        const currentClasses = Array.from<number>(new Set(students.map(s => s.currentClass))).sort((a,b) => a-b);
        
        currentClasses.forEach(cNum => {
            const classStudents = students.filter(s => s.currentClass === cNum).sort((a,b) => a.number - b.number);
            
            const data = classStudents.map(s => {
                const r = results.find(res => res.studentId === s.id)!;
                const cIdx = step === 1 ? r.step1ClassIndex : step === 2 ? r.step2ClassIndex : r.step3ClassIndex;
                const log = step === 3 ? [...r.log, ...(r.highlightStep3 ? ['인원조정'] : [])] : (step === 2 ? r.log : []);
                
                return {
                    '번호': s.number,
                    '이름': s.name,
                    '성별': s.gender,
                    '배정반': `${CLASS_NAMES[cIdx]}반`,
                    '비고': s.noteType + (s.noteDetail ? `(${s.noteDetail})` : ''),
                    '이동사유': log.join(' | ')
                };
            });

            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, `${cNum}반`);
        });

        XLSX.writeFile(wb, `배정결과_${step}단계_기존반별.xlsx`);
    }
  };

  const handlePdfDownload = async () => {
    if (!html2canvas || !jsPDF) {
        alert("PDF Generation libraries not loaded. Please refresh.");
        return;
    }
    
    if (!tableContainerRef.current) return;

    try {
        const canvas = await html2canvas(tableContainerRef.current, {
            scale: 2, // Higher resolution
            useCORS: true,
            logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        // Calculate aspect ratio to fit width
        const ratio = pdfWidth / imgWidth;
        const finalHeight = imgHeight * ratio;

        // If height is too big, we might need multi-page, but for simplicity we fit or let it overflow (or create long pdf)
        // Let's just fit to width. If it's too long, it will be small or cutoff. 
        // Better UX: Split logic is complex. For this single view, fitting width is standard.
        // If finalHeight > pdfHeight, add new pages.
        
        let heightLeft = finalHeight;
        let position = 0;
        let pageHeight = pdfHeight;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, finalHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - finalHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, finalHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`배정결과_${activeStep}단계_전체.pdf`);
    } catch (err) {
        console.error(err);
        alert("PDF 생성 중 오류가 발생했습니다.");
    }
  };

  // Prepare display data
  const renderTable = (step: 1 | 2 | 3) => {
     // Group results by class
     const groups = Array.from({length: settings.targetClassCount}, (_, i) => ({
         index: i,
         name: CLASS_NAMES[i],
         students: results.filter(r => {
             const idx = step === 1 ? r.step1ClassIndex : step === 2 ? r.step2ClassIndex : r.step3ClassIndex;
             return idx === i;
         }).map(r => ({ res: r, data: getStudent(r.studentId) }))
           .sort((a,b) => a.data.name.localeCompare(b.data.name)) // Sort by name
     }));

     return (
        <div ref={tableContainerRef} className="p-2 bg-white">
            <h3 className="text-center font-bold text-lg mb-4 print:block hidden">
                {activeStep}단계 배정 결과 ({settings.targetClassCount}학급)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groups.map(group => (
                    <div key={group.index} className="border rounded-lg shadow-sm bg-white overflow-hidden break-inside-avoid">
                        <div className="bg-gray-100 px-4 py-2 border-b font-bold flex justify-between">
                            <span>{group.name}반</span>
                            <span className="text-gray-500 text-sm">
                                {group.students.length}명 (남{group.students.filter(s => s.data.gender === '남').length}/여{group.students.filter(s => s.data.gender === '여').length})
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-2 py-1 text-left">번호</th>
                                        <th className="px-2 py-1 text-left">이름</th>
                                        <th className="px-2 py-1 text-left">성별</th>
                                        <th className="px-2 py-1 text-left">원반</th>
                                        <th className="px-2 py-1 text-left">비고</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {group.students.map((item, idx) => {
                                        const { res, data } = item;
                                        let bgClass = "";
                                        if (step === 2 && res.highlightStep2) bgClass = "bg-yellow-100";
                                        if (step === 3 && res.highlightStep3) bgClass = "bg-blue-100";
                                        else if (step === 3 && res.highlightStep2 && res.step2ClassIndex === res.step3ClassIndex) bgClass = "bg-yellow-50"; 

                                        return (
                                            <tr key={data.id} className={bgClass}>
                                                <td className="px-2 py-1">{idx + 1}</td>
                                                <td className="px-2 py-1 font-medium">{data.name}</td>
                                                <td className="px-2 py-1">{data.gender}</td>
                                                <td className="px-2 py-1">{data.currentClass}</td>
                                                <td className="px-2 py-1 truncate max-w-[80px]" title={data.noteType}>{data.noteType}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
     );
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <h2 className="text-xl font-semibold text-gray-800">배정 결과</h2>
         <div className="flex flex-wrap gap-2">
            <button onClick={onBack} className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">설정 수정</button>
            
            <button onClick={handlePdfDownload} className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm shadow-sm">
                <FileText className="w-4 h-4"/> PDF 저장
            </button>

            <button onClick={() => handleDownload('by_new_class')} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm shadow-sm">
                <FileSpreadsheet className="w-4 h-4"/> 배정 학급 기준 저장
            </button>
            
            <button onClick={() => handleDownload('by_old_class')} className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm shadow-sm">
                <Download className="w-4 h-4"/> 기존 학급 기준 저장
            </button>
         </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {[1, 2, 3].map((step) => (
            <button
              key={step}
              onClick={() => setActiveStep(step as 1|2|3)}
              className={clsx(
                activeStep === step
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
              )}
            >
              {step}단계: {step === 1 ? '기본배정' : step === 2 ? '규칙적용' : '인원균형'}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="flex gap-4 text-xs text-gray-600 mb-2">
          {activeStep === 2 && <div className="flex items-center"><span className="w-3 h-3 bg-yellow-100 border mr-1"></span> 규칙 적용으로 이동됨</div>}
          {activeStep === 3 && <div className="flex items-center"><span className="w-3 h-3 bg-blue-100 border mr-1"></span> 인원 균형 조정으로 이동됨</div>}
      </div>

      {renderTable(activeStep)}
      
      {/* Summary Statistics */}
      <div className="bg-gray-50 p-4 rounded border mt-6">
          <h3 className="font-bold text-gray-700 mb-2">배정 통계</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
             <div>총 학생수: {students.length}명</div>
             <div>학급당 평균: {(students.length / settings.targetClassCount).toFixed(1)}명</div>
             <div>특수감축설정: {settings.specialNeedsReduction}명</div>
             <div>배정방식: {settings.method}</div>
          </div>
      </div>
    </div>
  );
};