// 프로젝트 타입 정의
export interface Project {
  id: string;
  name: string;
  grade: string;
  classCount: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  students: Student[];
  status: 'draft' | 'in-progress' | 'completed';
}

// 학생 타입 정의 (암호화된 데이터)
export interface Student {
  id: string;
  encryptedName: string; // 암호화된 이름
  displayName: string; // 마스킹된 표시용 이름 (예: 김*수)
  gender: 'male' | 'female';
  maskedStudentNumber?: string; // 마스킹된 학번 (예: 2025****23)
  specialNeeds?: string; // 특수학급, 학습부진 등
  notes?: string;
  assignedClass?: number; // 배정된 반 번호
  separateFrom?: string[]; // 분리 희망 학생 ID 목록
  groupWith?: string[]; // 통합 희망 학생 ID 목록
}

// 엑셀 업로드용 학생 데이터 (평문)
export interface StudentUploadData {
  name: string; // 평문 이름
  gender: 'male' | 'female' | '남' | '여';
  studentNumber?: string;
  specialNeeds?: string;
  notes?: string;
}

// 반 배정 결과 타입
export interface ClassAssignment {
  classNumber: number;
  students: Student[];
  maleCount: number;
  femaleCount: number;
  specialNeedsCount: number;
}

// Firestore 문서 타입 (서버 타임스탬프 포함)
export interface ProjectDocument extends Omit<Project, 'createdAt' | 'updatedAt'> {
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
}
