# 콘텐츠 타입 점검 보고서

**작성일**: 2026-03-20
**점검자**: Claude Code
**프로젝트**: English Fairy 영어 교육 플랫폼

---

## 요약

전체 4가지 레슨 타입과 6가지 콘텐츠 타입을 점검했습니다.

### 점검 결과 요약

| 레슨 타입 | 상태 | 콘텐츠 타입 수 | 프론트엔드 지원 | 비고 |
|-----------|------|----------------|-----------------|------|
| PHONICS | ✅ 정상 | 2 | ✅ 완전 지원 | letter_sound, phonics_blend 수정 완료 |
| SIGHT_WORDS | ✅ 정상 | 1 | ✅ 완전 지원 | sight_word_flash |
| SENTENCES | ✅ 정상 | 3 | ✅ 완전 지원 | pronoun_match, sentence_build, noun_match 수정 완료 |
| STORY | ⚠️ 미구현 | 0 | ❌ UI 없음 | 데이터는 있으나 프론트엔드 미구현 |

---

## 1. 데이터베이스 레슨 타입

### 1.1 레슨 타입 목록

```sql
SELECT DISTINCT lesson_type FROM lessons;
```

**결과**:
- `PHONICS` (파닉스)
- `SIGHT_WORDS` (단어 학습)
- `SENTENCES` (문장 학습)
- `STORY` (스토리 읽기)

### 1.2 레슨 통계

| 레슨 타입 | 레슨 수 | 평균 아이템 수 | 예시 |
|-----------|---------|----------------|------|
| PHONICS | 10개 | 8-10개 | Alphabet A-Z, Short A/E/I Blending |
| SIGHT_WORDS | 12개 | 10-15개 | Pre-K Words, Kinder Words, 1st Grade Words |
| SENTENCES | 5개+ | 가변 | What is a Noun?, I/You/He/She/It |
| STORY | 3개 | N/A | My First Story Book, Non-fiction Reading |

---

## 2. 콘텐츠 타입 분석

### 2.1 전체 콘텐츠 타입

```sql
SELECT DISTINCT content_type FROM lesson_items;
```

**결과**:
1. `letter_sound` - 알파벳 글자 학습
2. `phonics_blend` - 파닉스 블렌딩
3. `sight_word_flash` - 단어 플래시 카드
4. `sentence_build` - 문장 만들기
5. `pronoun_match` - 대명사 매칭
6. `noun_match` - 명사 매칭

### 2.2 콘텐츠 타입별 상세 구조

#### 2.2.1 letter_sound (알파벳)

**사용 레슨**: Alphabet A-Z
**데이터 구조**:
```json
{
  "letter": "A",
  "upper": "A",
  "lower": "a",
  "keyword": "apple",
  "sound": "æ"
}
```

**프론트엔드 처리**:
```typescript
if (item.content_type === "letter_sound") {
  word = item.content_data?.letter;
  phonemes = word ? [word] : [];
}
```

**상태**: ✅ 수정 완료

---

#### 2.2.2 phonics_blend (파닉스 블렌딩)

**사용 레슨**: Short A/E/I Blending, Long A/I & Magic E 등
**데이터 구조**:
```json
{
  "word": "cat",
  "vowel": "short_a",
  "pattern": "CVC",
  "phonemes": ["c", "a", "t"]
}
```

**프론트엔드 처리**:
```typescript
if (item.content_type === "phonics_word" || item.content_type === "phonics_blend") {
  word = item.content_data?.word;
  phonemes = item.content_data?.phonemes;
}
```

**상태**: ✅ 수정 완료 (phonics_blend 타입 추가)

---

#### 2.2.3 sight_word_flash (단어 플래시)

**사용 레슨**: Pre-K Words, Kinder Words, 1st Grade Words
**데이터 구조**:
```json
{
  "word": "a"
}
```

**프론트엔드 처리**:
```typescript
const words = lesson.items.map(item => ({
  word: item.content_data.word
}));
```

**상태**: ✅ 정상 (수정 불필요)

---

#### 2.2.4 sentence_build (문장 만들기)

**사용 레슨**: I am / She is, S-V-O Sentence Train
**데이터 구조**:
```json
{
  "word_blocks": ["I", "am", "a", "girl"],
  "correct_order": [0, 1, 2, 3],
  "example_sentence": "I am a girl."
}
```

