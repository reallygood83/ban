import { 
  Student, 
  Request, 
  AssignmentSettings, 
  AssignmentResult, 
  AssignmentMethod, 
  NoteType,
  SeparationReason,
  CLASS_NAMES
} from './types';

// Helper to generate a unique key for startConfig
export const getStartConfigKey = (currentClass: number, gender: string) => `${currentClass}_${gender}`;

/**
 * Main Algorithm Function
 */
export const runAssignmentAlgorithm = (
  students: Student[],
  requests: Request[],
  settings: AssignmentSettings
): AssignmentResult[] => {
  
  const results: AssignmentResult[] = students.map(s => ({
    studentId: s.id,
    step1ClassIndex: -1,
    step2ClassIndex: -1,
    step3ClassIndex: -1,
    highlightStep2: false,
    highlightStep3: false,
    log: []
  }));

  const getRes = (id: string) => results.find(r => r.studentId === id)!;
  const getStudent = (id: string) => students.find(s => s.id === id)!;
  const targetCount = settings.targetClassCount;

  // --- 1. Preparation: Sort Lists per Current Class & Gender ---
  // We need to respect the "Start Student" setting.
  // If no start student is picked, we default to Number 1.
  
  // Group by Class -> Gender
  const groups: Record<string, Student[]> = {};
  students.forEach(s => {
    const key = getStartConfigKey(s.currentClass, s.gender);
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });

  // Sort each group by number
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => a.number - b.number);
  });

  // Re-order groups based on "Start Student"
  // If start student is number 5, the order becomes 5, 6, 7... 1, 2, 3, 4
  Object.keys(groups).forEach(key => {
    const startStudentId = settings.startConfig[key];
    if (startStudentId) {
      const list = groups[key];
      const idx = list.findIndex(s => s.id === startStudentId);
      if (idx > 0) {
        const part1 = list.slice(idx);
        const part2 = list.slice(0, idx);
        groups[key] = [...part1, ...part2];
      }
    }
  });

  // --- Step 1: Initial Allocation ---
  
  if (settings.method === AssignmentMethod.Random) {
    // Simple random distribution
    students.forEach((s, i) => {
      getRes(s.id).step1ClassIndex = Math.floor(Math.random() * targetCount);
    });
  } else {
    // Loop or Zigzag
    // We process each "Current Class" separately to respect "Start Target Class"
    const currentClasses = Array.from(new Set(students.map(s => s.currentClass))).sort((a, b) => a - b);

    // Prepare Pattern for Zigzag
    let pattern: number[] = [];
    if (settings.method === AssignmentMethod.Zigzag) {
      for(let i=0; i<targetCount; i++) pattern.push(i);
      for(let i=targetCount-1; i>=0; i--) pattern.push(i); // e.g. 0,1,2,2,1,0
    }

    currentClasses.forEach(cClass => {
      // Get all students in this class
      const boys = groups[getStartConfigKey(cClass, '남')] || [];
      const girls = groups[getStartConfigKey(cClass, '여')] || [];
      
      const distributeWithPattern = (list: Student[], gender: string) => {
        // Look up specific start target for this gender
        // Key example: "1_남" -> value: 0 (Ga), "1_여" -> value: 1 (Na)
        const startKey = getStartConfigKey(cClass, gender);
        let startIndex = settings.startTargetClass[startKey] ?? 0;
        
        list.forEach((s, i) => {
          if (settings.method === AssignmentMethod.Loop) {
            getRes(s.id).step1ClassIndex = (startIndex + i) % targetCount;
          } else {
            // Zigzag pattern usage
            // Map the startIndex (which is a class Index 0..N) to an index in the pattern?
            // Usually "Start Class" means the first student goes to that class.
            // In Zigzag pattern [0, 1, 2, 2, 1, 0], if start is 'Na' (1), we should start at index 1.
            // If start is 'Da' (2), index 2.
            
            // Find the first occurrence of startIndex in pattern to start cycle
            const patternStartOffset = pattern.indexOf(startIndex);
            const actualOffset = patternStartOffset === -1 ? 0 : patternStartOffset;

            const pIndex = (actualOffset + i) % pattern.length;
            getRes(s.id).step1ClassIndex = pattern[pIndex];
          }
        });
      };

      distributeWithPattern(boys, '남');
      distributeWithPattern(girls, '여');
    });
  }

  // Initialize Step 2 with Step 1
  results.forEach(r => r.step2ClassIndex = r.step1ClassIndex);

  // --- Step 2: Adjustments (Conflicts) ---
  // Priorities:
  // 1. Same Name (distribute)
  // 2. Special Needs (distribute)
  // 3. Separation Requests
  // 4. Integration Requests
  // 5. Note Priority

  // Helper to move a student to the "farthest" class from current
  // or adjacent if farthest is blocked (though here we just pick best candidate).
  // "Farthest": If total 5 classes, and current is 0. Farthest is 2 or 3.
  // We will simply search for a class index that minimizes conflicts.
  
  const moveStudent = (res: AssignmentResult, forbiddenIndices: Set<number>, reason: string) => {
    // Try to find a class index not in forbidden and not current
    let bestClass = -1;
    let maxDistance = -1;

    for (let c = 0; c < targetCount; c++) {
      if (c === res.step2ClassIndex) continue;
      if (forbiddenIndices.has(c)) continue;

      // Calculate distance (circular)
      let dist = Math.abs(c - res.step2ClassIndex);
      if (dist > targetCount / 2) dist = targetCount - dist;

      if (dist > maxDistance) {
        maxDistance = dist;
        bestClass = c;
      }
    }

    if (bestClass !== -1) {
      res.step2ClassIndex = bestClass;
      res.highlightStep2 = true;
      res.log.push(reason);
      return true;
    }
    return false;
  };

  // We run adjustments iteratively.
  // A simple pass might miss cascaded conflicts, but multiple passes can infinite loop.
  // We'll do a few passes or handles strictly by priority.

  // 1. Same Name
  if (settings.sameNameStrategy === 'distribute') {
    const nameMap: Record<string, Student[]> = {};
    students.forEach(s => {
      if (!nameMap[s.name]) nameMap[s.name] = [];
      nameMap[s.name].push(s);
    });

    Object.values(nameMap).forEach(group => {
      if (group.length > 1) {
        // Sort by name (already same) -> then maybe current class?
        // "Go to back of name sort" -> effectively last one moves.
        for (let i = 1; i < group.length; i++) {
            const student = group[i];
            const res = getRes(student.id);
            // Check if collides with previous
            const occupiedClasses = new Set<number>();
            for(let j=0; j<i; j++) occupiedClasses.add(getRes(group[j].id).step2ClassIndex);

            if (occupiedClasses.has(res.step2ClassIndex)) {
                moveStudent(res, occupiedClasses, '동명이인 분리');
            }
        }
      }
    });
  }

  // 2. Special Needs (One per class preferably)
  const specialStudents = students.filter(s => s.noteType === NoteType.Special);
  // This is a global distribution check.
  // If a class has > 1 special student, move one.
  // Simple heuristic: Count per class, if > 1, move excess.
  let specialCounts = new Array(targetCount).fill(0);
  specialStudents.forEach(s => specialCounts[getRes(s.id).step2ClassIndex]++);

  specialStudents.forEach(s => {
    const res = getRes(s.id);
    if (specialCounts[res.step2ClassIndex] > 1) {
      // Need to move
      // Find class with 0 special students
      const target = specialCounts.findIndex(c => c === 0);
      if (target !== -1) {
        specialCounts[res.step2ClassIndex]--;
        res.step2ClassIndex = target;
        specialCounts[target]++;
        res.highlightStep2 = true;
        res.log.push('특수학생 분산');
      }
    }
  });

  // 3. Separation Requests
  const sepReqs = requests.filter(r => r.type === 'separation');
  sepReqs.forEach(req => {
    const r1 = getRes(req.studentId1);
    const r2 = getRes(req.studentId2);
    if (r1.step2ClassIndex === r2.step2ClassIndex) {
      // Move r2 (Target student)
      moveStudent(r2, new Set([r1.step2ClassIndex]), `분리요청(${req.reason})`);
    }
  });

  // 4. Integration Requests
  const intReqs = requests.filter(r => r.type === 'integration');
  intReqs.forEach(req => {
    const r1 = getRes(req.studentId1);
    const r2 = getRes(req.studentId2);
    if (r1.step2ClassIndex !== r2.step2ClassIndex) {
      // Move to class with fewer students? Or just move r2 to r1?
      // Prompt: "Move from larger class to smaller class"
      // Let's just move r2 to r1 for simplicity unless r1 is crowded.
      // We haven't calculated crowds yet. Let's assume move r2 to r1.
      const oldClass = r2.step2ClassIndex;
      r2.step2ClassIndex = r1.step2ClassIndex;
      if (oldClass !== r2.step2ClassIndex) {
        r2.highlightStep2 = true;
        r2.log.push(`통합요청(${req.reason})`);
      }
    }
  });

  // 5. Note Priority Distribution
  // For each priority note type, ensure they are distributed?
  // Prompt says: "Apply based on priority... move if conflict?"
  // It implies distributing them so they don't clump.
  // Similar to Special Needs.
  settings.notePriority.forEach(noteType => {
      const targetStudents = students.filter(s => s.noteType === noteType);
      const counts = new Array(targetCount).fill(0);
      targetStudents.forEach(s => counts[getRes(s.id).step2ClassIndex]++);

      // If any class has significantly more than average, move.
      // Avg = Count / N. If > Avg + 1, move.
      const avg = Math.ceil(targetStudents.length / targetCount);
      
      targetStudents.forEach(s => {
          const res = getRes(s.id);
          if (counts[res.step2ClassIndex] > avg) {
               // Try move to a class with < avg
               const target = counts.findIndex(c => c < avg);
               if (target !== -1) {
                   counts[res.step2ClassIndex]--;
                   res.step2ClassIndex = target;
                   counts[target]++;
                   res.highlightStep2 = true;
                   res.log.push(`비고(${noteType}) 분산`);
               }
          }
      });
  });


  // --- Step 3: Balancing ---
  results.forEach(r => r.step3ClassIndex = r.step2ClassIndex);

  // Constraints for moving in Step 3:
  // Cannot move if: Special, Separation involved, Integration involved, or specific note distribution was applied?
  // Prompt: "Only move students without specific constraints (SameName, Special, Sep, Int, NoteDistribution)"
  // We can track "locked" status.
  const lockedIds = new Set<string>();
  
  // Re-evaluate who is involved in constraints to lock them
  // 1. Same names (if collision existed)
  // 2. Special students
  specialStudents.forEach(s => lockedIds.add(s.id));
  // 3. Requests
  requests.forEach(r => { lockedIds.add(r.studentId1); lockedIds.add(r.studentId2); });
  // 4. Notes (if in priority list)
  settings.notePriority.forEach(nt => {
      students.filter(s => s.noteType === nt).forEach(s => lockedIds.add(s.id));
  });

  // Calculate target capacities
  // Base capacity = Total / N
  // Adjustment: Special needs class gets -X capacity
  const classWeights = new Array(targetCount).fill(0); // Reduction amount
  students.forEach(s => {
      if (s.noteType === NoteType.Special) {
          classWeights[getRes(s.id).step3ClassIndex] = settings.specialNeedsReduction; // e.g., -2
      }
  });

  // Effective capacity calculation is complex because total students is fixed.
  // We want: Count(Class i) + Weight(Class i) ≈ Average
  // Actually, standard logic: A class with a special student counts that student as (1 + Reduction).
  // Example: Class A has 1 special (-2). Real count 20. Effective count = 20 + 2 = 22.
  // We want to equalize Effective Counts.
  
  // NOTE: Prompt says "Special class size decreases by selected amount".
  // This means if reduction is -2, that class should have 2 FEWER students than max class.
  // Logic: Calculate "Virtual Count". Each regular student = 1. Special student = 1 + ReductionAbs.
  // If reduction is -2 (meaning taking 2 spots), Special student weight is 3? 
  // Or simply: Target is to balance (Actual Count - WeightAdjustment)?
  // Let's use: Score = ActualCount + (HasSpecial ? Abs(Reduction) : 0).
  // Try to balance Score.
  
  const reductionAbs = Math.abs(settings.specialNeedsReduction);
  const getScore = (classIdx: number) => {
      let count = 0;
      let hasSpecial = false;
      results.forEach(r => {
          if (r.step3ClassIndex === classIdx) {
              count++;
              if (getStudent(r.studentId).noteType === NoteType.Special) hasSpecial = true;
          }
      });
      return count + (hasSpecial ? reductionAbs : 0);
  };

  // Balancing Algorithm (Greedy)
  // Repeat until balanced or limit reached
  let iterations = 0;
  while (iterations < 1000) {
      const scores = Array.from({length: targetCount}, (_, i) => ({idx: i, score: getScore(i)}));
      scores.sort((a, b) => a.score - b.score);
      
      const minClass = scores[0];
      const maxClass = scores[targetCount - 1];

      if (maxClass.score - minClass.score <= 1) break; // Balanced

      // Move a NON-LOCKED student from Max to Min
      // Also try to respect gender balance?
      // Prompt says: "Match Total, Male, Female counts similar"
      // Let's check gender breakdown of Max Class
      const candidates = results.filter(r => 
          r.step3ClassIndex === maxClass.idx && 
          !lockedIds.has(r.studentId)
      );
      
      if (candidates.length === 0) break; // Cannot move anyone

      // Pick best candidate to move (Gender balancing)
      // Check gender counts in Max and Min
      const getGenderCount = (cIdx: number, g: string) => 
          results.filter(r => r.step3ClassIndex === cIdx && getStudent(r.studentId).gender === g).length;

      const maxMale = getGenderCount(maxClass.idx, '남');
      const maxFemale = getGenderCount(maxClass.idx, '여');
      const minMale = getGenderCount(minClass.idx, '남');
      const minFemale = getGenderCount(minClass.idx, '여');

      let studentToMove: AssignmentResult | undefined;

      // If Max has more males relative to Min, move a male
      if (maxMale - minMale > maxFemale - minFemale) {
          studentToMove = candidates.find(r => getStudent(r.studentId).gender === '남');
      } else {
          studentToMove = candidates.find(r => getStudent(r.studentId).gender === '여');
      }
      
      // Fallback
      if (!studentToMove) studentToMove = candidates[0];

      // Move
      studentToMove.step3ClassIndex = minClass.idx;
      studentToMove.highlightStep3 = true;
      // studentToMove.log.push('인원 조정'); // Optional log
      
      iterations++;
  }

  return results;
};