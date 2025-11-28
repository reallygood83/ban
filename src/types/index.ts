// ============================================
// 협업 기능 관련 타입 정의
// ============================================

/**
 * 프로젝트 내 사용자 역할
 * - owner: 프로젝트 소유자 (모든 권한, 프로젝트 삭제 가능)
 * - admin: 관리자 (멤버 초대/제거, 설정 변경 가능)
 * - member: 일반 멤버 (담당 반 명단 업로드/편집 가능)
 * - viewer: 조회자 (읽기 전용)
 */
export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * 프로젝트 멤버 정보
 */
export interface ProjectMember {
  id: string;                    // 멤버 문서 ID
  userId: string;                // Firebase Auth UID
  email: string;                 // 사용자 이메일
  displayName: string;           // 표시 이름
  photoURL?: string;             // 프로필 사진 URL
  role: ProjectRole;             // 역할
  assignedClasses: number[];     // 담당 반 번호 목록
  joinedAt: Date;                // 참여 일시
  invitedBy?: string;            // 초대한 사용자 ID
}

/**
 * 프로젝트 멤버 Firestore 문서 타입
 */
export interface ProjectMemberDocument extends Omit<ProjectMember, 'joinedAt'> {
  joinedAt: any; // Firebase Timestamp
}

/**
 * 반별 명단 정보 (협업 모드용)
 */
export interface ClassRoster {
  classNumber: number;           // 반 번호
  students: Student[];           // 해당 반 학생 목록
  uploadedBy: string;            // 업로드한 사용자 ID
  uploadedByName: string;        // 업로드한 사용자 이름
  uploadedAt: Date;              // 업로드 일시
  lastModifiedBy?: string;       // 마지막 수정자 ID
  lastModifiedAt?: Date;         // 마지막 수정 일시
  status: 'draft' | 'confirmed'; // 상태 (임시저장/확정)
  studentCount: number;          // 학생 수
  maleCount: number;             // 남학생 수
  femaleCount: number;           // 여학생 수
}

/**
 * 반별 명단 Firestore 문서 타입
 */
export interface ClassRosterDocument extends Omit<ClassRoster, 'uploadedAt' | 'lastModifiedAt'> {
  uploadedAt: any; // Firebase Timestamp
  lastModifiedAt?: any; // Firebase Timestamp
}

/**
 * 초대 상태
 */
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

/**
 * 프로젝트 초대 정보
 */
export interface ProjectInvitation {
  id: string;                    // 초대 문서 ID
  projectId: string;             // 프로젝트 ID
  projectName: string;           // 프로젝트 이름 (표시용)
  invitedEmail: string;          // 초대받은 이메일
  invitedUserId?: string;        // 초대받은 사용자 ID (가입된 경우)
  invitedBy: string;             // 초대한 사용자 ID
  invitedByName: string;         // 초대한 사용자 이름
  role: ProjectRole;             // 부여할 역할
  assignedClasses: number[];     // 담당 반 번호
  status: InvitationStatus;      // 초대 상태
  inviteCode?: string;           // 초대 코드 (링크 초대용)
  createdAt: Date;               // 초대 생성 일시
  expiresAt: Date;               // 만료 일시
  respondedAt?: Date;            // 응답 일시
}

/**
 * 초대 Firestore 문서 타입
 */
export interface ProjectInvitationDocument extends Omit<ProjectInvitation, 'createdAt' | 'expiresAt' | 'respondedAt'> {
  createdAt: any;
  expiresAt: any;
  respondedAt?: any;
}

/**
 * 협업 설정
 */
export interface CollaborationSettings {
  allowMemberInvite: boolean;    // 멤버가 다른 멤버를 초대할 수 있는지
  requireApproval: boolean;      // 명단 확정 시 관리자 승인 필요 여부
  autoMergeRosters: boolean;     // 반별 명단 자동 병합 여부
  notifyOnUpload: boolean;       // 명단 업로드 시 알림 여부
}

// ============================================
// 프로젝트 타입 정의 (협업 기능 확장)
// ============================================

/**
 * 프로젝트 타입 정의
 * - 기존 단일 사용자 프로젝트와 협업 프로젝트 모두 지원
 * - 협업 관련 필드는 모두 선택적(optional)으로 하위 호환성 유지
 */
export interface Project {
  id: string;
  name: string;
  grade: string;
  classCount: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;                // 프로젝트 소유자 (기존 호환성 유지)
  students: Student[];           // 전체 학생 목록 (기존 호환성 유지)
  status: 'draft' | 'in-progress' | 'completed';

