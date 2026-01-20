(() => {
  // ---------- Intro: tap to skip ----------
  const intro = document.getElementById("intro");
  const introVideo = document.getElementById("introVideo");
  const skipBtn = document.getElementById("skipBtn");

  const hideIntro = () => {
    if (!intro || intro.classList.contains("is-hidden")) return;
    intro.classList.add("is-hidden");
    try { introVideo && introVideo.pause(); } catch (e) {}
    document.body.style.overflow = "";
  };

  // Lock scroll while intro is showing
  if (intro) document.body.style.overflow = "hidden";

  // If video ends, auto-hide
  if (introVideo) {
    introVideo.addEventListener("ended", hideIntro);
    introVideo.addEventListener("error", hideIntro); // fail-safe
  }

  // Tap anywhere to skip
  if (intro) intro.addEventListener("click", hideIntro);
  if (skipBtn) skipBtn.addEventListener("click", (e) => { e.stopPropagation(); hideIntro(); });

  // ---------- Tabs ----------
  const tabButtons = Array.from(document.querySelectorAll(".tab"));
  const panels = Array.from(document.querySelectorAll(".panel"));

  const setActiveTab = (id) => {
    tabButtons.forEach(btn => {
      const isOn = btn.dataset.tab === id;
      btn.classList.toggle("is-active", isOn);
      btn.setAttribute("aria-selected", String(isOn));
    });
    panels.forEach(p => p.classList.toggle("is-active", p.id === id));
    // light scroll to top of content area for mobile comfort
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  // Jump links inside cards (data-jump-tab)
  document.querySelectorAll("[data-jump-tab]").forEach(el => {
    el.addEventListener("click", (e) => {
      const id = el.getAttribute("data-jump-tab");
      if (!id) return;
      e.preventDefault();
      setActiveTab(id);
    });
  });

  // ---------- Fade lines: re-trigger when returning to Tab1 ----------
  // (기본 CSS 애니메이션이지만, 탭 이동 후 다시 들어올 때도 보여주고 싶으면 재실행)
  const reRunFadeLines = () => {
    const container = document.querySelector("#t1 .fadeLines[data-fade-lines]");
    if (!container) return;
    const spans = Array.from(container.querySelectorAll("span"));
    spans.forEach((s) => {
      s.style.animation = "none";
      s.offsetHeight; // reflow
      s.style.animation = "";
    });
  };

  // When Tab1 becomes active
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.tab === "t1") reRunFadeLines();
    });
  });
})();

(function () {
  const wrap = document.querySelector("[data-bullet-accord]");
  if (!wrap) return;

  const items = Array.from(wrap.querySelectorAll(".bulletCard"));

  // 초기 aria 동기화
  items.forEach((li) => {
    const btn = li.querySelector(".bulletCard__btn");
    if (!btn) return;
    btn.setAttribute("aria-expanded", String(li.classList.contains("is-open")));
  });

  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".bulletCard__btn");
    if (!btn) return;

    const li = btn.closest(".bulletCard");
    if (!li) return;

    const willOpen = !li.classList.contains("is-open");

    // 하나만 열리게
    items.forEach((other) => {
      other.classList.remove("is-open");
      const b = other.querySelector(".bulletCard__btn");
      if (b) b.setAttribute("aria-expanded", "false");
    });

    // 선택한 것만 토글
    if (willOpen) {
      li.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      li.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });
})();

// =========================
// Analytics (KT Plaza simple)
// =========================
const ANALYTICS_ENDPOINT = "https://script.google.com/macros/s/AKfycbzK7T__F4hhaXbSeZ038iU2N0R66jtkktx5qiMGst45rFArff5nQMNOLEeN3AxNyWS_PA/exec"; // <-- APPS_SCRIPT URL 복사

function getSessionId(){
  const k = "ktplaza_sid";
  let sid = localStorage.getItem(k);
  if (!sid) {
    sid = "s_" + Math.random().toString(36).slice(2) + "_" + Date.now();
    localStorage.setItem(k, sid);
  }
  return sid;
}

const sid = getSessionId();
let sessionStart = Date.now();

let activeTab = "t1";
let tabStart = Date.now();

function sendEvent(payload){
  const body = {
    ts: Date.now(),
    sessionId: sid,
    url: location.href,
    ua: navigator.userAgent,
    ...payload
  };
  // keepalive로 언로드 상황에서도 전송 시도
  fetch(`${ANALYTICS_ENDPOINT}?path=collect`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(()=>{});
}

// 최초 방문
sendEvent({ event:"page_view" });

// 탭 체류 기록 함수
function recordTabDwell(nextTab){
  const now = Date.now();
  const dur = now - tabStart;
  if (dur > 300) { // 너무 짧은 노이즈 제외
    sendEvent({ event:"tab_dwell", tab: activeTab, durationMs: dur });
  }
  activeTab = nextTab;
  tabStart = now;
}

// 탭 버튼 클릭 감지(너의 탭 구현에 맞춰 selector 조정)
document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const target = btn.getAttribute("data-tab-target") || btn.dataset.tab || "";
    // target이 "t1/t2/t3" 형태가 되도록 맞춰줘
    if (target) recordTabDwell(target);
  });
});

// 상담사 카드 클릭: <a class="profileCard" data-consultant="점장">...
document.addEventListener("click", (e)=>{
  const c = e.target.closest("[data-consultant]");
  if (c) {
    sendEvent({ event:"consultant_click", targetType:"consultant", targetId: c.dataset.consultant || "unknown" });
  }
});

// CTA 클릭: <a data-cta="naver_reserve" data-card="floating">...
document.addEventListener("click", (e)=>{
  const a = e.target.closest("[data-cta]");
  if (a) {
    sendEvent({
      event:"cta_click",
      targetType:"cta",
      targetId: a.dataset.cta || "unknown",
      cardId: a.dataset.card || "default",
    });
  }
});

// 세션 종료(페이지 나갈 때)
window.addEventListener("pagehide", ()=>{
  const dur = Date.now() - sessionStart;
  sendEvent({ event:"session_end", durationMs: dur });
});

function flushOnExit(){
  // 탭 체류도 마지막으로 한번 찍고
  const now = Date.now();
  const dur = now - tabStart;
  if (dur > 300) {
    sendEvent({ event:"tab_dwell", tab: activeTab, durationMs: dur });
  }

  // 세션 종료 찍기
  const total = now - sessionStart;
  sendEvent({ event:"session_end", durationMs: total });
}

// 화면이 백그라운드로 가거나(앱 전환), 탭이 숨겨질 때도 종료 처리
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushOnExit();
});

// 일부 브라우저에서 더 잘 잡히도록 추가
window.addEventListener("beforeunload", flushOnExit);