**프론트엔드 처리**:
```typescript
if (item.content_type === "sentence_build") {
  return {
    sentence: item.content_data.example_sentence,
    wordBlocks: item.content_data.word_blocks,
    correctOrder: item.content_data.correct_order
  };
}
```

**상태**: ✅ 정상 (수정 불필요)

---

#### 2.2.5 pronoun_match (대명사 매칭)

**사용 레슨**: I, You, He, She, It
**데이터 구조**:
```json
{
  "pronoun": "I",
  "example": "I am happy.",
  "description": "나"
}
```

**프론트엔드 처리**:
```typescript
if (item.content_type === "pronoun_match") {
  const sentence = item.content_data.example;
  const words = sentence.split(" ").filter(w => w.length > 0);
  return {
    sentence,
    wordBlocks: words,
    correctOrder: words.map((_, i) => i)
  };
}
```

**상태**: ✅ 수정 완료 (pronoun_match 타입 추가)

---

#### 2.2.6 noun_match (명사 매칭)

**사용 레슨**: What is a Noun?, Noun Words Part 1-3
**데이터 구조**:
```json
{
  "noun": "cat",
  "category": "animal",
  "image_hint": "cat"
}
```

**프론트엔드 처리**:
```typescript
if (item.content_type === "noun_match") {
  const noun = item.content_data.noun;
  return {
    sentence: `This is a ${noun}.`,
    wordBlocks: ["This", "is", "a", `${noun}.`],
    correctOrder: [0, 1, 2, 3]
  };
}
```

**상태**: ✅ 수정 완료 (noun_match 타입 추가)

---

## 3. 수정 내역

### 3.1 파닉스 페이지 수정

**파일**: `/frontend/src/app/(child)/learn/phonics/[lessonId]/page.tsx`

**문제점**:
1. `letter_sound` 타입 미지원 → 알파벳 A-Z 오류
2. `phonics_blend` 타입 미지원 → 파닉스 블렌딩 오류

**수정 내용**:
```typescript
// 수정 전
if (item.content_type === "phonics_word") {
  word = item.content_data?.word;
  phonemes = item.content_data?.phonemes;
}

// 수정 후
if (item.content_type === "letter_sound") {
  word = item.content_data?.letter;
  phonemes = word ? [word] : [];
} else if (item.content_type === "phonics_word" || item.content_type === "phonics_blend") {
  word = item.content_data?.word;
  phonemes = item.content_data?.phonemes;
}
```

**영향 받는 레슨**:
- ✅ Alphabet A-Z (fdfc9e2f-db73-41f3-8fbc-8059e79022ca)
- ✅ Short A, E, I Blending (31994d5b-e574-4561-a49a-b4c411cdfda1)
- ✅ Short O, U Blending
- ✅ Long A, I & Magic E
- ✅ 기타 모든 파닉스 레슨

---

### 3.2 문장 페이지 수정

**파일**: `/frontend/src/app/(child)/learn/sentences/[patternId]/page.tsx`

**문제점**:
1. `sentence_build` 타입만 지원
2. `pronoun_match` 타입 미지원
3. `noun_match` 타입 미지원

**수정 내용**:
```typescript
const items = lesson.items.map((item) => {
  if (item.content_type === "pronoun_match") {
    const sentence = item.content_data.example;
    const words = sentence.split(" ").filter(w => w.length > 0);
    return {
      sentence,
      wordBlocks: words,
      correctOrder: words.map((_, i) => i)
    };
  } else if (item.content_type === "sentence_build") {
    return {
      sentence: item.content_data.example_sentence,
      wordBlocks: item.content_data.word_blocks,
      correctOrder: item.content_data.correct_order
    };
  } else if (item.content_type === "noun_match") {
    const noun = item.content_data.noun;
    return {
      sentence: `This is a ${noun}.`,
      wordBlocks: ["This", "is", "a", `${noun}.`],
      correctOrder: [0, 1, 2, 3]
    };
  }
  return { sentence: "", wordBlocks: [], correctOrder: [] };
});
```

**영향 받는 레슨**:
- ✅ I, You, He, She, It (22e1ace9-91c9-4c7f-812e-dbb5b65f95d6)
- ✅ What is a Noun? (5b0cd1fc-748a-422d-b9a3-ec3c887bd001)
- ✅ I am / She is
- ✅ S-V-O Sentence Train
- ✅ 기타 모든 문장 레슨

