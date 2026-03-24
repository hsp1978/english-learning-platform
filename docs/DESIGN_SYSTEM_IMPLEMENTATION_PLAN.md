# 디자인 시스템 적용 계획서 (Design System Implementation Plan)

**작성일**: 2026-03-24
**프로젝트**: English Fairy - 아동 영어 교육 플랫폼
**목적**: "The Dual-Experience Framework" 디자인 시스템의 체계적 적용

---

## 1. Executive Summary

### 1.1 현재 상태 분석
- **디자인 시스템 문서**: 완비됨 (`docs/design-system.md`)
- **현재 구현 수준**: 부분 적용 (약 40%)
- **주요 갭**:
  - Child Theme의 playful physics 미적용
  - Parent Theme의 glassmorphism 미구현
  - 1px border 여전히 사용 중
  - Typography 계층 불완전

### 1.2 목표
1. **Child Experience**: 촉각적이고 즐거운 학습 환경 구현
2. **Parent Experience**: 전문적이고 데이터 중심의 대시보드 구현
3. **Design Consistency**: 100% 디자인 시스템 준수
4. **Performance**: 애니메이션 최적화로 60fps 유지

---

## 2. 디자인 시스템 핵심 원칙

### 2.1 The Adaptive Storybook 컨셉
- **Child Theme**: "Tactile Softness" - 큰 radius, springy physics
- **Parent Theme**: "Editorial Precision" - glassmorphism, high-contrast typography

### 2.2 No-Line Rule
- **금지**: `border: 1px solid #ccc` 같은 선
- **대안**: Surface 계층과 elevation으로 구분

### 2.3 Surface Hierarchy
```
Level 4: surface-container-highest (recessed areas)
Level 3: surface-container-high    (metadata)
Level 2: surface-container-low     (sectioning)
Level 1: surface-container-lowest  (elevated cards)
Level 0: surface                   (base canvas)
```

---

## 3. 현재 구현 현황

### 3.1 ✅ 이미 적용된 요소

#### Color System
```css
/* globals.css lines 3-54 */
- Material Design 3 기반 color tokens ✓
- Primary/Secondary/Tertiary 정의 ✓
- Surface hierarchy 변수 ✓
```

#### Typography Tokens
```css
/* globals.css lines 56-59 */
--font-headline: "Plus Jakarta Sans" ✓
--font-body: "Be Vietnam Pro" ✓
--font-kids: "Quicksand" ✓ (Child Theme용)
```

#### Utilities
```css
/* globals.css lines 110-121 */
.spring-bounce ✓
.shadow-child-ambient ✓
Custom animations ✓
```

### 3.2 ⚠️ 부분 적용된 요소

#### Child Pages
- `home/page.tsx`: 디자인 시스템 60% 적용
  - ✓ rounded-3xl, spring-bounce 사용
  - ✓ Material Icons 사용
  - ✗ Hero section에 glassmorphism 미적용
  - ✗ Asymmetrical margins 미사용

- `stories/page.tsx`: 디자인 시스템 40% 적용
  - ✓ surface-container-lowest 사용
  - ✓ shadow-child-ambient 적용
  - ✗ 여전히 `border` 스타일 존재 가능성
  - ✗ Typography scale 미준수

#### Interactive Components
- `stories/[bookId]/page.tsx`: 30% 적용
  - ✓ Tappable words with highlight
  - ✓ Animations with framer-motion
  - ✗ Card dividers 존재
  - ✗ Button hierarchy 불명확

### 3.3 ❌ 미적용 요소

#### Parent Dashboard
- Parent Theme 전체 미구현
- Glassmorphic navigation 없음
- Floating Progress Component 없음
- Editorial typography 미적용

#### Components
- Standardized Button variants 미완성
- Input fields의 "recessed look" 미적용
- Card header/body 구분에 divider 사용 가능성

---

## 4. 구현 로드맵 (4주 계획)

### Week 1: Foundation & Token Expansion

#### 1.1 CSS Variable Expansion
**파일**: `frontend/src/styles/globals.css`

