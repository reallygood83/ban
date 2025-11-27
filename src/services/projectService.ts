import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Project, ProjectDocument } from '../types';

const PROJECTS_COLLECTION = 'projects';

/**
 * 새 프로젝트 생성
 */
export const createProject = async (
  userId: string,
  projectData: {
    name: string;
    grade: string;
    classCount: number;
  }
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), {
      ...projectData,
      userId,
      students: [],
      status: 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return docRef.id;
  } catch (error) {
    console.error('프로젝트 생성 실패:', error);
    throw new Error('프로젝트 생성에 실패했습니다.');
  }
};

/**
 * 사용자의 모든 프로젝트 가져오기
 */
export const getUserProjects = async (userId: string): Promise<Project[]> => {
  try {
    const q = query(
      collection(db, PROJECTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const projects: Project[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data() as ProjectDocument;
      projects.push({
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate()
      });
    });

    return projects;
  } catch (error) {
    console.error('프로젝트 목록 가져오기 실패:', error);
    throw new Error('프로젝트 목록을 불러오는데 실패했습니다.');
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
    await updateDoc(projectRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('프로젝트 업데이트 실패:', error);
    throw new Error('프로젝트 업데이트에 실패했습니다.');
  }
};

/**
 * 프로젝트 삭제
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  try {
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    await deleteDoc(projectRef);
  } catch (error) {
    console.error('프로젝트 삭제 실패:', error);
    throw new Error('프로젝트 삭제에 실패했습니다.');
  }
};
