# GoodBye! - AI 반 배정 시스템

학급 편성을 스마트하게! Gemini AI가 최적의 반 배정을 추천합니다.

## 🎯 프로젝트 소개

**GoodBye!**는 교사들의 복잡한 반 배정 작업을 AI로 자동화하는 웹 애플리케이션입니다. 성별 균형, 특수학급 학생 분산, 학생 간 분리/통합 요청 등 다양한 조건을 고려하여 최적의 반 배정 결과를 제공합니다.

### 주요 기능

- ✅ **Google 소셜 로그인** - Firebase Authentication 기반 안전한 인증
- 📊 **프로젝트 관리** - 여러 학년/반의 배정 프로젝트를 생성하고 관리
- 📝 **학생 명단 관리** - Excel 업로드 또는 직접 입력으로 학생 정보 등록
- 🔐 **데이터 암호화** - AES-GCM 256-bit 암호화로 학생 정보 보호
- 🤖 **AI 반 배정** - 균형잡힌 자동 배정 알고리즘
- 📈 **배정 통계** - 성비, 특수학급 분포, 균형 점수 등 상세 통계
- 💾 **결과 내보내기** - Excel(.xls) 및 CSV 형식으로 결과 다운로드
- ✏️ **학생 정보 편집** - 특수사항, 비고, 같은 반 희망, 분리 희망 설정

## 🛠️ 기술 스택

### Frontend
- **React 19.2.0** - 최신 React 버전
- **TypeScript** - 타입 안전성
- **React Router v7** - 클라이언트 사이드 라우팅
- **Tailwind CSS** - 유틸리티 기반 스타일링
- **Lucide React** - 아이콘 라이브러리

### Backend & Database
- **Firebase Authentication** - 사용자 인증
- **Firebase Firestore** - NoSQL 데이터베이스
- **Firebase Hosting** - 정적 호스팅

### AI & Security
- **Google Gemini API** - AI 기반 추천 (향후 적용 예정)
- **Web Crypto API** - AES-GCM 256-bit 데이터 암호화

### Design System
- **Neo-Brutalism** - 대담한 색상, 굵은 테두리, 그림자 효과

## 📦 설치 및 실행

### 사전 요구사항

- Node.js 18.0 이상
- npm 또는 yarn
- Firebase 프로젝트 설정

### 설치

```bash
# 저장소 클론
git clone https://github.com/yourusername/goodbye-class-assignment.git
cd goodbye-class-assignment

# 의존성 설치
npm install
```

### 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 Firebase 설정을 추가합니다:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:5173](http://localhost:5173)을 엽니다.

### 빌드

```bash
npm run build
```

빌드된 파일은 `dist/` 디렉토리에 생성됩니다.

## 📂 프로젝트 구조

