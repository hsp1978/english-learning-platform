# NPM (Nginx Proxy Manager) 설정 가이드

> 영어요정 앱을 en.parkhong.co.kr 도메인으로 서비스하기 위한 NPM 설정

---

## 네트워크 구조

```
[인터넷]
    ↓
[en.parkhong.co.kr]
    ↓
[NPM: 192.168.10.137]
    ↓
    ├─ / → [192.168.10.102:3000] (Next.js 프론트엔드)
    └─ /api/v1 → [192.168.10.102:8000] (FastAPI 백엔드)
```

---

## 1. NPM 프록시 호스트 설정

### 기본 설정

NPM 관리 페이지 (`http://192.168.10.137:81`) 접속 후:

**Proxy Hosts > Add Proxy Host**

#### Details 탭:
```
Domain Names: en.parkhong.co.kr
Scheme: http
Forward Hostname/IP: 192.168.10.102
Forward Port: 3000

☑ Cache Assets
☑ Block Common Exploits
☑ Websockets Support
```

#### SSL 탭:
```
SSL Certificate: [Request a new SSL Certificate]
☑ Force SSL
☑ HTTP/2 Support
☑ HSTS Enabled
☑ HSTS Subdomains

Email Address: [your-email@example.com]
☑ I Agree to the Let's Encrypt Terms of Service
```

---

## 2. Custom Locations 설정 (백엔드 API)

같은 프록시 호스트 설정에서 **Custom Locations** 탭으로 이동:

### Location 1: 백엔드 API

**Add location 클릭:**

```
Location: /api/v1
Scheme: http
Forward Hostname/IP: 192.168.10.102
Forward Port: 8000
☑ Websockets Support
```

**Advanced 설정:**
```nginx
# 클라이언트 IP 전달
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# HTTP 버전
proxy_http_version 1.1;

# 타임아웃 설정 (AI 대화 등 긴 요청 대비)
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;

# 업로드 크기 제한 (음성 파일 등)
client_max_body_size 10M;
```

### Location 2: WebSocket (선택사항)

실시간 기능이 필요한 경우:

```
Location: /ws
Scheme: http
Forward Hostname/IP: 192.168.10.102
Forward Port: 8000
☑ Websockets Support
```

**Advanced 설정:**
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

# WebSocket 타임아웃 (1시간)
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
```

---

## 3. 앱 서버 설정 확인

### 프론트엔드 (192.168.10.102:3000)

**서비스 실행 확인:**
```bash
# Next.js 서버 상태 확인
curl http://192.168.10.102:3000

# PM2로 실행 중인지 확인
pm2 list
```

**환경변수 확인:**
```bash
cd /home/ubuntu/english-learning-platform/frontend
cat .env.production

# 다음 설정이 있어야 함:
# NEXT_PUBLIC_APP_URL=https://en.parkhong.co.kr
# BACKEND_URL=http://192.168.10.102:8000
```

### 백엔드 (192.168.10.102:8000)

**서비스 실행 확인:**
```bash
# FastAPI 서버 상태 확인
curl http://192.168.10.102:8000/api/v1/health

# 또는
curl http://192.168.10.102:8000/docs
```

**CORS 설정 확인:**
```bash
cd /home/ubuntu/english-learning-platform/backend
grep CORS .env

# 다음 설정이 있어야 함:
# APP_CORS_ORIGINS=["https://en.parkhong.co.kr"]
```

---

## 4. 방화벽 설정 (Ubuntu UFW)

앱 서버에서 NPM 서버의 접근 허용:

```bash
# NPM 서버에서 앱 서버로 접근 허용
sudo ufw allow from 192.168.10.137 to any port 3000 comment 'NPM to Next.js'
sudo ufw allow from 192.168.10.137 to any port 8000 comment 'NPM to FastAPI'

# 상태 확인
sudo ufw status numbered
```

---

## 5. 테스트

### 로컬에서 테스트 (NPM 설정 전)

```bash
# 프론트엔드 직접 접근
curl -I http://192.168.10.102:3000

# 백엔드 API 직접 접근
curl http://192.168.10.102:8000/api/v1/health
```

### NPM을 통한 테스트

```bash
# 프론트엔드 (HTTPS)
curl -I https://en.parkhong.co.kr

# HTTP는 HTTPS로 리다이렉트되어야 함
curl -I http://en.parkhong.co.kr

# 백엔드 API
curl https://en.parkhong.co.kr/api/v1/health

# WebSocket (wscat 사용)
wscat -c wss://en.parkhong.co.kr/ws
```

### 브라우저에서 테스트

1. `https://en.parkhong.co.kr` 접속
2. 개발자 도구 (F12) → Console 확인
3. Network 탭에서 API 요청 확인:
   - `https://en.parkhong.co.kr/api/v1/...` 로 요청
   - Status: 200 OK
   - CORS 에러 없음

---

## 6. 문제 해결

### 502 Bad Gateway

