/**
 * 협업 기능 서비스
 * 멤버 관리, 초대, 반별 명단 관리 기능
 */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
  increment,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Project,
  ProjectMember,
  ProjectMemberDocument,
  ProjectInvitation,
  ProjectInvitationDocument,
  ClassRoster,
  ClassRosterDocument,
  ProjectRole,
  CollaborationSettings,
  DEFAULT_COLLABORATION_SETTINGS,
  InvitationResponse,
  RosterUploadResult,
  Student,
} from '../types';

// 컬렉션 참조
const PROJECTS_COLLECTION = 'projects';
const MEMBERS_SUBCOLLECTION = 'members';
const ROSTERS_SUBCOLLECTION = 'classRosters';
const INVITATIONS_COLLECTION = 'invitations';

// ============================================
// 멤버 관리 함수
// ============================================

/**
 * 프로젝트 멤버 목록 조회
 */
export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  try {
    const membersRef = collection(db, PROJECTS_COLLECTION, projectId, MEMBERS_SUBCOLLECTION);
    const q = query(membersRef, orderBy('joinedAt', 'asc'));
    const snapshot = await getDocs(q);

    const members: ProjectMember[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as ProjectMemberDocument;
      members.push({
        id: doc.id,
        ...data,
        joinedAt: (data.joinedAt as Timestamp).toDate(),
      });
    });

    return members;
  } catch (error) {
    console.error('멤버 목록 조회 실패:', error);
    throw new Error('멤버 목록을 불러오는데 실패했습니다.');
  }
}

/**
 * 프로젝트 멤버 목록 실시간 구독
 */
export function subscribeToProjectMembers(
  projectId: string,
  callback: (members: ProjectMember[]) => void
): Unsubscribe {
  const membersRef = collection(db, PROJECTS_COLLECTION, projectId, MEMBERS_SUBCOLLECTION);
  const q = query(membersRef, orderBy('joinedAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const members: ProjectMember[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as ProjectMemberDocument;
      members.push({
        id: doc.id,
        ...data,
        joinedAt: (data.joinedAt as Timestamp).toDate(),
      });
    });
    callback(members);
  }, (error) => {
    console.error('멤버 목록 구독 실패:', error);
  });
}

/**
 * 프로젝트에 멤버 추가
 */