  // === 협업 기능 확장 필드 (선택적) ===
  isCollaborative?: boolean;     // 협업 프로젝트 여부 (기본값: false)
  memberIds?: string[];          // 멤버 userId 목록 (빠른 조회용)
  memberCount?: number;          // 멤버 수
  collaborationSettings?: CollaborationSettings; // 협업 설정
  classRosterStatus?: {          // 반별 명단 업로드 상태
    [classNumber: number]: {
      uploaded: boolean;
      uploadedBy?: string;
      status: 'draft' | 'confirmed';
    };
  };
  description?: string;          // 프로젝트 설명
  schoolName?: string;           // 학교 이름

  // === 반 배정 결과 (선택적) ===
  assignments?: ClassAssignment[]; // 반 배정 결과 (ClassAssignment 배열)
}

// ============================================
// 학생 타입 정의
// ============================================

/**
 * 학생 타입 정의 (암호화된 데이터)
 * - 협업 모드에서는 sourceClass 필드로 원본 반 추적
 */
export interface Student {
  id: string;
  encryptedName: string;         // 암호화된 이름
  displayName: string;           // 마스킹된 표시용 이름 (예: 김*수)
  gender: 'male' | 'female';
  maskedStudentNumber?: string;  // 마스킹된 학번 (예: 2025****23)
  specialNeeds?: string;         // 특수학급, 학습부진 등
  notes?: string;
  assignedClass?: number;        // 배정된 반 번호
  separateFrom?: string[];       // 분리 희망 학생 ID 목록
  groupWith?: string[];          // 통합 희망 학생 ID 목록

  // === 협업 기능 확장 필드 (선택적) ===
  sourceClass?: number;          // 원본 반 번호 (협업 모드에서 추적용)
  uploadedBy?: string;           // 업로드한 사용자 ID
}

