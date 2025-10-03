# Supabase 소셜 로그인 설정 가이드

## 1. Kakao Login 설정

### 1-1. Kakao Developers에서 앱 생성

1. [Kakao Developers](https://developers.kakao.com/) 접속 후 로그인
2. **내 애플리케이션** → **애플리케이션 추가하기**
3. 앱 이름: "시니어 재활 서비스" 입력
4. 회사명: 본인 이름 또는 서비스명

### 1-2. 플랫폼 설정

1. **앱 설정** → **플랫폼** → **Web 플랫폼 등록**
2. 사이트 도메인:
   - 개발: `http://localhost:3000`
   - 배포: `https://your-domain.com`

### 1-3. Redirect URI 설정

1. **제품 설정** → **카카오 로그인** → **활성화 설정** ON
2. **Redirect URI 등록**:
   ```
   https://dwyfxngmkhrqffnxdbcj.supabase.co/auth/v1/callback
   ```

### 1-4. 동의 항목 설정

1. **제품 설정** → **카카오 로그인** → **동의 항목**
2. 필수 동의:
   - 닉네임
   - 프로필 사진
3. 선택 동의:
   - 카카오계정(이메일)
   - 전화번호

### 1-5. REST API 키 복사

1. **앱 설정** → **앱 키**
2. **REST API 키** 복사 → Supabase에 입력

---

## 2. Naver Login 설정

### 2-1. 네이버 개발자센터 애플리케이션 등록

1. [네이버 개발자센터](https://developers.naver.com/) 접속
2. **Application** → **애플리케이션 등록**
3. 애플리케이션 이름: "시니어 재활 서비스"

### 2-2. 사용 API 선택

- **네아로(네이버 아이디로 로그인)** 체크

### 2-3. 제공 정보 선택

필수:
- 이메일 주소
- 별명
- 프로필 사진

선택:
- 휴대전화번호

### 2-4. 서비스 환경 및 Callback URL

1. **서비스 환경**: PC 웹
2. **서비스 URL**: `http://localhost:3000`
3. **Callback URL**:
   ```
   https://dwyfxngmkhrqffnxdbcj.supabase.co/auth/v1/callback
   ```

### 2-5. Client ID/Secret 복사

- **Client ID** 및 **Client Secret** 복사 → Supabase에 입력

---

## 3. Google Login 설정

### 3-1. Google Cloud Console 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **프로젝트 선택** → **새 프로젝트**
3. 프로젝트 이름: "senior-care"

### 3-2. OAuth 동의 화면 구성

1. **API 및 서비스** → **OAuth 동의 화면**
2. User Type: **외부** 선택
3. 앱 정보:
   - 앱 이름: "시니어 재활 서비스"
   - 사용자 지원 이메일: 본인 이메일
   - 개발자 연락처: 본인 이메일

### 3-3. 범위 추가

1. **범위 추가 또는 삭제**
2. 필수 범위:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`

### 3-4. OAuth 2.0 클라이언트 ID 생성

1. **API 및 서비스** → **사용자 인증 정보**
2. **사용자 인증 정보 만들기** → **OAuth 클라이언트 ID**
3. 애플리케이션 유형: **웹 애플리케이션**
4. 이름: "Senior Care Web"
5. **승인된 자바스크립트 원본**:
   - `http://localhost:3000`
   - `https://your-domain.com`
6. **승인된 리디렉션 URI**:
   ```
   https://dwyfxngmkhrqffnxdbcj.supabase.co/auth/v1/callback
   ```

### 3-5. Client ID/Secret 복사

- 생성된 **클라이언트 ID** 및 **클라이언트 보안 비밀** 복사

---

## 4. Supabase에서 Provider 활성화

### 4-1. Supabase Dashboard 접속

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. **senior-care** 프로젝트 선택
3. **Authentication** → **Providers**

### 4-2. Kakao 설정

1. **Kakao** 찾기 → **Enable** 토글
2. **Kakao Client ID**: Kakao REST API 키 입력
3. **Kakao Secret**: (선택) 비워둬도 됨
4. **Save** 클릭

### 4-3. Naver 설정

1. **Naver** 찾기 → **Enable** 토글 (없으면 Custom OAuth 사용)
2. Naver는 기본 제공 안 될 수 있음 → **나중에 Custom OAuth로 추가**

### 4-4. Google 설정

1. **Google** 찾기 → **Enable** 토글
2. **Google Client ID**: 구글 클라이언트 ID 입력
3. **Google Secret**: 구글 클라이언트 보안 비밀 입력
4. **Save** 클릭

---

## 5. 이메일/전화번호 인증 설정

### 5-1. Email Auth 활성화

1. **Authentication** → **Providers** → **Email**
2. **Enable Email provider** 토글 ON
3. **Confirm email** 체크 (이메일 인증 필수)

### 5-2. Phone Auth 활성화

1. **Authentication** → **Providers** → **Phone**
2. **Enable Phone provider** 토글 ON
3. SMS Provider 선택 필요:
   - Twilio
   - MessageBird
   - Vonage
   - **한국**: NCP(네이버 클라우드), Aligo, 카카오 알림톡 등 고려

---

## 6. 환경 변수 확인

`.env.local` 파일에 이미 설정되어 있는지 확인:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://dwyfxngmkhrqffnxdbcj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 7. 다음 단계

이제 코드로 로그인 UI를 만들 차례입니다:

1. 로그인 페이지 생성
2. 소셜 로그인 버튼 구현
3. 인증 상태 관리
4. Protected Routes 설정

설정 완료 후 알려주세요!