export async function addProjectMember(
  projectId: string,
  memberData: {
    userId: string;
    email: string;
    displayName: string;
    photoURL?: string;
    role: ProjectRole;
    assignedClasses?: number[];
    invitedBy?: string;
  }
): Promise<string> {
  console.log('=== addProjectMember 시작 ===');
  console.log('projectId:', projectId);
  console.log('memberData:', JSON.stringify(memberData, null, 2));

  try {
    const batch = writeBatch(db);

    // 멤버 문서 추가
    const membersRef = collection(db, PROJECTS_COLLECTION, projectId, MEMBERS_SUBCOLLECTION);
    const memberDoc = doc(membersRef);

    const memberToAdd: Omit<ProjectMemberDocument, 'id'> = {
      userId: memberData.userId,
      email: memberData.email,
      displayName: memberData.displayName,
      role: memberData.role,
      assignedClasses: memberData.assignedClasses || [],
      joinedAt: serverTimestamp(),
    };

    // Optional 필드만 조건부 추가
    if (memberData.photoURL) {
      (memberToAdd as any).photoURL = memberData.photoURL;
    }
    if (memberData.invitedBy) {
      (memberToAdd as any).invitedBy = memberData.invitedBy;
    }

    batch.set(memberDoc, memberToAdd);

    // 프로젝트 문서 업데이트 (memberIds 배열에 추가)
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    batch.update(projectRef, {
      memberIds: arrayUnion(memberData.userId),
      memberCount: increment(1),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    console.log('=== addProjectMember 성공 ===');
    console.log('memberId:', memberDoc.id);
    console.log('memberIds에 추가된 userId:', memberData.userId);
    return memberDoc.id;
  } catch (error) {
    console.error('=== addProjectMember 실패 ===');
    console.error('멤버 추가 실패:', error);
    throw new Error('멤버 추가에 실패했습니다.');
  }
}

/**
 * 멤버 역할 변경
 */
export async function updateMemberRole(
  projectId: string,
  memberId: string,
  newRole: ProjectRole
): Promise<void> {
  try {
    const memberRef = doc(db, PROJECTS_COLLECTION, projectId, MEMBERS_SUBCOLLECTION, memberId);
    await updateDoc(memberRef, {
      role: newRole,
    });
  } catch (error) {
    console.error('역할 변경 실패:', error);
    throw new Error('멤버 역할 변경에 실패했습니다.');
  }
}

/**
 * 멤버 담당 반 변경
 */
export async function updateMemberAssignedClasses(
  projectId: string,
  memberId: string,
  assignedClasses: number[]
): Promise<void> {
  try {
    const memberRef = doc(db, PROJECTS_COLLECTION, projectId, MEMBERS_SUBCOLLECTION, memberId);
    await updateDoc(memberRef, {
      assignedClasses,
    });
  } catch (error) {
    console.error('담당 반 변경 실패:', error);
    throw new Error('담당 반 변경에 실패했습니다.');
  }
}

/**
 * 멤버 제거
 */
export async function removeProjectMember(
  projectId: string,
  memberId: string,
  userId: string
): Promise<void> {
  try {
    const batch = writeBatch(db);

    // 멤버 문서 삭제
    const memberRef = doc(db, PROJECTS_COLLECTION, projectId, MEMBERS_SUBCOLLECTION, memberId);
    batch.delete(memberRef);

    // 프로젝트 문서 업데이트
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    batch.update(projectRef, {
      memberIds: arrayRemove(userId),
      memberCount: increment(-1),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    console.error('멤버 제거 실패:', error);
    throw new Error('멤버 제거에 실패했습니다.');
  }
}

// ============================================
// 초대 관리 함수
// ============================================

/**
 * 6자리 초대 코드 생성
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 프로젝트 초대 생성
 */
export async function createInvitation(
  projectId: string,
  projectName: string,
  invitedEmail: string,
  invitedBy: string,
  invitedByName: string,
  role: ProjectRole,
  assignedClasses: number[] = [],
  useCode: boolean = false
): Promise<ProjectInvitation> {
  try {
    // 이미 초대된 이메일인지 확인
    const existingInvitation = await getInvitationByEmail(projectId, invitedEmail);
    if (existingInvitation && existingInvitation.status === 'pending') {
      throw new Error('이미 초대가 진행 중인 이메일입니다.');
    }

    // 만료 시간 설정 (7일)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitationData: Omit<ProjectInvitationDocument, 'id'> = {
      projectId,
      projectName,
      invitedEmail,
      invitedBy,
      invitedByName,
      role,
      assignedClasses,
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
    };

    // 초대 코드 사용 시 추가
    if (useCode) {
      (invitationData as any).inviteCode = generateInviteCode();
    }

    const docRef = await addDoc(collection(db, INVITATIONS_COLLECTION), invitationData);

    return {
      id: docRef.id,
      ...invitationData,
      createdAt: new Date(),
      expiresAt,
    } as ProjectInvitation;
  } catch (error) {
    console.error('초대 생성 실패:', error);
    throw error;
  }
}

/**
 * 이메일로 초대 조회
 */
async function getInvitationByEmail(
  projectId: string,
  email: string
): Promise<ProjectInvitation | null> {
  const q = query(
    collection(db, INVITATIONS_COLLECTION),
    where('projectId', '==', projectId),
    where('invitedEmail', '==', email),
    where('status', '==', 'pending')
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data() as ProjectInvitationDocument;
  return {
    id: doc.id,
    ...data,
    createdAt: (data.createdAt as Timestamp).toDate(),
    expiresAt: (data.expiresAt as Timestamp).toDate(),
  };
}

/**
 * 사용자의 대기 중인 초대 목록 조회
 */
export async function getPendingInvitations(email: string): Promise<ProjectInvitation[]> {
  try {
    const q = query(
      collection(db, INVITATIONS_COLLECTION),
      where('invitedEmail', '==', email),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const invitations: ProjectInvitation[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as ProjectInvitationDocument;
      const expiresAt = (data.expiresAt as Timestamp).toDate();

      // 만료되지 않은 초대만 포함
      if (expiresAt > new Date()) {
        invitations.push({
          id: doc.id,
          ...data,
          createdAt: (data.createdAt as Timestamp).toDate(),
          expiresAt,
        });
      }
    });

    return invitations;
  } catch (error) {
    console.error('초대 목록 조회 실패:', error);
    throw new Error('초대 목록을 불러오는데 실패했습니다.');
  }
}

/**
 * 사용자의 대기 중인 초대 목록 실시간 구독
 */
export function subscribeToPendingInvitations(
  email: string,
  callback: (invitations: ProjectInvitation[]) => void
): Unsubscribe {
  const q = query(
    collection(db, INVITATIONS_COLLECTION),
    where('invitedEmail', '==', email),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const invitations: ProjectInvitation[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as ProjectInvitationDocument;
      const expiresAt = (data.expiresAt as Timestamp).toDate();

      // 만료되지 않은 초대만 포함
      if (expiresAt > new Date()) {
        invitations.push({
          id: doc.id,
          ...data,
          createdAt: (data.createdAt as Timestamp).toDate(),
          expiresAt,
        });
      }
    });
    callback(invitations);
  }, (error) => {
    console.error('초대 목록 구독 실패:', error);
  });
}

/**
 * 초대 수락
 */
export async function acceptInvitation(
  invitationId: string,
  userId: string,
  displayName: string,
  photoURL?: string
): Promise<InvitationResponse> {
  console.log('=== acceptInvitation 시작 ===');
  console.log('invitationId:', invitationId);
  console.log('userId:', userId);
  console.log('displayName:', displayName);

  try {
    const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId);
    const invitationSnap = await getDoc(invitationRef);

    if (!invitationSnap.exists()) {
      return { success: false, message: '초대를 찾을 수 없습니다.' };
    }

    const invitation = invitationSnap.data() as ProjectInvitationDocument;

    // 만료 확인
    const expiresAt = (invitation.expiresAt as Timestamp).toDate();
    if (expiresAt < new Date()) {
      await updateDoc(invitationRef, { status: 'expired' });
      return { success: false, message: '만료된 초대입니다.' };
    }

    // 이미 처리된 초대인지 확인
    if (invitation.status !== 'pending') {
      return { success: false, message: '이미 처리된 초대입니다.' };
    }

    // 멤버 추가
    await addProjectMember(invitation.projectId, {
      userId,
      email: invitation.invitedEmail,
      displayName,
      photoURL,
      role: invitation.role,
      assignedClasses: invitation.assignedClasses,
      invitedBy: invitation.invitedBy,
    });

    // 초대 상태 업데이트
    await updateDoc(invitationRef, {
      status: 'accepted',
      invitedUserId: userId,
      respondedAt: serverTimestamp(),
    });

    return {
      success: true,
      message: '초대를 수락했습니다.',
      projectId: invitation.projectId,
    };
  } catch (error) {
    console.error('초대 수락 실패:', error);
    return { success: false, message: '초대 수락에 실패했습니다.', error: String(error) };
  }
}

/**
 * 초대 거절
 */
export async function declineInvitation(invitationId: string): Promise<InvitationResponse> {
  try {
    const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId);
    await updateDoc(invitationRef, {
      status: 'declined',
      respondedAt: serverTimestamp(),
    });

    return { success: true, message: '초대를 거절했습니다.' };
  } catch (error) {
    console.error('초대 거절 실패:', error);
    return { success: false, message: '초대 거절에 실패했습니다.', error: String(error) };
  }
}

