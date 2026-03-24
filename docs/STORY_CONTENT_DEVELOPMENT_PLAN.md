# 스토리 컨텐츠 개발 계획서 (Story Content Development Plan)

**작성일**: 2026-03-24
**프로젝트**: English Fairy - Interactive Storybook Module
**목적**: 체계적이고 교육적으로 효과적인 인터랙티브 스토리 컨텐츠 개발

---

## 1. Executive Summary

### 1.1 현재 상태
- **스토리 데이터베이스**: 10개 스토리 (Fiction 6개, Non-fiction 4개)
- **기술 구현**: 완료 (Tappable words, Quiz system, Progress tracking)
- **컨텐츠 품질**: 기본 레벨 (4페이지 단편 스토리)
- **교육 효과성**: 개선 필요 (Lexile 레벨링, 단어 타입 분류 완료)

### 1.2 문제점
1. **컨텐츠 부족**: 10개로는 지속적 학습 지원 불가
2. **스토리 깊이**: 4페이지는 몰입감 부족
3. **교육적 다양성**: 장르와 학습 목표 다양성 부족
4. **멀티미디어**: Illustration, Audio URL이 대부분 비어있음

### 1.3 목표
1. **6개월 내 60개 스토리 제작** (월 10개)
2. **Lexile 0-300 범위 커버** (초급~중급)
3. **멀티미디어 통합** (일러스트, TTS 오디오)
4. **교육적 효과 극대화** (Dialogic reading, 반복 노출)

---

## 2. 리서치 인사이트 (2024-2025 Best Practices)

### 2.1 인터랙티브 스토리북 핵심 원칙

#### A. Multimedia Learning (Mayer's Principles)
**출처**: 2024 Sage Journals 연구

- **Coherence Principle**: 불필요한 요소 제거, 핵심 콘텐츠 집중
- **Redundancy Principle**: 시각 + 내레이션 > 시각 + 텍스트
- **Human Voice**: 로봇 음성보다 인간 목소리 선호
- **Conversational Tone**: 형식적이지 않은 친근한 톤

**적용 방안**:
```
✓ TTS는 자연스러운 인간 목소리 사용 (Google Cloud TTS WaveNet)
✓ 페이지당 삽화 1개 + 내레이션
✓ 텍스트는 간결하게 (페이지당 2-3문장)
```

#### B. Dialogic Reading Techniques
**출처**: PMC Research, Reading Rockets

- **PEER Sequence**:
  - **P**rompt: 아이가 이야기에 대해 말하도록 유도
  - **E**valuate: 아이의 반응 평가
  - **E**xpand: 아이의 답변 확장
  - **R**epeat: 새로운 정보로 다시 묻기

- **Open-ended Questions**: "What do you see?" instead of "Is this a dog?"

**적용 방안**:
```
✓ 각 스토리에 "Think About It" 섹션 추가
✓ 퀴즈를 단순 이해도 체크 → 추론/예측 질문으로 확장
✓ 부모용 Discussion Guide 제공
```

#### C. Repeated Reading & Spaced Repetition
**출처**: Preschoolers' Word-Learning Study

- **3회 반복 읽기**: 어휘 습득률 40% 증가
- **Elaborated Input**: 단순 반복보다 확장된 설명이 효과적

**적용 방안**:
```
✓ "Read Again" 기능 강조
✓ 두 번째 읽기에서 "New Words" 하이라이트
✓ Spaced repetition으로 이전 스토리 단어 재등장
```

### 2.2 상업 플랫폼 분석

#### Epic! Books
- **강점**: 연령/흥미 기반 추천, 배지 시스템, 독서 통계
- **약점**: 수동적 읽기, 상호작용 부족

#### Raz-Kids
- **강점**: Reading level 기반, 녹음 기능, 이해도 퀴즈, 가상 인센티브
- **약점**: 인터페이스가 교육적이지만 재미 부족

#### Oxford Reading Tree (ORT)
- **강점**: Structured progression, 반복 캐릭터, Phonics 통합
- **약점**: 디지털 버전 상호작용 제한적

