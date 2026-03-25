# Pattern-Based Lessons Redesign Plan

**Created**: 2026-03-25
**Purpose**: Convert grammar-focused SENTENCES lessons to age-appropriate pattern-based activities
**Target Age**: 6-8 years old (Pre-K ~ 1st Grade)

---

## Executive Summary

### Problem
Current SENTENCES lessons use metalinguistic grammar terminology inappropriate for 6-8 year olds:
- "What is a Noun?" - 6-year-olds don't understand grammatical categories
- "S-V-O Sentence Train" - Subject-Verb-Object is too abstract
- "Adjectives: Big, Red, Pretty" - Focus on taxonomy vs. usage

### Solution
Replace with **pattern repetition** approach:
- "I see a ___" instead of "What is a Noun?"
- "I like ___" instead of "S-V-O Sentence Train"
- "The ___ is big" instead of "Adjectives"

### Educational Rationale
- **Age-appropriate**: Patterns before grammar rules
- **Communicative**: Real usage, not terminology
- **Contextual**: Meaningful sentences, not isolated examples
- **TPR-friendly**: Can combine with actions/visuals

---

## Conversion Table

| Month | Before (Grammar) | After (Pattern) | Activity Type | Content Type |
|-------|------------------|-----------------|---------------|--------------|
| 1 | What is a Noun? | I see a ___ | Picture cards | sentence_pattern |
| 2 | I, You, He, She, It | My name is ___ | Self-introduction | sentence_pattern |
| 3 | I am / She is | This is ___ | Show and tell | sentence_pattern |
| 4 | S-V-O Sentence Train | I like ___ | Preference survey | sentence_pattern |
| 5 | Adjectives: Big, Red, Pretty | The ___ is big/small | Sorting game | sentence_pattern |
| 6 | My, Your, His, Her | My ___ is ___ | Trading game | sentence_pattern |
| 7 | Do you like...? Yes/No | Where is the ___? | Hide and seek game | sentence_pattern |
| 8 | In, On, Under, Behind | The cat is ___ the box | Position game | sentence_pattern |
| 9 | Quickly, Happily, Loudly | I run ___ | Action charades | sentence_pattern |
| 10 | Always, Often, Sometimes | I ___ eat breakfast | Routine survey | sentence_pattern |

---

## Detailed Lesson Redesigns

### Month 1: "I see a ___" Pattern

**Before**: "What is a Noun?" (noun_match content_type)
```json
{
  "content_type": "noun_match",
  "content_data": {
    "noun": "cat",
    "category": "animal",
    "image_hint": "cat"
  }
}
```

**After**: "I see a ___" Pattern (sentence_pattern content_type)
```json
{
  "content_type": "sentence_pattern",
  "content_data": {
    "pattern": "I see a ___",
    "target_word": "cat",
    "complete_sentence": "I see a cat",
    "category": "animal",
    "image": "cat.png",
    "audio": "i_see_a_cat.mp3"
  }
}
```

**Items** (5 items):
1. I see a cat (animal)
2. I see a dog (animal)
3. I see a ball (toy)
4. I see a bed (furniture)
5. I see the sun (nature)

**Activity**:
- Show picture → Child says "I see a ___"
- No explanation of what a "noun" is
- Pure pattern repetition

---

### Month 2: "My name is ___" Pattern

**Before**: "I, You, He, She, It" (pronoun focus)

**After**: "My name is ___" Pattern
```json
{
  "content_type": "sentence_pattern",
  "content_data": {
    "pattern": "My name is ___",
    "target_word": "[child's name]",
    "complete_sentence": "My name is Mia",
    "extension_patterns": [
      "Her name is ___",
      "His name is ___"
    ]
  }
}
```

**Items** (5 items):
1. My name is ___ (self)
2. His name is Tom (brother)
3. Her name is Lily (sister)
4. My friend is ___ (friend)
5. This is ___ (introduction)

---

### Month 3: "This is ___" Pattern

**Before**: "I am / She is" (Be-verb grammar)

**After**: "This is ___" Show and Tell
```json
{
  "content_type": "sentence_pattern",
  "content_data": {
    "pattern": "This is ___",
    "target_word": "my bag",
    "complete_sentence": "This is my bag",
    "category": "possession"
  }
}
```

**Items** (5 items):
1. This is my bag
2. This is my book
3. This is a pencil
4. This is a cat
5. That is a car

---

### Month 4: "I like ___" Pattern

**Before**: "S-V-O Sentence Train" (grammar structure)

**After**: "I like ___" Preference
```json
{
  "content_type": "sentence_pattern",
  "content_data": {
    "pattern": "I like ___",
    "target_word": "apples",
    "complete_sentence": "I like apples",
    "category": "food",
    "variations": ["I don't like ___"]
  }
}
```

**Items** (5 items):
1. I like apples (food)
2. I like pizza (food)
3. I like dogs (animals)
4. I like blue (colors)
5. I don't like bugs (negative)

---

### Month 5: "The ___ is big/small" Pattern

**Before**: "Adjectives: Big, Red, Pretty" (adjective taxonomy)

**After**: Describing with Adjectives
```json
{
  "content_type": "sentence_pattern",
  "content_data": {
    "pattern": "The ___ is ___",
    "target_word": "elephant",
    "adjective": "big",
    "complete_sentence": "The elephant is big",
    "opposite": "The mouse is small"
  }
}
```