**원인:** NPM이 앱 서버에 연결할 수 없음

**해결:**
```bash
# 1. 앱 서버에서 서비스 실행 확인
pm2 list

# 2. 포트 리스닝 확인
sudo netstat -tlnp | grep -E ':(3000|8000)'

# 3. 방화벽 확인
sudo ufw status

# 4. NPM에서 연결 테스트
# NPM 서버 (192.168.10.137)에서:
curl http://192.168.10.102:3000
curl http://192.168.10.102:8000/api/v1/health
```

### CORS 에러

**증상:** 브라우저 콘솔에 CORS 에러 표시

**해결:**
```bash
# 백엔드 .env 파일 확인
cd /home/ubuntu/english-learning-platform/backend
cat .env | grep CORS

# 도메인이 정확히 일치해야 함 (프로토콜, 포트 포함)
# ❌ APP_CORS_ORIGINS=["en.parkhong.co.kr"]
# ✅ APP_CORS_ORIGINS=["https://en.parkhong.co.kr"]

# 수정 후 백엔드 재시작
pm2 restart english-fairy-backend
```

### SSL 인증서 갱신 실패

**원인:** Let's Encrypt가 도메인 소유권 확인 실패

**해결:**
1. 도메인 DNS 설정 확인 (A 레코드가 NPM 서버 공인 IP를 가리켜야 함)
2. 80/443 포트가 열려있는지 확인
3. NPM에서 수동으로 인증서 재발급 시도

```bash
# NPM 서버에서 포트 확인
sudo netstat -tlnp | grep -E ':(80|443)'
```

### API 요청이 404

**원인:** NPM의 Custom Location 설정 누락

**해결:**
1. NPM 관리 페이지에서 프록시 호스트 편집
2. Custom Locations 탭 확인
3. `/api/v1` 경로가 `192.168.10.102:8000`로 포워딩되는지 확인

### 프론트엔드는 되는데 API만 안됨

**원인:** 백엔드 서비스가 실행되지 않음

**해결:**
```bash
# 백엔드 상태 확인
pm2 list

# 백엔드 로그 확인
pm2 logs english-fairy-backend

# 백엔드 재시작
pm2 restart english-fairy-backend

# 또는 수동 실행 테스트
cd /home/ubuntu/english-learning-platform/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 7. 모니터링

### PM2 모니터링

```bash
# 전체 프로세스 상태
pm2 list

# 실시간 로그
pm2 logs

# 특정 앱 로그
pm2 logs english-fairy-frontend
pm2 logs english-fairy-backend

# 모니터링 대시보드
pm2 monit
```

### NPM 로그 확인

```bash
# NPM 서버에서
docker logs -f nginx-proxy-manager

# 또는 특정 에러 로그
docker exec -it nginx-proxy-manager tail -f /data/logs/error.log
```

### 리소스 모니터링

```bash
# CPU, 메모리 사용량
htop

# 네트워크 연결
sudo netstat -anltp | grep -E ':(3000|8000)'

# 디스크 사용량
df -h
```

---

## 8. 배포 체크리스트

### NPM 설정
- [ ] 프록시 호스트 생성 (en.parkhong.co.kr → 192.168.10.102:3000)
- [ ] SSL 인증서 발급 (Let's Encrypt)
- [ ] Force SSL 활성화
- [ ] Custom Location 추가 (/api/v1 → 192.168.10.102:8000)
- [ ] WebSocket 지원 활성화
- [ ] Advanced 설정에 proxy headers 추가

### 앱 서버 설정
- [ ] 프론트엔드 환경변수 업데이트 (.env.production)
- [ ] 백엔드 환경변수 업데이트 (CORS 설정)
- [ ] 프론트엔드 빌드 (npm run build)
- [ ] PM2로 서비스 실행
- [ ] 방화벽 설정 (NPM에서 접근 허용)

### 테스트
- [ ] HTTP → HTTPS 리다이렉트 확인
- [ ] 프론트엔드 페이지 로딩 확인
- [ ] API 요청 정상 동작 확인 (/api/v1/health)
- [ ] 브라우저 콘솔 에러 없음
- [ ] Network 탭에서 CORS 에러 없음
- [ ] 회원가입/로그인 기능 테스트
- [ ] 레슨 플레이 테스트
- [ ] 음성 인식/TTS 테스트

### 운영
- [ ] PM2 자동 시작 설정 (pm2 startup, pm2 save)
- [ ] 로그 로테이션 설정
- [ ] 백업 전략 수립 (DB, 환경변수, 업로드 파일)
- [ ] 모니터링 알림 설정 (선택사항)

---

**설정 완료 후 접속 주소:**
- 프론트엔드: https://en.parkhong.co.kr
- 백엔드 API: https://en.parkhong.co.kr/api/v1/docs
- Swagger UI: https://en.parkhong.co.kr/api/v1/docs
- ReDoc: https://en.parkhong.co.kr/api/v1/redoc

---

마지막 업데이트: 2026-03-26