**우리의 차별점**:
```
✓ Raz-Kids의 레벨링 + Epic의 재미 + ORT의 구조화
✓ Word-level tapping (Epic/Raz에 없음)
✓ AI 기반 발음 피드백 (향후)
✓ 게임화된 progression (캐릭터 수집)
```

---

## 3. 스토리 컨텐츠 아키텍처

### 3.1 스토리 레벨 체계

| Level | Lexile | 월령 | 특징 | 스토리 수 |
|-------|--------|------|------|----------|
| **Pre-A** | 0-40 | 1-3 | 단어 3-5개/문장, 반복 구문 | 15개 |
| **A** | 40-100 | 4-6 | 단어 5-8개/문장, Sight words 중심 | 15개 |
| **B** | 100-200 | 7-9 | 단어 8-12개/문장, Simple past 도입 | 15개 |
| **C** | 200-300 | 10-12 | 단어 12-15개/문장, 복문 시작 | 15개 |

### 3.2 장르 분류 및 학습 목표

#### Fiction (60%)
1. **Animal Stories** (20%): Personification, Empathy
2. **Adventure** (15%): Sequencing, Problem-solving
3. **Family & Friends** (15%): Social-emotional learning
4. **Fantasy** (10%): Imagination, Vocabulary expansion

#### Non-fiction (40%)
1. **Science & Nature** (15%): Informational text, Facts
2. **Community Helpers** (10%): Real-world vocabulary
3. **How Things Work** (10%): Process description
4. **World Cultures** (5%): Diversity, Geography

### 3.3 스토리 구조 템플릿

#### Template A: Classic Story Arc (Fiction)
```
Page 1: Introduction (Setting + Character)
Page 2-3: Problem/Challenge
Page 4-5: Climax/Solution attempt
Page 6: Resolution
Page 7: Reflection/Moral

Total: 7 pages (up from 4)
```

**예시 (Level A)**:
```
Title: "The Lost Teddy"
P1: "Mia has a teddy. Teddy is brown. Teddy is soft."
P2: "One day, Teddy is gone! Mia looks under the bed."
P3: "Mia looks in the closet. No teddy!"
P4: "Mia looks in the garden. There is teddy!"
P5: "Teddy is wet. Teddy is muddy."
P6: "Mia washes teddy. Now teddy is clean!"
P7: "Mia hugs teddy. I love you, teddy!"

Target Words:
- Sight words: has, is, the, in, no, there
- Phonics: bed, wet, muddy
- Emotion: gone, love
```

#### Template B: Question-Answer (Non-fiction)
```
Page 1: Question (e.g., "What do bees do?")
Page 2-5: Answers with facts (one fact per page)
Page 6: Summary
Page 7: "Try This!" activity

Total: 7 pages
```

**예시 (Level B)**:
```
Title: "Busy Bees"
P1: "What do bees do all day?"
P2: "Bees fly to flowers. They collect nectar."
P3: "Bees bring nectar back to the hive."
P4: "Bees make honey from nectar. Yum!"
P5: "Bees also spread pollen. This helps flowers grow."
P6: "Bees are very important for plants and people!"
P7: "Try this: Draw a bee visiting a flower!"

Target Words:
- Content: bee, flower, nectar, hive, honey, pollen
- Verbs: fly, collect, bring, make, spread
```

### 3.4 Words Data 구조 강화

**현재 구조** (story_pages.words_data):
```json
[
  {"word": "I", "type": "sight"},
  {"word": "dog", "type": "phonics"}
]
```

**개선된 구조**:
```json
[
  {
    "word": "dog",
    "type": "phonics",
    "phoneme_breakdown": ["d", "o", "g"],
    "definition_simple": "an animal that barks",
    "example_sentence": "The dog runs fast.",
    "image_url": "/vocab/dog.png",
    "audio_url": "/vocab/dog.mp3",
    "difficulty": 1,
    "frequency_rank": 120
  }
]
```

**benefits**:
- 탭 시 단어 정의 표시 가능
- Vocabulary building 추적
- Adaptive learning (어려운 단어 재노출)

---

## 4. 제작 파이프라인

### 4.1 Phase 1: Story Writing (Weeks 1-4)

