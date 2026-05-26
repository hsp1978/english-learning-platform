# 웹서비스 개발 트러블슈팅 가이드

> 영어학습 플랫폼 개발 과정에서 발생한 주요 에러와 해결 방법 정리
> 작성일: 2026-03-26

---

## 목차
1. [프론트엔드 에러](#1-프론트엔드-에러)
2. [백엔드 에러](#2-백엔드-에러)
3. [PWA 관련 이슈](#3-pwa-관련-이슈)
4. [상태 관리 이슈](#4-상태-관리-이슈)
5. [데이터베이스 이슈](#5-데이터베이스-이슈)
6. [모범 사례 및 예방법](#6-모범-사례-및-예방법)

---

## 1. 프론트엔드 에러

### 1.1 React useCallback 의존성 누락

**에러 발생:**
```
알파벳 A-Z 레슨에서 글자를 클릭해도 반응하지 않음
```

**원인:**
```typescript
// ❌ 잘못된 코드
const handleTapPhoneme = useCallback((index: number) => {
  setCorrectCount((c) => c + 1);
}, [playPhoneme]); // setCorrectCount 누락!
```

**해결:**
```typescript
// ✅ 올바른 코드
const handleTapPhoneme = useCallback((index: number) => {
  setCorrectCount((c) => c + 1);
}, [playPhoneme, setCorrectCount]); // 모든 의존성 포함
```

**교훈:**
- `useCallback`, `useEffect` 등의 의존성 배열을 항상 정확히 명시
- ESLint의 `react-hooks/exhaustive-deps` 규칙 활성화 권장
- 함수형 setState `(prev) => prev + 1` 패턴 사용 시에도 setter 함수를 의존성에 포함

**참고:**
- 커밋: `e8fc31c`
- 파일: `frontend/src/app/(child)/learn/phonics/[lessonId]/page.tsx:72`

---

### 1.2 404 에러: 배경음악(BGM) 파일 누락

**에러 발생:**
```
Console Error: GET http://localhost:3000/audio/bgm/forest.mp3 404 (Not Found)
```

**원인:**
- BGM 파일이 실제로 존재하지 않는데 자동 재생 시도
- `gameStore`의 초기값이 `bgmEnabled: true`로 설정됨

**해결 방법:**

**임시 해결 (프로덕션 배포 전):**
```typescript
// frontend/src/stores/gameStore.ts
export const useGameStore = create<GameState>((set) => ({
  // ❌ bgmEnabled: true,
  bgmEnabled: false, // ✅ 파일이 준비될 때까지 비활성화
  // ...
}));
```

**근본 해결 (권장):**
```typescript
// 1. 파일 존재 여부 체크 후 재생
const checkAudioExists = async (url: string) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

// 2. 오디오 로더에서 에러 핸들링
audio.addEventListener('error', (e) => {
  console.warn(`Audio file not found: ${src}`);
  setBgmEnabled(false); // 자동으로 비활성화
});
```

**교훈:**
- 외부 리소스(이미지, 오디오, 폰트 등)는 항상 존재 여부 검증
- Fallback UI/UX 제공 (예: "배경음악이 준비중입니다")
- 개발 환경에서도 콘솔 에러가 없도록 관리

**참고:**
- 커밋: `4df618d`
- 파일: `frontend/src/stores/gameStore.ts:2`

---

### 1.3 완료된 레슨 재학습 불가 이슈

**문제:**
- 사용자가 이미 완료한 레슨을 다시 플레이하려고 해도 클릭이 차단됨
- UX 관점에서 복습 기회 제한

**원인:**
```typescript
// ❌ 완료된 레슨 클릭 차단
onClick={() => !isCompleted && handleMissionClick(...)}
className={isCompleted ? "opacity-50" : "cursor-pointer"}
```

**해결:**
```typescript
// ✅ 완료 여부와 관계없이 클릭 허용
onClick={() => handleMissionClick(lesson.lesson_type, lesson.id)}
className={cn(
  "card-child cursor-pointer",
  isCompleted && "ring-2 ring-green-500" // 완료 표시만 시각화
)}
```

**추가 개선사항:**
```typescript
// 완료 배지를 우측 상단에 표시
{isCompleted && (
  <div className="absolute top-4 right-4">
    <div className="w-10 h-10 bg-green-500 rounded-full">
      <CheckIcon />
    </div>
  </div>
)}

// 버튼 텍스트 변경
<button>
  {isCompleted ? "다시 하기" : "시작하기"}
</button>
```

**교훈:**
- 사용자 행동을 불필요하게 제한하지 말 것
- 완료 상태는 시각적으로만 표시하고 기능은 유지
- 재학습, 복습 기능은 학습 플랫폼의 핵심 UX

**참고:**
- 파일: `frontend/src/app/(child)/home/page.tsx:351-354`

---

### 1.4 캐시된 데이터로 인한 UI 불일치

**문제:**
- 서버에서 커리큘럼 데이터를 업데이트했는데 프론트엔드에 반영되지 않음
- React Query 캐시가 5분간 유지되어 변경사항 확인 불가

**원인:**
```typescript
// frontend/src/hooks/useApi.ts
export function useCurriculumMap() {
  return useQuery({
    queryKey: queryKeys.curriculumMap(childId ?? ""),
    queryFn: async () => { /* ... */ },
    staleTime: 5 * 60 * 1000, // 5분간 캐시
  });
}
```

**해결 방법:**

**1. 강제 새로고침 (개발 중):**
```typescript
const queryClient = useQueryClient();

// 특정 쿼리 무효화
queryClient.invalidateQueries({
  queryKey: queryKeys.curriculumMap(childId)
});

// 또는 즉시 다시 가져오기
queryClient.refetchQueries({
  queryKey: queryKeys.curriculumMap(childId)
});
```

**2. staleTime 조정 (프로덕션):**
```typescript
// 개발 환경
staleTime: 0, // 항상 최신 데이터

// 프로덕션 환경
staleTime: 5 * 60 * 1000, // 5분 캐시
```

**3. Mutation 후 자동 갱신:**
```typescript
const recordLearning = useMutation({
  mutationFn: (data) => api.post('/progress/record', data),
  onSuccess: () => {
    // 학습 기록 후 커리큘럼 데이터 갱신
    queryClient.invalidateQueries({
      queryKey: queryKeys.curriculumMap(childId)
    });
  },
});
```

**교훈:**
- 개발 중에는 캐시 시간을 짧게 설정
- Mutation 후 관련된 쿼리를 자동으로 무효화
- 환경별로 다른 캐시 전략 사용 (`process.env.NODE_ENV`)

**참고:**
- 커밋: `11747d4`
- 파일: `frontend/src/hooks/useApi.ts:44`

---

## 2. 백엔드 에러

### 2.1 데이터베이스 세션 관리 에러

**에러 발생:**
```
sqlalchemy.exc.InvalidRequestError: This session is in 'committed' state;
no further SQL can be emitted within this transaction
```

**원인:**
```python
# ❌ 잘못된 패턴
async def get_db():
    async with async_session_factory() as session:
        yield session
        await session.commit()  # 이후 추가 쿼리 실행 시 에러
```

**해결:**
```python
# ✅ 올바른 패턴
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

**추가 권장사항:**
```python
# FastAPI Dependency에서 트랜잭션 관리
@router.post("/progress/record")
async def record_learning(
    body: LearningRecordCreate,
    db: AsyncSession = Depends(get_db),
):
    # db.add(), db.execute() 등 사용
    # 함수 종료 시 자동으로 commit 또는 rollback
    pass
```

**교훈:**
- 데이터베이스 세션은 컨텍스트 매니저로 관리
- 예외 발생 시 반드시 rollback
- FastAPI의 Dependency Injection 활용

**참고:**
- 파일: `backend/app/core/database.py:34-41`

---

### 2.2 배지 체크 실패 시 학습 기록 실패

**문제:**
- 배지 시스템에 버그가 있을 때 학습 기록 자체가 실패함
- 사용자 경험에 치명적 영향

**원인:**
```python
# ❌ 배지 에러가 전체 요청을 중단
await badge_service.check_and_award_badges(db, child_id)
# 에러 발생 시 학습 기록도 실패
```

**해결:**
```python
# ✅ 배지 체크 실패를 격리
try:
    from app.services.badge_service import get_badge_service
    badge_service = get_badge_service()
    await badge_service.check_and_award_badges(db, child_id)
except Exception as e:
    # 로그만 남기고 요청은 성공 처리
    print(f"Badge check failed: {e}")
    # TODO: 프로덕션에서는 Sentry 등으로 전송
```

**개선 방안:**
```python
# 1. 구조화된 로깅
import logging
logger = logging.getLogger(__name__)

try:
    await badge_service.check_and_award_badges(db, child_id)
except Exception as e:
    logger.exception("Badge award failed", extra={
        "child_id": str(child_id),
        "lesson_id": str(body.lesson_id),
    })

# 2. 비동기 백그라운드 작업으로 분리
from fastapi import BackgroundTasks

@router.post("/progress/record")
async def record_learning(
    body: LearningRecordCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    # 학습 기록은 즉시 처리
    record = LearningRecord(...)
    db.add(record)
    await db.commit()

    # 배지는 백그라운드에서 처리
    background_tasks.add_task(
        check_badges, db, child_id
    )

    return record
```

**교훈:**
- 핵심 기능과 부가 기능을 분리
- 부가 기능 실패가 전체 요청을 중단시키지 않도록
- 백그라운드 작업으로 분리하여 응답 속도 개선

**참고:**
- 파일: `backend/app/api/v1/endpoints/curriculum.py:172-178`

---

### 2.3 TODO: 캐싱 미구현으로 인한 성능 이슈

**문제:**
- TTS 음성 파일을 매번 OpenAI API로 생성
- 동일한 텍스트에 대해 반복 요청 발생
- API 비용 증가 및 응답 속도 저하

**현재 코드:**
```python
# backend/app/api/v1/endpoints/tts.py:185
# TODO: Check Minio/S3 cache first

@router.get("/tts/generate")
async def generate_tts(text: str, voice: str = "alloy"):
    # 항상 새로 생성
    response = await openai_client.audio.speech.create(
        model="tts-1",
        voice=voice,
        input=text,
    )
    # TODO: Store in Minio/S3 cache
    return Response(content=audio_data, media_type="audio/mpeg")
```

**해결 방안:**

**1. Redis 캐시 추가:**
```python
from redis.asyncio import Redis
import hashlib

redis_client = Redis.from_url("redis://localhost:6379")

async def get_tts_audio(text: str, voice: str) -> bytes:
    # 캐시 키 생성
    cache_key = f"tts:{voice}:{hashlib.md5(text.encode()).hexdigest()}"

    # 캐시 확인
    cached = await redis_client.get(cache_key)
    if cached:
        return cached

    # 생성 및 캐시 저장
    audio = await generate_tts_from_openai(text, voice)
    await redis_client.setex(cache_key, 7 * 24 * 3600, audio)  # 7일

    return audio
```

**2. MinIO/S3 저장소 사용:**
```python
from minio import Minio

minio_client = Minio(
    "localhost:9000",
    access_key="minioadmin",
    secret_key="minioadmin",
    secure=False
)

async def get_or_create_tts(text: str, voice: str) -> bytes:
    object_name = f"tts/{voice}/{hash(text)}.mp3"

    try:
        # S3에서 확인
        response = minio_client.get_object("audio", object_name)
        return response.read()
    except Exception:
        # 없으면 생성 후 업로드
        audio = await generate_tts_from_openai(text, voice)
        minio_client.put_object(
            "audio",
            object_name,
            io.BytesIO(audio),
            len(audio),
            content_type="audio/mpeg"
        )
        return audio
```

**3. 데이터베이스 캐시 테이블:**
```python
# models.py
class TTSAudioCache(Base):
    __tablename__ = "tts_audio_cache"

    id = Column(UUID, primary_key=True)
    text_hash = Column(String, unique=True, index=True)
    voice = Column(String)
    audio_url = Column(String)  # S3 URL
    created_at = Column(DateTime)
```

**교훈:**
- 외부 API 호출은 항상 캐싱 고려
- 캐시 계층: Redis (빠름) → S3 (저렴) → DB (메타데이터)
- 해시 기반 키로 중복 생성 방지

**참고:**
- 파일: `backend/app/api/v1/endpoints/tts.py:185,202`

---

## 3. PWA 관련 이슈

### 3.1 Maskable Icon 크기 불일치

**문제:**
- Chrome DevTools에서 PWA 설치 시 경고 발생
- "Maskable icon size mismatch: expected 512x512, got 616x616"

**원인:**
```javascript
// ❌ 잘못된 아이콘 생성
await sharp(svgBuffer)
  .resize(512, 512)
  .extend({
    top: 52, bottom: 52, left: 52, right: 52,  // 616x616 됨!
    background: { r: 160, g: 55, b: 59, alpha: 1 }
  })
  .png()
  .toFile('public/icons/maskable-512.png');
```

**해결:**
```javascript
// ✅ 정확한 크기 계산
const ICON_SIZE = 512;
const SAFE_ZONE = 0.1; // 10% safe zone
const CONTENT_SIZE = Math.floor(ICON_SIZE * (1 - 2 * SAFE_ZONE));

await sharp(svgBuffer)
  .resize(CONTENT_SIZE, CONTENT_SIZE)  // 410x410
  .extend({
    top: Math.floor((ICON_SIZE - CONTENT_SIZE) / 2),
    bottom: Math.ceil((ICON_SIZE - CONTENT_SIZE) / 2),
    left: Math.floor((ICON_SIZE - CONTENT_SIZE) / 2),
    right: Math.ceil((ICON_SIZE - CONTENT_SIZE) / 2),
    background: { r: 160, g: 55, b: 59, alpha: 1 }
  })
  .png()
  .toFile('public/icons/maskable-512.png');
```

**검증 방법:**
```javascript
// 생성된 이미지 크기 확인
const metadata = await sharp('public/icons/maskable-512.png').metadata();
console.log(`Generated: ${metadata.width}x${metadata.height}`);
// Expected: 512x512
```

**교훈:**
- PWA manifest 스펙을 정확히 준수
- 이미지 생성 후 메타데이터 검증
- Safe zone 계산 시 floor/ceil로 정확한 픽셀 맞춤

**참고:**
- 커밋: `903f2d7`
- 파일: `frontend/generate-icons.js`

---

### 3.2 PWA 스크린샷 누락

**문제:**
```
Chrome DevTools Warning:
- Richer install UI not available (mobile screenshot missing)
- Richer install UI not available (desktop screenshot missing)
```

**해결:**
```json
// frontend/public/manifest.json
{
  "screenshots": [
    {
      "src": "/screenshots/mobile.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "영어요정 모바일 화면"
    },
    {
      "src": "/screenshots/desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "영어요정 데스크톱 화면"
    }
  ]
}
```

**스크린샷 생성 (Sharp):**
```javascript
const { createCanvas, loadImage } = require('canvas');

async function generateScreenshot(width, height, outputPath) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 그라디언트 배경
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#a0373b');
  gradient.addColorStop(1, '#7a2b2f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 로고 추가
  const logo = await loadImage('public/icons/icon-512.png');
  ctx.drawImage(logo, (width - 200) / 2, (height - 200) / 2, 200, 200);

  // 텍스트
  ctx.fillStyle = 'white';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('영어요정', width / 2, height - 100);

  // 저장
  const buffer = canvas.toBuffer('image/png');
  await sharp(buffer).toFile(outputPath);
}

// 생성
await generateScreenshot(540, 720, 'public/screenshots/mobile.png');
await generateScreenshot(1280, 720, 'public/screenshots/desktop.png');
```

**교훈:**
- PWA 설치 UX 개선을 위해 스크린샷 필수
- narrow(모바일), wide(데스크톱) 두 가지 제공
- 실제 앱 화면 캡처 또는 목업 이미지 사용

**참고:**
- 커밋: `903f2d7`
- 파일: `frontend/generate-icons.js:89`

---

## 4. 상태 관리 이슈

### 4.1 Zustand 스토어 초기화 타이밍

**문제:**
- 페이지 새로고침 시 사용자 인증 정보가 사라짐
- localStorage에서 복구되기 전에 API 호출 발생

**원인:**
```typescript
// ❌ 동기적으로 초기화
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  // localStorage 읽기가 늦음
}));

// API 호출이 먼저 실행됨
function Component() {
  const token = useAuthStore(s => s.token); // null!
  useQuery({ queryFn: () => api.get('/data') }); // 401 에러
}
```

**해결:**
```typescript
// ✅ persist 미들웨어 사용
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setToken: (token) => set({ token }),
    }),
    {
      name: 'auth-storage',
      // onRehydrateStorage 콜백으로 복구 완료 감지
      onRehydrateStorage: () => (state) => {
        console.log('Auth rehydrated:', state);
      },
    }
  )
);

