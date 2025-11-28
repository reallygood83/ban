/**
 * 파일 파싱 유틸리티
 * Excel 및 CSV 파일을 파싱하여 학생 데이터로 변환
 */

import { StudentUploadData } from '../types';

// 명렬표 형식의 학생 데이터 (성별 없음)
export interface StudentRosterData {
  grade: string;       // 학년
  classNumber: string; // 반
  number: string;      // 번호
  name: string;        // 성명
  notes?: string;      // 비고
}

// 파싱 결과 타입 (명렬표 형식인지 구분)
export interface ParseResult {
  type: 'standard' | 'roster';  // standard: 기존 형식 (성별 포함), roster: 명렬표 형식 (성별 없음)
  students?: StudentUploadData[];  // standard 형식일 때
  rosterData?: StudentRosterData[];  // roster 형식일 때
}

/**
 * CSV 파일 파싱 - 형식 자동 감지
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
 * CSV 파일 파싱 - 명렬표 형식 전용 (성별 정보 없음)
 */
export async function parseRosterCSVFile(file: File): Promise<StudentRosterData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rosterData = parseRosterCSVText(text);
        resolve(rosterData);
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
 * CSV 파일 형식 감지 (헤더 확인)
 */
export async function detectCSVFormat(file: File): Promise<'standard' | 'roster'> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const firstLine = text.split('\n')[0] || '';
        const headers = parseCSVLine(firstLine).map(h => h.toLowerCase().trim());

        // 학년, 반 컬럼이 있으면 명렬표 형식
        if (headers.includes('학년') || headers.includes('반') || headers.includes('번호')) {
          resolve('roster');
        } else {
          resolve('standard');
        }
      } catch (error) {
        reject(new Error('파일 형식을 확인할 수 없습니다.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽는데 실패했습니다.'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * 명렬표 CSV 텍스트를 파싱 (학년, 반, 번호, 성명, 비고)
 */
function parseRosterCSVText(text: string): StudentRosterData[] {
  const lines = text.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV 파일에 데이터가 없습니다.');
  }

  // 헤더 분석
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());

  // 컬럼 인덱스 찾기
  const gradeIdx = headers.findIndex(h => h.includes('학년'));
  const classIdx = headers.findIndex(h => h === '반' || h.includes('반'));
  const numberIdx = headers.findIndex(h => h === '번호' || h.includes('번호'));
  const nameIdx = headers.findIndex(h => h === '성명' || h.includes('이름') || h.includes('성명'));
  const notesIdx = headers.findIndex(h => h === '비고' || h.includes('비고'));

  // 데이터 라인
  const dataLines = lines.slice(1);
  const students: StudentRosterData[] = [];

  dataLines.forEach((line, index) => {
    try {
      const values = parseCSVLine(line);

      // 이름 추출
      const name = nameIdx >= 0 && values[nameIdx] ? values[nameIdx].trim() : '';

      // 이름이 비어있으면 건너뜀
      if (!name) {
        console.warn(`라인 ${index + 2}: 이름이 없습니다. 건너뜁니다.`);
        return;
      }

      students.push({
        grade: gradeIdx >= 0 && values[gradeIdx] ? values[gradeIdx].trim() : '',
        classNumber: classIdx >= 0 && values[classIdx] ? values[classIdx].trim() : '',
        number: numberIdx >= 0 && values[numberIdx] ? values[numberIdx].trim() : '',
        name: name,
        notes: notesIdx >= 0 && values[notesIdx] ? values[notesIdx].trim() : undefined
      });
    } catch (error) {
      console.error(`라인 ${index + 2} 파싱 오류:`, error);
    }
  });

  return students;
}

/**
 * CSV 텍스트를 학생 데이터로 변환 (기존 형식 + 명렬표 형식 자동 감지)
 */
function parseCSVText(text: string): StudentUploadData[] {
  const lines = text.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV 파일에 데이터가 없습니다.');
  }

  // 헤더 분석하여 형식 감지
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());

  // 명렬표 형식 감지 (학년, 반 컬럼 존재 여부)
  const isRosterFormat = headers.includes('학년') || headers.includes('반') ||
    headers.findIndex(h => h === '번호' || h.includes('번호')) >= 0;

  if (isRosterFormat) {
    // 명렬표 형식: 성별 정보가 없으므로 오류 발생
    // 실제로는 ManageStudents에서 성별 선택 UI를 통해 처리됨
    throw new Error('ROSTER_FORMAT_DETECTED');
  }

  // 기존 형식: 이름, 성별, 학번, 특수사항, 비고
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

