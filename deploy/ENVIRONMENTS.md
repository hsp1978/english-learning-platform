# Environment Separation

이 저장소는 현재 서버를 개발/테스트 서버로 두고, 실제 서비스는 별도 운영 서버에서 Docker Compose로 띄우는 구조를 기준으로 운영한다.

## 역할

### 개발/테스트 서버

- 현재 서버: `192.168.10.102`, Tailscale `100.106.163.2`
- 목적: 기능 개발, QA, 임시 확인, 테스트 데이터
- 실행 방식: `backend/.env`, `frontend/.env.local`, `npm run dev`, `uvicorn --reload`
- 접근 예:
  - Frontend: `http://100.106.163.2:3000`
  - API health: `http://100.106.163.2:8000/health`
- 주의: 실제 사용자 도메인과 운영 DB를 이 서버에 연결하지 않는다.

### 운영 서버

- 목적: 실제 사용자 서비스
- 실행 방식: 루트 `.env.production` + `deploy/docker-compose.yml`
- 서비스 구성: HAProxy, Next.js standalone, FastAPI, PostgreSQL, Redis, MinIO
- 운영 도메인: 예: `https://en.parkhong.co.kr`
- 운영 DB/Redis/MinIO 볼륨은 운영 서버에서만 유지한다.

## 운영 서버 최초 준비

운영 서버에 Docker와 Docker Compose plugin이 설치되어 있어야 한다.

```bash
sudo mkdir -p /opt/english-learning-platform
sudo chown -R "$USER":"$USER" /opt/english-learning-platform
cd /opt/english-learning-platform
cp .env.production.example .env.production
```

`.env.production`에서 최소한 아래 값은 운영 서버 기준으로 바꾼다.

```bash
APP_ENV=production
APP_DEBUG=false
APP_CORS_ORIGINS=["https://en.parkhong.co.kr"]
DB_HOST=db
DB_PORT=5432
DB_PASSWORD=<strong-production-db-password>
REDIS_HOST=redis
REDIS_PASSWORD=<strong-production-redis-password>
APP_SECRET_KEY=<64+ chars random>
JWT_SECRET_KEY=<64+ chars random>
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=<strong-minio-access>
S3_SECRET_KEY=<strong-minio-secret>
OPENAI_IMAGE_MODEL=gpt-image-2
STORY_IMAGE_SIZE=1536x1024
STORY_IMAGE_QUALITY=medium
STORY_IMAGE_OUTPUT_FORMAT=jpeg
STORY_IMAGE_STORAGE_DIR=generated/story-images
STORY_IMAGE_BASE_URL=/api/v1/story-images
NEXT_PUBLIC_API_URL=https://en.parkhong.co.kr/api/v1
NEXT_PUBLIC_WS_URL=wss://en.parkhong.co.kr/api/v1
NEXT_PUBLIC_APP_URL=https://en.parkhong.co.kr
```

Cloudflare Tunnel을 운영 서버에서 쓸 때만 `CLOUDFLARE_TUNNEL_TOKEN`을 실제 값으로 넣는다. 값이 `YOUR_TUNNEL_TOKEN`이면 `cloudflared` 컨테이너는 실행하지 않는다.

## 원격 배포

개발/테스트 서버에서 운영 서버로 코드를 전송하고 운영 서버에서 배포한다.

```bash
PROD_HOST=<production-server-ip-or-host> \
PROD_USER=ubuntu \
PROD_PATH=/opt/english-learning-platform \
./deploy/deploy-remote.sh
```

`deploy-remote.sh`는 실제 `.env*` 파일, `node_modules`, `.next`, Python venv를 전송하지 않는다. 운영 서버의 `.env.production`은 운영 서버에만 보관한다.

## 운영 서버에서 직접 배포

운영 서버에 코드가 이미 있다면:

```bash
cd /opt/english-learning-platform/deploy
./deploy.sh
```

Compose 설정만 템플릿으로 검증할 때는:

```bash
cd deploy
PRODUCTION_ENV_FILE=../.env.production.example \
docker compose --env-file ../.env.production.example config
```

## 도메인 전환

현재 문서의 기존 NPM 설정은 `en.parkhong.co.kr`을 개발/테스트 서버 `192.168.10.102`로 보내는 구조다. 운영 분리 후에는 아래 둘 중 하나로 바꾼다.

- Nginx Proxy Manager를 쓰는 경우: `en.parkhong.co.kr`의 Forward Host/IP를 운영 서버 IP로 변경
- Cloudflare Tunnel을 쓰는 경우: 운영 서버의 tunnel이 `http://haproxy:80`으로 라우팅하도록 설정

전환 후 확인:

```bash
curl -I https://en.parkhong.co.kr
curl https://en.parkhong.co.kr/health
curl https://en.parkhong.co.kr/api/v1/health
```

## 배포 흐름

1. 개발/테스트 서버에서 기능 확인
2. `npm run type-check`, `npm run build`로 프론트 검증
3. 백엔드 마이그레이션/스모크 테스트 확인
4. `deploy/deploy-remote.sh`로 운영 서버 배포
5. 운영 도메인 health check와 주요 사용자 흐름 확인

운영 장애가 나면 도메인을 다시 이전 운영 서버로 되돌리거나, 운영 서버에서 `docker compose logs -f api frontend haproxy`로 원인을 확인한다.