```css
/* 추가할 tokens */
@theme {
  /* Typography Scale - 디자인 시스템 3.에 따라 */
  --font-size-display-lg: 3.5rem;
  --font-size-headline-md: 1.75rem;
  --font-size-title-lg: 1.375rem;
  --font-size-body-lg: 1rem;
  --font-size-label-md: 0.75rem;

  /* Spacing Scale - Editorial asymmetry를 위해 */
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-12: 3rem;

  /* Elevation Shadows */
  --shadow-child-soft: 0 20px 40px -15px rgba(160, 55, 59, 0.12);
  --shadow-parent-professional: 0 8px 30px rgba(0, 0, 0, 0.04);

  /* Backdrop Blur for glassmorphism */
  --blur-glass: blur(24px);
}
```

#### 1.2 Component Base Classes 정의
**새 파일**: `frontend/src/styles/components.css`

```css
@layer components {
  /* ═══ Buttons ═══ */
  .btn-primary-child {
    @apply bg-primary text-on-primary rounded-3xl px-10 py-5;
    @apply font-kids font-bold text-xl shadow-child-ambient spring-bounce;
    transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .btn-secondary-child {
    @apply bg-secondary-container text-on-secondary-container rounded-xl;
    @apply font-kids font-bold px-6 py-3 spring-bounce;
  }

  .btn-tertiary-child {
    @apply text-primary font-bold px-4 py-2;
    @apply hover:bg-primary-container/20 rounded-lg transition-colors;
  }

  .btn-primary-parent {
    @apply bg-primary text-on-primary rounded-xl px-8 py-4;
    @apply font-headline font-bold text-base;
    @apply shadow-parent-ambient backdrop-blur-xl;
  }

  /* ═══ Cards ═══ */
  .card-child {
    @apply bg-surface-container-lowest rounded-xl p-6;
    @apply shadow-child-ambient border-none spring-bounce;
  }

  .card-child-sectioned {
    @apply card-child;
    /* NO DIVIDERS - use spacing or bg shift */
  }

  .card-child-header {
    @apply mb-6; /* spacing-6 gap instead of divider */
  }

  .card-parent {
    @apply bg-surface-container rounded-xl p-8;
    @apply shadow-parent-ambient border-none;
    @apply backdrop-blur-xl bg-surface/60;
  }

  /* ═══ Input Fields ═══ */
  .input-recessed {
    @apply bg-surface-container-highest/50 border-none rounded-md;
    @apply px-4 py-3 text-on-surface;
    @apply focus:ring-2 focus:ring-primary/30 outline-none;
    @apply transition-all duration-200;
  }

  /* ═══ Progress Components ═══ */
  .progress-bar-child {
    @apply h-10 w-full bg-surface-container-high rounded-full overflow-hidden p-1.5;
    @apply shadow-inner;
  }

  .progress-fill-child {
    @apply h-full bg-tertiary rounded-full relative;
    @apply transition-all duration-1000 ease-out;
  }
}
```

#### 1.3 Asymmetrical Layout Utilities
```css
@layer utilities {
  /* Editorial Asymmetry */
  .asymmetric-section {
    padding-left: var(--spacing-8);
    padding-right: var(--spacing-12);
  }

  /* Glass Effect for Parent Theme */
  .glass-parent {
    @apply backdrop-blur-xl bg-surface/60;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* No border alternative - Ghost Border */
  .ghost-border {
    @apply border border-outline-variant/20;
  }
}
```

**예상 작업 시간**: 8시간
**담당**: Frontend Developer
**Output**:
- Updated `globals.css`
- New `components.css`
- Token documentation

---

### Week 2: Child Theme Implementation

#### 2.1 Child Home Page Refactoring
**파일**: `frontend/src/app/(child)/home/page.tsx`

