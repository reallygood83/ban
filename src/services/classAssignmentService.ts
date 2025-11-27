import { Student, ClassAssignment } from '../types';

/**
 * 반 배정 알고리즘 서비스
 *
 * 배정 원칙:
 * 1. 성별 균형: 각 반의 남녀 비율을 최대한 균등하게 배정
 * 2. 특수사항 고려: 특수학급 학생을 각 반에 고르게 분산
 * 3. 분리 요청: separateFrom 목록의 학생들을 다른 반으로 배정
 * 4. 통합 요청: groupWith 목록의 학생들을 같은 반으로 배정 (우선순위 높음)
 */

interface AssignmentResult {
  assignments: ClassAssignment[];
  warnings: string[];
}

/**
 * 학생들을 반에 배정하는 메인 함수
 */
export function assignStudentsToClasses(
  students: Student[],
  classCount: number
): AssignmentResult {
  const warnings: string[] = [];

  // 빈 반 생성
  const classes: ClassAssignment[] = Array.from({ length: classCount }, (_, i) => ({
    classNumber: i + 1,
    students: [],
    maleCount: 0,
    femaleCount: 0,
    specialNeedsCount: 0
  }));

  // 1단계: 통합 요청이 있는 학생들을 먼저 처리 (그룹 단위로)
  const grouped = new Set<string>();
  students.forEach(student => {
    if (student.groupWith && student.groupWith.length > 0 && !grouped.has(student.id)) {
      const group = [student, ...students.filter(s => student.groupWith?.includes(s.id))];

      // 그룹이 너무 크면 경고
      if (group.length > Math.ceil(students.length / classCount / 2)) {
        warnings.push(`${student.displayName} 그룹이 너무 큽니다 (${group.length}명). 일부만 같은 반에 배정될 수 있습니다.`);
      }

      // 그룹을 가장 적합한 반에 배정
      const targetClass = findBestClassForGroup(group, classes);
      group.forEach(s => {
        assignStudentToClass(s, targetClass);
        grouped.add(s.id);
      });
    }
  });

  // 2단계: 특수사항이 있는 학생들을 균등하게 분산
  const specialNeedsStudents = students.filter(
    s => s.specialNeeds && !grouped.has(s.id)
  );

  specialNeedsStudents.forEach(student => {
    const targetClass = findClassWithLeastSpecialNeeds(classes, student);
    assignStudentToClass(student, targetClass);
    grouped.add(student.id);
  });

  // 3단계: 나머지 학생들을 성별 균형을 고려하여 배정
  const remainingStudents = students.filter(s => !grouped.has(s.id));

  // 남학생과 여학생으로 분리
  const maleStudents = remainingStudents.filter(s => s.gender === 'male');
  const femaleStudents = remainingStudents.filter(s => s.gender === 'female');

  // 성별로 순차 배정하여 균형 유지
  assignStudentsByGenderBalance(maleStudents, femaleStudents, classes);

  // 4단계: 분리 요청 검증 및 경고
  validateSeparationRequests(classes, warnings);

  return { assignments: classes, warnings };
}

/**
 * 그룹에 가장 적합한 반 찾기
 */
function findBestClassForGroup(
  group: Student[],
  classes: ClassAssignment[]
): ClassAssignment {
  // 그룹의 성별 구성 계산
  const groupMaleCount = group.filter(s => s.gender === 'male').length;
  const groupFemaleCount = group.filter(s => s.gender === 'female').length;

  // 각 반의 점수 계산 (점수가 낮을수록 적합)
  const scores = classes.map(cls => {
    const sizeAfter = cls.students.length + group.length;
    const maleAfter = cls.maleCount + groupMaleCount;
    const femaleAfter = cls.femaleCount + groupFemaleCount;

    // 성별 불균형 점수 (0에 가까울수록 균형잡힘)
    const genderImbalance = Math.abs(maleAfter - femaleAfter);

    // 반 크기 점수 (작을수록 좋음)
    const sizeScore = sizeAfter;

    return {
      class: cls,
      score: genderImbalance * 2 + sizeScore
    };
  });

  // 점수가 가장 낮은 반 선택
  scores.sort((a, b) => a.score - b.score);
  return scores[0].class;
}

/**
 * 특수사항 학생이 가장 적은 반 찾기
 */
function findClassWithLeastSpecialNeeds(
  classes: ClassAssignment[],
  student: Student
): ClassAssignment {
  // 각 반의 점수 계산
  const scores = classes.map(cls => {
    const maleAfter = cls.maleCount + (student.gender === 'male' ? 1 : 0);
    const femaleAfter = cls.femaleCount + (student.gender === 'female' ? 1 : 0);
    const genderImbalance = Math.abs(maleAfter - femaleAfter);

    return {
      class: cls,
      score: cls.specialNeedsCount * 10 + genderImbalance * 2 + cls.students.length
    };
  });

  scores.sort((a, b) => a.score - b.score);
  return scores[0].class;
}

/**
 * 성별 균형을 고려하여 학생 배정
 */
