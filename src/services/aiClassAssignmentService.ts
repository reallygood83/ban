/**
 * AI 기반 반 배정 알고리즘 서비스
 *
 * 주요 기능:
 * 1. 동명이인 자동 분리
 * 2. 성별 균형 최적화
 * 3. 특수학급 학생 분산
 * 4. 분리/통합 제약 조건 처리
 * 5. 배정 경고 및 핑크색 하이라이트 식별
 */

import {
  Student,
  SameNameGroup,
  AssignmentWarning,
  AssignmentConstraint,
  ClassBalance,
  AIClassAssignment,
  AssignmentResult,
  WarningType,
  WarningSeverity
} from '../types';

// ============================================
// 동명이인 감지 및 처리
// ============================================

/**
 * 동명이인 그룹 감지
 * - 같은 이름을 가진 학생들을 그룹화
 */
export function detectSameNameStudents(students: Student[]): SameNameGroup[] {
  const nameMap = new Map<string, string[]>();

  // 이름별로 학생 ID 그룹화
  students.forEach(student => {
    const name = student.displayName;
    if (!nameMap.has(name)) {
      nameMap.set(name, []);
    }
    nameMap.get(name)!.push(student.id);
  });

  // 2명 이상인 그룹만 필터링 (동명이인)
  const sameNameGroups: SameNameGroup[] = [];
  nameMap.forEach((studentIds, name) => {
    if (studentIds.length >= 2) {
      sameNameGroups.push({
        name,
        studentIds,
        count: studentIds.length
      });
    }
  });

  return sameNameGroups;
}

/**
 * 동명이인에 대한 경고 생성
 */
export function createSameNameWarnings(
  sameNameGroups: SameNameGroup[],
  students: Student[]
): AssignmentWarning[] {
  const warnings: AssignmentWarning[] = [];

  sameNameGroups.forEach(group => {
    group.studentIds.forEach(studentId => {
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      // 같은 이름을 가진 다른 학생들
      const otherStudents = group.studentIds.filter(id => id !== studentId);

      warnings.push({
        studentId,
        studentName: student.displayName,
        warningType: 'same-name',
        severity: 'high',
        message: `동명이인 학생입니다 (총 ${group.count}명). 다른 반으로 배정하는 것을 권장합니다.`,
        suggestion: `${student.displayName} 학생들을 각각 다른 반으로 배정`,
        affectedStudents: otherStudents
      });
    });
  });

  return warnings;
}

// ============================================
// 제약조건 처리
// ============================================

/**
 * 학생들의 제약조건 추출
 */
export function extractConstraints(students: Student[]): AssignmentConstraint[] {
  const constraints: AssignmentConstraint[] = [];

  students.forEach(student => {
    // 분리 희망 제약
    if (student.separateFrom && student.separateFrom.length > 0) {
      constraints.push({
        studentId: student.id,
        type: 'separate',
        targetIds: student.separateFrom,
        reason: '학생/학부모 요청에 따른 분리'
      });
    }

    // 통합 희망 제약
    if (student.groupWith && student.groupWith.length > 0) {
      constraints.push({
        studentId: student.id,
        type: 'group',
        targetIds: student.groupWith,
        reason: '학생/학부모 요청에 따른 통합'
      });
    }
  });

  return constraints;
}

/**
 * 제약조건 위반 검사
 */
export function checkConstraintViolations(
  assignments: AIClassAssignment[],
  constraints: AssignmentConstraint[]
): AssignmentWarning[] {
  const warnings: AssignmentWarning[] = [];

  constraints.forEach(constraint => {
    const student = findStudentInAssignments(assignments, constraint.studentId);
    if (!student || student.assignedClass === undefined) return;

    const studentClass = student.assignedClass;

    constraint.targetIds.forEach(targetId => {
      const targetStudent = findStudentInAssignments(assignments, targetId);
      if (!targetStudent || targetStudent.assignedClass === undefined) return;

      const targetClass = targetStudent.assignedClass;

      // 분리 제약 위반
      if (constraint.type === 'separate' && studentClass === targetClass) {
        warnings.push({
          studentId: constraint.studentId,
          studentName: student.displayName,
          warningType: 'constraint-violation',
          severity: 'critical',
          message: `${student.displayName}와 ${targetStudent.displayName}는 분리 희망이지만 같은 반(${studentClass}반)에 배정되었습니다.`,
          suggestion: `두 학생을 다른 반으로 재배정`,
          affectedStudents: [targetId]
        });
      }

      // 통합 제약 위반
      if (constraint.type === 'group' && studentClass !== targetClass) {
        warnings.push({
          studentId: constraint.studentId,
          studentName: student.displayName,
          warningType: 'constraint-violation',
          severity: 'high',
          message: `${student.displayName}와 ${targetStudent.displayName}는 같은 반 희망이지만 다른 반에 배정되었습니다.`,
          suggestion: `두 학생을 같은 반으로 재배정`,
          affectedStudents: [targetId]
        });
      }
    });
  });

  return warnings;
}

