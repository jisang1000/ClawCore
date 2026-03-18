# Desktop App Profiles

앱별 안정화 프로파일.

## Safari
- `focus-window` 전에 `switch-app` 선행
- 짧은 sleep 후 focus 재시도 환경을 만듦
- capture 실패 시 native screen capture fallback 선호

## Telegram
- `focus-window` 전에 `switch-app` 선행
- Safari보다 약간 긴 focus 안정화 대기 사용
- capture 실패 시 native screen capture fallback 선호

## Finder
- launch name resolution이 흔들릴 수 있어 `switch-app` fallback 선호
- focus 관련 전처리는 짧게 유지

## 운영 원칙
- 공통 fallback은 `ui-operator` 기본 로직으로 유지
- 앱 특화 프로파일은 Safari / Telegram / Finder처럼 실제 흔들림이 확인된 앱에만 추가
- 프로파일 추가 시 metrics에 `appProfilesUsed`도 남긴다
