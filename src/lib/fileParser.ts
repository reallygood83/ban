/**
 * 파일 파싱 유틸리티
 * Excel 및 CSV 파일을 파싱하여 학생 데이터로 변환
 */

import { StudentUploadData } from '../types';

/**
 * CSV 파일 파싱
 */
export async function parseCSVFile(file: File): Promise<StudentUploadData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const students = parseCSVText(text);
        resolve(students);
      } catch (error) {
        reject(new Error('CSV 파일 파싱에 실패했습니다.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽는데 실패했습니다.'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * CSV 텍스트를 학생 데이터로 변환
 */
function parseCSVText(text: string): StudentUploadData[] {
  const lines = text.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV 파일에 데이터가 없습니다.');
  }

  // 헤더 라인 제거 (첫 번째 줄)
  const dataLines = lines.slice(1);

  const students: StudentUploadData[] = [];

  dataLines.forEach((line, index) => {
    try {
      const values = parseCSVLine(line);

      // 최소 2개 컬럼 필요 (이름, 성별)
      if (values.length < 2) {
        console.warn(`라인 ${index + 2}: 데이터가 부족합니다. 건너뜁니다.`);
        return;
      }

      const [name, genderRaw, studentNumber, specialNeeds, notes] = values;

      // 이름이 비어있으면 건너뜀
      if (!name || !name.trim()) {
        console.warn(`라인 ${index + 2}: 이름이 없습니다. 건너뜁니다.`);
        return;
      }

      // 성별 정규화
      const gender = normalizeGender(genderRaw);
      if (!gender) {
        console.warn(`라인 ${index + 2}: 성별이 올바르지 않습니다. 건너뜁니다.`);
        return;
      }

      students.push({
        name: name.trim(),
        gender,
        studentNumber: studentNumber?.trim() || undefined,
        specialNeeds: specialNeeds?.trim() || undefined,
        notes: notes?.trim() || undefined
      });
    } catch (error) {
      console.error(`라인 ${index + 2} 파싱 오류:`, error);
    }
  });

  return students;
}

/**
 * CSV 라인 파싱 (쉼표로 구분, 따옴표 처리)
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map(v => v.trim().replace(/^"|"$/g, ''));
}

/**
 * 성별 정규화
 */
function normalizeGender(gender: string): 'male' | 'female' | null {
  const normalized = gender.toLowerCase().trim();

  if (normalized === '남' || normalized === 'male' || normalized === 'm') {
    return 'male';
  }

  if (normalized === '여' || normalized === 'female' || normalized === 'f') {
    return 'female';
  }

  return null;
}

/**
 * Excel HTML 파일 파싱 (HTML 테이블 구조)
 */
export async function parseExcelHTMLFile(file: File): Promise<StudentUploadData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const html = e.target?.result as string;
        const students = parseHTMLTable(html);
        resolve(students);
      } catch (error) {
        reject(new Error('Excel HTML 파일 파싱에 실패했습니다.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽는데 실패했습니다.'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * HTML 테이블에서 학생 데이터 추출
 */
function parseHTMLTable(html: string): StudentUploadData[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const rows = doc.querySelectorAll('table tbody tr');
  const students: StudentUploadData[] = [];

  rows.forEach((row, index) => {
    try {
      const cells = row.querySelectorAll('td');

      if (cells.length < 2) {
        return;
      }

      const name = cells[0]?.textContent?.trim() || '';
      const genderRaw = cells[1]?.textContent?.trim() || '';
      const studentNumber = cells[2]?.textContent?.trim() || '';
      const specialNeeds = cells[3]?.textContent?.trim() || '';
      const notes = cells[4]?.textContent?.trim() || '';

      // 예시 데이터 건너뛰기
      if (name.includes('김철수') || name.includes('예시')) {
        return;
      }

      if (!name) {
        return;
      }

      const gender = normalizeGender(genderRaw);
      if (!gender) {
        console.warn(`행 ${index + 1}: 성별이 올바르지 않습니다. 건너뜁니다.`);
        return;
      }

      students.push({
        name,
        gender,
        studentNumber: studentNumber || undefined,
        specialNeeds: specialNeeds || undefined,
        notes: notes || undefined
      });
    } catch (error) {
      console.error(`행 ${index + 1} 파싱 오류:`, error);
    }
  });

  return students;
}

/**
 * 파일 타입 감지 및 자동 파싱
 */
export async function parseStudentFile(file: File): Promise<StudentUploadData[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCSVFile(file);
  } else if (extension === 'xls' || extension === 'xlsx' || extension === 'html') {
    return parseExcelHTMLFile(file);
  } else {
    throw new Error('지원하지 않는 파일 형식입니다. CSV 또는 Excel HTML 파일을 업로드해주세요.');
  }
}

/**
 * 파싱 결과 검증
 */
export function validateStudentData(students: StudentUploadData[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (students.length === 0) {
    errors.push('파일에 학생 데이터가 없습니다.');
    return { valid: false, errors, warnings };
  }

  // 이름 중복 체크
  const names = students.map(s => s.name);
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);

  if (duplicates.length > 0) {
    warnings.push(`중복된 이름이 있습니다: ${[...new Set(duplicates)].join(', ')}`);
  }

  // 성별 분포 체크
  const maleCount = students.filter(s => s.gender === 'male' || s.gender === '남').length;
  const femaleCount = students.filter(s => s.gender === 'female' || s.gender === '여').length;

  if (maleCount === 0 || femaleCount === 0) {
    warnings.push(`성별 분포가 한쪽으로 치우쳐 있습니다. (남: ${maleCount}, 여: ${femaleCount})`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