/**
 * 초대 코드로 초대 조회
 */
export async function getInvitationByCode(code: string): Promise<ProjectInvitation | null> {
  try {
    const q = query(
      collection(db, INVITATIONS_COLLECTION),
      where('inviteCode', '==', code.toUpperCase()),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data() as ProjectInvitationDocument;
    const expiresAt = (data.expiresAt as Timestamp).toDate();

    if (expiresAt < new Date()) {
      return null;
    }

    return {
      id: doc.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
      expiresAt,
    };
  } catch (error) {
    console.error('초대 코드 조회 실패:', error);
    return null;
  }
}

// ============================================
// 반별 명단 관리 함수
// ============================================

/**
 * 반별 명단 저장/업데이트
 */
export async function saveClassRoster(
  projectId: string,
  classNumber: number,
  students: Student[],
  uploadedBy: string,
  uploadedByName: string
): Promise<RosterUploadResult> {
  try {
    const rostersRef = collection(db, PROJECTS_COLLECTION, projectId, ROSTERS_SUBCOLLECTION);

    // 기존 명단 확인
    const q = query(rostersRef, where('classNumber', '==', classNumber));
    const existingSnapshot = await getDocs(q);

    const maleCount = students.filter(s => s.gender === 'male').length;
    const femaleCount = students.filter(s => s.gender === 'female').length;

    const rosterData: Omit<ClassRosterDocument, 'lastModifiedBy' | 'lastModifiedAt'> = {
      classNumber,
      students,
      uploadedBy,
      uploadedByName,
      uploadedAt: serverTimestamp(),
      status: 'draft',
      studentCount: students.length,
      maleCount,
      femaleCount,
    };

    if (existingSnapshot.empty) {
      // 새 명단 생성
      await addDoc(rostersRef, rosterData);
    } else {
      // 기존 명단 업데이트
      const existingDoc = existingSnapshot.docs[0];
      await updateDoc(existingDoc.ref, {
        ...rosterData,
        lastModifiedBy: uploadedBy,
        lastModifiedAt: serverTimestamp(),
      });
    }

    // 프로젝트의 classRosterStatus 업데이트
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    await updateDoc(projectRef, {
      [`classRosterStatus.${classNumber}`]: {
        uploaded: true,
        uploadedBy,
        status: 'draft',
      },
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      classNumber,
      studentCount: students.length,
      maleCount,
      femaleCount,
      message: `${classNumber}반 명단이 저장되었습니다. (${students.length}명)`,
    };
  } catch (error) {
    console.error('명단 저장 실패:', error);
    return {
      success: false,
      classNumber,
      studentCount: 0,
      maleCount: 0,
      femaleCount: 0,
      message: '명단 저장에 실패했습니다.',
      errors: [String(error)],
    };
  }
}

/**
 * 모든 반별 명단 조회
 */
export async function getAllClassRosters(projectId: string): Promise<ClassRoster[]> {
  try {
    const rostersRef = collection(db, PROJECTS_COLLECTION, projectId, ROSTERS_SUBCOLLECTION);
    const q = query(rostersRef, orderBy('classNumber', 'asc'));
    const snapshot = await getDocs(q);

    const rosters: ClassRoster[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as ClassRosterDocument;
      rosters.push({
        ...data,
        uploadedAt: (data.uploadedAt as Timestamp).toDate(),
        lastModifiedAt: data.lastModifiedAt
          ? (data.lastModifiedAt as Timestamp).toDate()
          : undefined,
      });
    });

    return rosters;
  } catch (error) {
    console.error('명단 조회 실패:', error);
    throw new Error('반별 명단을 불러오는데 실패했습니다.');
  }
}

/**
 * 모든 반별 명단 실시간 구독
 */
export function subscribeToClassRosters(
  projectId: string,
  callback: (rosters: ClassRoster[]) => void
): Unsubscribe {
  const rostersRef = collection(db, PROJECTS_COLLECTION, projectId, ROSTERS_SUBCOLLECTION);
  const q = query(rostersRef, orderBy('classNumber', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const rosters: ClassRoster[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as ClassRosterDocument;
      rosters.push({
        ...data,
        uploadedAt: (data.uploadedAt as Timestamp).toDate(),
        lastModifiedAt: data.lastModifiedAt
          ? (data.lastModifiedAt as Timestamp).toDate()
          : undefined,
      });
    });
    callback(rosters);
  }, (error) => {
    console.error('명단 구독 실패:', error);
  });
}

