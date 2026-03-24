# Cloudflare Tunnel 설정 가이드

## 사전 요구사항

1. Cloudflare 계정 + 도메인 등록 완료
2. `cloudflared` CLI 설치 (또는 Docker 이미지 사용)

## 1. 터널 생성

```bash
# Cloudflare 로그인
cloudflared tunnel login

# 터널 생성
cloudflared tunnel create english-fairy

# 터널 ID 확인
cloudflared tunnel list
```

## 2. DNS 레코드 설정

```bash
# CNAME 레코드 자동 생성
cloudflared tunnel route dns english-fairy fairy.your-domain.com
```

## 3. 토큰 발급

Cloudflare Zero Trust 대시보드 → Networks → Tunnels → english-fairy → Configure
→ "Install and run a connector" → 토큰 복사

## 4. .env.production에 토큰 설정

```
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoiYWJj...
NEXT_PUBLIC_APP_URL=https://fairy.your-domain.com
NEXT_PUBLIC_API_URL=https://fairy.your-domain.com/api/v1
NEXT_PUBLIC_WS_URL=wss://fairy.your-domain.com/api/v1
```

## 5. Tunnel ingress 설정 (대시보드에서)

| Hostname | Service | Path |
|---|---|---|
| fairy.your-domain.com | http://haproxy:80 | * |

또는 `config.yml` 사용 시:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: fairy.your-domain.com
    service: http://haproxy:80
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

## 6. 배포

```bash
cd deploy
chmod +x deploy.sh
./deploy.sh
```

## 아키텍처

```
[User Browser]
     ↓ HTTPS
[Cloudflare CDN/Tunnel]
     ↓ HTTP
[cloudflared container]
     ↓
[HAProxy :80]
     ├─ /api/*     → [FastAPI :8000]
     ├─ /ws/*      → [FastAPI :8000]  (WebSocket)
     └─ /*         → [Next.js :3000]
```

## HAProxy와 기존 인프라 연동

기존 HAProxy가 있는 경우, deploy/docker-compose.yml에서 haproxy 서비스를 제거하고
기존 HAProxy 설정에 backend를 추가:

```haproxy
# 기존 haproxy.cfg에 추가
backend english_fairy_api
    server ef_api 127.0.0.1:8000 check

backend english_fairy_frontend
    server ef_fe 127.0.0.1:3000 check
```

## SSL 인증서 갱신 (Cloudflare Tunnel 미사용 시)

```bash
# Let's Encrypt + certbot
certbot certonly --standalone -d fairy.your-domain.com

# HAProxy용 combined cert
cat /etc/letsencrypt/live/fairy.your-domain.com/fullchain.pem \
    /etc/letsencrypt/live/fairy.your-domain.com/privkey.pem \
    > deploy/certs/combined.pem

# haproxy.cfg에서 HTTPS frontend 활성화
```

## 모니터링

- HAProxy stats: http://localhost:8404/stats
- API health: http://localhost:8000/health
- Docker logs: `docker compose logs -f`
