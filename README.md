# 업무유형별 구비서류 안내 (GitHub Pages용)

이 저장소는 엑셀(구비서류DB - 복사본.xlsx)을 JSON(`data.json`)으로 변환해, 정적 웹사이트에서 드롭다운 3단계 선택 → 서류 안내를 표시합니다.

## 파일 구성
- `index.html` — 단일 HTML로 UI/스타일/스크립트 포함. GitHub Pages에서 바로 동작
- `data.json` — 엑셀을 파싱한 데이터. 수정 시 사이트는 자동 반영(새로고침)
- `구비서류DB - 복사본.xlsx` — 원본 데이터(옵션)

## 배포
1. GitHub 새 저장소 생성 후, 위 2개 파일(index.html, data.json)을 커밋/푸시
2. **Settings → Pages → Source:** `Deploy from a branch` → `main` → `/ (root)` → 저장
3. 수 분 후 Pages 주소에서 접속

## 데이터 업데이트 방법
- `data.json`만 교체하면 됩니다.
- 엑셀을 수정했다면, 같은 포맷으로 다시 JSON을 만들고 교체하세요.

## UX 포인트
- 3단계 드롭다운은 상위 선택값에 따라 옵션이 자동으로 "축소"됩니다.
- "추가 전달사항"은 로컬에만 저장됩니다(localStorage). 브라우저/PC 변경 시 사라집니다.