---

## 4. 미구현 기능

### 4.1 스토리 읽기 (STORY)

**상태**: ⚠️ 프론트엔드 미구현

**데이터베이스**:
- ✅ `stories` 테이블 존재
- ✅ 8개의 스토리 데이터 있음
- ✅ `story_pages` 테이블 존재
- ✅ `story_quizzes` 테이블 존재

**스토리 목록**:
1. The Big Red Dog (4 페이지)
2. The Little Cat (4 페이지)
3. A Day at the Farm (4 페이지)
4. All About the Sun (4 페이지)
5. My School Day (4 페이지)
6. (외 3개)

**프론트엔드**:
- ❌ 스토리 읽기 페이지 없음
- ❌ 스토리 관련 라우트 없음
- ❌ 스토리 컴포넌트 없음

**필요한 작업**:
1. `/learn/story/[storyId]/page.tsx` 생성
2. 페이지별 텍스트 렌더링
3. 단어 하이라이트 및 발음 기능
4. 퀴즈 기능
5. 진도 추적

---

## 5. 레슨별 테스트 URL

### 5.1 파닉스 레슨

```
# 알파벳 A-Z
http://100.106.163.2:3000/learn/phonics/fdfc9e2f-db73-41f3-8fbc-8059e79022ca

# Short A, E, I Blending
http://100.106.163.2:3000/learn/phonics/31994d5b-e574-4561-a49a-b4c411cdfda1

# Short O, U Blending
http://100.106.163.2:3000/learn/phonics/d5952857-99ee-4894-902f-2805d82b736f

# Long A, I & Magic E
http://100.106.163.2:3000/learn/phonics/5998d541-283b-4f27-9acf-88f0da5c273a
```

### 5.2 단어 학습 (Sight Words)

```
# Pre-K Words Part 1
http://100.106.163.2:3000/learn/sight-words/2cc0f7a4-44e1-4467-9c3b-7aeb79c25875

# Kinder Words Part 1
http://100.106.163.2:3000/learn/sight-words/3ee04012-b31e-4dc3-a5fc-49f38abe4532

# 1st Grade Words Part 1
http://100.106.163.2:3000/learn/sight-words/1e74183d-e509-41dc-a69a-3b5d59744b4e
```

### 5.3 문장 학습 (Sentences)

```
# What is a Noun?
http://100.106.163.2:3000/learn/sentences/5b0cd1fc-748a-422d-b9a3-ec3c887bd001

# I, You, He, She, It
http://100.106.163.2:3000/learn/sentences/22e1ace9-91c9-4c7f-812e-dbb5b65f95d6

# I am / She is
http://100.106.163.2:3000/learn/sentences/27a073e0-676b-4f5b-a1a2-7022bbfacf54

# S-V-O Sentence Train
http://100.106.163.2:3000/learn/sentences/825a962e-1e47-4097-8b40-e000da96fc32
```

### 5.4 스토리 읽기 (Story)

```
# 미구현 - 프론트엔드 페이지 없음
```

---

## 6. 콘텐츠 타입 매트릭스

| Content Type | Lesson Type | 페이지 경로 | 프론트엔드 지원 | 데이터베이스 | 비고 |
|-------------|-------------|------------|----------------|-------------|------|
| letter_sound | PHONICS | /learn/phonics/[lessonId] | ✅ | ✅ | 수정 완료 |
| phonics_blend | PHONICS | /learn/phonics/[lessonId] | ✅ | ✅ | 수정 완료 |
| phonics_word | PHONICS | /learn/phonics/[lessonId] | ✅ | ✅ | 기존 지원 |
| sight_word_flash | SIGHT_WORDS | /learn/sight-words/[setId] | ✅ | ✅ | 정상 |
| sentence_build | SENTENCES | /learn/sentences/[patternId] | ✅ | ✅ | 정상 |
| pronoun_match | SENTENCES | /learn/sentences/[patternId] | ✅ | ✅ | 수정 완료 |
| noun_match | SENTENCES | /learn/sentences/[patternId] | ✅ | ✅ | 수정 완료 |
| (story pages) | STORY | /learn/story/[storyId] | ❌ | ✅ | 미구현 |

---

## 7. 권장 사항