```
ban-main/
├── src/
│   ├── components/          # 재사용 가능한 컴포넌트
│   │   ├── AddStudentModal.tsx
│   │   ├── EditStudentModal.tsx
│   │   └── ExcelUploader.tsx
│   ├── contexts/            # React Context
│   │   └── AuthContext.tsx
│   ├── lib/                 # 유틸리티 함수
│   │   ├── crypto.ts        # 암호화 함수
│   │   ├── excelExport.ts   # Excel/CSV 내보내기
│   │   └── excelParser.ts   # Excel 파싱
│   ├── pages/               # 페이지 컴포넌트
│   │   ├── Landing.tsx
│   │   ├── Dashboard.tsx
│   │   ├── CreateProject.tsx
│   │   ├── ManageStudents.tsx
│   │   └── ClassAssignment.tsx
│   ├── services/            # Firebase 서비스
│   │   ├── projectService.ts
│   │   └── classAssignmentService.ts
│   ├── types/               # TypeScript 타입 정의
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## 🚀 주요 기능 상세

### 1. 프로젝트 생성

- 학년 선택 (1-6학년)
- 반 개수 설정 (2-9개)
- 프로젝트 이름 지정
- Firebase Firestore에 자동 저장

### 2. 학생 명단 관리

#### Excel 파일 업로드
- 지원 형식: `.xlsx`, `.xls`
- 필수 컬럼: 이름, 성별
- 선택 컬럼: 학번, 특수사항, 비고

#### 직접 입력
- 학생 개별 추가
- 모든 필드 입력 가능
- 실시간 명단 업데이트

#### 정보 수정
- 특수사항 및 비고 편집
- 같은 반 희망 학생 선택 (복수 가능)
- 분리 희망 학생 선택 (복수 가능)

### 3. 반 배정 알고리즘

#### 균형 요소
- **성별 균형**: 각 반의 남녀 비율 최적화
- **특수학급 분산**: 특수학급 학생을 골고루 배정
- **분리/통합 조건**: 학생 간 관계 고려

#### 배정 결과
- 반별 학생 목록
- 성비 통계
- 특수학급 분포
- 균형 점수 (0-100점)

### 4. 결과 내보내기

#### Excel 형식 (.xls)
- 스타일링된 HTML 테이블
- 통계 정보 포함
- Microsoft Excel에서 바로 열림

#### CSV 형식
- UTF-8 BOM 인코딩 (한글 지원)
- 반, 번호, 이름, 성별, 특수사항 포함
- 모든 스프레드시트 앱 호환

## 🔒 보안

### 데이터 암호화

학생 개인정보는 AES-GCM 256-bit 암호화로 보호됩니다:

- 사용자별 고유 암호화 키 생성
- Firestore 저장 전 자동 암호화
- 클라이언트에서만 복호화 가능
- 서버에서는 암호화된 데이터만 저장

### Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId} {
      allow read, write: if request.auth != null
                       && request.auth.uid == resource.data.userId;
    }
  }
}
```

## 🎨 디자인 시스템

### Neo-Brutalism

- **굵은 테두리**: 모든 요소에 2-4px 검은 테두리
- **그림자 효과**: `shadow-neo` 클래스로 입체감
- **비대칭 회전**: 약간의 회전 효과로 역동성
- **대담한 색상**: 노란색, 파란색, 분홍색, 녹색 등 선명한 색상

### Tailwind CSS Classes

```css
.neo-card {
  @apply bg-white border-4 border-black p-6 shadow-neo;
}

.neo-btn {
  @apply px-6 py-3 border-4 border-black font-bold shadow-neo
         transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none;
}

.shadow-neo {
  box-shadow: 8px 8px 0px 0px rgba(0, 0, 0, 1);
}
```

## 📊 데이터 구조

### Project Type

```typescript
interface Project {
  id: string;
  name: string;
  grade: number;
  classCount: number;
  userId: string;
  status: 'pending' | 'in-progress' | 'completed';
  students?: Student[];
  assignments?: ClassAssignment[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Student Type (암호화된 상태)

```typescript
interface Student {
  id: string;
  displayName: string;        // 암호화됨
  gender: 'male' | 'female';
  studentNumber?: string;     // 암호화됨
  specialNeeds?: string;      // 암호화됨
  notes?: string;             // 암호화됨
  groupWith?: string[];       // 같은 반 희망 학생 ID 배열
  separateFrom?: string[];    // 분리 희망 학생 ID 배열
}
```

### ClassAssignment Type

```typescript
interface ClassAssignment {
  classNumber: number;
  students: Student[];
  maleCount: number;
  femaleCount: number;
  specialNeedsCount: number;
}
```

## 🤝 기여하기

기여는 언제나 환영합니다! 다음 절차를 따라주세요:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 👤 제작자

**김문정 (안양 박달초등학교)**

- GitHub: [@reallygood83](https://github.com/reallygood83)

## 🙏 감사의 말

- Firebase - 인증 및 데이터베이스 제공
- Lucide - 아이콘 라이브러리
- Tailwind CSS - 스타일링 프레임워크
- React - UI 라이브러리

---

**GoodBye!** - 학급 편성을 스마트하게, AI와 함께!
