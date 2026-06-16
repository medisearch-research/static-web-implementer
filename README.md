# static-web-implementer

> Static web hosting for design review. Drop HTML files into `/sites` → auto-deployed via GitHub Pages.
> Used for internal design approval across **MediSearch**, **BP+**, **YakSaseyo**, and **Pharmdash** projects.

Claude Code로 생성한 HTML/CSS 디자인 파일을 폴더에 넣으면 → URL로 바로 확인 가능 → 재가권자가 브라우저에서 검토합니다.

---

## 어떻게 동작하나

1. `sites/<프로젝트>/` 폴더에 단일 `.html` 디자인 파일을 넣고 푸시합니다.
2. GitHub Actions가 `/sites`를 스캔해 루트 **`index.html`**(디자인 목록)을 자동으로 다시 만듭니다.
3. GitHub Pages가 `main` 브랜치를 그대로 배포합니다.
4. 검토자는 목록 페이지 또는 각 디자인 URL을 브라우저에서 열어 검토합니다. (목록 페이지 상단 **검색창**으로 제목·설명·파일·프로젝트명·하위 페이지명을 즉시 필터링할 수 있습니다. `index.html?q=키워드` 딥링크도 지원.)

```
https://dalyulbam.github.io/static-web-implementer/                 ← 전체 디자인 목록
https://dalyulbam.github.io/static-web-implementer/sites/medisearch/medisearch-landing-v1.html
```

---

## 폴더 구조

```
static-web-implementer/
├── index.html                  ← 전체 디자인 목록 (자동 생성, 직접 수정 X)
├── sites/
│   ├── medisearch/
│   │   └── medisearch-landing-v1.html
│   ├── bp-plus/
│   │   └── bp-plus-product-page-v1.html
│   ├── yaksaseyo/
│   │   └── yaksaseyo-main-v1.html
│   └── pharmdash/
│       └── pharmdash-admin-v1.html
├── scripts/
│   └── build-index.mjs         ← 목록 페이지 생성 스크립트 (Node, 무의존성)
├── .github/workflows/
│   └── build-index.yml         ← 푸시 시 index.html 자동 재생성
└── .nojekyll                   ← Pages가 파일을 그대로 서빙하도록 함
```

---

## 새 디자인 추가하기

1. 디자인을 **단일 `.html` 파일**로 만든다 (아래 규칙 참고).
2. `sites/<프로젝트명>/` 폴더에 넣는다. (새 프로젝트면 폴더를 새로 만든다.)
3. 커밋 & 푸시.
4. 잠시 후 목록 페이지에 자동으로 카드가 추가됩니다.

> 프로젝트 폴더가 곧 분류입니다. 알려진 폴더(`medisearch`, `bp-plus`/`bps`, `yaksaseyo`, `pharmdash`)는 보기 좋은 이름으로 표시되고, 새 폴더도 자동으로 한 섹션으로 잡힙니다.

### 멀티파일(폴더형) 프로젝트

단일 `.html`로 담기 어려운 프로젝트(여러 페이지 + 공용 JS/이미지 등)는 **하위 폴더**로 통째로 넣을 수 있습니다.

```
sites/<프로젝트>/<하위프로젝트>/
├── index.html        ← 진입점 (시작 페이지)
├── skins/ …          ← 내부 페이지들 (index.html에서 링크로 이동)
└── assets/ …         ← 공용 JS/CSS/이미지
```

- 하위 폴더에 **`index.html`이 있으면** 목록에는 **타일 1개**(진입점)만 만들어집니다. 내부 페이지는 진입점에서 링크로 이동합니다.
- 그래도 검색은 내부 페이지 제목/설명까지 훑으므로, 하위 페이지명으로도 그 타일이 검색됩니다.
- 폴더형 프로젝트 **내부에서는** `../assets/`, `skins/…` 같은 **상대 경로 참조가 허용**됩니다(폴더 단위로 함께 배포되므로 그대로 해석됨). 단일 `.html` 디자인에 대한 "외부 로컬 참조 금지" 규칙과 구분됩니다.

### 파일 네이밍 규칙

폴더가 이미 프로젝트를 나타내므로, 파일명은 **페이지 + 버전**으로 짧게 둡니다:

```
sites/<프로젝트>/<프로젝트>-<페이지명>-v<버전>.html
```

예시:

```
sites/medisearch/medisearch-location-map-v2.html
sites/bp-plus/bp-plus-onboarding-v1.html
```

- 소문자 + 하이픈(`-`)만 사용
- 버전은 `-v1`, `-v2` … (목록에서 버전 뱃지로 표시됨)
- `<title>` 과 `<meta name="description">` 를 채워두면 목록 카드에 제목/설명으로 노출됩니다.

---

## Claude Code 지시 시 주의사항

디자인을 생성할 때 다음 규칙을 반드시 지키도록 지시하세요:

1. **모든 디자인은 단일 `.html` 파일**로 생성 (CSS/JS는 인라인, 또는 CDN만 사용)
2. **외부 로컬 파일 참조 금지** — `../assets/` 같은 로컬 이미지/CSS/JS 경로 사용 X
3. **폰트는 Google Fonts CDN** 사용
4. **실제 API 호출 없이 목업 데이터**로 렌더링
5. 파일은 반드시 **`sites/<프로젝트명>/`** 폴더 아래에 저장
6. 이미지가 필요하면 **inline SVG / 이모지 / CSS 그라데이션**으로 대체 (외부 이미지 URL도 지양)

> 핵심: 검토자가 raw URL을 열었을 때 **외부 의존성 없이 바로 렌더링**되어야 합니다.

---

## index.html 자동 생성

루트 `index.html`은 직접 관리하지 않습니다. **`scripts/build-index.mjs`** 가 `/sites`의 모든 `.html`을 스캔해 만듭니다.

- **푸시할 때 자동**: `.github/workflows/build-index.yml` 이 `sites/**` 변경을 감지해 `index.html`을 다시 만들고 커밋합니다.
- **로컬에서 직접 실행**:

  ```bash
  node scripts/build-index.mjs
  ```

  (Node 18+ 필요. 의존성 설치 불필요.) 출력은 결정적(deterministic)이라 페이지 구성이 바뀔 때만 파일이 변경됩니다.

---

## GitHub Pages 설정 (최초 1회)

1. GitHub 저장소 → **Settings → Pages**
2. **Source: Deploy from a branch**
3. **Branch: `main` / `(root)`** 선택 후 Save
4. 잠시 후 `https://<사용자명>.github.io/static-web-implementer/` 에서 목록 페이지가 열립니다.

> `index.html`이 루트에 있으므로 그대로 목록 페이지로 동작합니다.
> Actions가 `index.html`을 커밋해도 `main` 브랜치 배포가 다시 트리거되어 자동 반영됩니다.

---

## 로컬에서 미리보기

```bash
# 저장소 루트에서
python -m http.server 8000
# 또는
npx serve .
```

브라우저에서 `http://localhost:8000/` 접속.
