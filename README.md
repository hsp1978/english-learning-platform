# 영어요정 (English Fairy) — 초등 영어 학습 웹 서비스

## Quick Start

```bash
chmod +x bootstrap.sh
./bootstrap.sh
```

브라우저에서 http://localhost:3000 접속.

## Manual Setup

### 1. 인프라 실행

```bash
cd backend
cp .env.example .env    # 필요시 DB 비밀번호 등 수정
docker compose up -d    # PostgreSQL + Redis + MinIO
```

### 2. 백엔드

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# DB 마이그레이션 + 시드 데이터
alembic revision --autogenerate -m "initial"
alembic upgrade head
python -m app.scripts.seed_curriculum

# API 서버 실행
make dev
# → http://localhost:8000/docs
```

### 3. 프론트엔드

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
# → http://localhost:3000
```

### 4. 테스트

```bash
cd backend

# 시드 데이터 검증 (DB 불필요)
make verify

# API 스모크 테스트
make smoke

# 전체 E2E 테스트 (회원가입→학습→게이미피케이션)
make e2e
```

## 아키텍처

```
[Next.js PWA]  ←→  [FastAPI]  ←→  [PostgreSQL]
                       ↕               ↕
                    [Redis]       [Alembic Migration]
                       ↕
                 [LLM Router]
                 ├─ Tier 1: Ollama (local)
                 ├─ Tier 2: Gemini Flash
                 └─ Tier 3: Gemini Pro / GPT-4o
```

## 디렉토리 구조

```
english-fairy/
├── bootstrap.sh                # 원커맨드 로컬 부트스트랩
├── .env.production.example     # 프로덕션 환경변수 템플릿
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # 8개 엔드포인트 그룹
│   │   ├── core/               # config, database, redis, security
│   │   ├── models/             # SQLAlchemy 23개 테이블
│   │   ├── schemas/            # Pydantic request/response
│   │   ├── services/           # LLM Router, SM-2 알고리즘
│   │   └── scripts/
│   │       ├── seed_data/      # 9개 JSON 데이터 파일
│   │       ├── generators/     # 캐릭터 SVG, TTS 음원 생성기
│   │       ├── seed_curriculum.py
│   │       └── verify_seed_data.py
│   ├── tests/
│   │   ├── smoke_test.sh
│   │   ├── test_e2e_flow.py
│   │   └── test_llm_integration.py
│   ├── docker-compose.yml
│   ├── Makefile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router (14 pages)
│   │   ├── components/         # UI, learning, speech, gamification
│   │   ├── hooks/              # useSpeech, useAudio, useApi
│   │   ├── stores/             # Zustand (auth, game)
│   │   ├── lib/                # api client, env, cn
│   │   └── types/              # TypeScript 타입 정의
│   ├── public/
│   │   ├── manifest.json
│   │   └── images/characters/  # 72 SVG (36 캐릭터 × 해금/잠금)
│   ├── Dockerfile
│   └── package.json
└── deploy/
    ├── docker-compose.yml      # 프로덕션 compose (HAProxy + Tunnel)
    ├── haproxy.cfg             # 라우팅 설정
    ├── deploy.sh               # 프로덕션 배포 스크립트
    └── TUNNEL_SETUP.md         # Cloudflare Tunnel 가이드
```

## API 엔드포인트

