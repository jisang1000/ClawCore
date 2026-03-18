# ClawCore Desktop Operator (MVP)

ClawCore에서 macOS UI를 bounded 방식으로 조작하기 위한 Peekaboo 기반 데스크톱 오퍼레이터야.

## 현재 지원 step kind
- `launch-app`
- `open-url`
- `see`
- `image`
- `click`
- `type`
- `press`
- `hotkey`
- `sleep`

## 사용법
ClawCore 루트에서:

```bash
node core/ui-operator.js --plan=operators/desktop/demo-open-safari.json --dry-run
```

실제 실행:

```bash
node core/ui-operator.js --plan=operators/desktop/demo-open-safari.json
```

## 추가 예제 플랜
- `operators/desktop/safari-search.json`
- `operators/desktop/textedit-note.json`
- `operators/desktop/app-hotkeys.json`

### 예시 실행
```bash
npm run ui-operator -- --plan=operators/desktop/safari-search.json --dry-run
npm run ui-operator -- --plan=operators/desktop/textedit-note.json --dry-run
npm run ui-operator -- --plan=operators/desktop/app-hotkeys.json --dry-run
```

## 출력
- 실행 결과 report는 같은 폴더에 `*.report.json` 으로 저장됨.

## 주의
- Peekaboo의 Screen Recording / Accessibility 권한이 필요함.
- 다만 `see`를 쓰지 않는 plan은 화면 기록 없이도 일부 조작이 가능할 수 있음.
- 현재는 bounded MVP라서, 자유형 에이전트 판단보다는 **명시된 plan 실행기**에 가까움.
