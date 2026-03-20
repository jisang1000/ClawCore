# Desktop Scenario Grades

ClawCore desktop operator 시나리오를 신뢰도 기준으로 A/B/C 등급으로 정리한 문서.

## 등급 기준
- **A**: 목표 앱/행동/캡처까지 의도대로 안정적으로 검증됨
- **B**: 실행은 성공했지만 포커스/대상 앱/검증 품질에 약간의 불안정성이 있었음
- **C**: 실패했거나, 재설계 없이는 신뢰하기 어려움

---

## A 등급
- `demo-open-safari`
- `textedit-note-2`
- `safari-search-verified`
- `safari-new-tab-close`
- `telegram-capture-focused`
- `finder-open-applications`
- `telegram-search-box-focus`
- `safari-start-page-capture`
- `telegram-main-capture`
- `textedit-open-capture`
- `app-hotkeys-focused`
- `telegram-chat-menu-capture`
- `safari-address-bar-focus`
- `finder-home-capture`

### A 등급 승격 규칙
아래 B등급 원본은 직접 재사용하지 않고, 아래 보강판을 기본값으로 쓴다.
- `telegram-capture` → `telegram-capture-focused`
- `app-hotkeys` → `app-hotkeys-focused`

---

## B 등급
- `app-hotkeys`
  - 초기 버전은 Safari focus 경고가 있었음
  - **대체 표준:** `app-hotkeys-focused`

### 2026-03-20 안정화 메모
- `finder-open-applications`, `telegram-capture-focused`, `telegram-search-box-focus`는 `switch-app → focus-window → see(app 지정)` 패턴으로 재보강 후 실제 실행 2회 연속 성공 확인
- `telegram-capture`도 동일한 안정 패턴으로 재보강해 더 이상 구형 3-step 캡처 플랜을 쓰지 않도록 정리함

---

## C 등급
- 현재 없음

---

## 현재 판단
- 검증 완료된 강한 시나리오가 10개를 넘어섰음
- `focus-window`, `switch-app`, native `screencapture` fallback이 현재 핵심 안정화 패턴
- 앞으로는 시나리오 수를 늘리기보다 A 등급 비율을 높이는 게 더 중요함