#### 작업 흐름
```
Step 1: Topic Selection (교육 목표 + 흥미도)
Step 2: Lexile Target Setting
Step 3: Controlled Vocabulary List (기존 학습 단어 + 신규 5-8개)
Step 4: Draft Writing (7 pages)
Step 5: Readability Check (Lexile Analyzer)
Step 6: Peer Review
```

#### 도구
- **Lexile Analyzer**: https://lexile.com/analyzer/
- **Readability Formulas**: https://readabilityformulas.com/
- **Controlled Vocabulary**: Dolch Sight Words + Fry's First 100

#### 작가 가이드라인
```markdown
DO:
- Use repetitive sentence structures (Pre-A, A)
- Include 1 emotion word per story
- End with a positive resolution
- Use present tense for Pre-A/A, simple past for B+
- Include onomatopoeia for engagement (splash! buzz!)

DON'T:
- Use idioms or abstract concepts
- Introduce > 8 new words per story
- Create complex subordinate clauses before Level C
- Use passive voice
```

### 4.2 Phase 2: Illustration (Weeks 5-8)

#### 스타일 가이드
- **Art Style**: Soft, rounded, high-contrast
- **Color Palette**: 디자인 시스템의 primary/secondary/tertiary colors
- **Character Consistency**: 반복 캐릭터는 동일 디자인
- **Text-Image Relationship**: 50% overlap (image shows what text says)

#### 제작 방법
**Option A: AI Generation (빠르고 저렴)**
- **Tool**: Midjourney v6 / DALL-E 3
- **Prompt Template**:
  ```
  Children's book illustration, [scene description],
  soft rounded shapes, pastel colors, high contrast,
  friendly character design, educational style,
  no text, simple background, --ar 16:9
  ```
- **Cost**: ~$30/month for unlimited
- **Timeline**: 1 illustration / 5 minutes

**Option B: Human Illustrator (고품질)**
- **Cost**: $50-100 per illustration
- **Timeline**: 3-5 days per story
- **Best for**: Hero stories, recurring characters

**권장 하이브리드**:
- AI로 초안 생성 → Human touchup
- 60% AI + 40% human editing

### 4.3 Phase 3: Audio Production (Weeks 9-12)

#### TTS vs. Human Voice

| Aspect | Google Cloud TTS WaveNet | Human Voice Actor |
|--------|--------------------------|-------------------|
| Cost | $16 per 1M characters (~200 stories) | $100-200 per story |
| Quality | 8/10 (natural but slightly robotic) | 10/10 |
| Speed | Instant | 1 week turnaround |
| Editing | Easy (re-generate) | Requires re-recording |
| **권장** | **Initial Launch** | **Premium Stories** |

#### TTS 최적화 팁
```python
# Google Cloud TTS API 설정
synthesis_input = texttospeech.SynthesisInput(
    text="The dog runs fast!",
    # SSML for emotion
    ssml="""
    <speak>
      The dog <emphasis>runs fast</emphasis>!
      <break time="500ms"/>
    </speak>
    """
)

voice = texttospeech.VoiceSelectionParams(
    language_code="en-US",
    name="en-US-Neural2-C",  # Child-friendly voice
    ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
)

audio_config = texttospeech.AudioConfig(
    audio_encoding=texttospeech.AudioEncoding.MP3,
    speaking_rate=0.85,  # Slower for learners
    pitch=2.0  # Higher pitch for child appeal
)
```

### 4.4 Phase 4: Quiz Design (Weeks 13-16)

#### Quiz Types by Level

**Pre-A & A**:
- **Picture Match**: "Which picture shows the dog?" (4 images)
- **True/False**: "The dog is big. True or False?"
- **What Comes Next?**: Sequencing (3 image sequence)

**B & C**:
- **Comprehension**: "Why did Mia look for Teddy?"
- **Inference**: "How do you think Mia felt when she found Teddy?"
- **Vocabulary**: "What does 'muddy' mean?"

#### Quiz Quality Standards
```
✓ 3-5 questions per story
✓ Mix of recall (40%) + inference (40%) + vocabulary (20%)
✓ Distractors are plausible but clearly wrong
✓ Avoid "all of the above" / "none of the above"
✓ Use images in choices for Pre-A/A
```

