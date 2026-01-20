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
const ANALYTICS_ENDPOINT = "https://script.google.com/macros/s/AKfycbzK7T__F4hhaXbSeZ038iU2N0R66jtkktx5qiMGst45rFArff5nQMNOLEeN3AxNyWS_PA/exec"; // <-- APPS_SCRIPT URL

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

// 중복 전송 방지(visibilitychange + pagehide + beforeunload가 겹칠 수 있음)
let didFlush = false;

function sendEvent(payload){
  const bodyObj = {
    ts: Date.now(),
    sessionId: sid,
    url: location.href,
    ua: navigator.userAgent,
    ...payload
  };

  const url = `${ANALYTICS_ENDPOINT}?path=collect`;
  const json = JSON.stringify(bodyObj);

  // 1) 가장 안정적: sendBeacon (CORS preflight 없이 전송되는 경우가 많음)
  if (navigator.sendBeacon) {
    try {
      const blob = new Blob([json], { type: "text/plain;charset=UTF-8" });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    } catch (e) {}
  }

  // 2) fallback: no-cors + 헤더 없이 전송(응답은 못 읽어도 저장은 됨)
  fetch(url, {
    method: "POST",
    body: json,
    keepalive: true,
    mode: "no-cors",
    cache: "no-store",
  }).catch(()=>{});
}

// 최초 방문
sendEvent({ event:"page_view" });

// 탭 체류 기록 함수
function recordTabDwell(nextTab){
  const now = Date.now();
  const dur = now - tabStart;
  if (dur > 300) {
    sendEvent({ event:"tab_dwell", tab: activeTab, durationMs: dur });
  }
  activeTab = nextTab;
  tabStart = now;
}

// 탭 버튼 클릭 감지
document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const target = btn.getAttribute("data-tab-target") || btn.dataset.tab || "";
    if (target) recordTabDwell(target);
  });
});

// 상담사 카드 클릭
document.addEventListener("click", (e)=>{
  const c = e.target.closest("[data-consultant]");
  if (c) {
    sendEvent({
      event:"consultant_click",
      targetType:"consultant",
      targetId: c.dataset.consultant || "unknown"
    });
  }
});

// CTA 클릭
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

function flushOnExit(){
  if (didFlush) return;
  didFlush = true;

  const now = Date.now();

  // 마지막 탭 체류 기록
  const dur = now - tabStart;
  if (dur > 300) {
    sendEvent({ event:"tab_dwell", tab: activeTab, durationMs: dur });
  }

  // 세션 종료 기록
  const total = now - sessionStart;
  if (total > 300) {
    sendEvent({ event:"session_end", durationMs: total });
  }
}

// 페이지 나갈 때
window.addEventListener("pagehide", flushOnExit);

// 화면이 백그라운드로 갈 때(앱 전환 등)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushOnExit();
});

// 일부 브라우저에서 보강
window.addEventListener("beforeunload", flushOnExit);