**변경 사항**:
```tsx
// BEFORE (line 50-73)
<section className="relative overflow-hidden bg-tertiary-container/30 rounded-xl p-8 md:p-12...">

// AFTER
<section className="relative overflow-hidden bg-hero-texture rounded-3xl p-8 md:p-12
                    shadow-child-ambient asymmetric-section">
  {/* Gradient background per design system 2. Glass & Gradient Rule */}
  <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container opacity-90" />

  <div className="flex-1 space-y-6 z-10 relative">
    <span className="bg-primary-container text-on-primary-container
                     px-4 py-1.5 rounded-full font-headline font-bold
                     text-xs uppercase tracking-wider">
      Level {level} Explorer
    </span>

    {/* Typography: display-lg per design system 3. */}
    <h2 className="text-[3.5rem] md:text-[4rem] font-headline font-black
                   text-white leading-tight">
      Welcome back,<br />{child?.nickname || "Little Fairy"}!
    </h2>

    {/* Body: body-lg */}
    <p className="text-lg text-white/90 font-body font-medium max-w-md">
      Ready to discover new magical stories and win shiny stickers today?
    </p>

    {nextLesson && (
      <button
        onClick={() => handleMissionClick(nextLesson.lesson_type, nextLesson.id)}
        className="btn-primary-child flex items-center gap-3"
      >
        <span className="material-symbols-outlined fill-icon text-2xl">play_circle</span>
        Start Today's Quest
      </button>
    )}
  </div>
</section>
```

**변경 포인트**:
- ✅ Hero gradient 적용 (design system 2.)
- ✅ Typography scale 준수 (design system 3.)
- ✅ rounded-3xl for child theme
- ✅ btn-primary-child 컴포넌트 클래스 사용

#### 2.2 Stories Page Redesign
**파일**: `frontend/src/app/(child)/stories/page.tsx`

**StoryCard 컴포넌트 개선**:
```tsx
// BEFORE (lines 96-117)
function StoryCard({ story, onSelect }: { story: StoryListItem; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className={cn(
        "w-full bg-surface-container-lowest rounded-xl p-4...",
        story.is_read && "ring-2 ring-mint-400",
      )}>
      {/* ... */}
    </button>
  );
}

// AFTER
function StoryCard({ story, onSelect }: { story: StoryListItem; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "card-child w-full flex items-center gap-4",
        "hover:shadow-[0_24px_48px_-18px_rgba(160,55,59,0.15)]", // Enhanced shadow on hover
        story.is_read && "ring-2 ring-tertiary/30", // Success color
      )}
    >
      {/* Cover Image - elevated with tonal layering */}
      <div className="w-16 h-20 rounded-xl bg-surface-container-high
                      flex items-center justify-center text-3xl shrink-0
                      shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)]">
        {story.is_fiction ? "📖" : "🔬"}
      </div>

      <div className="flex-1 min-w-0 text-left">
        {/* Title: title-lg */}
        <p className="font-headline text-[1.375rem] font-bold text-on-surface truncate">
          {story.title}
        </p>
        {/* Metadata: label-md with on-surface-variant */}
        <p className="text-[0.75rem] text-on-surface-variant mt-1 font-label">
          {story.page_count} pages · L{story.lexile_min}-{story.lexile_max}
        </p>
      </div>

      {story.is_read && (
        <span className="text-xs text-tertiary font-bold shrink-0
                         bg-tertiary-container/30 px-3 py-1 rounded-full">
          Complete
        </span>
      )}
    </button>
  );
}
```

**변경 포인트**:
- ✅ card-child 클래스 사용
- ✅ NO dividers - spacing으로 분리
- ✅ Typography tokens 적용
- ✅ Tonal layering (surface-container-high for cover)
- ✅ Success state에 tertiary 색상 사용

#### 2.3 Story Reader Enhancements
**파일**: `frontend/src/app/(child)/stories/[bookId]/page.tsx`

**Tappable Words 개선** (lines 260-274):
```tsx
// AFTER
<div className="flex flex-wrap gap-x-2 gap-y-2 leading-relaxed">
  {words.map((word, i) => (
    <button
      key={i}
      onClick={() => handleWordTap(word.replace(/[.,!?]/g, ""), i)}
      className={cn(
        "text-english font-body font-semibold px-3 py-1.5 rounded-xl",
        "transition-all duration-300",
        "spring-bounce", // Add spring physics
        highlightWord === i
          ? "bg-primary text-on-primary scale-110 shadow-child-ambient"
          : "text-on-surface hover:bg-surface-container-low active:scale-95",
      )}
    >
      {word}
    </button>
  ))}
</div>
```