// 복구 완료까지 대기
function Component() {
  const hasHydrated = useAuthStore.persist.hasHydrated();

  if (!hasHydrated) {
    return <LoadingSpinner />;
  }

  // 이제 안전하게 API 호출
  return <DataComponent />;
}
```

**교훈:**
- Zustand persist 미들웨어 활용
- 하이드레이션 완료 여부 확인 후 API 호출
- SSR 환경에서는 서버/클라이언트 불일치 주의

---

### 4.2 React Query 캐시 무효화 타이밍

**문제:**
- 학습 기록 후 홈 화면에 진행률이 업데이트되지 않음

**원인:**
```typescript
// ❌ 무효화 없이 Mutation만 실행
const recordLearning = useMutation({
  mutationFn: (data) => api.post('/progress/record', data),
  // 캐시 갱신 없음!
});
```

**해결:**
```typescript
// ✅ Optimistic Update + Invalidation
const queryClient = useQueryClient();

const recordLearning = useMutation({
  mutationFn: (data) => api.post('/progress/record', data),

  // 1. 낙관적 업데이트 (즉각 UI 반영)
  onMutate: async (newRecord) => {
    await queryClient.cancelQueries({
      queryKey: queryKeys.curriculumMap(childId)
    });

    const previous = queryClient.getQueryData(
      queryKeys.curriculumMap(childId)
    );

    queryClient.setQueryData(
      queryKeys.curriculumMap(childId),
      (old) => ({
        ...old,
        lessons: old.lessons.map(l =>
          l.id === newRecord.lesson_id
            ? { ...l, is_completed: true }
            : l
        ),
      })
    );

    return { previous };
  },

  // 2. 에러 시 롤백
  onError: (err, variables, context) => {
    queryClient.setQueryData(
      queryKeys.curriculumMap(childId),
      context.previous
    );
  },

  // 3. 성공 시 서버 데이터로 갱신
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.curriculumMap(childId)
    });
  },
});
```

**교훈:**
- Mutation 후 관련 쿼리 무효화 필수
- Optimistic Update로 UX 개선
- 에러 시 롤백 로직 구현

---

## 5. 데이터베이스 이슈

### 5.1 완료 판정 로직의 한계

**문제:**
- 학습 기록이 하나라도 있으면 무조건 "완료"로 표시
- 낮은 점수(0점)로 완료해도 재학습 불가

**현재 로직:**
```python
# backend/app/api/v1/endpoints/curriculum.py:51-62
completed_ids = set()
records_result = await db.execute(
    select(LearningRecord.lesson_id)
    .where(LearningRecord.child_id == child_id)
    .distinct()
)
for row in records_result:
    completed_ids.add(row[0])  # 기록 존재 = 완료