// 엑셀 업로드용 학생 데이터 (평문)
export interface StudentUploadData {
  name: string; // 평문 이름
  gender?: 'male' | 'female'; // Optional - NEIS format doesn't include gender column
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

// ============================================
// Firestore 문서 타입
// ============================================

/**
 * 프로젝트 Firestore 문서 타입 (서버 타임스탬프 포함)
 */
export interface ProjectDocument extends Omit<Project, 'createdAt' | 'updatedAt'> {
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
}

// ============================================
// 권한 및 유틸리티 타입
// ============================================

/**
 * 역할별 권한 정의
 */
export interface RolePermissions {
  canEditProject: boolean;       // 프로젝트 설정 편집
  canDeleteProject: boolean;     // 프로젝트 삭제
  canInviteMembers: boolean;     // 멤버 초대
  canRemoveMembers: boolean;     // 멤버 제거
  canEditAllRosters: boolean;    // 모든 반 명단 편집
  canEditAssignedRosters: boolean; // 담당 반 명단만 편집
  canViewAllRosters: boolean;    // 모든 반 명단 조회
  canRunAssignment: boolean;     // 반 배정 실행
  canExportResults: boolean;     // 결과 내보내기
}

/**
 * 역할별 권한 상수
 */
export const ROLE_PERMISSIONS: Record<ProjectRole, RolePermissions> = {
  owner: {
    canEditProject: true,
    canDeleteProject: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canEditAllRosters: true,
    canEditAssignedRosters: true,
    canViewAllRosters: true,
    canRunAssignment: true,
    canExportResults: true,
  },
  admin: {
    canEditProject: true,
    canDeleteProject: false,
    canInviteMembers: true,
    canRemoveMembers: true,
    canEditAllRosters: true,
    canEditAssignedRosters: true,
    canViewAllRosters: true,
    canRunAssignment: true,
    canExportResults: true,
  },
  member: {
    canEditProject: false,
    canDeleteProject: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canEditAllRosters: false,
    canEditAssignedRosters: true,
    canViewAllRosters: true,
    canRunAssignment: false,
    canExportResults: true,
  },
  viewer: {
    canEditProject: false,
    canDeleteProject: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canEditAllRosters: false,
    canEditAssignedRosters: false,
    canViewAllRosters: true,
    canRunAssignment: false,
    canExportResults: false,
  },
};

/**
 * 협업 프로젝트 기본 설정
 */
export const DEFAULT_COLLABORATION_SETTINGS: CollaborationSettings = {
  allowMemberInvite: false,
  requireApproval: false,
  autoMergeRosters: true,
  notifyOnUpload: true,
};

/**
 * 사용자의 프로젝트 내 컨텍스트 정보
 */
export interface UserProjectContext {
  userId: string;
  projectId: string;
  role: ProjectRole;
  permissions: RolePermissions;
  assignedClasses: number[];
  isOwner: boolean;
  isCollaborator: boolean;
}

/**
 * 프로젝트 목록 아이템 (대시보드용 간소화 타입)
 */
export interface ProjectListItem {
  id: string;
  name: string;
  grade: string;
  classCount: number;
  studentCount: number;
  status: Project['status'];
  updatedAt: Date;
  isCollaborative: boolean;
  memberCount: number;
  myRole?: ProjectRole;
}

/**
 * 초대 응답 결과
 */
export interface InvitationResponse {
  success: boolean;
  message: string;
  projectId?: string;
  error?: string;
}

/**
 * 반별 명단 업로드 결과
 */
export interface RosterUploadResult {
  success: boolean;
  classNumber: number;
  studentCount: number;
  maleCount: number;
  femaleCount: number;
  message: string;
  errors?: string[];
}

/**
 * 전체 명단 병합 결과
 */
export interface MergedRosterResult {
  totalStudents: number;
  totalMale: number;
  totalFemale: number;
  classBreakdown: {
    classNumber: number;
    studentCount: number;
    status: 'draft' | 'confirmed';
    uploadedBy: string;
  }[];
  pendingClasses: number[];
  confirmedClasses: number[];
}

// ============================================
// AI 반 배정 알고리즘 관련 타입 정의
// ============================================

/**
 * 경고 심각도 수준
 */
export type WarningSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * 배정 경고 타입
 */
export type WarningType =
  | 'same-name'              // 동명이인
  | 'gender-imbalance'       // 성별 불균형
  | 'special-needs-cluster'  // 특수학급 학생 집중
  | 'constraint-violation'   // 분리/통합 제약 위반
  | 'class-size-imbalance';  // 반 인원 불균형

/**
 * 배정 경고 정보
 * - 핑크색 하이라이트 대상 학생 식별용
 */
export interface AssignmentWarning {
  studentId: string;         // 경고 대상 학생 ID
  studentName: string;       // 표시용 이름
  warningType: WarningType;  // 경고 유형
  severity: WarningSeverity; // 심각도
  message: string;           // 경고 메시지
  suggestion?: string;       // 해결 제안
  affectedStudents?: string[]; // 관련된 다른 학생 ID들
}

/**
 * 동명이인 그룹
 * - 같은 이름을 가진 학생들의 그룹
 */
export interface SameNameGroup {
  name: string;              // 공통 이름
  studentIds: string[];      // 해당 이름을 가진 학생 ID 목록
  count: number;             // 동명이인 인원 수
}

/**
 * 배정 제약조건
 */
export interface AssignmentConstraint {
  studentId: string;
  type: 'separate' | 'group'; // 분리 또는 통합
  targetIds: string[];        // 대상 학생 ID들
  reason?: string;            // 제약 이유
}

/**
 * 반 균형 평가 지표
 */
export interface ClassBalance {
  classNumber: number;
  totalStudents: number;
  maleCount: number;
  femaleCount: number;
  specialNeedsCount: number;
  genderRatio: number;        // 성비 (male / total)
  balanceScore: number;       // 0-100 균형 점수
}

/**
 * AI 배정 결과 (확장)
 * - 기존 ClassAssignment에 경고 및 균형 정보 추가
 */
export interface AIClassAssignment extends ClassAssignment {
  warnings: AssignmentWarning[];  // 이 반의 경고 목록
  balance: ClassBalance;          // 균형 평가 지표
  constraintsSatisfied: number;   // 만족된 제약조건 수
  constraintsViolated: number;    // 위반된 제약조건 수
}

/**
 * 전체 배정 결과 및 분석
 */
export interface AssignmentResult {
  assignments: AIClassAssignment[]; // 반별 배정 결과
  allWarnings: AssignmentWarning[]; // 전체 경고 목록
  sameNameGroups: SameNameGroup[];  // 동명이인 그룹 목록
  overallBalance: number;           // 전체 균형 점수 (0-100)
  totalConstraints: number;         // 전체 제약조건 수
  satisfiedConstraints: number;     // 만족된 제약조건 수
  violatedConstraints: number;      // 위반된 제약조건 수
}