/**
 * 특정 반 명단 조회
 */
export async function getClassRoster(
  projectId: string,
  classNumber: number
): Promise<ClassRoster | null> {
  try {
    const rostersRef = collection(db, PROJECTS_COLLECTION, projectId, ROSTERS_SUBCOLLECTION);
    const q = query(rostersRef, where('classNumber', '==', classNumber));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data() as ClassRosterDocument;

    return {
      ...data,
      uploadedAt: (data.uploadedAt as Timestamp).toDate(),
      lastModifiedAt: data.lastModifiedAt
        ? (data.lastModifiedAt as Timestamp).toDate()
        : undefined,
    };
  } catch (error) {
    console.error('반 명단 조회 실패:', error);
    throw new Error('반 명단을 불러오는데 실패했습니다.');
  }
}

/**
 * 반별 명단 상태 변경 (draft → confirmed)
 */
export async function confirmClassRoster(
  projectId: string,
  classNumber: number
): Promise<void> {
  try {
    const rostersRef = collection(db, PROJECTS_COLLECTION, projectId, ROSTERS_SUBCOLLECTION);
    const q = query(rostersRef, where('classNumber', '==', classNumber));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('명단을 찾을 수 없습니다.');
    }

    const rosterDoc = snapshot.docs[0];
    await updateDoc(rosterDoc.ref, {
      status: 'confirmed',
      lastModifiedAt: serverTimestamp(),
    });

    // 프로젝트 상태 업데이트
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    await updateDoc(projectRef, {
      [`classRosterStatus.${classNumber}.status`]: 'confirmed',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('명단 확정 실패:', error);
    throw new Error('명단 확정에 실패했습니다.');
  }
}

/**
 * 모든 반별 명단을 하나의 학생 배열로 병합
 */
export async function mergeAllRosters(projectId: string): Promise<Student[]> {
  try {
    const rosters = await getAllClassRosters(projectId);
    const allStudents: Student[] = [];

    rosters.forEach((roster) => {
      roster.students.forEach((student) => {
        allStudents.push({
          ...student,
          sourceClass: roster.classNumber,
        });
      });
    });

    return allStudents;
  } catch (error) {
    console.error('명단 병합 실패:', error);
    throw new Error('명단 병합에 실패했습니다.');
  }
}

/**
 * 병합된 명단을 프로젝트의 students 필드에 저장
 */
export async function saveMergedStudentsToProject(projectId: string): Promise<number> {
  try {
    const mergedStudents = await mergeAllRosters(projectId);

    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    await updateDoc(projectRef, {
      students: mergedStudents,
      updatedAt: serverTimestamp(),
    });

    return mergedStudents.length;
  } catch (error) {
    console.error('병합 명단 저장 실패:', error);
    throw new Error('병합된 명단 저장에 실패했습니다.');
  }
}

/**
 * 학생 정보 업데이트 (성별, 특수학급, 비고)
 */
export async function updateStudentInfo(
  projectId: string,
  classNumber: number,
  studentId: string,
  updates: {
    gender?: 'male' | 'female';
    specialNeeds?: string;
    notes?: string;
  }
): Promise<void> {
  try {
    const rosterRef = doc(db, PROJECTS_COLLECTION, projectId, ROSTERS_SUBCOLLECTION, classNumber.toString());
    const rosterSnap = await getDoc(rosterRef);

    if (!rosterSnap.exists()) {
      throw new Error('명단을 찾을 수 없습니다.');
    }

    const roster = rosterSnap.data() as ClassRoster;

    // 확정된 명단은 수정 불가
    if (roster.status === 'confirmed') {
      throw new Error('확정된 명단은 수정할 수 없습니다.');
    }

    // 학생 찾기 및 업데이트
    const studentIndex = roster.students.findIndex(s => s.id === studentId);
    if (studentIndex === -1) {
      throw new Error('학생을 찾을 수 없습니다.');
    }

    const updatedStudents = [...roster.students];
    updatedStudents[studentIndex] = {
      ...updatedStudents[studentIndex],
      ...updates,
    };

    await updateDoc(rosterRef, {
      students: updatedStudents,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('학생 정보 업데이트 실패:', error);
    throw error;
  }
}

// ============================================
// 협업 프로젝트 설정 함수
// ============================================

/**
 * 프로젝트를 협업 모드로 전환
 */
export async function enableCollaboration(
  projectId: string,
  ownerId: string,
  ownerEmail: string,
  ownerName: string,
  settings?: Partial<CollaborationSettings>
): Promise<void> {
  try {
    const batch = writeBatch(db);

    // 프로젝트 업데이트
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    batch.update(projectRef, {
      isCollaborative: true,
      memberIds: [ownerId],
      memberCount: 1,
      collaborationSettings: {
        ...DEFAULT_COLLABORATION_SETTINGS,
        ...settings,
      },
      updatedAt: serverTimestamp(),
    });

    // 소유자를 멤버로 추가
    const membersRef = collection(db, PROJECTS_COLLECTION, projectId, MEMBERS_SUBCOLLECTION);
    const ownerMemberDoc = doc(membersRef);
    batch.set(ownerMemberDoc, {
      userId: ownerId,
      email: ownerEmail,
      displayName: ownerName,
      role: 'owner',
      assignedClasses: [],
      joinedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    console.error('협업 모드 활성화 실패:', error);
    throw new Error('협업 모드 활성화에 실패했습니다.');
  }
}

/**
 * 협업 설정 업데이트
 */
export async function updateCollaborationSettings(
  projectId: string,
  settings: Partial<CollaborationSettings>
): Promise<void> {
  try {
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    const updates: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    // 각 설정 필드를 개별적으로 업데이트
    Object.entries(settings).forEach(([key, value]) => {
      updates[`collaborationSettings.${key}`] = value;
    });

    await updateDoc(projectRef, updates);
  } catch (error) {
    console.error('협업 설정 업데이트 실패:', error);
    throw new Error('협업 설정 업데이트에 실패했습니다.');
  }
}