```

**개선 방안 1: 점수 기반 완료 판정**
```python
# 60점 이상만 완료로 인정
completed_ids = set()
records_result = await db.execute(
    select(LearningRecord.lesson_id)
    .where(
        LearningRecord.child_id == child_id,
        LearningRecord.score >= 0.6,  # 추가 조건
    )
    .distinct()
)
```

**개선 방안 2: 최고 점수 기반**
```python
from sqlalchemy import func

# 각 레슨의 최고 점수 조회
subquery = (
    select(
        LearningRecord.lesson_id,
        func.max(LearningRecord.score).label('best_score')
    )
    .where(LearningRecord.child_id == child_id)
    .group_by(LearningRecord.lesson_id)
    .subquery()
)

# 60점 이상인 것만 완료
completed = await db.execute(
    select(subquery.c.lesson_id)
    .where(subquery.c.best_score >= 0.6)
)
completed_ids = {row[0] for row in completed}
```

**개선 방안 3: 프론트엔드에서 재학습 허용**
```typescript
// 완료 여부와 관계없이 항상 클릭 가능
onClick={() => handleMissionClick(lesson.lesson_type, lesson.id)}

// 시각적으로만 구분
className={isCompleted ? "border-green-500" : "border-gray-300"}
```

**교훈:**
- 비즈니스 로직을 명확히 정의 (완료 = 기록 존재? 일정 점수 이상?)
- 학습 플랫폼은 재학습 기회 제공이 중요
- 백엔드/프론트엔드 양쪽에서 정책 일관성 유지

**참고:**
- 파일: `backend/app/api/v1/endpoints/curriculum.py:51-62`

---

### 5.2 N+1 쿼리 문제 (잠재적 이슈)

**문제:**
- 레슨 목록 조회 시 각 레슨의 아이템을 개별 쿼리로 가져옴
- 레슨이 100개면 101번의 쿼리 실행

**원인:**
```python
# ❌ 레슨만 먼저 조회
lessons = await db.execute(select(Lesson))

