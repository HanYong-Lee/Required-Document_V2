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
const ANALYTICS_ENDPOINT = "https://script.google.com/macros/s/AKfycbzK7T__F4hhaXbSeZ038iU2N0R66jtkktx5qiMGst45rFArff5nQMNOLEeN3AxNyWS_PA/exec";

// ✅ UA 요약(축약) 함수: raw UA 전체를 저장하지 않음
function getUaSummary(){
  const ua = (navigator.userAgent || "").toLowerCase();
  const plat = (navigator.platform || "").toLowerCase();

  // deviceType
  const isMobile =
    /mobi|android|iphone|ipad|ipod|iemobile|windows phone/.test(ua);
  const deviceType = isMobile ? "mobile" : "desktop";

  // os
  let os = "other";
  if (/android/.test(ua)) os = "android";
  else if (/iphone|ipad|ipod/.test(ua)) os = "ios";
  else if (/windows/.test(ua) || /win/.test(plat)) os = "windows";
  else if (/mac os|macintosh/.test(ua) || /mac/.test(plat)) os = "mac";
  else if (/linux/.test(ua) || /linux/.test(plat)) os = "linux";

  // browser
  let browser = "other";
  // order matters
  if (/edg\//.test(ua)) browser = "edge";
  else if (/opr\//.test(ua) || /opera/.test(ua)) browser = "opera";
  else if (/samsungbrowser\//.test(ua)) browser = "samsung";
  else if (/chrome\//.test(ua) && !/chromium/.test(ua)) browser = "chrome";
  else if (/firefox\//.test(ua)) browser = "firefox";
  else if (/safari\//.test(ua) && !/chrome\//.test(ua) && !/crios\//.test(ua)) browser = "safari";

  return `${deviceType}|${os}|${browser}`;
}

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

// 중복 전송 방지
let didFlush = false;

function sendEvent(payload){
  const bodyObj = {
    ts: Date.now(),
    sessionId: sid,
    url: location.href,
    // ✅ raw UA 대신 요약값만 저장
    ua: getUaSummary(),
    ...payload
  };

  const url = `${ANALYTICS_ENDPOINT}?path=collect`;
  const json = JSON.stringify(bodyObj);

  // 1) sendBeacon 우선
  if (navigator.sendBeacon) {
    try {
      const blob = new Blob([json], { type: "text/plain;charset=UTF-8" });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    } catch (e) {}
  }

  // 2) fallback: no-cors
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

// 탭 체류 기록
function recordTabDwell(nextTab){
  const now = Date.now();
  const dur = now - tabStart;
  if (dur > 300) {
    sendEvent({ event:"tab_dwell", tab: activeTab, durationMs: dur });
  }
  activeTab = nextTab;
  tabStart = now;
}

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

  // 마지막 탭 체류
  const dur = now - tabStart;
  if (dur > 300) {
    sendEvent({ event:"tab_dwell", tab: activeTab, durationMs: dur });
  }

  // 세션 종료
  const total = now - sessionStart;
  if (total > 300) {
    sendEvent({ event:"session_end", durationMs: total });
  }
}

window.addEventListener("pagehide", flushOnExit);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushOnExit();
});

window.addEventListener("beforeunload", flushOnExit);
