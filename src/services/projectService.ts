/**
 * 프로젝트 관리 서비스
 * 프로젝트 CRUD 및 협업 프로젝트 지원
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
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Project,
  ProjectDocument,
  ProjectListItem,
  ProjectRole,
  CollaborationSettings,
  DEFAULT_COLLABORATION_SETTINGS
} from '../types';
import { getUserRole } from '../utils/permissions';

const PROJECTS_COLLECTION = 'projects';

/**
 * Firestore 문서를 Project 객체로 변환
 */
const convertDocToProject = (docId: string, data: ProjectDocument): Project => {
  return {
    id: docId,
    ...data,
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp
      ? data.updatedAt.toDate()
      : new Date(data.updatedAt)
  };
};

/**
 * 새 프로젝트 생성
 * @param userId 프로젝트 소유자 ID
 * @param projectData 프로젝트 기본 정보
 * @param isCollaborative 협업 프로젝트 여부 (기본값: false)
 */
export const createProject = async (
  userId: string,
  projectData: {
    name: string;
    grade: string;
    classCount: number;
    description?: string;
    schoolName?: string;
  },
  isCollaborative: boolean = false
): Promise<string> => {
  try {
    // 기본 프로젝트 데이터
    const baseData: Record<string, any> = {
      name: projectData.name,
      grade: projectData.grade,
      classCount: projectData.classCount,
      userId,
      students: [],
      status: 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // 선택적 필드 추가 (undefined 값 방지)
    if (projectData.description) {
      baseData.description = projectData.description;
    }
    if (projectData.schoolName) {
      baseData.schoolName = projectData.schoolName;
    }

    // 협업 프로젝트인 경우 추가 필드
    if (isCollaborative) {
      baseData.isCollaborative = true;
      baseData.memberIds = [userId]; // 소유자를 첫 멤버로 추가
      baseData.memberCount = 1;
      baseData.collaborationSettings = DEFAULT_COLLABORATION_SETTINGS;
      baseData.classRosterStatus = {};
    }

    const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), baseData);

    return docRef.id;
  } catch (error) {
    console.error('프로젝트 생성 실패:', error);
    throw new Error('프로젝트 생성에 실패했습니다.');
  }
};

/**
 * 사용자의 모든 프로젝트 가져오기 (소유 + 협업 참여 프로젝트)
 * @param userId 사용자 ID
 * @returns 프로젝트 목록 (소유 프로젝트 + 협업 프로젝트)
 */