# 각 레슨마다 아이템 조회 (N번)
for lesson in lessons:
    items = await db.execute(
        select(LessonItem).where(LessonItem.lesson_id == lesson.id)
    )
```

**해결:**
```python
# ✅ selectinload로 한 번에 조회
from sqlalchemy.orm import selectinload

lessons = await db.execute(
    select(Lesson)
    .options(selectinload(Lesson.items))  # Eager loading
    .where(Lesson.is_active.is_(True))
)

# 이제 lesson.items 접근 시 추가 쿼리 없음
for lesson in lessons:
    for item in lesson.items:
        print(item.content_data)
```

**SQLAlchemy 로딩 전략:**
```python
# 1. selectinload - 2개 쿼리로 처리 (권장)
.options(selectinload(Lesson.items))

# 2. joinedload - JOIN으로 1개 쿼리 (1:N 관계 주의)
.options(joinedload(Lesson.items))

# 3. subqueryload - 서브쿼리 사용
.options(subqueryload(Lesson.items))
```

**검증 방법:**
```python
# 쿼리 로깅 활성화
engine = create_async_engine(
    DATABASE_URL,
    echo=True,  # 모든 SQL 출력
)

# 또는 SQLAlchemy 이벤트 리스너
from sqlalchemy import event

@event.listens_for(Engine, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, ...):
    logger.info(f"SQL: {statement}")