// ============================================
// 반 균형 평가
// ============================================

/**
 * 반별 균형 점수 계산
 */
export function calculateClassBalance(assignment: AIClassAssignment): ClassBalance {
  const { students, classNumber } = assignment;

  const totalStudents = students.length;
  const maleCount = students.filter(s => s.gender === 'male').length;
  const femaleCount = students.filter(s => s.gender === 'female').length;
  const specialNeedsCount = students.filter(s => s.specialNeeds).length;

  const genderRatio = totalStudents > 0 ? maleCount / totalStudents : 0.5;

  // 균형 점수 계산 (0-100)
  // 이상적인 성비는 0.5 (50:50)
  const genderDeviation = Math.abs(genderRatio - 0.5);
  const genderScore = (1 - genderDeviation * 2) * 100;

  return {
    classNumber,
    totalStudents,
    maleCount,
    femaleCount,
    specialNeedsCount,
    genderRatio,
    balanceScore: Math.max(0, genderScore)
  };
}

/**
 * 성별 불균형 경고 생성
 */
export function checkGenderImbalance(
  balance: ClassBalance,
  allBalances: ClassBalance[]
): AssignmentWarning[] {
  const warnings: AssignmentWarning[] = [];

  // 평균 성비 계산
  const avgGenderRatio = allBalances.reduce((sum, b) => sum + b.genderRatio, 0) / allBalances.length;

  // 평균 대비 10% 이상 차이나면 경고
  const deviation = Math.abs(balance.genderRatio - avgGenderRatio);
  if (deviation > 0.1) {
    const severity: WarningSeverity = deviation > 0.2 ? 'high' : 'medium';

    warnings.push({
      studentId: `class-${balance.classNumber}`,
      studentName: `${balance.classNumber}반 전체`,
      warningType: 'gender-imbalance',
      severity,
      message: `${balance.classNumber}반의 성비가 불균형합니다. (남: ${balance.maleCount}, 여: ${balance.femaleCount})`,
      suggestion: `다른 반과 학생을 교환하여 성비 균형 맞추기`
    });
  }

  return warnings;
}

/**
 * 특수학급 학생 집중 경고 생성
 */
