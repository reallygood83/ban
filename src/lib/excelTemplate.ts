/**
 * 학생 명단 엑셀 템플릿 생성 및 다운로드 유틸리티
 */

export interface ExcelTemplateColumn {
  header: string;
  key: string;
  width: number;
  example: string;
}

// 엑셀 템플릿 컬럼 정의
export const STUDENT_TEMPLATE_COLUMNS: ExcelTemplateColumn[] = [
  {
    header: '학생 이름',
    key: 'name',
    width: 15,
    example: '김철수'
  },
  {
    header: '성별',
    key: 'gender',
    width: 10,
    example: '남 또는 여'
  },
  {
    header: '학번 (선택)',
    key: 'studentNumber',
    width: 15,
    example: '20250101'
  },
  {
    header: '특수사항 (선택)',
    key: 'specialNeeds',
    width: 20,
    example: '특수학급, 학습부진 등'
  },
  {
    header: '비고 (선택)',
    key: 'notes',
    width: 30,
    example: '기타 참고사항'
  }
];

/**
 * CSV 형식의 템플릿 생성
 */
export function generateCSVTemplate(): string {
  const headers = STUDENT_TEMPLATE_COLUMNS.map(col => col.header).join(',');
  const examples = STUDENT_TEMPLATE_COLUMNS.map(col => col.example).join(',');

  return `${headers}\n${examples}\n`;
}

/**
 * CSV 템플릿 다운로드
 */
export function downloadCSVTemplate(grade: string, classCount: number): void {
  const csvContent = generateCSVTemplate();
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `학생명단_템플릿_${grade}학년_${classCount}반.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 엑셀 스타일의 HTML 테이블 생성 (Excel에서 열기 가능)
 */
export function generateExcelHTMLTemplate(): string {
  const headers = STUDENT_TEMPLATE_COLUMNS.map(col =>
    `<th style="background-color: #4CAF50; color: white; padding: 12px; border: 1px solid #ddd; font-weight: bold;">${col.header}</th>`
  ).join('');

  const examples = STUDENT_TEMPLATE_COLUMNS.map(col =>
    `<td style="padding: 12px; border: 1px solid #ddd; color: #666;">${col.example}</td>`
  ).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>학생 명단 템플릿</title>
  <style>
    body {
      font-family: "Malgun Gothic", "맑은 고딕", sans-serif;
      padding: 20px;
    }
    h1 {
      color: #333;
      border-bottom: 3px solid #4CAF50;
      padding-bottom: 10px;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-top: 20px;
    }
    .info {
      background-color: #f0f8ff;
      border-left: 4px solid #2196F3;
      padding: 15px;
      margin: 20px 0;
    }
    .warning {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>📋 학생 명단 입력 템플릿</h1>

  <div class="info">
    <h3>✅ 작성 방법</h3>
    <ol>
      <li><strong>이 파일을 Excel에서 열어주세요</strong></li>
      <li>예시 행(회색 글씨)을 삭제하고 실제 학생 정보를 입력하세요</li>
      <li>필수 항목: 학생 이름, 성별</li>
      <li>선택 항목: 학번, 특수사항, 비고</li>
      <li>작성 완료 후 CSV 또는 XLSX 형식으로 저장하세요</li>
    </ol>
  </div>

  <div class="warning">
    <h3>🔒 개인정보 보호</h3>
    <p>
      • 입력하신 학생 이름과 학번은 <strong>자동으로 암호화</strong>되어 저장됩니다<br>
      • 시스템에서는 마스킹된 형태(예: 김*수, 2025****23)로만 표시됩니다<br>
      • 오직 담당 교사만 복호화하여 실제 이름을 확인할 수 있습니다
    </p>
  </div>

  <table>
    <thead>
      <tr>${headers}</tr>
    </thead>
    <tbody>
      <tr>${examples}</tr>
      <!-- 여기부터 학생 정보를 입력하세요 -->
    </tbody>
  </table>

  <div style="margin-top: 30px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
    <h3>📌 성별 입력 방법</h3>
    <p>
      • "남" 또는 "여"로 입력<br>
      • 영어로 "male" 또는 "female"도 가능
    </p>
  </div>
</body>
</html>
  `;
}

/**
 * Excel HTML 템플릿 다운로드
 */
export function downloadExcelHTMLTemplate(grade: string, classCount: number): void {
  const htmlContent = generateExcelHTMLTemplate();
  const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `학생명단_템플릿_${grade}학년_${classCount}반.xls`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