```

**교훈:**
- ORM 사용 시 N+1 쿼리 항상 주의
- `selectinload`, `joinedload` 등으로 Eager Loading
- 프로덕션 배포 전 쿼리 개수 모니터링

---

## 6. 모범 사례 및 예방법

### 6.1 개발 환경 설정

**필수 도구:**
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "typescript",
    "typescriptreact"
  ],
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  }
}
```

**ESLint 규칙:**
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    'react-hooks/exhaustive-deps': 'error', // 의존성 누락 방지
    '@typescript-eslint/no-unused-vars': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

---

### 6.2 에러 핸들링 패턴

**프론트엔드:**
```typescript
// 1. React Error Boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error, errorInfo);
    // Sentry.captureException(error);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

// 2. React Query onError
const { data } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  onError: (error) => {
    toast.error('데이터를 불러오는데 실패했습니다.');
    console.error(error);
  },
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});

// 3. Axios Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 로그아웃 처리
      authStore.logout();
      router.push('/login');
    }
    return Promise.reject(error);
  }
);
```

**백엔드:**
```python
# 1. FastAPI Exception Handler
from fastapi import HTTPException
from fastapi.responses import JSONResponse

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "path": request.url.path},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.exception("Unhandled exception", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# 2. 도메인 별 커스텀 예외
class LessonNotFoundError(Exception):
    pass

class InsufficientXPError(Exception):
    pass

# 3. 구조화된 로깅
import structlog

logger = structlog.get_logger()
logger.info("user_action", user_id=user_id, action="complete_lesson")
```