/**
 * 명렬표 데이터 검증
 */
export function validateRosterData(rosterData: StudentRosterData[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  classGroups: Map<string, StudentRosterData[]>;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const classGroups = new Map<string, StudentRosterData[]>();

  if (rosterData.length === 0) {
    errors.push('파일에 학생 데이터가 없습니다.');
    return { valid: false, errors, warnings, classGroups };
  }

  // 반별로 그룹화
  rosterData.forEach(student => {
    const key = `${student.grade}-${student.classNumber}`;
    if (!classGroups.has(key)) {
      classGroups.set(key, []);
    }
    classGroups.get(key)!.push(student);
  });

  // 이름 중복 체크 (반 내에서)
  classGroups.forEach((students, classKey) => {
    const names = students.map(s => s.name);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
      warnings.push(`${classKey}반에 중복된 이름이 있습니다: ${[...new Set(duplicates)].join(', ')}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    classGroups
  };
}

/**
 * 명렬표 데이터를 StudentUploadData로 변환 (성별 정보 및 특이사항 추가)
 */
export function convertRosterToStudentData(
  rosterData: StudentRosterData[],
  genderMap: Map<string, 'male' | 'female'>,
  specialNeedsMap?: Map<string, string>
): StudentUploadData[] {
  return rosterData.map(student => {
    // 학년-반-번호를 키로 조회
    const key = `${student.grade}-${student.classNumber}-${student.number}`;
    const gender = genderMap.get(key) || genderMap.get(student.name) || 'male';
    
    // 특이사항 조회 (Map에서 먼저 찾고, 없으면 기존 notes 사용)
    let specialNeeds = specialNeedsMap?.get(key);
    
    // '(직접입력)'인 경우 빈 문자열로 처리 (실제 입력값이 없는 경우)
    if (specialNeeds === '(직접입력)') {
      specialNeeds = undefined;
    }

    return {
      name: student.name,
      gender,
      studentNumber: `${student.grade}${student.classNumber}${student.number.padStart(2, '0')}`,
      specialNeeds: specialNeeds, // Map에서 가져온 값은 specialNeeds로
      notes: student.notes // 기존 파일의 비고란은 notes로
    };
  });
}

/**
 * 반별 학생 수 요약
 */
export function getRosterSummary(rosterData: StudentRosterData[]): {
  totalCount: number;
  classCounts: { classKey: string; count: number; grade: string; classNumber: string }[];
} {
  const classGroups = new Map<string, StudentRosterData[]>();

  rosterData.forEach(student => {
    const key = `${student.grade}-${student.classNumber}`;
    if (!classGroups.has(key)) {
      classGroups.set(key, []);
    }
    classGroups.get(key)!.push(student);
  });

  const classCounts: { classKey: string; count: number; grade: string; classNumber: string }[] = [];
  classGroups.forEach((students, key) => {
    const [grade, classNumber] = key.split('-');
    classCounts.push({
      classKey: key,
      count: students.length,
      grade,
      classNumber
    });
  });

  // 정렬: 학년 → 반 순서
  classCounts.sort((a, b) => {
    if (a.grade !== b.grade) return Number(a.grade) - Number(b.grade);
    return Number(a.classNumber) - Number(b.classNumber);
  });

  return {
    totalCount: rosterData.length,
    classCounts
  };
}