---

## 5. 제작 일정 및 목표

### 5.1 6개월 로드맵

| Month | Stories | Focus | Deliverables |
|-------|---------|-------|--------------|
| **M1** | 10 | Pre-A (Lexile 0-40) | 10 stories + illustrations + audio |
| **M2** | 10 | A (Lexile 40-100) | + Quiz system improvement |
| **M3** | 10 | B (Lexile 100-200) | + Parent discussion guides |
| **M4** | 10 | C (Lexile 200-300) | + Vocabulary tracking |
| **M5** | 10 | Mixed review + Themes | + Seasonal stories (Halloween, Christmas) |
| **M6** | 10 | Premium series | + Character merchandise mockups |
| **Total** | **60** | | **Full curriculum** |

### 5.2 주간 제작 페이스

**월 10개 = 주 2.5개**

**Week 1-2**: Writing (5 stories written, reviewed)
**Week 3**: Illustration (5 stories illustrated)
**Week 4**: Audio + Quiz + QA (5 stories completed)

**Team Composition**:
- 1 Writer (20h/week)
- 1 Illustrator (AI + editing) (15h/week)
- 1 Audio Producer (TTS management) (10h/week)
- 1 QA Tester (5h/week)

**Total**: 50h/week → 200h/month → **$3,000-5,000/month** (freelancer rates)

---

## 6. 데이터베이스 스키마 확장

### 6.1 현재 스키마 검토

```sql
-- stories table (현재)
CREATE TABLE stories (
  id UUID PRIMARY KEY,
  title VARCHAR(200),
  author VARCHAR(100),
  genre VARCHAR(50),  -- 'fiction' or 'informational'
  lexile_min INTEGER,
  lexile_max INTEGER,
  page_count INTEGER,
  target_month INTEGER,
  cover_image_url VARCHAR(500),
  is_fiction BOOLEAN,
  is_active BOOLEAN
);

-- story_pages table (현재)
CREATE TABLE story_pages (
  id UUID PRIMARY KEY,
  story_id UUID REFERENCES stories(id),
  page_number INTEGER,
  text_content TEXT,
  words_data JSONB,  -- [{"word": "dog", "type": "phonics"}]
  illustration_url VARCHAR(500),
  audio_url VARCHAR(500)
);
```

### 6.2 확장 제안

#### A. stories 테이블 확장
```sql
ALTER TABLE stories ADD COLUMN:
  series_name VARCHAR(100),  -- e.g., "Mia's Adventures"
  theme VARCHAR(50),  -- e.g., "friendship", "animals"
  emotional_focus VARCHAR(50),  -- e.g., "empathy", "courage"
  target_vocabulary TEXT[],  -- Array of key words
  prerequisite_story_id UUID,  -- For sequential series
  estimated_duration_minutes INTEGER,  -- Reading time
  difficulty_score DECIMAL(3,2),  -- 1.00 to 5.00
  illustration_style VARCHAR(50),  -- "AI", "Human", "Hybrid"
  audio_type VARCHAR(50),  -- "TTS", "Voice Actor"
  created_at TIMESTAMP,
  updated_at TIMESTAMP;
```

#### B. New Table: story_vocabulary
```sql
CREATE TABLE story_vocabulary (
  id UUID PRIMARY KEY,
  story_id UUID REFERENCES stories(id),
  word VARCHAR(100),
  word_type VARCHAR(20),  -- 'sight', 'phonics', 'content'
  phoneme_breakdown TEXT[],
  definition_simple TEXT,
  example_sentence TEXT,
  image_url VARCHAR(500),
  audio_url VARCHAR(500),
  difficulty_level INTEGER,  -- 1-5
  frequency_rank INTEGER,  -- 1-1000
  first_appearance_page INTEGER
);

CREATE INDEX idx_story_vocab ON story_vocabulary(story_id, word);
```