---

### 6.3 테스트 전략

**단위 테스트 (Jest):**
```typescript
// frontend/src/hooks/__tests__/useApi.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useCurriculumMap } from '../useApi';

test('fetches curriculum map', async () => {
  const { result } = renderHook(() => useCurriculumMap());

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(result.current.data.lessons).toHaveLength(10);
});
```

**통합 테스트 (Pytest):**
```python
# backend/tests/test_curriculum.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_get_curriculum_map(client: AsyncClient, auth_headers):
    response = await client.get(
        "/api/v1/curriculum/map",
        params={"child_id": str(child_id)},
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert "lessons" in data
    assert len(data["lessons"]) > 0
```

**E2E 테스트 (Playwright):**
```typescript
// e2e/lesson.spec.ts
import { test, expect } from '@playwright/test';

test('complete phonics lesson', async ({ page }) => {
  await page.goto('/learn/phonics/lesson-1');

  // 글자 클릭
  await page.click('[data-testid="phoneme-0"]');
  await expect(page.locator('.feedback')).toContainText('완벽해요!');

  // 다음 버튼
  await page.click('[data-testid="next-btn"]');

  // 완료 확인
  await expect(page).toHaveURL('/home');
  await expect(page.locator('.lesson-card')).toHaveClass(/completed/);
});
```

