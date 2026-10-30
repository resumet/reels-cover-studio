# ReelCover Studio

스크린샷 두 장을 분석해 인스타그램 릴스용 제목 5개, 새 캡션, 글자 없는 세로 배경을 만들고 1080×1920 PNG로 내보내는 Next.js 웹앱입니다.

## 주요 흐름

1. 장면이 담긴 스크린샷과 캡션 스크린샷을 업로드합니다.
2. 화면에서 OpenAI 또는 Gemini를 선택해 장면과 원문을 분석하고 3줄×줄당 3어절 제목 5개와 새 캡션을 만듭니다.
3. 이미지 공급자로 OpenAI 또는 Gemini를 선택해 첫 스크린샷과 선택 제목을 참고한 텍스트 없는 배경을 생성합니다.
4. 브라우저 Canvas에서 제목 위치와 스타일을 조정하고 정확히 1080×1920 PNG로 저장합니다.

AI 배경과 제목 렌더링은 분리되어 있습니다. 제목 선택, 글자 수정, 위치 이동, 서식 변경은 AI API를 다시 호출하지 않습니다.

## AI 요청 로그

화면 상단의 `로그` 버튼에서 최근 AI 요청 30건을 확인할 수 있습니다. 각 로그에는 다음 정보가 표시됩니다.

- 호출 작업, API 종류, 모델, 요청 시각
- 실제 System 프롬프트와 User 프롬프트
- 이미지 파일명·형식·용량·detail 설정
- 재시도별 구조화된 응답과 제목 규칙 검증 결과
- 응답 ID와 토큰 사용량
- 이미지 생성 프롬프트, 수정된 프롬프트, 출력 설정

보안을 위해 `OPENAI_API_KEY`, `GEMINI_API_KEY`와 이미지 Base64 원문은 로그에 포함하지 않습니다. 로그는 현재 브라우저 메모리에만 존재하며 새로고침하면 사라집니다.

## 로컬 실행

Node.js 20 이상을 권장합니다.

```bash
npm install
copy .env.example .env.local
npm run dev
```

`http://localhost:3000`을 엽니다.

## 환경변수

```dotenv
OPENAI_API_KEY=
OPENAI_TEXT_MODEL=gpt-6-astra
OPENAI_IMAGE_MODEL=gpt-image-2.5-sunburst
GEMINI_API_KEY=
GEMINI_TEXT_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-nano-banana-2.1
APP_ACCESS_PASSWORD=
```

- `OPENAI_API_KEY`와 `GEMINI_API_KEY`는 서버에서만 읽습니다. `NEXT_PUBLIC_` 접두어를 사용하지 마세요.
- 실제로 선택할 공급자의 API 키만 필수이며, 모델 접근 권한과 사용 가능 여부는 각 공급자 프로젝트에서 확인하세요.
- `APP_ACCESS_PASSWORD`를 설정하면 화면의 “접근 비밀번호 설정”에 같은 값을 입력해야 API를 호출할 수 있습니다.
- 공개 배포에서는 앱 비밀번호만 의존하지 말고 Vercel Deployment Protection 또는 별도 인증을 함께 사용하세요.

## 검증

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Vercel 배포

1. 이 디렉터리를 사용자가 지정한 GitHub 저장소에 연결합니다.
2. Vercel에서 저장소를 가져옵니다.
3. Production, Preview 환경에 필요한 환경변수를 직접 등록합니다.
4. Deployment Protection과 함수 실행 시간, 업로드 본문 크기, 선택한 AI 공급자의 사용 한도를 확인합니다.
5. 배포 전 위의 네 검증 명령을 모두 통과시킵니다.

현재 구현은 MVP답게 요청 처리 중 이미지를 메모리에만 보관하고 장기 저장하지 않습니다. 서버리스 인스턴스 단위의 간단한 호출 제한이 포함되어 있으나, 공개 서비스로 확장할 때는 Upstash 같은 외부 저장소 기반 rate limit과 비동기 이미지 작업 큐를 추가하세요.

## 문제 해결

- `서버에 OpenAI API 키가 설정되지 않았습니다`: `.env.local` 또는 Vercel 환경변수의 `OPENAI_API_KEY`를 확인합니다.
- `서버에 Gemini API 키가 설정되지 않았습니다`: `.env.local` 또는 Vercel 환경변수의 `GEMINI_API_KEY`를 확인합니다.
- `접근 비밀번호가 올바르지 않습니다`: 서버의 `APP_ACCESS_PASSWORD`와 화면 입력값을 맞춥니다.
- 제목 규칙 오류: 제목 다시 생성을 누르거나 각 줄을 공백 기준 3어절로 직접 수정합니다.
- 이미지 생성 실패: 선택한 공급자 프로젝트의 이미지 모델 접근 권한, 한도, 콘텐츠 정책 응답을 확인합니다. 이전 결과는 유지됩니다.
- PNG 저장 오류: 브라우저에서 Canvas와 다운로드 권한을 허용하고 다시 시도합니다.

## 개인정보와 비용

업로드할 사진과 캡션에 대한 이용 권한을 확인해야 합니다. OpenAI와 Gemini API 호출에는 공급자별 사용량에 따른 비용이 발생합니다. 실제 가격과 모델별 제한은 배포 시점의 각 공식 문서에서 확인하세요.
