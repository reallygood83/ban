/**
 * 권한 관리 유틸리티
 * 프로젝트 내 사용자 권한 확인 및 관리 함수
 */

import {
  Project,
  ProjectMember,
  ProjectRole,
  RolePermissions,
  ROLE_PERMISSIONS,
  UserProjectContext,
} from '../types';

/**
 * 역할에 따른 권한 객체 반환
 */
export function getPermissionsForRole(role: ProjectRole): RolePermissions {
  return ROLE_PERMISSIONS[role];
}

/**
 * 사용자가 특정 프로젝트에서 가진 역할 확인
 * @param project 프로젝트
 * @param userId 사용자 ID
 * @param members 프로젝트 멤버 목록 (협업 프로젝트인 경우)
 * @returns 사용자 역할 또는 null (멤버가 아닌 경우)
 */
export function getUserRole(
  project: Project,
  userId: string,
  members?: ProjectMember[]
): ProjectRole | null {
  // 프로젝트 소유자인 경우
  if (project.userId === userId) {
    return 'owner';
  }

  // 협업 프로젝트가 아닌 경우 소유자가 아니면 접근 불가
  if (!project.isCollaborative) {
    return null;
  }

  // memberIds에 포함되어 있는지 빠른 확인
  if (project.memberIds && !project.memberIds.includes(userId)) {
    return null;
  }

  // 멤버 목록에서 역할 확인
  if (members) {
    const member = members.find(m => m.userId === userId);
    return member?.role || null;
  }

  // memberIds에는 있지만 상세 정보가 없는 경우 기본 member 역할 반환
  if (project.memberIds?.includes(userId)) {
    return 'member';
  }

  return null;
}

/**
 * 사용자의 프로젝트 컨텍스트 정보 생성
 * @param project 프로젝트
 * @param userId 사용자 ID
 * @param members 프로젝트 멤버 목록
 * @returns UserProjectContext 또는 null (접근 권한 없음)
 */
export function getUserProjectContext(
  project: Project,
  userId: string,
  members?: ProjectMember[]
): UserProjectContext | null {
  const role = getUserRole(project, userId, members);

  if (!role) {
    return null;
  }

  const permissions = getPermissionsForRole(role);
  const member = members?.find(m => m.userId === userId);

  return {
    userId,
    projectId: project.id,
    role,
    permissions,
    assignedClasses: member?.assignedClasses || [],
    isOwner: role === 'owner',
    isCollaborator: project.isCollaborative === true && role !== 'owner',
  };
}

/**
 * 특정 권한 확인
 */
export function hasPermission(
  context: UserProjectContext | null,
  permission: keyof RolePermissions
): boolean {
  if (!context) return false;
  return context.permissions[permission];
}

/**
 * 프로젝트 접근 권한 확인
 */
export function canAccessProject(
  project: Project,
  userId: string,
  members?: ProjectMember[]
): boolean {
  return getUserRole(project, userId, members) !== null;
}

/**
 * 프로젝트 편집 권한 확인
 */
export function canEditProject(
  project: Project,
  userId: string,
  members?: ProjectMember[]
): boolean {
  const context = getUserProjectContext(project, userId, members);
  return hasPermission(context, 'canEditProject');
}

/**
 * 프로젝트 삭제 권한 확인
 */
export function canDeleteProject(
  project: Project,
  userId: string,
  members?: ProjectMember[]
): boolean {
  const context = getUserProjectContext(project, userId, members);
  return hasPermission(context, 'canDeleteProject');
}

/**
 * 멤버 초대 권한 확인
 */
export function canInviteMembers(
  project: Project,
  userId: string,
  members?: ProjectMember[]
): boolean {
  const context = getUserProjectContext(project, userId, members);
  if (!hasPermission(context, 'canInviteMembers')) {
    return false;
  }

  // 협업 설정에서 멤버가 초대할 수 있는지 확인
  if (context?.role === 'member' && !project.collaborationSettings?.allowMemberInvite) {
    return false;
  }

  return true;
}

