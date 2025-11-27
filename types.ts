export type Gender = '남' | '여';

export enum NoteType {
  None = '',
  Special = '특수학급',
  Underachievement = '학습부진',
  Behavior = '특이행동',
  Multicultural = '다문화',
  HighAcademic = '성적우수',
  GoodAttitude = '태도우수',
  TransferPlanned = '전학예정',
  Other = '기타',
}

export interface Student {
  id: string; // Unique ID
  currentClass: number; // 1 to 15
  number: number;
  name: string;
  gender: Gender;
  noteType: NoteType;
  noteDetail: string; // Used if 'Other' or for specifics
}

export enum SeparationReason {
  Twin = '쌍둥이',
  Bullying = '학교폭력',
  ParentRequest = '부모요청',
  TeacherJudgment = '교사판단',
}

export type IntegrationReason = Exclude<SeparationReason, SeparationReason.Bullying>;

export interface Request {
  id: string;
  type: 'separation' | 'integration';
  studentId1: string;
  studentId2: string;
  reason: SeparationReason | IntegrationReason;
}

export enum AssignmentMethod {
  Loop = '가나다가나다가나다 (순환)',
  Zigzag = '가나다다나가가나다 (지그재그)',
  Random = '랜덤배정',
}

export interface AssignmentSettings {
  targetClassCount: number;
  method: AssignmentMethod;
  sameNameStrategy: 'distribute' | 'ignore';
  specialNeedsReduction: number; // -1 to -3
  notePriority: NoteType[]; // Order of priority
  startConfig: {
    // Key: currentClass_gender (e.g., "1_남") -> value: studentId to start with
    [key: string]: string; 
  };
  startTargetClass: {
    // Key: currentClass (e.g., "1") -> value: target class index (0 for '가', 1 for '나')
    [key: string]: number;
  }
}

export interface AssignmentResult {
  studentId: string;
  step1ClassIndex: number; // Initial
  step2ClassIndex: number; // After constraints
  step3ClassIndex: number; // After balancing
  highlightStep2: boolean; // Yellow
  highlightStep3: boolean; // Blue
  log: string[]; // Reasons for movement
}

export const CLASS_NAMES = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하', '거'];