#### C. New Table: discussion_prompts
```sql
CREATE TABLE discussion_prompts (
  id UUID PRIMARY KEY,
  story_id UUID REFERENCES stories(id),
  page_number INTEGER,
  prompt_text TEXT,  -- "What do you think will happen next?"
  prompt_type VARCHAR(50),  -- 'prediction', 'emotion', 'recall'
  target_audience VARCHAR(50)  -- 'child', 'parent'
);
```

#### D. story_quizzes 확장
```sql
ALTER TABLE story_quizzes ADD COLUMN:
  quiz_type VARCHAR(50),  -- 'comprehension', 'inference', 'vocabulary'
  difficulty_level INTEGER,  -- 1-3
  explanation TEXT,  -- Why this is the correct answer
  image_choices JSONB;  -- For picture-based questions
```

---

## 7. 기술적 개선 사항

### 7.1 스토리 리더 UI/UX 개선

#### A. Word Interaction 강화
**현재** (`stories/[bookId]/page.tsx:260-274`):
```tsx
<button onClick={() => handleWordTap(word, i)}>
  {word}
</button>
```

**개선안**:
```tsx
<button
  onClick={() => handleWordTap(word, i)}
  onMouseEnter={() => showWordPreview(word)}  // Desktop
  className={cn(
    "word-button",
    wordDifficulty[word] === 'hard' && "word-new",  // Visual indicator
    learningHistory.includes(word) && "word-learned"
  )}
>
  {word}
  {wordDifficulty[word] === 'hard' && <Sparkle />}  // New word indicator
</button>

// Word Definition Tooltip
{showDefinition && (
  <div className="absolute z-50 card-child p-4 max-w-xs">
    <img src={wordData.image_url} className="w-full h-24 object-cover rounded-lg mb-2" />
    <p className="font-bold text-primary">{word}</p>
    <p className="text-sm text-on-surface-variant">{wordData.definition_simple}</p>
    <audio autoPlay src={wordData.audio_url} />
  </div>
)}
```

#### B. Progress Visualization
```tsx
// Add to story reader
<div className="fixed top-4 right-4 z-40">
  <CircularProgress
    value={(pageIndex / pages.length) * 100}
    size="sm"
    color="tertiary"
  >
    {pageIndex + 1}/{pages.length}
  </CircularProgress>
</div>

// Celebration on completion
{pageIndex === pages.length - 1 && (
  <Confetti />
  <Modal>
    <h2>Story Complete! 🎉</h2>
    <p>You learned {newWordsCount} new words!</p>
    <StoryBadge story={story} />
  </Modal>
)}
```

#### C. Read Again with Highlights
```tsx
// Second read mode
const [readMode, setReadMode] = useState<'first' | 'second'>('first');

{readMode === 'second' && (
  <div className="mb-4 p-3 bg-primary-container/20 rounded-xl">
    <p className="text-sm font-kids">
      🌟 Look for these new words you learned!
    </p>
  </div>
)}

// Highlight target vocabulary on second read
<span className={cn(
  "word",
  readMode === 'second' && isTargetVocab && "bg-primary-container/40"
)}>
  {word}
</span>
```

### 7.2 Parent Dashboard 통합

#### Story Progress Analytics
```tsx
// New component: ParentStoryReport
export function ParentStoryReport({ childId }: { childId: string }) {
  const { data } = useQuery({
    queryKey: ['story-progress', childId],
    queryFn: () => api.get(`/parent/story-progress/${childId}`)
  });

  return (
    <div className="card-parent space-y-6">
      <h3 className="font-headline text-xl font-bold">Reading Progress</h3>

      {/* Stories Read Chart */}
      <BarChart
        data={data.stories_by_week}
        xKey="week"
        yKey="count"
        color="tertiary"
      />

      {/* Vocabulary Growth */}
      <div>
        <h4 className="font-body text-sm text-on-surface-variant mb-2">
          Vocabulary Acquired
        </h4>
        <div className="flex items-baseline gap-2">
          <span className="font-headline text-4xl font-black text-tertiary">
            {data.total_words_learned}
          </span>
          <span className="text-sm text-on-surface-variant">words</span>
        </div>
      </div>

      {/* Recommended Next Stories */}
      <div>
        <h4 className="font-body text-sm text-on-surface-variant mb-3">
          Recommended Next
        </h4>
        <div className="space-y-2">
          {data.recommendations.map(story => (
            <StoryRecommendationCard key={story.id} story={story} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 7.3 백엔드 API 확장

#### New Endpoints
```python
# app/routers/stories.py

