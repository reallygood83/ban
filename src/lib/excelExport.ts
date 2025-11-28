import { ClassAssignment } from '../types';

/**
 * 반 배정 결과를 Excel HTML 형식으로 내보내기
 */
export function exportToExcelHTML(
  assignments: ClassAssignment[],
  projectName: string,
  grade: string,
  balanceScore: number
): void {
  const date = new Date().toLocaleDateString('ko-KR');

  // HTML 테이블 생성
  let htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} - 반 배정 결과</title>
  <style>
    body {
      font-family: 'Malgun Gothic', sans-serif;
      margin: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #333;
      padding-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      color: #333;
      font-size: 28px;
    }
    .header .subtitle {
      color: #666;
      margin-top: 10px;
      font-size: 14px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      border: 2px solid #dee2e6;
    }
    .stat-card .label {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }
    .stat-card .value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    .class-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .class-card {
      border: 2px solid #333;
      border-radius: 8px;
      overflow: hidden;
    }
    .class-header {
      background: #333;
      color: white;
      padding: 12px;
      text-align: center;
      font-weight: bold;
      font-size: 18px;
    }
    .class-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      background: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }
    .class-stat {
      padding: 10px;
      text-align: center;
      border-right: 1px solid #dee2e6;
    }
    .class-stat:last-child {
      border-right: none;
    }
    .class-stat .num {
      font-size: 20px;
      font-weight: bold;
      color: #007bff;
    }
    .class-stat .label {
      font-size: 11px;
      color: #666;
    }
    .student-list {
      padding: 15px;
      max-height: 400px;
      overflow-y: auto;
    }
    .student-item {
      display: flex;
      justify-content: space-between;
      padding: 8px;
      border-bottom: 1px solid #f0f0f0;
    }
    .student-item:last-child {
      border-bottom: none;
    }
    .student-name {
      font-weight: 500;
    }
    .student-info {
      font-size: 12px;
      color: #666;
    }
    .footer {
      text-align: center;
      color: #666;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #dee2e6;
      font-size: 12px;
    }
    @media print {
      body {
        background: white;
      }
      .container {
        box-shadow: none;
      }
      .student-list {
        max-height: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 ${projectName}</h1>
      <div class="subtitle">
        ${grade}학년 ${assignments.length}개 반 편성 결과 | 생성일: ${date}
      </div>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="label">총 학생 수</div>
        <div class="value">${assignments.reduce((sum, c) => sum + c.students.length, 0)}명</div>
      </div>
      <div class="stat-card">
        <div class="label">반당 평균</div>
        <div class="value">${(assignments.reduce((sum, c) => sum + c.students.length, 0) / assignments.length).toFixed(1)}명</div>
      </div>
      <div class="stat-card">
        <div class="label">균형도 점수</div>
        <div class="value" style="color: ${balanceScore >= 80 ? '#28a745' : balanceScore >= 60 ? '#ffc107' : '#dc3545'}">${balanceScore}점</div>
      </div>
      <div class="stat-card">
        <div class="label">성별 비율</div>
        <div class="value" style="font-size: 16px;">
          남 ${assignments.reduce((sum, c) => sum + c.maleCount, 0)} :
          여 ${assignments.reduce((sum, c) => sum + c.femaleCount, 0)}
        </div>
      </div>
    </div>

    <div class="class-grid">
`;

  // 각 반별 정보 추가
  assignments.forEach(classData => {
    htmlContent += `
      <div class="class-card">
        <div class="class-header">${classData.classNumber}반</div>
        <div class="class-stats">
          <div class="class-stat">
            <div class="num">${classData.students.length}</div>
            <div class="label">전체</div>
          </div>
          <div class="class-stat">
            <div class="num" style="color: #28a745;">${classData.maleCount}</div>
            <div class="label">남학생</div>
          </div>
          <div class="class-stat">
            <div class="num" style="color: #e83e8c;">${classData.femaleCount}</div>
            <div class="label">여학생</div>
          </div>
        </div>
        <div class="student-list">
`;

    classData.students.forEach((student, idx) => {
      htmlContent += `
          <div class="student-item">
            <span class="student-name">${idx + 1}. ${student.displayName}</span>
            <span class="student-info">
              ${student.gender === 'male' ? '남' : '여'}
              ${student.specialNeeds ? ' ⭐' : ''}
            </span>
          </div>
`;
    });

    htmlContent += `
        </div>
      </div>
`;
  });

  htmlContent += `
    </div>

    <div class="footer">
      <p><strong>GoodBye!</strong> - AI 기반 반 배정 시스템</p>
      <p>이 문서는 자동으로 생성되었습니다.</p>
    </div>
  </div>
</body>
</html>
`;

  // Blob 생성 및 다운로드
  const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}_반배정결과_${date.replace(/\./g, '-')}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * CSV 형식으로 내보내기
 */
export function exportToCSV(
  assignments: ClassAssignment[],
  projectName: string
): void {
  const date = new Date().toLocaleDateString('ko-KR');

  let csvContent = '\uFEFF'; // UTF-8 BOM
  csvContent += `"${projectName} - 반 배정 결과"\n`;
  csvContent += `"생성일: ${date}"\n\n`;

  assignments.forEach(classData => {
    csvContent += `"${classData.classNumber}반","전체 ${classData.students.length}명","남 ${classData.maleCount}명","여 ${classData.femaleCount}명"\n`;
    csvContent += `"번호","이름","성별","특수사항"\n`;

    classData.students.forEach((student, idx) => {
      csvContent += `"${idx + 1}","${student.displayName}","${student.gender === 'male' ? '남' : '여'}","${student.specialNeeds || ''}"\n`;
    });

    csvContent += '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}_반배정결과_${date.replace(/\./g, '-')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