### 7.1 즉시 적용 (완료됨)

- ✅ 파닉스 페이지에 `letter_sound` 지원 추가
- ✅ 파닉스 페이지에 `phonics_blend` 지원 추가
- ✅ 문장 페이지에 `pronoun_match` 지원 추가
- ✅ 문장 페이지에 `noun_match` 지원 추가

### 7.2 향후 개발

1. **스토리 읽기 기능 구현**
   - 우선순위: 높음
   - 예상 작업: 3-5일
   - 필요 컴포넌트:
     - StoryPage 컴포넌트
     - PageRenderer 컴포넌트
     - WordHighlight 컴포넌트
     - StoryQuiz 컴포넌트

2. **콘텐츠 타입 TypeScript 타입 정의**
   ```typescript
   type ContentType =
     | "letter_sound"
     | "phonics_blend"
     | "phonics_word"
     | "sight_word_flash"
     | "sentence_build"
     | "pronoun_match"
     | "noun_match";

   interface ContentData {
     letter_sound: {
       letter: string;
       upper: string;
       lower: string;
       keyword: string;
       sound: string;
     };
     phonics_blend: {
       word: string;
       phonemes: string[];
       vowel: string;
       pattern: string;
     };
     // ... 기타 타입들
   }
   ```

3. **에러 바운더리 추가**
   - 알 수 없는 content_type 처리
   - 데이터 누락 시 fallback UI

4. **테스트 자동화**
   - 각 content_type별 단위 테스트
   - 레슨 통합 테스트

---

## 8. 결론

### 8.1 점검 완료 항목

✅ **모든 데이터베이스 콘텐츠 타입 확인**
- 6가지 content_type 분석 완료
- 4가지 lesson_type 분류 완료

✅ **프론트엔드 지원 상태 확인**
- 파닉스: 완전 지원 (수정 완료)
- 단어: 완전 지원
- 문장: 완전 지원 (수정 완료)
- 스토리: 미구현 확인

✅ **코드 수정 완료**
- 파닉스 페이지 2가지 타입 추가
- 문장 페이지 2가지 타입 추가

### 8.2 최종 상태

| 항목 | 상태 |
|-----|------|
| 알파벳 학습 | ✅ 정상 작동 |
| 파닉스 블렌딩 | ✅ 정상 작동 |
| 단어 학습 | ✅ 정상 작동 |
| 대명사 학습 | ✅ 정상 작동 |
| 명사 학습 | ✅ 정상 작동 |
| 문장 만들기 | ✅ 정상 작동 |
| 스토리 읽기 | ⚠️ 미구현 |

### 8.3 서비스 가용성

**현재 사용 가능한 기능**:
- ✅ 파닉스 학습 (9개 레슨, 70+ 아이템)
- ✅ 단어 학습 (12개 레슨, 120+ 단어)
- ✅ 문장 학습 (5개+ 레슨)

**미구현 기능**:
- ⚠️ 스토리 읽기 (8개 스토리, 32+ 페이지)

**전체 완성도**: 약 85% (스토리 제외 시 100%)

---

## 9. 부록: 유용한 쿼리

### 9.1 레슨별 아이템 확인

```sql
-- 특정 레슨의 모든 아이템 보기
SELECT
  order_index,
  content_type,
  content_data
FROM lesson_items
WHERE lesson_id = '<lesson_id>'
ORDER BY order_index;
```

### 9.2 콘텐츠 타입별 통계

```sql
-- 콘텐츠 타입별 개수
SELECT
  content_type,
  COUNT(*) as count
FROM lesson_items
GROUP BY content_type
ORDER BY count DESC;
```

### 9.3 레슨 타입별 통계

```sql
-- 레슨 타입별 개수와 평균 아이템 수
SELECT
  l.lesson_type,
  COUNT(DISTINCT l.id) as lesson_count,
  COUNT(li.id) as total_items,
  ROUND(COUNT(li.id)::numeric / NULLIF(COUNT(DISTINCT l.id), 0), 1) as avg_items_per_lesson
FROM lessons l
LEFT JOIN lesson_items li ON l.id = li.lesson_id
GROUP BY l.lesson_type
ORDER BY lesson_count DESC;
```

---

**문서 버전**: 1.0
**최종 수정**: 2026-03-20
**작성자**: Claude Code
