/**
 * 학생 데이터 관리 서비스
 * 학생 정보 암호화, 저장, 조회 기능
 */

import { Student, StudentUploadData } from '../types';
import { encryptStudentName, maskName, maskStudentNumber } from '../lib/encryption';

/**
 * 업로드 데이터를 암호화된 학생 데이터로 변환
 */
export async function encryptStudentData(
  uploadData: StudentUploadData,
  userId: string,
  index: number
): Promise<Student> {
  try {
    // 데이터 타입 안전성 확보 (문자열 변환)
    const safeName = String(uploadData.name || '');
    const safeStudentNumber = uploadData.studentNumber ? String(uploadData.studentNumber) : undefined;
    const safeGender = uploadData.gender; // 이미 검증됨

    if (!safeName) {
      throw new Error('학생 이름이 없습니다.');
    }

    // 이름 암호화
    const encryptedName = await encryptStudentName(safeName, userId);

    // 표시용 마스킹된 이름 생성
    const displayName = maskName(safeName);

    // 학번 마스킹 (있는 경우)
    const maskedStudentNumber = safeStudentNumber
      ? maskStudentNumber(safeStudentNumber)
      : undefined;

    // 성별은 파싱 단계에서 이미 'male' | 'female'로 정규화됨
    // uploadData.gender는 항상 존재해야 함 (validation 통과)
    if (!safeGender) {
      throw new Error(`학생 ${safeName}의 성별 정보가 없습니다.`);
    }

    // Firebase는 undefined 값을 허용하지 않으므로 필터링
    const student: Student = {
      id: `student_${Date.now()}_${index}`,
      encryptedName,
      displayName,
      gender: safeGender
    };

    // undefined가 아닌 값만 추가
    if (maskedStudentNumber) {
      student.maskedStudentNumber = maskedStudentNumber;
    }
    if (uploadData.specialNeeds) {
      student.specialNeeds = uploadData.specialNeeds;
    }
    if (uploadData.specialTags && uploadData.specialTags.length > 0) {
      student.specialTags = uploadData.specialTags;
    }
    if (uploadData.customTag) {
      student.customTag = uploadData.customTag;
    }
    if (uploadData.notes) {
      student.notes = uploadData.notes;
    }

    return student;
  } catch (error) {
    console.error('학생 데이터 암호화 실패:', error);
    throw new Error(`${uploadData.name} 학생의 데이터 암호화에 실패했습니다.`);
  }
}

/**
 * 여러 학생 데이터를 일괄 암호화
 */
export async function encryptStudentDataBatch(
  uploadDataList: StudentUploadData[],
  userId: string
): Promise<Student[]> {
  const encryptedStudents: Student[] = [];

  for (let i = 0; i < uploadDataList.length; i++) {
    const student = await encryptStudentData(uploadDataList[i], userId, i);
    encryptedStudents.push(student);
  }

  return encryptedStudents;
}

/**
 * 학생 데이터 통계 생성
 */
export function generateStudentStats(students: Student[]): {
  total: number;
  maleCount: number;
  femaleCount: number;
  specialNeedsCount: number;
  genderRatio: string;
} {
  const total = students.length;
  const maleCount = students.filter(s => s.gender === 'male').length;
  const femaleCount = students.filter(s => s.gender === 'female').length;
  const specialNeedsCount = students.filter(s => s.specialNeeds).length;

  const genderRatio = total > 0
    ? `${((maleCount / total) * 100).toFixed(1)}% : ${((femaleCount / total) * 100).toFixed(1)}%`
    : '0% : 0%';

  return {
    total,
    maleCount,
    femaleCount,
    specialNeedsCount,
    genderRatio
  };
}

/**
 * 학생 목록에서 특정 학생 찾기
 */
export function findStudentById(students: Student[], studentId: string): Student | undefined {
  return students.find(s => s.id === studentId);
}

/**
 * 학생 목록에서 표시 이름으로 검색
 */
export function searchStudentsByDisplayName(students: Student[], query: string): Student[] {
  const lowerQuery = query.toLowerCase();
  return students.filter(s =>
    s.displayName.toLowerCase().includes(lowerQuery) ||
    s.maskedStudentNumber?.includes(query)
  );
}

/**
 * 학생 데이터 유효성 검사
 */
export function validateStudent(student: Student): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!student.id) {
    errors.push('학생 ID가 없습니다.');
  }

  if (!student.encryptedName) {
    errors.push('암호화된 이름이 없습니다.');
  }

  if (!student.displayName) {
    errors.push('표시 이름이 없습니다.');
  }

  if (student.gender !== 'male' && student.gender !== 'female') {
    errors.push('성별이 올바르지 않습니다.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