**Quiz Choice Buttons** (lines 186-209):
```tsx
// Remove borders, use surface hierarchy
<motion.button
  key={i}
  whileTap={{ scale: 0.97 }}
  onClick={() => handleQuizAnswer(i)}
  disabled={selectedAnswer !== null}
  className={cn(
    "w-full p-5 rounded-2xl text-left text-english font-body font-medium",
    "transition-all duration-300",
    // Default state: elevated card
    !showResult && "bg-surface-container-lowest shadow-child-ambient",
    // Correct state
    showResult && isCorrectAnswer &&
      "bg-tertiary-container border-none ring-4 ring-tertiary/30 text-on-tertiary-container",
    // Wrong state
    showResult && isSelected && !isCorrectAnswer &&
      "bg-error-container/20 ring-4 ring-error/30 text-error",
    // Unselected state
    showResult && !isSelected && !isCorrectAnswer &&
      "bg-surface-container-high text-on-surface-variant opacity-50",
  )}
>
  <span className="mr-3 text-on-surface-variant font-label">
    {String.fromCharCode(65 + i)}.
  </span>
  {choice}
</motion.button>
```

**변경 포인트**:
- ✅ Remove all `border` styles
- ✅ Use surface hierarchy for states
- ✅ Ring으로 focus/selection 표현
- ✅ Tertiary for success, Error for wrong

**예상 작업 시간**: 16시간
**Output**:
- Refactored Child pages
- Component consistency
- No borders anywhere

---

### Week 3: Parent Theme Implementation

#### 3.1 Parent Dashboard Shell
**새 파일**: `frontend/src/app/(parent)/dashboard/layout.tsx`

```tsx
export default function ParentDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-mesh">
      {/* Glassmorphic Navigation */}
      <nav className="sticky top-0 z-50 glass-parent border-none">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <h1 className="font-headline text-[1.75rem] font-bold text-on-surface">
            Parent Dashboard
          </h1>

          <div className="flex items-center gap-6">
            <button className="btn-tertiary-parent">Analytics</button>
            <button className="btn-tertiary-parent">Settings</button>
            <div className="w-10 h-10 rounded-full bg-primary-container
                          flex items-center justify-center">
              <span className="material-symbols-outlined fill-icon text-primary">person</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="asymmetric-section py-12">
        {children}
      </main>
    </div>
  );
}
```

#### 3.2 Floating Progress Component
**새 컴포넌트**: `frontend/src/components/parent/FloatingProgressRing.tsx`

```tsx
"use client";

import { motion } from "motion/react";

interface FloatingProgressRingProps {
  percentage: number;
  label: string;
  subtitle: string;
}

export function FloatingProgressRing({
  percentage,
  label,
  subtitle
}: FloatingProgressRingProps) {
  const circumference = 2 * Math.PI * 45; // radius 45
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="card-parent relative w-48 h-48 flex flex-col items-center justify-center">
      {/* Glassmorphic background */}
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        {/* Background ring */}
        <circle
          cx="96"
          cy="96"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-tertiary-container/30"
        />
        {/* Progress ring */}
        <motion.circle
          cx="96"
          cy="96"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          className="text-tertiary"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>

      {/* Center content */}
      <div className="relative z-10 text-center">
        <div className="font-headline text-3xl font-black text-tertiary">
          {percentage}%
        </div>
        <div className="font-body text-sm text-on-surface-variant mt-1">
          {label}
        </div>
      </div>

      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2
                      bg-surface px-4 py-1 rounded-full">
        <span className="font-label text-[0.75rem] text-on-surface-variant">
          {subtitle}
        </span>
      </div>
    </div>
  );
}
```

#### 3.3 Weekly Report Card (Editorial Style)
**새 컴포넌트**: `frontend/src/components/parent/WeeklyReportCard.tsx`