@router.get("/stories/{story_id}/vocabulary")
async def get_story_vocabulary(
    story_id: UUID,
    child_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get vocabulary list with learning status for a story.
    Returns words the child hasn't learned yet highlighted.
    """
    vocab = db.query(StoryVocabulary).filter(
        StoryVocabulary.story_id == story_id
    ).all()

    learned_words = db.query(LearnedVocabulary.word).filter(
        LearnedVocabulary.child_id == child_id
    ).all()

    return [
        {
            **vocab_item.dict(),
            "is_learned": vocab_item.word in learned_words
        }
        for vocab_item in vocab
    ]

@router.post("/stories/{story_id}/complete")
async def mark_story_complete(
    story_id: UUID,
    child_id: UUID,
    time_spent_seconds: int,
    new_words_learned: List[str],
    db: Session = Depends(get_db)
):
    """
    Record story completion and update vocabulary progress.
    """
    # Record completion
    record = LearningRecord(
        child_id=child_id,
        lesson_id=story_id,
        lesson_type="story",
        time_spent_seconds=time_spent_seconds,
        completed_at=datetime.now()
    )
    db.add(record)

    # Update vocabulary
    for word in new_words_learned:
        vocab_entry = LearnedVocabulary(
            child_id=child_id,
            word=word,
            first_learned_at=datetime.now(),
            story_id=story_id
        )
        db.add(vocab_entry)

    db.commit()
    return {"success": True, "xp_earned": 50}
```

---

## 8. 컨텐츠 품질 보증

### 8.1 체크리스트

#### Story Writing
- [ ] Lexile score within target range (±10)
- [ ] Max 8 new words per story
- [ ] Repetitive sentence structures (Pre-A/A)
- [ ] Positive resolution
- [ ] No idioms or abstract concepts
- [ ] Emotional vocabulary included
- [ ] Age-appropriate themes

#### Illustration
- [ ] Matches text content 50%+
- [ ] Follows design system colors
- [ ] Clear, uncluttered composition
- [ ] Character consistency (if series)
- [ ] No text in images
- [ ] 16:9 aspect ratio
- [ ] High contrast for readability

#### Audio
- [ ] Clear pronunciation
- [ ] Appropriate pacing (0.85x speed)
- [ ] Emotion in voice
- [ ] No background noise
- [ ] MP3 format, 128kbps
- [ ] Sentence-by-sentence files

#### Quiz
- [ ] 3-5 questions per story
- [ ] Mix of recall/inference/vocabulary
- [ ] Plausible distractors
- [ ] No "all of the above"
- [ ] Images in choices (Pre-A/A)
- [ ] Correct answer validated

### 8.2 Testing Protocol

#### Phase 1: Internal QA
- **Readability**: Lexile Analyzer check
- **Technical**: Load time < 2s, No broken images/audio
- **Content**: Grammar, Spelling check

#### Phase 2: Beta Testing (5-10 children)
- **Engagement**: Do children finish the story?
- **Comprehension**: Quiz pass rate > 70%?
- **Enjoyment**: Post-story survey (emoji rating)

#### Phase 3: Iteration
- Rewrite pages with < 60% completion rate
- Replace illustrations with < 3/5 rating
- Adjust quiz difficulty if pass rate < 60% or > 90%

---

## 9. Success Metrics

### 9.1 Content KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Stories published | 60 in 6 months | Database count |
| Avg. Lexile accuracy | ±10 from target | Lexile Analyzer |
| Illustration quality | 4/5 rating | User survey |
| Audio clarity | < 5% complaints | Support tickets |
| Quiz pass rate | 70-85% | Analytics |

### 9.2 Engagement KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Story completion rate | > 80% | `story_reads` table |
| Avg. time per story | 3-5 minutes | `time_spent_seconds` |
| Repeat reads | > 30% | Multiple records per story |
| Word tap rate | > 5 taps/story | Event tracking |
| Quiz attempts | > 90% | Quiz completion records |

### 9.3 Learning Outcomes

| Metric | Target | Measurement |
|--------|--------|-------------|
| Vocabulary retention | > 60% after 1 week | Spaced repetition quizzes |
| Reading level progression | +1 level per 3 months | Lexile pre/post test |
| Comprehension accuracy | > 75% | Quiz scores |
| Parent satisfaction | 4.5/5 | Survey |

---

## 10. Budget & Resources

### 10.1 Cost Breakdown (6 months)

| Category | Cost/Month | Total (6M) |
|----------|------------|------------|
| **Content Creation** |
| Writer (freelance) | $2,000 | $12,000 |
| Illustrator (AI + editing) | $1,500 | $9,000 |
| Audio Producer (TTS management) | $500 | $3,000 |
| QA Tester | $500 | $3,000 |
| **Tools & Services** |
| Midjourney Pro | $60 | $360 |
| Google Cloud TTS | $50 | $300 |
| Lexile Analyzer | $200/year | $200 |
| **Total** | **$4,810** | **$28,860** |

### 10.2 Cost Optimization

**Option A: In-house team** (더 비쌈, 더 빠름)
- Full-time writer/illustrator: $50K/year
- Better quality control
- Faster iteration

**Option B: Freelance (권장)**
- Flexible scaling
- Lower fixed costs
- Access to diverse talent

**Option C: Hybrid**
- In-house writer for story structure
- Freelance illustrator for visuals
- Automated TTS for audio

---

## 11. Risk Assessment

### 11.1 Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Content delays** | High | Medium | Build 2-week buffer, have backup writers |
| **Illustration quality issues** | Medium | High | Trial period with 3 illustrators, pick best |
| **TTS sounds unnatural** | Medium | Medium | Use WaveNet, add SSML, human backup |
| **Low engagement** | Low | High | Beta test every batch, iterate based on data |
| **Copyright issues** | Low | Critical | Original content only, CC0 images, legal review |
| **Budget overrun** | Medium | Medium | Phase-gated releases, cut scope if needed |

### 11.2 Contingency Plan

**If Budget Cut by 50%**:
- Reduce to 30 stories (5/month)
- Use AI illustrations exclusively
- TTS only (no voice actors)
- Self-QA (no dedicated tester)

**If Timeline Extended to 12 months**:
- Hire part-time freelancers
- More thorough testing
- Premium illustration quality
- Build character merchandise

---

## 12. Next Steps & Timeline

### 12.1 Immediate Actions (Week 1)

#### Day 1-2: Setup
- [ ] Hire freelance writer (post on Upwork/Fiverr)
- [ ] Set up Midjourney account
- [ ] Configure Google Cloud TTS API
- [ ] Create story template documents

#### Day 3-4: Pilot Story
- [ ] Write 1 Pre-A story (7 pages)
- [ ] Generate illustrations (Midjourney)
- [ ] Produce audio (TTS)
- [ ] Create quiz (3 questions)
- [ ] Test in app

#### Day 5-7: Review & Iterate
- [ ] Internal review
- [ ] 3 kids beta test
- [ ] Gather feedback
- [ ] Refine pipeline

### 12.2 Month 1 Milestones

- [ ] Week 1: 3 stories completed
- [ ] Week 2: 3 stories completed
- [ ] Week 3: 4 stories completed
- [ ] Week 4: QA + publish 10 stories

### 12.3 Quarterly Reviews

**Q1 Review (Month 3)**:
- Stories 1-30 published
- Engagement metrics analysis
- Content strategy adjustment
- Budget review

**Q2 Review (Month 6)**:
- Stories 31-60 published
- Learning outcomes assessment
- Parent feedback integration
- Plan next 60 stories

---

## 13. Appendix

### 13.1 Story Idea Bank (60 Titles)

#### Pre-A (Lexile 0-40) - 15 stories
1. Big and Small (opposites)
2. I Can Jump (actions)
3. Red, Blue, Green (colors)
4. My Family (people)
5. One, Two, Three (numbers)
6. Cat and Dog (animals)
7. In the Box (prepositions)
8. Hot and Cold (sensations)
9. Day and Night (time)
10. Happy and Sad (emotions)
11. Up and Down (directions)
12. Fast and Slow (speed)
13. Shapes All Around (geometry)
14. At the Park (places)
15. I Like Food (preferences)

#### A (Lexile 40-100) - 15 stories
1. The Lost Teddy (problem-solving)
2. Mia's New Friend (friendship)
3. The Big Red Dog (size/color)
4. A Day at the Farm (animals)
5. Let's Make a Cake (process)
6. The Little Seed (growth)
7. Where is my Sock? (searching)
8. The Rainbow (colors/weather)
9. My School Day (routine)
10. The Magic Hat (fantasy)
11. Helping Mom (responsibility)
12. The Noisy Street (sounds)
13. Bedtime Story (routine)
14. The Treasure Hunt (adventure)
15. Sharing is Caring (social skills)

#### B (Lexile 100-200) - 15 stories
1. All About the Sun (science)
2. How Butterflies Grow (life cycle)
3. The Secret Garden (discovery)
4. Benny's Birthday (celebration)
5. The Rainy Day Adventure (weather)
6. Animals in the Sea (habitat)
7. The Brave Little Mouse (courage)
8. My First Pet (responsibility)
9. The Moon and Stars (astronomy)
10. Jobs in Our Town (community)
11. The Magic Paint Brush (creativity)
12. Lost in the Forest (problem-solving)
13. The Dinosaur Museum (history)
14. Making New Friends (social)
15. The Camping Trip (nature)

#### C (Lexile 200-300) - 15 stories
1. The Mystery of the Missing Cookies (mystery)
2. Journey to the Top of the Mountain (perseverance)
3. The Robot's First Day (technology)
4. How Airplanes Fly (science)
5. The Secret of the Moon (space)
6. The Time Traveler's Watch (fantasy)
7. Building a Treehouse (process)
8. The Underwater Adventure (exploration)
9. The Talent Show (confidence)
10. Recycling Saves the Earth (environment)
11. The Magic Library (imagination)
12. A Visit to the Hospital (health)
13. The Great Race (competition)
14. Seasons of the Year (time)
15. The Kindness Chain (empathy)

### 13.2 Controlled Vocabulary Lists

#### Dolch Pre-Primer (40 words)
a, and, away, big, blue, can, come, down, find, for, funny, go, help, here, I, in, is, it, jump, little, look, make, me, my, not, one, play, red, run, said, see, the, three, to, two, up, we, where, yellow, you

#### Fry's First 100 (most frequent)
the, of, and, a, to, in, is, you, that, it, he, was, for, on, are, as, with, his, they, I, at, be, this, have, from, or, one, had, by, word, but, not, what, all, were, we, when, your, can, said, there, use, an, each, which, she, do, how, their, if, will, up, other, about, out, many, then, them, these, so, some, her, would, make, like, him, into, time, has, look, two, more, write, go, see, number, no, way, could, people, my, than, first, water, been, call, who, oil, its, now, find, long, down, day, did, get, come, made, may, part

### 13.3 Reference Resources

#### Readability Tools
- Lexile Analyzer: https://lexile.com/analyzer/
- Readability Formulas: https://readabilityformulas.com/
- Hemingway Editor: https://hemingwayapp.com/

#### Illustration Inspiration
- Children's Book Illustrations on Pinterest
- Caldecott Award Winners
- Eric Carle, Leo Lionni, Beatrix Potter styles

#### Educational Standards
- Common Core State Standards (CCSS) for ELA
- WIDA English Language Development Standards
- National Association for the Education of Young Children (NAEYC)

#### Research Papers
1. "Developing Digital Storybook to Improve Children's Language Learning" (2021)
2. "Interactive E-Storybook Intervention for Reading Comprehension" (2024)
3. "Dialogic Reading's Potential to Improve Children's Emergent Literacy Skills" (2015)

---

**Document Version**: 1.0
**Last Updated**: 2026-03-24
**Author**: Claude Code
**Status**: Ready for Implementation
**Next Review**: End of Month 1 (2026-04-24)
