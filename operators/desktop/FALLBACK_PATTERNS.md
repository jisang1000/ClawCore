# Desktop Operator Fallback Patterns

B등급 시나리오를 A등급으로 끌어올리기 위한 현재 표준 우회 패턴.

## 1. App focus 흔들림
문제:
- launch는 성공했지만 실제 캡처/입력이 다른 앱으로 가는 경우

표준 우회:
1. `launch-app`
2. `sleep`
3. `switch-app`
4. `sleep`
5. `focus-window`
6. `sleep`
7. `see` 또는 `image`

적용 예:
- Telegram
- Safari

## 2. App-targeted input timeout
문제:
- `type --app Safari` 같은 방식이 focus timeout으로 실패

표준 우회:
- 먼저 `switch-app` 또는 `focus-window`
- 이후 전역 `type` / `press` 사용

적용 예:
- `safari-search-verified`

## 3. Peekaboo capture 불안정
문제:
- `see`의 TCC 흔들림
- `image --mode frontmost` hang/continuation leak

표준 우회:
- `image --mode screen`은 native `/usr/sbin/screencapture -x` fallback 사용
- 앱/창 검증이 중요하면 `see`
- 단순 증빙 캡처면 `image --mode screen`

## 4. App name resolution 실패
문제:
- `launch-app`에서 앱 이름 매칭 실패

표준 우회:
- 이미 실행 중인 앱이면 `switch-app` 우선
- 한국어/영어 표시명 차이는 실제 성공한 값 기준으로 고정

적용 예:
- Finder
- 텍스트 편집기