```tsx
"use client";

interface ReportData {
  week_range: string;
  total_time_minutes: number;
  lessons_completed: number;
  avg_score: number;
  streak_days: number;
}

export function WeeklyReportCard({ data }: { data: ReportData }) {
  return (
    <article className="card-parent space-y-8">
      {/* Header - NO divider, use spacing-8 gap */}
      <header className="space-y-2">
        <h2 className="font-headline text-[1.75rem] font-bold text-on-surface">
          Weekly Progress
        </h2>
        <p className="font-body text-on-surface-variant">
          {data.week_range}
        </p>
      </header>

      {/* Stats Grid - Asymmetric */}
      <div className="grid grid-cols-2 gap-6 asymmetric-section">
        <StatItem
          icon="schedule"
          value={`${data.total_time_minutes}m`}
          label="Study Time"
        />
        <StatItem
          icon="task_alt"
          value={data.lessons_completed.toString()}
          label="Lessons"
        />
        <StatItem
          icon="trending_up"
          value={`${Math.round(data.avg_score * 100)}%`}
          label="Avg. Score"
          highlight
        />
        <StatItem
          icon="local_fire_department"
          value={`${data.streak_days} days`}
          label="Streak"
          highlight
        />
      </div>
    </article>
  );
}

function StatItem({
  icon,
  value,
  label,
  highlight = false
}: {
  icon: string;
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "p-6 rounded-xl",
      highlight
        ? "bg-tertiary-container/20 border-none"
        : "bg-surface-container-high"
    )}>
      <div className="flex items-center gap-3 mb-2">
        <span className={cn(
          "material-symbols-outlined fill-icon text-2xl",
          highlight ? "text-tertiary" : "text-on-surface-variant"
        )}>
          {icon}
        </span>
        <span className="font-headline text-2xl font-black text-on-surface">
          {value}
        </span>
      </div>
      <p className="font-label text-[0.75rem] text-on-surface-variant uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}
```

**예상 작업 시간**: 20시간
**Output**:
- Parent dashboard structure
- Glassmorphic navigation
- FloatingProgressRing component
- WeeklyReportCard component

---

### Week 4: Polish & Migration

#### 4.1 Remove All Legacy Borders
**Task**: Global search & replace

```bash
# Search for all border usages
grep -r "border:" frontend/src/app/
grep -r "border-\[" frontend/src/app/

# Replace with:
# - ghost-border (if absolutely needed for a11y)
# - surface hierarchy shifts
# - NO borders
```

#### 4.2 Button Standardization
**모든 버튼을 표준화된 클래스로 교체**:

```tsx
// Child pages
<button className="btn-primary-child">Primary</button>
<button className="btn-secondary-child">Secondary</button>
<button className="btn-tertiary-child">Tertiary</button>

// Parent pages
<button className="btn-primary-parent">Primary</button>
<button className="btn-ghost-parent">Ghost</button>
```

#### 4.3 Input Fields Migration
**모든 input을 input-recessed로**:

```tsx
// BEFORE
<input className="border rounded-md px-4 py-2" />

// AFTER
<input className="input-recessed" />
```

#### 4.4 Animation Performance Audit
**도구**: Chrome DevTools Performance tab

**목표**:
- 60fps for all animations
- No layout thrashing
- GPU-accelerated transforms only

**최적화 방법**:
```css
/* Use transform/opacity only for animations */
.optimized-animation {
  will-change: transform, opacity;
  transform: translateZ(0); /* Force GPU */
}
```

#### 4.5 Dark Mode Preparation
**파일**: `globals.css`

```css
@theme {
  /* Add dark mode variants */
  .dark {
    --color-surface: #1a1c1a;
    --color-on-surface: #e1e3de;
    --color-surface-container-lowest: #0f110f;
    /* ... 모든 색상의 dark variant */
  }
}
```

**예상 작업 시간**: 12시간
**Output**:
- 100% border removal
- Standardized components
- Performance optimization
- Dark mode foundation

---

## 5. Success Metrics

### 5.1 Code Quality
- [ ] Zero `border: 1px solid` in codebase
- [ ] 100% use of design system tokens
- [ ] All buttons use standard classes
- [ ] All cards follow surface hierarchy

### 5.2 Visual Quality
- [ ] Child pages feel "tactile and soft"
- [ ] Parent pages feel "editorial and precise"
- [ ] Asymmetrical margins on key sections
- [ ] Glassmorphism on parent navigation