function assignStudentsByGenderBalance(
  maleStudents: Student[],
  femaleStudents: Student[],
  classes: ClassAssignment[]
): void {
  let maleIndex = 0;
  let femaleIndex = 0;

  // 모든 학생이 배정될 때까지 반복
  while (maleIndex < maleStudents.length || femaleIndex < femaleStudents.length) {
    // 각 반에 대해 성별 균형을 고려하여 학생 배정
    for (const cls of classes) {
      if (maleIndex >= maleStudents.length && femaleIndex >= femaleStudents.length) {
        break;
      }

      // 현재 반의 성별 균형 계산
      const genderDiff = cls.maleCount - cls.femaleCount;

      if (genderDiff > 0 && femaleIndex < femaleStudents.length) {
        // 남학생이 더 많으면 여학생 배정
        assignStudentToClass(femaleStudents[femaleIndex], cls);
        femaleIndex++;
      } else if (genderDiff < 0 && maleIndex < maleStudents.length) {
        // 여학생이 더 많으면 남학생 배정
        assignStudentToClass(maleStudents[maleIndex], cls);
        maleIndex++;
      } else {
        // 균형이 맞으면 남은 학생 중 아무나 배정
        if (maleIndex < maleStudents.length) {
          assignStudentToClass(maleStudents[maleIndex], cls);
          maleIndex++;
        } else if (femaleIndex < femaleStudents.length) {
          assignStudentToClass(femaleStudents[femaleIndex], cls);
          femaleIndex++;
        }
      }
    }
  }
}

/**
 * 학생을 반에 배정하고 통계 업데이트
 */
function assignStudentToClass(
  student: Student,
  targetClass: ClassAssignment
): void {
  const assignedStudent = { ...student, assignedClass: targetClass.classNumber };
  targetClass.students.push(assignedStudent);

  if (student.gender === 'male') {
    targetClass.maleCount++;
  } else {
    targetClass.femaleCount++;
  }

  if (student.specialNeeds) {
    targetClass.specialNeedsCount++;
  }
}

/**
 * 분리 요청 검증 및 경고 생성
 */
function validateSeparationRequests(
  classes: ClassAssignment[],
  warnings: string[]
): void {
  classes.forEach(cls => {
    cls.students.forEach(student => {
      if (student.separateFrom && student.separateFrom.length > 0) {
        const separateIds = student.separateFrom;
        const sameClassStudents = cls.students.filter(s =>
          separateIds.includes(s.id)
        );

        if (sameClassStudents.length > 0) {
          warnings.push(
            `${student.displayName}과(와) ${sameClassStudents.map(s => s.displayName).join(', ')}은(는) ` +
            `분리 요청이 있었으나 ${cls.classNumber}반에 같이 배정되었습니다.`
          );
        }
      }
    });
  });
}

/**
 * 배정 결과의 균형도 점수 계산 (0~100, 높을수록 균형잡힘)
 */
export function calculateBalanceScore(assignments: ClassAssignment[]): number {
  if (assignments.length === 0) return 0;

  // 1. 반별 인원 균형 점수 (40점)
  const studentCounts = assignments.map(c => c.students.length);
  const avgStudents = studentCounts.reduce((a, b) => a + b, 0) / assignments.length;
  const maxDeviation = Math.max(...studentCounts.map(c => Math.abs(c - avgStudents)));
  const sizeScore = Math.max(0, 40 - maxDeviation * 5);

  // 2. 성별 균형 점수 (40점)
  const genderScores = assignments.map(cls => {
    if (cls.students.length === 0) return 40;
    const genderDiff = Math.abs(cls.maleCount - cls.femaleCount);
    const genderRatio = genderDiff / cls.students.length;
    return Math.max(0, 40 - genderRatio * 100);
  });
  const avgGenderScore = genderScores.reduce((a, b) => a + b, 0) / assignments.length;

  // 3. 특수사항 분산 점수 (20점)
  const specialCounts = assignments.map(c => c.specialNeedsCount);
  const avgSpecial = specialCounts.reduce((a, b) => a + b, 0) / assignments.length;
  const specialDeviation = Math.max(...specialCounts.map(c => Math.abs(c - avgSpecial)));
  const specialScore = Math.max(0, 20 - specialDeviation * 5);

  return Math.round(sizeScore + avgGenderScore + specialScore);
}

/**
 * 배정 결과 요약 통계 생성
 */
export function generateAssignmentSummary(assignments: ClassAssignment[]): {
  totalStudents: number;
  averagePerClass: number;
  balanceScore: number;
  genderBalance: string;
} {
  const totalStudents = assignments.reduce((sum, c) => sum + c.students.length, 0);
  const averagePerClass = totalStudents / assignments.length;
  const balanceScore = calculateBalanceScore(assignments);

  const totalMale = assignments.reduce((sum, c) => sum + c.maleCount, 0);
  const totalFemale = assignments.reduce((sum, c) => sum + c.femaleCount, 0);
  const genderBalance = `남 ${totalMale}명 : 여 ${totalFemale}명`;

  return {
    totalStudents,
    averagePerClass: Math.round(averagePerClass * 10) / 10,
    balanceScore,
    genderBalance
  };
}