| Group | Endpoint | Method | Description |
|-------|----------|--------|-------------|
| Auth | /auth/signup | POST | 회원가입 |
| Auth | /auth/login | POST | 로그인 |
| Auth | /auth/refresh | POST | 토큰 갱신 |
| Auth | /auth/verify-pin | POST | 학부모 PIN 확인 |
| Children | /children | GET/POST | 아동 프로필 목록/생성 |
| Children | /children/{id} | GET/PATCH | 아동 프로필 조회/수정 |
| Curriculum | /curriculum/map | GET | 커리큘럼 맵 |
| Curriculum | /curriculum/lesson/{id} | GET | 레슨 상세 (아이템 포함) |
| Progress | /progress/record | POST | 학습 결과 기록 |
| Speech | /speech/evaluate | POST | 발음 평가 (음성 업로드) |
| Review | /review/due | GET | 복습 예정 항목 |
| Review | /review/record | POST | 복습 결과 기록 (SM-2) |
| Talk | /talk/scenarios | GET | AI 대화 시나리오 목록 |
| Talk | /talk/ws/{id} | WS | AI 대화 WebSocket |
| Game | /game/characters | GET | 캐릭터 도감 |
| Game | /game/characters/unlock | POST | 캐릭터 해금 |
| Game | /game/shop | GET | 상점 아이템 |
| Game | /game/shop/purchase | POST | 아이템 구매 |
| Parent | /parent/dashboard | GET | 학부모 대시보드 |
| Parent | /parent/report/weekly/{id} | GET | 주간 리포트 |

## 시드 데이터

| 데이터 | 건수 |
|--------|------|
| Curriculum Phases | 4 |
| Lessons | 36 (12개월 × 3) |
| Lesson Items | 190+ (파닉스/사이트워드/문장) |
| Phonics Words | 95 (4 levels) |
| Sight Words | 186 (Dolch List) |
| Sentence Patterns | 24 |
| Characters | 36 (4 rarities) |
| Badges | 20 |
| Shop Items | 23 |
| AI Scenarios | 5 |

## 커리큘럼

| Phase | Month | Phonics | Sight Words | Sentences |
|-------|-------|---------|-------------|-----------|
| 1 | 1-3 | Short vowels CVC | Pre-K 40단어 | Be동사, 인칭대명사 |
| 2 | 4-6 | Long vowels, blends | Kinder 52단어 | SVO, 형용사, 소유 |
| 3 | 7-9 | Digraphs, r-controlled, silent | 1st Grade 41단어 | Do/Does, 전치사, 부사 |
| 4 | 10-12 | Review + fluency | Nouns 53단어 | 빈도부사, 접속사 |

## 에셋 생성

```bash
cd backend

# 캐릭터 SVG 이미지 (36종 × 해금/잠금 = 72파일)
make gen-chars

# TTS 음원 (파닉스 음소 + 전체 단어)
# edge-tts 엔진 (무료, API 키 불필요)
make gen-audio

# Google Cloud TTS 사용 시
python -m app.scripts.generators.generate_audio --engine google

# OpenAI TTS 사용 시
python -m app.scripts.generators.generate_audio --engine openai
```

## LLM 연동 테스트

```bash
cd backend

# 전체 Tier 테스트
make llm-test

# Tier별 개별 테스트
python -m tests.test_llm_integration --tier local   # Ollama
python -m tests.test_llm_integration --tier mid     # Gemini Flash
python -m tests.test_llm_integration --tier high    # Gemini Pro / GPT-4o
```

Ollama 사전 준비:
```bash
# Mac Studio에서 모델 다운로드
ollama pull exaone3.5:7.8b

# 또는 Llama 3.1 사용
ollama pull llama3.1:8b
# .env에서 OLLAMA_MODEL=llama3.1:8b 로 변경
```

## 프로덕션 배포

```bash
# 1. 환경변수 설정
cp .env.production.example .env.production
# 비밀번호, API 키, 도메인 등 수정

# 2. Cloudflare Tunnel 설정 (선택)
# deploy/TUNNEL_SETUP.md 참조

# 3. 배포 실행
cd deploy
chmod +x deploy.sh
./deploy.sh
```

배포 구성:
```
[Browser] → [Cloudflare Tunnel] → [HAProxy]
                                      ├→ /api/*  → FastAPI :8000
                                      ├→ /ws/*   → FastAPI :8000 (WebSocket)
                                      └→ /*      → Next.js :3000
```
