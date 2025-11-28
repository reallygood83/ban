# 🔧 Firebase 설정 배포 가이드

## 문제 해결 완료! ✅

### 1. 수정된 내용

#### ✅ Firestore Security Rules 수정
- 초대 생성 권한 문제 해결
- 읽기/쓰기 권한 완화 (인증된 사용자 모두 접근 가능)

#### ✅ Firestore 인덱스 설정 추가
- `firestore.indexes.json` 파일 생성
- 필요한 복합 인덱스 자동 생성 설정

#### ✅ 초대 링크 공유 기능 추가
- 이메일 없이도 링크로 초대 가능
- URL 파라미터로 자동 참여 지원
- 예: `https://goodbye.teaboard.link?invite=ABC123`

---

## 🚀 Firebase 배포 방법

### 방법 1: Firebase CLI로 배포 (권장)

```bash
# 1. Firebase CLI 설치 (아직 안 했다면)
npm install -g firebase-tools

# 2. Firebase 로그인
firebase login

# 3. 프로젝트 초기화 (처음만)
firebase init

# 4. Firestore Rules와 Indexes 배포
firebase deploy --only firestore
```

### 방법 2: Firebase Console에서 수동 설정

#### A. Security Rules 업데이트
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택 (goodbye-9ea05)
3. **Firestore Database** → **규칙** 탭
4. `firestore.rules` 파일 내용 복사하여 붙여넣기
5. **게시** 버튼 클릭

#### B. 인덱스 생성
콘솔 오류 메시지의 링크를 클릭하여 자동 생성:

1. **초대 목록 인덱스**:
   ```
   https://console.firebase.google.com/v1/r/project/goodbye-9ea05/firestore/indexes?create_composite=...
   ```

2. **프로젝트 목록 인덱스**:
   ```
   https://console.firebase.google.com/v1/r/project/goodbye-9ea05/firestore/indexes?create_composite=...
   ```

또는 Firebase Console에서 수동 생성:
- **Firestore Database** → **색인** 탭
- **복합 색인 추가** 클릭
- `firestore.indexes.json` 파일 참고하여 생성

---

## 📝 새로운 초대 방식

### 1. 이메일 초대 (기존)
```
1. "멤버 초대" 클릭
2. 이메일 입력
3. 역할 선택
4. 초대 전송
```

### 2. 링크 공유 (신규) ⭐
```
1. "멤버 초대" 클릭
2. 이메일 입력 (선택사항)
3. 초대 생성 후 "링크 복사" 버튼 클릭
4. 카카오톡, 메신저 등으로 링크 공유
5. 받은 사람이 링크 클릭하면 자동으로 참여 모달 열림
```

**링크 형식**:
```
https://goodbye.teaboard.link?invite=ABC123
```

---

## ⚠️ 주의사항

### 인덱스 생성 시간
- Firebase가 인덱스를 생성하는 데 **몇 분** 소요될 수 있습니다
- 생성 중에는 해당 쿼리가 실패할 수 있습니다
- Firebase Console에서 인덱스 상태 확인 가능

### 보안 규칙 변경
- 현재는 인증된 사용자 누구나 초대를 읽을 수 있습니다
- 더 엄격한 보안이 필요하면 규칙 수정 가능

---

## 🧪 테스트 방법

1. **초대 생성 테스트**
   ```
   - 프로젝트 생성 (협업 모드)
   - "초대" 버튼 클릭
   - 이메일 입력 및 역할 선택
   - 초대 생성 확인
   ```

2. **링크 공유 테스트**
   ```
   - 초대 생성 후 "링크 복사" 클릭
   - 새 시크릿 창에서 링크 접속
   - 자동으로 참여 모달 열림 확인
   - 프로젝트 참여 완료
   ```

3. **실시간 동기화 테스트**
   ```
   - 두 개의 브라우저 창 열기
   - 한 창에서 멤버 추가
   - 다른 창에서 실시간 반영 확인
   ```

---

## 📞 문제 해결

### "Missing or insufficient permissions" 오류
→ Firestore Rules 배포 확인

### "The query requires an index" 오류
→ 인덱스 생성 및 완료 대기 (5-10분)

### 초대 링크가 작동하지 않음
→ URL 파라미터 확인 (`?invite=코드`)

---

**배포 후 테스트해보세요!** 🎉
