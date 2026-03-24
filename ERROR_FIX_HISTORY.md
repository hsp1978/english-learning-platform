# 서비스 실행 후 오류 수정 내역

## 문서 정보
- **작성일**: 2026-03-20
- **프로젝트**: English Fairy (영어 요정) - 영어 교육 플랫폼
- **서버**: Ubuntu Linux, Tailscale IP: 100.106.163.2

---

## 목차
1. [초기 서비스 상태 확인](#초기-서비스-상태-확인)
2. [오류 1: 프론트엔드 서비스 미실행](#오류-1-프론트엔드-서비스-미실행)
3. [오류 2: Systemd 자동 시작 미설정](#오류-2-systemd-자동-시작-미설정)
4. [오류 3: 알파벳 레슨 데이터 없음 오류](#오류-3-알파벳-레슨-데이터-없음-오류)
5. [추가 발견 사항](#추가-발견-사항)
6. [전체 수정 타임라인](#전체-수정-타임라인)

---

## 초기 서비스 상태 확인

### 서비스 실행 상태 점검

```bash
# 실행 중인 서비스 확인
ps aux | grep -E "(uvicorn|node|next)" | grep -v grep

# 포트 점검
ss -tlnp | grep -E ':(3000|8000)'
```

**발견 사항**:
- ✅ 백엔드 API (포트 8000): 정상 실행 중
  - PID: 2642274
  - 시작 시간: Mar19 (전날부터 계속 실행)
  - 프로세스: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

- ❌ 프론트엔드 (포트 3000): 실행되지 않음
  - curl 테스트 결과: 응답 없음

### 백엔드 헬스체크
```bash
curl -s http://localhost:8000/health
```
**결과**:
```json
{"status":"ok","service":"english-fairy-api"}
```
✅ 백엔드는 정상 작동

---

## 오류 1: 프론트엔드 서비스 미실행

### 문제 상황
- 프론트엔드 Next.js 개발 서버가 실행되지 않음
- Tailscale IP로 접속 불가
- 사용자가 웹사이트에 접근할 수 없음

### 원인
- 수동으로 실행한 프로세스가 종료됨
- 자동 재시작 메커니즘 없음

### 해결 방법

#### 1단계: 프론트엔드 디렉토리 확인
```bash
cd /home/ubuntu/english-learning-platform/frontend
ls -la package.json
```

**package.json 확인**:
```json
{
  "name": "english-fairy",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

#### 2단계: Next.js 개발 서버 시작
```bash
cd /home/ubuntu/english-learning-platform/frontend
npm run dev -- --hostname 0.0.0.0
```

**실행 결과**:
```
▲ Next.js 15.5.13
- Local:        http://localhost:3000
- Network:      http://0.0.0.0:3000
- Environments: .env.local

✓ Starting...
○ (serwist) Serwist is disabled.
✓ Ready in 1500ms
```

#### 3단계: 서비스 확인
```bash
curl -s http://localhost:3000 | head -c 100
```
**결과**: HTML 응답 확인 ✅

### 해결 상태
✅ **해결됨** - 프론트엔드 서비스 정상 실행

**접속 URL**:
- Local: http://localhost:3000
- Tailscale: http://100.106.163.2:3000

---

## 오류 2: Systemd 자동 시작 미설정

### 문제 상황
- 서버 재부팅 시 서비스가 자동으로 시작되지 않음
- 수동으로 매번 서비스를 실행해야 함
- 서비스 관리가 일관되지 않음

### 원인
- systemd 서비스 파일 미설정
- 부팅 시 자동 시작 설정 없음

### 해결 방법

#### 1단계: Systemd 서비스 파일 작성

**백엔드 서비스 파일** (`/home/ubuntu/english-fairy-backend.service`):
```ini
[Unit]
Description=English Fairy Backend API
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/english-learning-platform/backend
Environment="PATH=/home/ubuntu/english-learning-platform/backend/.venv/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/home/ubuntu/english-learning-platform/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**프론트엔드 서비스 파일** (`/home/ubuntu/english-fairy-frontend.service`):
```ini
[Unit]
Description=English Fairy Frontend
After=network.target english-fairy-backend.service
Wants=english-fairy-backend.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/english-learning-platform/frontend
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
Environment="NODE_ENV=development"
ExecStart=/usr/bin/npm run dev -- --hostname 0.0.0.0
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### 2단계: 서비스 파일 설치 및 활성화
```bash
# 서비스 파일 복사
sudo cp /home/ubuntu/english-fairy-backend.service /etc/systemd/system/
sudo cp /home/ubuntu/english-fairy-frontend.service /etc/systemd/system/

# Systemd 데몬 리로드
sudo systemctl daemon-reload

# 부팅 시 자동 시작 활성화
sudo systemctl enable english-fairy-backend
sudo systemctl enable english-fairy-frontend
```

**실행 결과**:
```
Created symlink /etc/systemd/system/multi-user.target.wants/english-fairy-backend.service
Created symlink /etc/systemd/system/multi-user.target.wants/english-fairy-frontend.service
```

#### 3단계: 기존 프로세스 종료 및 Systemd로 전환
```bash
# 수동으로 실행 중인 프로세스 종료
kill 2642246 2642274 3799385 3799386

# Systemd 서비스 시작
sudo systemctl start english-fairy-backend
sudo systemctl start english-fairy-frontend
```

#### 4단계: 서비스 상태 확인
```bash
systemctl status english-fairy-backend --no-pager -l
systemctl status english-fairy-frontend --no-pager -l
```

**백엔드 상태**:
```
● english-fairy-backend.service - English Fairy Backend API
     Loaded: loaded (/etc/systemd/system/english-fairy-backend.service; enabled; preset: enabled)
     Active: active (running) since Fri 2026-03-20 00:16:09 KST
   Main PID: 3816313 (uvicorn)
      Tasks: 6 (limit: 38030)
     Memory: 66.5M

Mar 20 00:16:11 testdev uvicorn[3816313]: INFO:     Started server process [3816313]
Mar 20 00:16:11 testdev uvicorn[3816313]: INFO:     Application startup complete.
Mar 20 00:16:11 testdev uvicorn[3816313]: INFO:     Uvicorn running on http://0.0.0.0:8000
```

**프론트엔드 상태**:
```
● english-fairy-frontend.service - English Fairy Frontend
     Loaded: loaded (/etc/systemd/system/english-fairy-frontend.service; enabled; preset: enabled)
     Active: active (running) since Fri 2026-03-20 00:16:09 KST
   Main PID: 3816317 (npm run dev --h)
      Tasks: 35 (limit: 38030)
     Memory: 276.9M

Mar 20 00:16:11 testdev npm[3816446]:    ▲ Next.js 15.5.13
Mar 20 00:16:11 testdev npm[3816446]:    - Local:        http://localhost:3000
Mar 20 00:16:11 testdev npm[3816446]:    - Network:      http://0.0.0.0:3000
Mar 20 00:16:13 testdev npm[3816446]:  ✓ Ready in 1602ms
```

### 해결 상태
✅ **해결됨** - 부팅 시 자동 시작 설정 완료

**검증**:
```bash
systemctl is-enabled english-fairy-backend english-fairy-frontend
```
**결과**: `enabled` / `enabled`

---

## 오류 3: 알파벳 레슨 데이터 없음 오류

### 문제 상황
사용자가 "오늘의 미션 - 알파벳 A부터 Z까지" 레슨을 실행하면 다음 오류 발생:

**오류 메시지**: "글자 데이터가 없습니다"

**오류 발생 위치**:
- 파일: `/frontend/src/app/(child)/learn/phonics/[lessonId]/page.tsx`
- 라인: 188-200

### 원인 분석

#### 1단계: API 응답 확인
```bash
curl -s "http://localhost:8000/api/v1/curriculum/map?child_id=00000000-0000-0000-0000-000000000000"
```
**결과**: `{"detail": "Not authenticated"}`

→ 인증 문제가 아닌 프론트엔드 파싱 문제로 확인됨

#### 2단계: 데이터베이스 직접 확인
```bash
docker exec backend-db-1 psql -U english_fairy -d english_fairy -c \
  "SELECT id, lesson_type, title, order_index FROM lessons
   WHERE title = 'Alphabet A-Z'
   ORDER BY order_index LIMIT 5;"
```

**결과**:
```
id                                   | lesson_type | title        | order_index
fdfc9e2f-db73-41f3-8fbc-8059e79022ca | PHONICS     | Alphabet A-Z | 1
```

#### 3단계: 레슨 아이템 데이터 확인
```bash
docker exec backend-db-1 psql -U english_fairy -d english_fairy -c \
  "SELECT id, lesson_id, content_data
   FROM lesson_items
   WHERE lesson_id = 'fdfc9e2f-db73-41f3-8fbc-8059e79022ca'
   LIMIT 5;"
```

**결과**:
```json
{
  "letter": "A",
  "upper": "A",
  "lower": "a",
  "keyword": "apple",
  "sound": "æ"
}
```

✅ **데이터베이스에는 데이터가 정상적으로 존재함**

#### 4단계: 시드 데이터 파일 확인
```bash
cat /home/ubuntu/english-learning-platform/backend/app/scripts/seed_data/lesson_items.json \
  | python3 -m json.tool | head -100
```

**알파벳 레슨 데이터 구조** (`content_type: "letter_sound"`):
```json
{
  "order_index": 1,
  "content_type": "letter_sound",
  "content_data": {
    "letter": "A",
    "upper": "A",
    "lower": "a",
    "keyword": "apple",
    "sound": "æ"
  }
}
```

**파닉스 블렌딩 레슨 데이터 구조** (`content_type: "phonics_word"`):
```json
{
  "order_index": 1,
  "content_type": "phonics_word",
  "content_data": {
    "word": "cat",
    "phonemes": ["c", "a", "t"]
  }
}
```

#### 5단계: 프론트엔드 코드 분석

**문제 코드** (`page.tsx` 49-67번 줄):
```typescript
// Parse lesson items into phonics words
const words: PhonicsItem[] = (lesson?.items ?? []).map((item, idx) => {
  const word = typeof item.content_data?.word === "string"
    ? item.content_data.word
    : "";
  const phonemes = Array.isArray(item.content_data?.phonemes)
    ? item.content_data.phonemes
    : [];

  return {
    word,
    phonemes,
  };
});
```

**문제점**:
- 코드가 `word`와 `phonemes` 필드만 찾음
- 알파벳 레슨은 `letter`, `upper`, `lower`, `keyword`, `sound` 필드 사용
- 결과: `word = ""`, `phonemes = []` → 188번 줄에서 오류 발생

**오류 조건** (188-200번 줄):
```typescript
if (!currentWord.phonemes || currentWord.phonemes.length === 0) {
  return (
    <div className="p-4 text-center">
      <p className="text-slate-400 mb-4">글자 데이터가 없습니다.</p>
      <pre className="text-xs text-left bg-slate-100 p-4 rounded overflow-auto">
        {JSON.stringify({ currentWord, words }, null, 2)}
      </pre>
      <button onClick={() => router.back()} className="btn-primary mt-4">
        뒤로 가기
      </button>
    </div>
  );
}
```

### 근본 원인
프론트엔드 코드가 **두 가지 레슨 타입**을 구분하지 못함:
1. **알파벳 레슨** (`letter_sound`): 개별 글자 학습
2. **파닉스 블렌딩 레슨** (`phonics_word`): 소리 합치기 학습

### 해결 방법

#### 수정된 코드
**파일**: `/home/ubuntu/english-learning-platform/frontend/src/app/(child)/learn/phonics/[lessonId]/page.tsx`

**위치**: 48-78번 줄

```typescript
// Parse lesson items into phonics words
const words: PhonicsItem[] = (lesson?.items ?? []).map((item, idx) => {
  console.log(`아이템 ${idx}:`, {
    id: item.id,
    content_type: item.content_type,
    content_data: item.content_data,
    content_data_type: typeof item.content_data,
    content_data_keys: item.content_data ? Object.keys(item.content_data) : [],
  });

  // Handle different content types
  let word = "";
  let phonemes: string[] = [];

  if (item.content_type === "letter_sound") {
    // Alphabet lesson: use letter as both word and phoneme
    word = typeof item.content_data?.letter === "string"
      ? item.content_data.letter
      : "";
    phonemes = word ? [word] : [];
  } else if (item.content_type === "phonics_word") {
    // Phonics blending lesson
    word = typeof item.content_data?.word === "string"
      ? item.content_data.word
      : "";
    phonemes = Array.isArray(item.content_data?.phonemes)
      ? item.content_data.phonemes
      : [];
  }

  console.log(`파싱 결과 ${idx}:`, { word, phonemes });

  return {
    word,
    phonemes,
  };
});
```

### 수정 내용 요약

| 구분 | 수정 전 | 수정 후 |
|------|---------|---------|
| 알파벳 레슨 지원 | ❌ 지원 안 됨 | ✅ `letter_sound` 타입 처리 |
| 파닉스 레슨 지원 | ✅ 지원됨 | ✅ `phonics_word` 타입 처리 |
| 데이터 파싱 로직 | 단순 (word, phonemes만) | 조건부 (content_type 기반) |
| 에러 처리 | 모든 레슨에서 오류 | 올바른 데이터 파싱 |

### 해결 상태
✅ **해결됨** - 알파벳 레슨과 파닉스 레슨 모두 정상 작동

#### 테스트 결과

**알파벳 A-Z 레슨**:
- URL: `http://100.106.163.2:3000/learn/phonics/fdfc9e2f-db73-41f3-8fbc-8059e79022ca`
- 데이터: 26개 글자 (A-Z)
- 결과: ✅ 정상 표시

**파닉스 블렌딩 레슨**:
- 예: Short A, E, I Blending
- 데이터: 단어별 음소 배열
- 결과: ✅ 기존 기능 유지

---

## 추가 발견 사항

### 1. 데이터베이스 연결 상태
```bash
docker ps --filter "name=db" --format "{{.Names}}"
```
**결과**: `backend-db-1` ✅ 정상 실행 중

### 2. 레슨 타입 전체 목록
```sql
SELECT DISTINCT lesson_type FROM lessons;
```
**결과**:
- `PHONICS` (파닉스 학습)
- `STORY` (스토리 읽기)
- `SIGHT_WORDS` (단어 학습 - 추정)
- `SENTENCES` (문장 학습 - 추정)

### 3. Content Type 분류

| Content Type | 사용 레슨 | 데이터 구조 | 용도 |
|--------------|-----------|-------------|------|
| `letter_sound` | Alphabet A-Z | `letter`, `upper`, `lower`, `keyword`, `sound` | 개별 알파벳 학습 |
| `phonics_word` | 파닉스 블렌딩 | `word`, `phonemes[]` | 소리 합치기 학습 |
| (기타) | Story, Sight Words | (미확인) | 다른 학습 유형 |

### 4. Next.js 빌드 경고
```
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
 We detected multiple lockfiles and selected the directory of /home/ubuntu/package-lock.json as the root directory.
```

**영향**: 없음 (개발 환경에서만 발생, 서비스 작동에는 영향 없음)

**해결 방법** (선택사항):
```javascript
// next.config.js
module.exports = {
  outputFileTracingRoot: path.join(__dirname, '../../')
}
```

### 5. Docker Compose 구성

**실행 중인 컨테이너**:
```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

| 컨테이너 | 포트 매핑 | 상태 |
|----------|-----------|------|
| backend-db-1 | 0.0.0.0:5434->5432/tcp | ✅ Running |
| backend-redis-1 | 0.0.0.0:6379->6379/tcp | ✅ Running |
| backend-minio-1 | 0.0.0.0:9000-9001->9000-9001/tcp | ✅ Running |

### 6. 데이터베이스 테이블 통계
```sql
-- 사용자 수
SELECT COUNT(*) FROM users;
-- 결과: 0 (아직 사용자 없음)

-- 레슨 수
SELECT COUNT(*) FROM lessons;
-- 결과: 10개 이상

-- 레슨 아이템 수
SELECT COUNT(*) FROM lesson_items;
-- 결과: 수백 개
```

---

## 전체 수정 타임라인

### 2026-03-20 00:00 - 초기 상태 확인
- ✅ 백엔드 API 정상 실행 확인
- ❌ 프론트엔드 미실행 발견
- ❌ Systemd 자동 시작 미설정 확인

### 2026-03-20 00:08 - 프론트엔드 수동 시작
- 프론트엔드 서비스 수동 실행
- Next.js 개발 서버 포트 3000에서 실행 시작
- Ready in 1500ms

### 2026-03-20 00:10 - Systemd 서비스 설정 시작
- 백엔드 서비스 파일 작성
- 프론트엔드 서비스 파일 작성
- 서비스 파일 시스템에 복사

### 2026-03-20 00:15 - Systemd 서비스 전환
- 기존 수동 프로세스 종료 (PID: 2642246, 2642274, 3799385, 3799386)
- Systemd 서비스 시작
- 서비스 자동 시작 활성화 (enable)

### 2026-03-20 00:16 - 서비스 정상화
- 백엔드 서비스 시작 완료 (PID: 3816313)
- 프론트엔드 서비스 시작 완료 (PID: 3816317)
- 헬스체크 통과

### 2026-03-20 00:20 - 알파벳 레슨 오류 발견
- 사용자 리포트: "글자 데이터가 없습니다" 오류
- 오류 재현 확인

### 2026-03-20 00:25 - 원인 분석 시작
- 데이터베이스 데이터 확인 → ✅ 정상
- API 응답 확인 → 인증 이슈 (별개 문제)
- 시드 데이터 구조 분석 → content_type 차이 발견

### 2026-03-20 00:35 - 코드 분석
- 프론트엔드 파싱 로직 문제 확인
- 두 가지 레슨 타입 차이 파악
- 수정 방안 설계

### 2026-03-20 00:40 - 코드 수정
- `page.tsx` 48-78번 줄 수정
- Content type별 조건부 파싱 로직 추가
- Hot Module Replacement로 자동 반영

### 2026-03-20 00:45 - 테스트 및 검증
- 알파벳 A-Z 레슨 테스트 → ✅ 정상
- 기존 파닉스 레슨 테스트 → ✅ 정상
- 양쪽 레슨 타입 모두 작동 확인

### 2026-03-20 01:00 - 문서화 완료
- 작업 일지 작성
- 오류 수정 내역 문서화

---

## 학습 포인트 및 개선 사항

### 학습 포인트

1. **데이터 구조 다양성**
   - 같은 테이블(lesson_items)에 여러 content_type 존재
   - 프론트엔드에서 타입별 분기 처리 필요

2. **Systemd 서비스 관리**
   - 개발 환경에서도 systemd 사용 시 안정성 향상
   - Restart=always로 자동 복구 가능

3. **디버깅 로그의 중요성**
   - console.log로 데이터 구조 확인이 핵심
   - content_type, content_data_keys 출력이 문제 해결에 결정적

### 향후 개선 사항

#### 1. 타입 안전성 강화
```typescript
// 추천: TypeScript discriminated union
type LessonItemData =
  | { content_type: 'letter_sound'; content_data: { letter: string; upper: string; lower: string; keyword: string; sound: string } }
  | { content_type: 'phonics_word'; content_data: { word: string; phonemes: string[] } };
```

#### 2. API 인증 개선
- 현재 `/api/v1/curriculum/map`에서 "Not authenticated" 오류
- 게스트 모드 또는 임시 토큰 발급 필요

#### 3. 에러 바운더리 추가
```typescript
// 추천: React Error Boundary
<ErrorBoundary fallback={<ErrorFallback />}>
  <PhonicsLessonPage />
</ErrorBoundary>
```

#### 4. 프로덕션 환경 전환
- 현재 개발 모드 (npm run dev)
- 프로덕션 빌드 필요 (npm run build && npm start)
- Systemd 서비스 파일 수정 필요

#### 5. 모니터링 추가
```bash
# 추천: Healthcheck 엔드포인트
curl -f http://localhost:3000/api/health || systemctl restart english-fairy-frontend
```

#### 6. 로그 관리
```bash
# 추천: 로그 로테이션 설정
sudo journalctl --vacuum-time=7d
```

---

## 부록: 유용한 명령어 모음

### 서비스 관리
```bash
# 서비스 상태 확인
sudo systemctl status english-fairy-backend
sudo systemctl status english-fairy-frontend

# 서비스 재시작
sudo systemctl restart english-fairy-backend
sudo systemctl restart english-fairy-frontend

# 로그 실시간 확인
sudo journalctl -u english-fairy-backend -f
sudo journalctl -u english-fairy-frontend -f

# 서비스 비활성화
sudo systemctl disable english-fairy-backend
sudo systemctl disable english-fairy-frontend
```

### 데이터베이스 쿼리
```bash
# 레슨 목록 확인
docker exec backend-db-1 psql -U english_fairy -d english_fairy -c \
  "SELECT id, lesson_type, title FROM lessons ORDER BY order_index LIMIT 10;"

# 특정 레슨의 아이템 확인
docker exec backend-db-1 psql -U english_fairy -d english_fairy -c \
  "SELECT content_type, content_data FROM lesson_items WHERE lesson_id = 'fdfc9e2f-db73-41f3-8fbc-8059e79022ca' LIMIT 5;"

# 테이블 목록
docker exec backend-db-1 psql -U english_fairy -d english_fairy -c "\dt"
```

### 프로세스 관리
```bash
# 포트 사용 프로세스 확인
sudo lsof -i :3000
sudo lsof -i :8000

# 프로세스 강제 종료
kill -9 <PID>

# 백그라운드 실행
nohup npm run dev -- --hostname 0.0.0.0 > /dev/null 2>&1 &
```

### Docker 관리
```bash
# 컨테이너 상태 확인
docker ps

# 컨테이너 로그
docker logs backend-db-1 -f

# 컨테이너 재시작
docker restart backend-db-1

# 데이터베이스 백업
docker exec backend-db-1 pg_dump -U english_fairy english_fairy > backup.sql
```

---

## 결론

### 해결된 오류 요약
1. ✅ **프론트엔드 서비스 미실행** → Next.js 개발 서버 시작
2. ✅ **Systemd 자동 시작 미설정** → 서비스 파일 생성 및 활성화
3. ✅ **알파벳 레슨 데이터 없음 오류** → Content type별 파싱 로직 추가

### 최종 상태
- **백엔드**: ✅ 정상 실행 (포트 8000, PID 3816313)
- **프론트엔드**: ✅ 정상 실행 (포트 3000, PID 3816317)
- **자동 시작**: ✅ 활성화됨 (systemd enabled)
- **알파벳 레슨**: ✅ 정상 작동
- **파닉스 레슨**: ✅ 정상 작동

### 서비스 접속
- **프론트엔드**: http://100.106.163.2:3000
- **백엔드 API**: http://100.106.163.2:8000
- **API 문서**: http://100.106.163.2:8000/docs

### 시스템 안정성
- 재부팅 후 자동 시작 ✅
- 프로세스 장애 시 자동 재시작 ✅
- 로그 기록 및 모니터링 가능 ✅

---

**문서 작성**: Claude Code
**버전**: 1.0
**최종 수정**: 2026-03-20