/**
 * 멤버 제거 권한 확인
 */
export function canRemoveMembers(
  project: Project,
  userId: string,
  targetUserId: string,
  members?: ProjectMember[]
): boolean {
  const context = getUserProjectContext(project, userId, members);

  // 기본 권한 확인
  if (!hasPermission(context, 'canRemoveMembers')) {
    return false;
  }

  // 자기 자신은 제거 가능
  if (userId === targetUserId) {
    return true;
  }

  // 소유자는 제거 불가
  if (project.userId === targetUserId) {
    return false;
  }

  // admin은 다른 admin을 제거할 수 없음
  const targetMember = members?.find(m => m.userId === targetUserId);
  if (context?.role === 'admin' && targetMember?.role === 'admin') {
    return false;
  }

  return true;
}

/**
 * 특정 반 명단 편집 권한 확인
 */
export function canEditClassRoster(
  project: Project,
  userId: string,
  classNumber: number,
  members?: ProjectMember[]
): boolean {
  const context = getUserProjectContext(project, userId, members);

  if (!context) return false;

  // 모든 반 편집 권한이 있으면 true
  if (context.permissions.canEditAllRosters) {
    return true;
  }

  // 담당 반만 편집 가능한 경우 확인
  if (context.permissions.canEditAssignedRosters) {
    return context.assignedClasses.includes(classNumber);
  }

  return false;
}

/**
 * 반 배정 실행 권한 확인
 */
export function canRunAssignment(
  project: Project,
  userId: string,
  members?: ProjectMember[]
): boolean {
  const context = getUserProjectContext(project, userId, members);
  return hasPermission(context, 'canRunAssignment');
}

/**
 * 결과 내보내기 권한 확인
 */
export function canExportResults(
  project: Project,
  userId: string,
  members?: ProjectMember[]
): boolean {
  const context = getUserProjectContext(project, userId, members);
  return hasPermission(context, 'canExportResults');
}

/**
 * 역할 변경 가능 여부 확인
 * @param currentUserRole 현재 사용자의 역할
 * @param targetRole 대상 사용자의 현재 역할
 * @param newRole 변경하려는 역할
 */
export function canChangeRole(
  currentUserRole: ProjectRole,
  targetRole: ProjectRole,
  newRole: ProjectRole
): boolean {
  // owner만 역할 변경 가능
  if (currentUserRole !== 'owner') {
    return false;
  }

  // owner 역할은 변경 불가
  if (targetRole === 'owner' || newRole === 'owner') {
    return false;
  }

  return true;
}

/**
 * 역할 표시 이름 반환
 */
export function getRoleDisplayName(role: ProjectRole): string {
  const roleNames: Record<ProjectRole, string> = {
    owner: '소유자',
    admin: '관리자',
    member: '멤버',
    viewer: '조회자',
  };
  return roleNames[role];
}

/**
 * 역할 설명 반환
 */
export function getRoleDescription(role: ProjectRole): string {
  const roleDescriptions: Record<ProjectRole, string> = {
    owner: '프로젝트의 모든 권한을 가지며, 프로젝트를 삭제할 수 있습니다.',
    admin: '멤버 관리와 모든 반 명단을 편집할 수 있습니다.',
    member: '담당 반의 명단만 업로드하고 편집할 수 있습니다.',
    viewer: '프로젝트와 명단을 조회만 할 수 있습니다.',
  };
  return roleDescriptions[role];
}

/**
 * 역할 색상 반환 (UI용)
 */
export function getRoleColor(role: ProjectRole): string {
  const roleColors: Record<ProjectRole, string> = {
    owner: 'bg-purple-100 text-purple-800 border-purple-300',
    admin: 'bg-blue-100 text-blue-800 border-blue-300',
    member: 'bg-green-100 text-green-800 border-green-300',
    viewer: 'bg-gray-100 text-gray-800 border-gray-300',
  };
  return roleColors[role];
}