### 5.3 Performance
- [ ] 60fps animations on mid-range devices
- [ ] < 3s page load time
- [ ] Lighthouse score > 90

### 5.4 Accessibility
- [ ] WCAG AA contrast ratios
- [ ] Ghost borders where needed for a11y
- [ ] Focus states on all interactive elements

---

## 6. Testing Strategy

### 6.1 Visual Regression Testing
**도구**: Playwright + Percy

```typescript
// tests/visual/child-theme.spec.ts
test('home page matches design system', async ({ page }) => {
  await page.goto('/home');
  await expect(page).toHaveScreenshot('home-child.png');
});
```

### 6.2 Design Token Validation
**자동화 스크립트**:

```bash
# Check for forbidden patterns
npm run lint:design-system

# Rules:
# - Fail on "border: 1px"
# - Fail on hardcoded colors
# - Pass only with CSS variables
```

### 6.3 Animation Performance Test
```typescript
// tests/performance/animations.spec.ts
test('spring-bounce maintains 60fps', async ({ page }) => {
  const metrics = await page.evaluate(() => performance.getEntriesByType('measure'));
  expect(metrics.fps).toBeGreaterThan(58);
});
```

---

## 7. Documentation Updates

### 7.1 Component Storybook
**도구**: Storybook for React

```tsx
// stories/Buttons.stories.tsx
export default {
  title: 'Child Theme/Buttons',
  component: Button,
};

export const PrimaryChild = {
  args: {
    className: 'btn-primary-child',
    children: 'Start Quest',
  },
};
```

### 7.2 Design System Guide
**새 파일**: `docs/design-system-usage.md`

내용:
- Quick reference for developers
- Before/After code examples
- Common patterns
- Troubleshooting

---

## 8. Risk Mitigation

### 8.1 Breaking Changes
**Risk**: 기존 페이지가 깨질 수 있음

**Mitigation**:
- Feature flags for gradual rollout
- Legacy class support during migration
- Comprehensive visual regression tests

### 8.2 Performance Regression
**Risk**: 애니메이션이 느려질 수 있음

**Mitigation**:
- Performance budget 설정
- CI/CD에 Lighthouse 통합
- `will-change` 남용 방지

### 8.3 Accessibility Issues
**Risk**: 디자인 강조로 a11y 저하

**Mitigation**:
- axe-core 자동화 테스트
- Ghost borders for critical boundaries
- Screen reader testing

---

## 9. Timeline Summary

| Week | Focus | Hours | Deliverables |
|------|-------|-------|--------------|
| 1 | Foundation | 8h | Token expansion, Base classes |
| 2 | Child Theme | 16h | Refactored child pages |
| 3 | Parent Theme | 20h | Parent dashboard components |
| 4 | Polish | 12h | Migration, optimization |
| **Total** | | **56h** | **100% Design System** |

---

## 10. Next Steps

1. **Immediate**: Week 1 token expansion
2. **Day 3**: Start child theme refactoring
3. **Day 10**: Parent theme kickoff
4. **Day 20**: Visual regression suite
5. **Day 28**: Production deployment

---

## Appendix A: Design System Checklist

### Child Theme
- [ ] rounded-3xl on primary elements
- [ ] spring-bounce on all interactive elements
- [ ] shadow-child-ambient on cards
- [ ] font-kids for body text
- [ ] Oversized hero sections
- [ ] Tappable word highlighting

### Parent Theme
- [ ] Glassmorphic navigation (backdrop-blur-xl)
- [ ] Editorial asymmetric margins
- [ ] FloatingProgressRing component
- [ ] font-headline for headers
- [ ] shadow-parent-ambient
- [ ] Data-driven visualizations

### Global
- [ ] NO 1px borders anywhere
- [ ] Surface hierarchy consistency
- [ ] Typography scale adherence
- [ ] Color token usage only
- [ ] 60fps animations
- [ ] WCAG AA compliance

---

**Document Version**: 1.0
**Last Updated**: 2026-03-24
**Author**: Claude Code
**Status**: Ready for Implementation
