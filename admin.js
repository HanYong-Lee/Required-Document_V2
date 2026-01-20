const ANALYTICS_ENDPOINT = "https://script.google.com/macros/s/AKfycbzK7T__F4hhaXbSeZ038iU2N0R66jtkktx5qiMGst45rFArff5nQMNOLEeN3AxNyWS_PA/exec"; // <-- 교체

function fmtPct(x){ return (x*100).toFixed(1) + "%"; }

document.getElementById("load").addEventListener("click", async ()=>{
  const pass = document.getElementById("pass").value.trim();
  const group = document.getElementById("group").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  const url = new URL(ANALYTICS_ENDPOINT);
  url.searchParams.set("path","stats");
  url.searchParams.set("pass", pass);
  if (start) url.searchParams.set("start", start);
  if (end) url.searchParams.set("end", end);
  url.searchParams.set("group", group);

  const summaryEl = document.getElementById("summary");
  const resultEl = document.getElementById("result");

  summaryEl.textContent = "조회 중...";
  resultEl.innerHTML = "";

  // 캐시 방지용 ts 파라미터
  url.searchParams.set("_ts", String(Date.now()));

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  }).then(r => r.json())
    .catch(()=>({ok:false, error:"fetch_failed"}));

  if (!res.ok) {
    summaryEl.textContent = "오류: " + (res.error || "unknown");
    return;
  }

  const rows = res.rows || [];
  const totalVisitors = rows.reduce((s,r)=>s+(r.visitors||0),0);
  summaryEl.textContent = `기간 결과: ${rows.length}개 구간 / 합산 방문자(세션): ${totalVisitors}`;

  const table = document.createElement("table");
  table.className = "adminTable";
  table.innerHTML = `
    <thead>
      <tr>
        <th>기간</th>
        <th>방문자(세션)</th>
        <th>평균 체류</th>
        <th>t1 체류 비율</th>
        <th>상담사 클릭</th>
        <th>CTA 클릭(카드별)</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tb = table.querySelector("tbody");

  for (const r of rows) {
    const cons = r.consultantClicks || {};
    const ctas = r.ctaClicks || {};

    const consHtml = Object.entries(cons).map(([k,v])=>`<span class="pillMini">${k}: ${v}</span>`).join("");
    const ctaHtml = Object.entries(ctas).map(([k,v])=>`<span class="pillMini">${k}: ${v}</span>`).join("");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.key}</td>
      <td>${r.visitors}</td>
      <td>${r.avgStaySec}s</td>
      <td>${fmtPct(r.t1DwellRatio || 0)}</td>
      <td>${consHtml || "-"}</td>
      <td>${ctaHtml || "-"}</td>
    `;
    tb.appendChild(tr);
  }

  resultEl.appendChild(table);
});