export function checkSpecialNeedsClustering(
  balance: ClassBalance,
  allBalances: ClassBalance[]
): AssignmentWarning[] {
  const warnings: AssignmentWarning[] = [];

  // 평균 특수학급 학생 수 계산
  const avgSpecialNeeds = allBalances.reduce((sum, b) => sum + b.specialNeedsCount, 0) / allBalances.length;

  // 평균 대비 2명 이상 많으면 경고
  if (balance.specialNeedsCount > avgSpecialNeeds + 2) {
    warnings.push({
      studentId: `class-${balance.classNumber}`,
      studentName: `${balance.classNumber}반 전체`,
      warningType: 'special-needs-cluster',
      severity: 'high',
      message: `${balance.classNumber}반에 특수학급 학생이 집중되어 있습니다. (${balance.specialNeedsCount}명)`,
      suggestion: `특수학급 학생을 다른 반으로 분산 배치`
    });
  }

  return warnings;
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 배정 결과에서 학생 찾기
 */
function findStudentInAssignments(
  assignments: AIClassAssignment[],
  studentId: string
): Student | undefined {
  for (const assignment of assignments) {
    const student = assignment.students.find(s => s.id === studentId);
    if (student) return student;
  }
  return undefined;
}

/**
 * 경고 심각도에 따라 정렬
 */
export function sortWarningsBySeverity(warnings: AssignmentWarning[]): AssignmentWarning[] {
  const severityOrder: Record<WarningSeverity, number> = {
    'critical': 4,
    'high': 3,
    'medium': 2,
    'low': 1
  };

  return [...warnings].sort((a, b) => {
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

/**
 * 핑크색 하이라이트 대상 학생 식별
 * - critical 또는 high 심각도의 경고가 있는 학생
 */
export function identifyStudentsNeedingReview(warnings: AssignmentWarning[]): Set<string> {
  const needsReview = new Set<string>();

  warnings.forEach(warning => {
    if (warning.severity === 'critical' || warning.severity === 'high') {
      needsReview.add(warning.studentId);

      // 관련된 다른 학생들도 추가
      if (warning.affectedStudents) {
        warning.affectedStudents.forEach(id => needsReview.add(id));
      }
    }
  });

  return needsReview;
}

// ============================================
// 핵심 반 배정 알고리즘
// ============================================

/**
 * AI 기반 반 배정 메인 알고리즘
 *
 * 처리 순서:
 * 1. 동명이인 감지 및 분리 배정
 * 2. 성별 균형 최적화
 * 3. 특수학급 학생 분산
 * 4. 분리/통합 제약조건 적용
 * 5. 경고 생성 및 핑크색 하이라이트 대상 식별
 */
export function assignStudentsToClasses(
  students: Student[],
  classCount: number
): AssignmentResult {
  // 1. 동명이인 감지
  const sameNameGroups = detectSameNameStudents(students);

  // 2. 제약조건 추출
  const constraints = extractConstraints(students);

  // 3. 초기 반 배정 (균형잡힌 무작위 배정)
  const assignments = initializeClassAssignments(students, classCount, sameNameGroups);

  // 4. 성별 균형 최적화
  optimizeGenderBalance(assignments);

  // 5. 특수학급 학생 분산
  distributeSpecialNeeds(assignments);

  // 6. 분리/통합 제약조건 적용
  applyConstraints(assignments, constraints);

  // 7. 경고 생성
  const allWarnings = generateAllWarnings(assignments, sameNameGroups, constraints, students);

  // 8. 균형 점수 계산
  const balances = assignments.map(a => calculateClassBalance(a));
  const overallBalance = balances.reduce((sum, b) => sum + b.balanceScore, 0) / balances.length;

  // 9. 제약조건 만족도 계산
  const constraintStats = calculateConstraintSatisfaction(assignments, constraints);

  // 10. 결과 반환
  return {
    assignments,
    allWarnings: sortWarningsBySeverity(allWarnings),
    sameNameGroups,
    overallBalance,
    totalConstraints: constraints.length,
    satisfiedConstraints: constraintStats.satisfied,
    violatedConstraints: constraintStats.violated
  };
}

/**
 * 초기 반 배정 - 동명이인 분리를 고려한 균형잡힌 배정
 */
function initializeClassAssignments(
  students: Student[],
  classCount: number,
  sameNameGroups: SameNameGroup[]
): AIClassAssignment[] {
  // 반 배정 초기화
  const assignments: AIClassAssignment[] = Array.from({ length: classCount }, (_, i) => ({
    classNumber: i + 1,
    students: [],
    maleCount: 0,
    femaleCount: 0,
    specialNeedsCount: 0,
    warnings: [],
    balance: {
      classNumber: i + 1,
      totalStudents: 0,
      maleCount: 0,
      femaleCount: 0,
      specialNeedsCount: 0,
      genderRatio: 0.5,
      balanceScore: 100
    },
    constraintsSatisfied: 0,
    constraintsViolated: 0
  }));

  // 동명이인 학생 ID 집합
  const sameNameStudentIds = new Set<string>();
  sameNameGroups.forEach(group => {
    group.studentIds.forEach(id => sameNameStudentIds.add(id));
  });

  // 1단계: 동명이인 학생들 먼저 배정 (각기 다른 반으로)
  sameNameGroups.forEach(group => {
    group.studentIds.forEach((studentId, index) => {
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      // 동명이인들을 최대한 고르게 분산
      const classIndex = index % classCount;
      const targetClass = assignments[classIndex];

      const assignedStudent = { ...student, assignedClass: targetClass.classNumber };
      targetClass.students.push(assignedStudent);

      if (student.gender === 'male') targetClass.maleCount++;
      else targetClass.femaleCount++;
      if (student.specialNeeds) targetClass.specialNeedsCount++;
    });
  });

  // 2단계: 나머지 학생들 균형잡힌 배정
  const remainingStudents = students.filter(s => !sameNameStudentIds.has(s.id));

  // 성별로 분류
  const maleStudents = remainingStudents.filter(s => s.gender === 'male');
  const femaleStudents = remainingStudents.filter(s => s.gender === 'female');

  // 남학생 배정
  distributeStudentsEvenly(maleStudents, assignments);

  // 여학생 배정
  distributeStudentsEvenly(femaleStudents, assignments);

  return assignments;
}

/**
 * 학생들을 반에 균등하게 분배
 */
function distributeStudentsEvenly(
  students: Student[],
  assignments: AIClassAssignment[]
): void {
  // 학생을 섞어서 무작위성 추가
  const shuffled = [...students].sort(() => Math.random() - 0.5);

  shuffled.forEach((student, index) => {
    // 현재 학생 수가 가장 적은 반 찾기
    const targetClass = assignments.reduce((min, current) =>
      current.students.length < min.students.length ? current : min
    );

    const assignedStudent = { ...student, assignedClass: targetClass.classNumber };
    targetClass.students.push(assignedStudent);

    if (student.gender === 'male') targetClass.maleCount++;
    else targetClass.femaleCount++;
    if (student.specialNeeds) targetClass.specialNeedsCount++;
  });
}

/**
 * 성별 균형 최적화
 */
function optimizeGenderBalance(assignments: AIClassAssignment[]): void {
  const maxIterations = 100;
  let iteration = 0;

  while (iteration < maxIterations) {
    const balances = assignments.map(a => calculateClassBalance(a));
    const avgRatio = balances.reduce((sum, b) => sum + b.genderRatio, 0) / balances.length;

    // 가장 불균형한 반 찾기
    const mostImbalanced = balances.reduce((max, current) => {
      const maxDev = Math.abs(max.genderRatio - avgRatio);
      const currentDev = Math.abs(current.genderRatio - avgRatio);
      return currentDev > maxDev ? current : max;
    });

    // 불균형이 충분히 작으면 종료
    if (Math.abs(mostImbalanced.genderRatio - avgRatio) < 0.05) break;

    // 학생 교환 시도
    const improved = trySwapForGenderBalance(assignments, mostImbalanced.classNumber, avgRatio);
    if (!improved) break;

    iteration++;
  }
}

/**
 * 성별 균형을 위한 학생 교환 시도
 */
function trySwapForGenderBalance(
  assignments: AIClassAssignment[],
  targetClassNum: number,
  avgRatio: number
): boolean {
  const targetClass = assignments.find(a => a.classNumber === targetClassNum);
  if (!targetClass) return false;

  const targetBalance = calculateClassBalance(targetClass);
  const needsMoreMales = targetBalance.genderRatio < avgRatio;

  // 교환 대상 성별
  const genderToSend = needsMoreMales ? 'female' : 'male';
  const genderToReceive = needsMoreMales ? 'male' : 'female';

  // 다른 반들과 교환 시도
  for (const otherClass of assignments) {
    if (otherClass.classNumber === targetClassNum) continue;

    const studentToSend = targetClass.students.find(s => s.gender === genderToSend);
    const studentToReceive = otherClass.students.find(s => s.gender === genderToReceive);

    if (studentToSend && studentToReceive) {
      // 학생 교환
      swapStudents(targetClass, otherClass, studentToSend, studentToReceive);
      return true;
    }
  }

  return false;
}

/**
 * 두 반 간 학생 교환
 */
function swapStudents(
  class1: AIClassAssignment,
  class2: AIClassAssignment,
  student1: Student,
  student2: Student
): void {
  // class1에서 student1 제거, student2 추가
  class1.students = class1.students.filter(s => s.id !== student1.id);
  student2.assignedClass = class1.classNumber;
  class1.students.push({ ...student2 });

  // class2에서 student2 제거, student1 추가
  class2.students = class2.students.filter(s => s.id !== student2.id);
  student1.assignedClass = class2.classNumber;
  class2.students.push({ ...student1 });

  // 카운트 업데이트
  updateClassCounts(class1);
  updateClassCounts(class2);
}

/**
 * 반의 통계 카운트 업데이트
 */
function updateClassCounts(assignment: AIClassAssignment): void {
  assignment.maleCount = assignment.students.filter(s => s.gender === 'male').length;
  assignment.femaleCount = assignment.students.filter(s => s.gender === 'female').length;
  assignment.specialNeedsCount = assignment.students.filter(s => s.specialNeeds).length;
}

/**
 * 특수학급 학생 분산
 */
function distributeSpecialNeeds(assignments: AIClassAssignment[]): void {
  const specialNeedsStudents: { student: Student; classNum: number }[] = [];

  // 특수학급 학생들 수집
  assignments.forEach(assignment => {
    assignment.students.forEach(student => {
      if (student.specialNeeds) {
        specialNeedsStudents.push({
          student,
          classNum: assignment.classNumber
        });
      }
    });
  });

  // 평균 특수학급 학생 수
  const avgSpecialNeeds = specialNeedsStudents.length / assignments.length;

  // 특수학급 학생이 집중된 반에서 분산
  assignments.forEach(assignment => {
    const currentCount = assignment.students.filter(s => s.specialNeeds).length;

    if (currentCount > avgSpecialNeeds + 1.5) {
      // 과도하게 많은 경우, 다른 반으로 이동
      const excess = Math.floor(currentCount - avgSpecialNeeds);
      const studentsToMove = assignment.students
        .filter(s => s.specialNeeds)
        .slice(0, excess);

      studentsToMove.forEach(studentToMove => {
        // 가장 적은 특수학급 학생을 가진 반 찾기
        const targetClass = assignments.reduce((min, current) => {
          const minCount = min.students.filter(s => s.specialNeeds).length;
          const currentCount = current.students.filter(s => s.specialNeeds).length;
          return currentCount < minCount ? current : min;
        });

        if (targetClass.classNumber !== assignment.classNumber) {
          // 일반 학생과 교환
          const normalStudent = targetClass.students.find(s =>
            !s.specialNeeds && s.gender === studentToMove.gender
          );

          if (normalStudent) {
            swapStudents(assignment, targetClass, studentToMove, normalStudent);
          }
        }
      });
    }
  });
}

/**
 * 분리/통합 제약조건 적용
 */
function applyConstraints(
  assignments: AIClassAssignment[],
  constraints: AssignmentConstraint[]
): void {
  const maxIterations = 50;
  let iteration = 0;

  while (iteration < maxIterations) {
    let improved = false;

    for (const constraint of constraints) {
      const student = findStudentInAssignments(assignments, constraint.studentId);
      if (!student || !student.assignedClass) continue;

      const studentClass = assignments.find(a => a.classNumber === student.assignedClass);
      if (!studentClass) continue;

      if (constraint.type === 'separate') {
        // 분리 제약: 같은 반에 있으면 이동
        for (const targetId of constraint.targetIds) {
          const targetStudent = findStudentInAssignments(assignments, targetId);
          if (targetStudent && targetStudent.assignedClass === student.assignedClass) {
            // 다른 반으로 이동 시도
            const moved = moveStudentToAnotherClass(assignments, targetStudent);
            if (moved) improved = true;
          }
        }
      } else if (constraint.type === 'group') {
        // 통합 제약: 다른 반에 있으면 같은 반으로 이동 시도
        for (const targetId of constraint.targetIds) {
          const targetStudent = findStudentInAssignments(assignments, targetId);
          if (targetStudent && targetStudent.assignedClass !== student.assignedClass) {
            const moved = moveStudentToClass(assignments, targetStudent, student.assignedClass);
            if (moved) improved = true;
          }
        }
      }
    }

    if (!improved) break;
    iteration++;
  }
}

/**
 * 학생을 다른 반으로 이동
 */
function moveStudentToAnotherClass(
  assignments: AIClassAssignment[],
  student: Student
): boolean {
  if (!student.assignedClass) return false;

  const currentClass = assignments.find(a => a.classNumber === student.assignedClass);
  if (!currentClass) return false;

  // 다른 반 찾기
  const otherClasses = assignments.filter(a => a.classNumber !== student.assignedClass);

  for (const targetClass of otherClasses) {
    // 같은 성별의 학생과 교환 시도
    const swapCandidate = targetClass.students.find(s => s.gender === student.gender);
    if (swapCandidate) {
      swapStudents(currentClass, targetClass, student, swapCandidate);
      return true;
    }
  }

  return false;
}

/**
 * 학생을 특정 반으로 이동
 */
function moveStudentToClass(
  assignments: AIClassAssignment[],
  student: Student,
  targetClassNum: number
): boolean {
  if (!student.assignedClass || student.assignedClass === targetClassNum) return false;

  const currentClass = assignments.find(a => a.classNumber === student.assignedClass);
  const targetClass = assignments.find(a => a.classNumber === targetClassNum);

  if (!currentClass || !targetClass) return false;

  // 같은 성별의 학생과 교환 시도
  const swapCandidate = targetClass.students.find(s => s.gender === student.gender);
  if (swapCandidate) {
    swapStudents(currentClass, targetClass, student, swapCandidate);
    return true;
  }

  return false;
}

/**
 * 모든 경고 생성
 */
function generateAllWarnings(
  assignments: AIClassAssignment[],
  sameNameGroups: SameNameGroup[],
  constraints: AssignmentConstraint[],
  originalStudents: Student[]
): AssignmentWarning[] {
  const warnings: AssignmentWarning[] = [];

  // 1. 동명이인 경고
  const sameNameWarnings = createSameNameWarnings(sameNameGroups, originalStudents);
  warnings.push(...sameNameWarnings);

  // 2. 제약조건 위반 경고
  const constraintWarnings = checkConstraintViolations(assignments, constraints);
  warnings.push(...constraintWarnings);

  // 3. 성별 불균형 경고
  const balances = assignments.map(a => calculateClassBalance(a));
  balances.forEach(balance => {
    const genderWarnings = checkGenderImbalance(balance, balances);
    warnings.push(...genderWarnings);
  });

  // 4. 특수학급 집중 경고
  balances.forEach(balance => {
    const specialNeedsWarnings = checkSpecialNeedsClustering(balance, balances);
    warnings.push(...specialNeedsWarnings);
  });

  // 각 반의 경고 할당
  assignments.forEach(assignment => {
    assignment.warnings = warnings.filter(w => {
      if (w.studentId.startsWith('class-')) {
        return w.studentId === `class-${assignment.classNumber}`;
      }
      return assignment.students.some(s => s.id === w.studentId);
    });
  });

  return warnings;
}

/**
 * 제약조건 만족도 계산
 */
function calculateConstraintSatisfaction(
  assignments: AIClassAssignment[],
  constraints: AssignmentConstraint[]
): { satisfied: number; violated: number } {
  let satisfied = 0;
  let violated = 0;

  constraints.forEach(constraint => {
    const student = findStudentInAssignments(assignments, constraint.studentId);
    if (!student || !student.assignedClass) return;

    constraint.targetIds.forEach(targetId => {
      const targetStudent = findStudentInAssignments(assignments, targetId);
      if (!targetStudent || !targetStudent.assignedClass) return;

      if (constraint.type === 'separate') {
        if (student.assignedClass !== targetStudent.assignedClass) {
          satisfied++;
        } else {
          violated++;
        }
      } else if (constraint.type === 'group') {
        if (student.assignedClass === targetStudent.assignedClass) {
          satisfied++;
        } else {
          violated++;
        }
      }
    });
  });

  // 각 반의 제약조건 통계 업데이트
  assignments.forEach(assignment => {
    const classConstraints = constraints.filter(c =>
      assignment.students.some(s => s.id === c.studentId)
    );

    let classSatisfied = 0;
    let classViolated = 0;

    classConstraints.forEach(constraint => {
      const student = assignment.students.find(s => s.id === constraint.studentId);
      if (!student) return;

      constraint.targetIds.forEach(targetId => {
        const targetStudent = findStudentInAssignments(assignments, targetId);
        if (!targetStudent || !targetStudent.assignedClass) return;

        if (constraint.type === 'separate') {
          if (student.assignedClass !== targetStudent.assignedClass) {
            classSatisfied++;
          } else {
            classViolated++;
          }
        } else if (constraint.type === 'group') {
          if (student.assignedClass === targetStudent.assignedClass) {
            classSatisfied++;
          } else {
            classViolated++;
          }
        }
      });
    });

    assignment.constraintsSatisfied = classSatisfied;
    assignment.constraintsViolated = classViolated;
  });

  return { satisfied, violated };
}