---

### 6.4 모니터링 및 로깅

**Sentry 설정:**
```typescript
// frontend/src/lib/sentry.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event, hint) {
    // 개인정보 제거
    if (event.user) {
      delete event.user.email;
    }
    return event;
  },
});
```

**성능 모니터링:**
```typescript
// Next.js Web Vitals
export function reportWebVitals(metric) {
  console.log(metric);

  // Analytics 전송
  if (metric.label === 'web-vital') {
    gtag('event', metric.name, {
      value: Math.round(metric.value),
      event_label: metric.id,
    });
  }
}
```

**백엔드 로깅:**
```python
# backend/app/core/logging.py
import structlog

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.dev.ConsoleRenderer()
    ],
)

logger = structlog.get_logger()

# 사용
logger.info("lesson_completed",
    child_id=str(child_id),
    lesson_id=str(lesson_id),
    score=score,
    duration_seconds=duration
)
```

---

### 6.5 배포 전 체크리스트

**프론트엔드:**
- [ ] 콘솔 에러 0개 확인
- [ ] Lighthouse 점수 확인 (Performance > 90, Accessibility > 95)
- [ ] 모바일/데스크톱 반응형 테스트
- [ ] PWA manifest 검증 (Chrome DevTools)
- [ ] 환경변수 프로덕션 값으로 변경
- [ ] 404, 500 에러 페이지 디자인
- [ ] 이미지 최적화 (WebP, lazy loading)
- [ ] 번들 사이즈 분석 (`next build --analyze`)

**백엔드:**
- [ ] DB 마이그레이션 스크립트 테스트
- [ ] API 문서 최신화 (Swagger/Redoc)
- [ ] CORS 설정 프로덕션 도메인만 허용
- [ ] Rate limiting 설정
- [ ] Health check 엔드포인트 (`/health`, `/ready`)
- [ ] 로그 레벨 INFO로 변경 (DEBUG 비활성화)
- [ ] 시크릿 키 환경변수로 분리
- [ ] 데이터베이스 백업 전략 수립

**인프라:**
- [ ] HTTPS 인증서 설정
- [ ] 도메인 DNS 설정
- [ ] CDN 설정 (정적 파일)
- [ ] 데이터베이스 커넥션 풀 설정
- [ ] Redis 캐시 서버 설정
- [ ] 모니터링 도구 설정 (Sentry, DataDog 등)
- [ ] CI/CD 파이프라인 테스트

---

## 요약

### 가장 중요한 5가지 교훈

1. **React Hook 의존성 배열을 정확히 명시하라**
   → ESLint 규칙 활성화, 함수형 setState 사용

2. **외부 리소스는 항상 에러 핸들링하라**
   → 404 파일, API 실패, 네트워크 에러 대비

3. **캐싱 전략을 개발 초기부터 고려하라**
   → React Query staleTime, Redis, S3 등 계층별 캐싱

4. **비즈니스 로직을 명확히 정의하라**
   → "완료"의 정의, 점수 기준, 재학습 정책 등

5. **모니터링 없는 배포는 하지 마라**
   → Sentry, 로그, 성능 지표를 먼저 구축

---

**다음 프로젝트에서 참고할 것:**
- 이 문서를 프로젝트 초기에 공유
- 각 섹션의 "모범 사례"를 보일러플레이트에 포함
- 테스트 커버리지 80% 이상 유지
- 코드 리뷰 시 이 문서의 안티패턴 체크

---

마지막 업데이트: 2026-03-26
작성자: Claude Code
프로젝트: English Learning Platform (영어요정)