export const getUserProjects = async (userId: string): Promise<Project[]> => {
  console.log('=== getUserProjects 시작 ===');
  console.log('userId:', userId);

  try {
    // 1. 사용자가 소유한 프로젝트 쿼리
    const ownerQuery = query(
      collection(db, PROJECTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    // 2. 사용자가 멤버로 참여한 협업 프로젝트 쿼리
    const memberQuery = query(
      collection(db, PROJECTS_COLLECTION),
      where('memberIds', 'array-contains', userId)
    );

    // 병렬로 두 쿼리 실행
    const [ownerSnapshot, memberSnapshot] = await Promise.all([
      getDocs(ownerQuery),
      getDocs(memberQuery)
    ]);

    console.log('소유 프로젝트 수:', ownerSnapshot.size);
    console.log('멤버 프로젝트 수:', memberSnapshot.size);

    const projectsMap = new Map<string, Project>();

    // 소유 프로젝트 추가
    ownerSnapshot.forEach((docSnap) => {
      const data = docSnap.data() as ProjectDocument;
      projectsMap.set(docSnap.id, convertDocToProject(docSnap.id, data));
    });

    // 협업 프로젝트 추가 (중복 방지 - 소유자가 memberIds에도 포함된 경우)
    memberSnapshot.forEach((docSnap) => {
      if (!projectsMap.has(docSnap.id)) {
        const data = docSnap.data() as ProjectDocument;
        projectsMap.set(docSnap.id, convertDocToProject(docSnap.id, data));
      }
    });

    // Map을 배열로 변환하고 updatedAt 기준으로 정렬
    const projects = Array.from(projectsMap.values());
    projects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return projects;
  } catch (error) {
    console.error('프로젝트 목록 가져오기 실패:', error);
    throw new Error('프로젝트 목록을 불러오는데 실패했습니다.');
  }
};

/**
 * 사용자의 프로젝트 목록 아이템 가져오기 (대시보드용 간소화 버전)
 * @param userId 사용자 ID
 * @returns ProjectListItem 배열
 */
export const getUserProjectListItems = async (userId: string): Promise<ProjectListItem[]> => {
  try {
    const projects = await getUserProjects(userId);

    return projects.map(project => ({
      id: project.id,
      name: project.name,
      grade: project.grade,
      classCount: project.classCount,
      studentCount: project.students.length,
      status: project.status,
      updatedAt: project.updatedAt,
      isCollaborative: project.isCollaborative || false,
      memberCount: project.memberCount || 1,
      myRole: getUserRole(project, userId) || undefined
    }));
  } catch (error) {
    console.error('프로젝트 목록 아이템 가져오기 실패:', error);
    throw new Error('프로젝트 목록을 불러오는데 실패했습니다.');
  }
};

/**
 * 특정 프로젝트 가져오기
 */
export const getProject = async (projectId: string): Promise<Project | null> => {
  try {
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) {
      return null;
    }

    const data = projectSnap.data() as ProjectDocument;
    return convertDocToProject(projectSnap.id, data);
  } catch (error) {
    console.error('프로젝트 가져오기 실패:', error);
    throw new Error('프로젝트를 불러오는데 실패했습니다.');
  }
};

/**
 * 프로젝트 접근 권한 확인 후 가져오기
 * @param projectId 프로젝트 ID
 * @param userId 사용자 ID
 * @returns 프로젝트 (접근 권한이 없으면 null)
 */
export const getProjectWithAccess = async (
  projectId: string,
  userId: string
): Promise<{ project: Project; role: ProjectRole } | null> => {
  try {
    const project = await getProject(projectId);

    if (!project) {
      return null;
    }

    const role = getUserRole(project, userId);

    if (!role) {
      return null; // 접근 권한 없음
    }

    return { project, role };
  } catch (error) {
    console.error('프로젝트 접근 확인 실패:', error);
    throw new Error('프로젝트를 불러오는데 실패했습니다.');
  }
};

/**
 * 프로젝트 업데이트
 */
export const updateProject = async (
  projectId: string,
  updates: Partial<Project>
): Promise<void> => {
  try {
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);

    // undefined 값 제거 (Firebase는 undefined를 허용하지 않음)
    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    await updateDoc(projectRef, {
      ...cleanUpdates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('프로젝트 업데이트 실패:', error);
    throw new Error('프로젝트 업데이트에 실패했습니다.');
  }
};

/**
 * 프로젝트 삭제 (협업 프로젝트인 경우 하위 컬렉션도 삭제)
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);

    // 협업 프로젝트인 경우 하위 컬렉션 삭제
    // members 컬렉션 삭제
    const membersRef = collection(db, PROJECTS_COLLECTION, projectId, 'members');
    const membersSnapshot = await getDocs(membersRef);
    membersSnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // classRosters 컬렉션 삭제
    const rostersRef = collection(db, PROJECTS_COLLECTION, projectId, 'classRosters');
    const rostersSnapshot = await getDocs(rostersRef);
    rostersSnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // invitations 컬렉션 삭제
    const invitationsRef = collection(db, PROJECTS_COLLECTION, projectId, 'invitations');
    const invitationsSnapshot = await getDocs(invitationsRef);
    invitationsSnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // 프로젝트 문서 삭제
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    batch.delete(projectRef);

    await batch.commit();
  } catch (error) {
    console.error('프로젝트 삭제 실패:', error);
    throw new Error('프로젝트 삭제에 실패했습니다.');
  }
};

/**
 * 프로젝트 상태 업데이트
 */
export const updateProjectStatus = async (
  projectId: string,
  status: Project['status']
): Promise<void> => {
  try {
    await updateProject(projectId, { status });
  } catch (error) {
    console.error('프로젝트 상태 업데이트 실패:', error);
    throw new Error('프로젝트 상태 업데이트에 실패했습니다.');
  }
};

/**
 * 프로젝트 협업 설정 업데이트
 */
export const updateProjectCollaborationSettings = async (
  projectId: string,
  settings: Partial<CollaborationSettings>
): Promise<void> => {
  try {
    const project = await getProject(projectId);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    const currentSettings = project.collaborationSettings || DEFAULT_COLLABORATION_SETTINGS;
    const newSettings = { ...currentSettings, ...settings };

    await updateProject(projectId, {
      collaborationSettings: newSettings
    });
  } catch (error) {
    console.error('협업 설정 업데이트 실패:', error);
    throw new Error('협업 설정 업데이트에 실패했습니다.');
  }
};

/**
 * 기존 프로젝트를 협업 프로젝트로 전환
 */
export const convertToCollaborativeProject = async (
  projectId: string,
  userId: string
): Promise<void> => {
  try {
    const project = await getProject(projectId);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    if (project.userId !== userId) {
      throw new Error('프로젝트 소유자만 협업 모드로 전환할 수 있습니다.');
    }

    if (project.isCollaborative) {
      throw new Error('이미 협업 프로젝트입니다.');
    }

    await updateProject(projectId, {
      isCollaborative: true,
      memberIds: [userId],
      memberCount: 1,
      collaborationSettings: DEFAULT_COLLABORATION_SETTINGS,
      classRosterStatus: {}
    });
  } catch (error) {
    console.error('협업 프로젝트 전환 실패:', error);
    throw new Error('협업 프로젝트로 전환하는데 실패했습니다.');
  }
};

/**
 * 프로젝트 복제
 * @param projectId 원본 프로젝트 ID
 * @param userId 새 프로젝트 소유자 ID
 * @param newName 새 프로젝트 이름 (선택적)
 */
export const duplicateProject = async (
  projectId: string,
  userId: string,
  newName?: string
): Promise<string> => {
  try {
    const originalProject = await getProject(projectId);
    if (!originalProject) {
      throw new Error('원본 프로젝트를 찾을 수 없습니다.');
    }

    // 새 프로젝트 생성 (협업 관련 필드는 초기화)
    const newProjectData: Record<string, any> = {
      name: newName || `${originalProject.name} (복사본)`,
      grade: originalProject.grade,
      classCount: originalProject.classCount,
      userId,
      students: [...originalProject.students], // 학생 데이터 복사
      status: 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // 선택적 필드 복사
    if (originalProject.description) {
      newProjectData.description = originalProject.description;
    }
    if (originalProject.schoolName) {
      newProjectData.schoolName = originalProject.schoolName;
    }

    const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), newProjectData);
    return docRef.id;
  } catch (error) {
    console.error('프로젝트 복제 실패:', error);
    throw new Error('프로젝트 복제에 실패했습니다.');
  }
};