**Items** (4 items):
1. The elephant is big / The mouse is small (size)
2. The ball is red / The grass is green (color)
3. The flower is pretty / The rose is beautiful (appearance)
4. The ice is cold / The sun is hot (temperature)

---

### Month 6: "My ___ is ___" Pattern

**Before**: "My, Your, His, Her" (possessive adjectives)

**After**: Showing Possessions
```json
{
  "content_type": "sentence_pattern",
  "content_data": {
    "pattern": "My ___ is ___",
    "noun": "bag",
    "adjective": "red",
    "complete_sentence": "My bag is red"
  }
}
```

**Items** (4 items):
1. My bag is red
2. Your book is blue
3. His car is fast
4. Her doll is pretty

---

### Month 7: "Where is the ___?" Pattern

**Before**: "Do you like...? Yes/No" (question structure)

**After**: Finding Things Game
```json
{
  "content_type": "sentence_pattern",
  "content_data": {
    "question": "Where is the ___?",
    "target_word": "ball",
    "answers": [
      "Under the bed",
      "In the box",
      "On the table",
      "Behind the door"
    ],
    "complete_qa": "Where is the ball? - Under the bed."
  }
}
```

**Items** (5 items):
1. Where is the ball? - Under the bed
2. Where is the cat? - In the box
3. Where is the book? - On the table
4. Where is the dog? - Behind the door
5. Where is the toy? - Next to the chair

---

### Month 8: "The cat is ___ the box" Pattern

**Before**: "In, On, Under, Behind" (preposition list)

**After**: Position Game
```json
{
  "content_type": "sentence_pattern",
  "content_data": {
    "pattern": "The ___ is ___ the ___",
    "subject": "cat",
    "preposition": "in",
    "object": "box",
    "complete_sentence": "The cat is in the box",
    "image": "cat_in_box.png"
  }
}
```

**Items** (4 items):
1. The cat is in the box
2. The cat is on the table
3. The cat is under the bed
4. The cat is behind the door

---

### Month 9: "I run ___" Pattern

**Before**: "Quickly, Happily, Loudly" (adverb taxonomy)

**After**: Action Descriptions
```json
{
  "content_type": "sentence_pattern",
  "content_data": {
    "pattern": "I ___ ___",
    "verb": "run",
    "adverb": "fast",
    "complete_sentence": "I run fast",
    "action_image": "running.gif"
  }
}
```

**Items** (4 items):
1. I run fast / I walk slowly
2. I sing loudly / I whisper quietly
3. I jump high / I sit down
4. I clap happily / I cry sadly

---

### Month 10: "I ___ eat breakfast" Pattern

**Before**: "Always, Often, Sometimes" (frequency adverbs)

**After**: Daily Routines
```json
{
  "content_type": "sentence_pattern",
  "content_data": {
    "pattern": "I ___ ___",
    "frequency": "always",
    "activity": "eat breakfast",
    "complete_sentence": "I always eat breakfast",
    "options": ["always", "often", "sometimes", "never"]
  }
}
```

**Items** (4 items):
1. I always eat breakfast
2. I often play outside
3. I sometimes watch TV
4. I never eat bugs

---

## Implementation Plan

### Phase 1: Database Migration Script
Create `seed_pattern_lessons.py`:
1. Read existing SENTENCES lessons
2. Transform content from grammar → pattern
3. Update lesson titles and descriptions
4. Change content_type from noun_match/etc → sentence_pattern
5. Add pattern, complete_sentence, image fields

### Phase 2: Frontend Component
Update `/app/(child)/learn/sentences/[lessonId]/page.tsx`:
1. Handle `sentence_pattern` content_type
2. Display pattern template: "I see a ___"
3. Show target word with image
4. Play complete sentence audio
5. Allow child to record themselves saying it

### Phase 3: Audio Generation
Pre-generate TTS audio for all pattern sentences:
- Use OpenAI TTS (nova voice)
- Cache in tts_audio_cache table
- Format: "I see a cat" → i_see_a_cat.mp3

### Phase 4: Testing
1. Verify all 11 SENTENCES lessons converted
2. Test frontend rendering
3. Check audio playback
4. Validate educational effectiveness

---

## Success Metrics

### Before (Grammar-focused):
- Abstract terminology ❌
- Requires metalinguistic awareness ❌
- Age-inappropriate (6-8 years) ❌
- Not communicative ❌

### After (Pattern-based):
- Concrete examples ✅
- Immediate usage ✅
- Age-appropriate ✅
- Communicative & contextual ✅

### Expected Outcomes:
- Curriculum review score: 72 → 80 (+8 points)
- Child engagement: Higher (patterns are fun)
- Retention: Better (meaningful context)
- Parent satisfaction: Higher (visible progress)

---

## Next Steps

1. ✅ Create this redesign document
2. ⏳ Write database migration script
3. ⏳ Update frontend component
4. ⏳ Generate pattern sentence audio
5. ⏳ Test with sample lessons
6. ⏳ Deploy and monitor

---

**Author**: Claude Code
**Reviewed By**: ESL Teacher Perspective
**Alignment**: Common Core K-2, Jolly Phonics, Balanced Literacy Approach
