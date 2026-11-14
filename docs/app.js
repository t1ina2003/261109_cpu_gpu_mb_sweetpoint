"use strict";

const data = SweetData;
const model = SweetModel;
const byId = id => document.getElementById(id);
const form = byId("settings");
const control = name => form.elements.namedItem(name);
const num = (value, digits = 0) => new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: digits, minimumFractionDigits: digits,
}).format(value);
const signed = (value, digits) => (value > 0 ? "+" : "") + num(value, digits);
const money = value => "NT$" + num(value);
const retail = part => data.sources[part.source].url;
const titleOf = build => build.cpu.name + " ＋ " + build.gpu.name;
const labels = ["CPU", "GPU", "主機板", "記憶體", "SSD", "散熱器", "電源", "機殼"];
const editable = [...data.cpus, ...data.gpus, ...data.boards, ...data.ram, ...data.ssd,
  ...Object.values(data.coolers).filter(part => part.price), ...data.psus, data.case];

function readQuotes() {
  try {
    const value = JSON.parse(localStorage.getItem("sweetpoint-quotes-v1") || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

let quotes = readQuotes();
let result;
let selectedId;
let activePreset = "mixed";

function saveQuotes() {
  try {
    localStorage.setItem("sweetpoint-quotes-v1", JSON.stringify(quotes));
  } catch {
    // The current tab still keeps the quote overrides.
  }
}

function options(select, rows, all) {
  const current = select.value;
  select.replaceChildren();
  if (all) select.add(new Option(all, ""));
  for (const row of rows) select.add(new Option(row.label || row.name, row.id));
  if ([...select.options].some(option => option.value === current)) select.value = current;
}

function updatePlatformOptions() {
  const platform = control("platform").value;
  options(control("board"), data.boards.filter(part => !platform || part.platform === platform), "自動選配");
  options(control("cpu"), data.cpus.filter(part => !platform || part.platform === platform), "自動選配");
}

function settings() {
  return Object.fromEntries(Object.entries(model.defaults).map(([key, fallback]) => {
    const input = control(key);
    if (typeof fallback === "boolean") return [key, input.checked];
    if (typeof fallback === "number") return [key, input.value === "" ? fallback : Number(input.value)];
    return [key, input.value];
  }));
}

function applyPreset(name) {
  activePreset = name;
  for (const [key, value] of Object.entries(model.presets[name])) {
    const input = control(key);
    if (typeof value === "boolean") input.checked = value;
    else input.value = value;
  }
  updatePlatformOptions();
  selectedId = undefined;
  renderPlanner();
}

function buildList(build) {
  const rows = build.parts.map((part, i) => {
    const quote = model.effectivePrice(part, quotes);
    const suffix = part.bundle ? " · 搭機限定" : "";
    const amount = quote ? money(quote) : "隨 CPU";
    const priceLink = quote ? '<a href="' + retail(part) + '" target="_blank" rel="noopener">' + amount + "</a>" : amount;
    return "<li><b>" + labels[i] + "</b>" + (part.sku || part.name) + " · " + priceLink + suffix + "</li>";
  });
  return '<ul class="build-list">' + rows.join("") + "</ul>";
}

function stats(build) {
  return '<div class="stats"><div><strong>' + money(build.price) + '</strong><span>整機估價</span></div>'
    + '<div><strong>' + num(build.watts) + ' W</strong><span>同時負載估算</span></div>'
    + '<div><strong>' + num(build.index, 1) + '</strong><span>混合效能指數</span></div></div>'
    + '<p class="small">每千元 ' + num(build.value, 2) + ' 點 · 每瓦 ' + num(build.efficiency, 3) + ' 點</p>';
}

function renderWinner() {
  const winner = result.winner;
  if (winner) {
    byId("winner").innerHTML = '<p class="eyebrow">目前最平衡</p><h3>' + titleOf(winner) + "</h3>"
      + stats(winner) + buildList(winner)
      + '<p class="small">請核對 BIOS 版本、顯卡供電接頭和店家搭機條件。總價含主機零件。</p>';
    return;
  }
  const messages = [];
  if (result.minimumPrice !== undefined) messages.push("此功耗上限內最低需 " + money(result.minimumPrice) + "。");
  if (result.minimumWatts !== undefined) messages.push("此預算內最低估算為 " + num(result.minimumWatts) + " W。");
  if (result.absoluteMinimum !== undefined && !messages.length) messages.push("放寬功耗上限後，最低價為 " + money(result.absoluteMinimum) + "。");
  if (!messages.length) messages.push("請調整指定零件、主機板、VRAM、CUDA 或搭機價篩選。");
  byId("winner").innerHTML = '<p class="eyebrow">目前的條件</p><h3>找不到可行組合</h3><p class="small">'
    + messages.join(" ") + "</p>";
}

function selectBuild(id) {
  const build = result.sorted.find(item => item.id === id);
  if (!build) return;
  selectedId = id;
  const delta = build.id === result.winner.id ? "" : '<p class="small">相對目前推薦　'
    + signed(build.price - result.winner.price, 0) + ' 元 · '
    + signed(build.watts - result.winner.watts, 0) + ' W · '
    + signed(build.index - result.winner.index, 1) + ' 點</p>';
  byId("chart-selection").innerHTML = "<strong>" + titleOf(build) + "</strong> · "
    + money(build.price) + " · " + build.watts + " W · " + num(build.index, 1) + " 點"
    + delta + buildList(build);
  byId("alternatives").querySelectorAll("button").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.build === id));
  });
  byId("chart").querySelectorAll(".dot").forEach(dot => {
    dot.setAttribute("aria-pressed", String(dot.dataset.build === id));
    dot.setAttribute("stroke", dot.dataset.build === id ? "#182c27" : "#fff");
  });
}

function chart() {
  if (!result.sorted.length) {
    byId("chart").innerHTML = '<p class="empty">調整條件後即可顯示圖表。</p>';
    byId("chart-selection").replaceChildren();
    return;
  }
  const axis = byId("axis").value;
  const stepX = axis === "price" ? 5000 : 25;
  const stepY = 10;
  const extent = (values, step) => {
    const low = Math.max(0, Math.floor(Math.min(...values) / step) * step);
    const high = Math.ceil(Math.max(...values) / step) * step;
    return [low, Math.max(low + step, high)];
  };
  const [minX, maxX] = extent(result.sorted.map(build => build[axis]), stepX);
  const [minY, maxY] = extent(result.sorted.map(build => build.index), stepY);
  const x = value => 42 + 385 * (value - minX) / (maxX - minX);
  const y = value => 210 - 190 * (value - minY) / (maxY - minY);
  const tickX = value => axis === "price" ? num(value / 1000, value % 1000 ? 1 : 0) + "k" : num(value);
  const front = new Set(result.frontier.map(build => build.id));
  const dots = [
    ...result.sorted.filter(build => !front.has(build.id)),
    ...result.frontier.filter(build => build !== result.winner),
    result.winner,
  ];
  let markup = '<svg viewBox="0 0 450 246" role="group" aria-label="可互動的整機散佈圖">';
  for (let i = 0; i <= 4; i++) {
    const vx = minX + (maxX - minX) * i / 4;
    const vy = minY + (maxY - minY) * i / 4;
    markup += '<path class="grid" d="M42 ' + y(vy) + 'H427 M' + x(vx) + ' 20V210"/>'
      + '<text x="36" y="' + (y(vy) + 4) + '" text-anchor="end">' + num(vy, vy % 1 ? 1 : 0) + "</text>"
      + '<text x="' + x(vx) + '" y="226" text-anchor="middle">' + tickX(vx) + "</text>";
  }
  markup += '<text x="234" y="244" text-anchor="middle">' + (axis === "price" ? "整機價格（NT$）" : "同時負載估算（W）") + "</text>";
  for (const build of dots) {
    const winner = build === result.winner;
    const edge = front.has(build.id);
    const label = titleOf(build) + "，" + money(build.price) + "，" + build.watts + " 瓦，" + num(build.index, 1) + " 點";
    markup += '<circle class="dot" data-build="' + build.id + '" cx="' + x(build[axis]) + '" cy="'
      + y(build.index) + '" r="' + (winner ? 8 : edge ? 5.5 : 3.7) + '" fill="'
      + (winner ? "#d17a13" : edge ? "#168460" : "#a5b9ae") + '" stroke="#fff" stroke-width="1"'
      + (edge ? ' tabindex="0" role="button" aria-label="' + label + '"' : ' aria-hidden="true"')
      + "><title>" + label + "</title></circle>";
  }
  byId("chart").innerHTML = markup + "</svg>";
  selectBuild(result.sorted.some(build => build.id === selectedId) ? selectedId : result.winner.id);
}

function renderPlanner() {
  const current = settings();
  for (const key of ["game", "rt", "cost", "power"]) byId(key + "-value").textContent = current[key] + "%";
  form.querySelectorAll("[data-preset]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.preset === activePreset));
  });
  byId("quote-count").textContent = "目前已自訂 " + editable.filter(part => Object.hasOwn(quotes, part.id)).length + " 項報價。";
  result = model.selectBuilds(data, current, quotes);
  renderWinner();
  const alternatives = byId("alternatives");
  alternatives.innerHTML = result.shortlist.length ? result.shortlist.map(({ label, build }) =>
    '<button type="button" data-build="' + build.id + '"><b>' + label + '</b><small>' + titleOf(build)
      + " · " + money(build.price) + " · " + build.watts + " W · " + num(build.index, 1) + " 點</small></button>").join("")
    : '<p class="small">' + (result.winner ? "目前前緣只有推薦方案。" : "放寬條件後即可比較方案。") + "</p>";
  chart();
  document.dispatchEvent(new Event("planner-updated"));
}

const benchmarks = {
  cpu: [
    { id: "work", name: "生產力指數", unit: "點", note: "Tweakers CPU 生產力指數 2026-2。每瓦為跨測項參考比值（指數 ÷ Cinebench 26 供電瓦數）。" },
    { id: "game", name: "遊戲指數", unit: "點", note: "Tweakers CPU 遊戲指數 2026-1。每瓦為跨測項參考比值（指數 ÷ Cinebench 26 供電瓦數）。" },
    { id: "cine", name: "Cinebench 26 多核", unit: "點", note: "Tweakers 同一 Cinebench 26 負載的多核分數與 CPU 供電功耗。" },
  ],
  gpu: [
    ...["1080p", "1440p", "4K"].flatMap((res, i) => [
      { id: "raster" + i, name: res + " 原生光柵", unit: "FPS", note: "Tom’s Hardware 原生 Ultra 遊戲套件。每瓦為跨測項參考比值（套件 FPS ÷ Tweakers 遊戲瓦數）。" },
      { id: "ray" + i, name: res + " 原生光追", unit: "FPS", note: "Tom’s Hardware 原生 Ultra 光追套件。每瓦為跨測項參考比值（套件 FPS ÷ Tweakers 遊戲瓦數）。" },
    ]),
    { id: "cyber", name: "Cyberpunk 2077 效能／瓦", unit: "FPS", note: "每瓦欄採 Tweakers 同一場景的 1440p Ultra 實測結果。這組資料僅提供每瓦，缺測留白。" },
  ],
};

function benchmarkValue(part, bench) {
  const match = /^(raster|ray)([012])$/.exec(bench.id);
  if (match) return part[match[1]][Number(match[2])];
  return part[bench.id] ?? null;
}

function renderRanking() {
  const kind = byId("rank-kind").value;
  const bench = benchmarks[kind].find(item => item.id === byId("rank-bench").value);
  const order = byId("rank-order").value;
  const parts = kind === "cpu" ? data.cpus : data.gpus;
  const rows = parts.map(part => {
    const performance = bench.id === "cyber" ? null : benchmarkValue(part, bench);
    const price = model.effectivePrice(part, quotes);
    return {
      part, performance, price,
      value: performance === null ? null : performance / (price / 1000),
      efficiency: bench.id === "cyber" ? (part.cyber ?? null) : (performance === null || part.powerNote ? null : performance / part.watts),
    };
  }).sort((a, b) => {
    const av = a[order], bv = b[order];
    if (av === null || bv === null) return Number(av === null) - Number(bv === null);
    return (order === "price" ? av - bv : bv - av) || a.price - b.price;
  });
  byId("rank-note").textContent = bench.note + " 排名採所列型號的標價，可輸入自訂報價。RX 9070 GRE 的搭機折扣另於整機選配計入。";
  const top = rows.filter(row => row[order] !== null).slice(0, 8);
  const max = top.length ? Math.max(...top.map(row => row[order])) : 0;
  const valueText = value => order === "price" ? num(value) : num(value, order === "efficiency" ? 3 : 1);
  byId("rank-chart").innerHTML = top.length ? '<div class="bars">' + top.map(row =>
    '<div class="bar-row"><span>' + row.part.name + '</span><span class="bar-track" aria-hidden="true"><i style="width:'
    + (100 * row[order] / max) + '%"></i></span><b>' + valueText(row[order]) + "</b></div>").join("") + "</div>"
    : '<p class="small">這組資料可使用「效能／瓦」排序。</p>';
  const fmt = (value, places) => value === null ? "—" : num(value, places);
  const rankTitle = kind === "gpu" ? "顯卡（VRAM）" : "處理器（平台）";
  byId("rank-table").innerHTML = '<table><thead><tr><th scope="col">#</th><th scope="col">' + rankTitle
    + '</th><th scope="col">台灣價 NT$</th><th scope="col">效能（' + bench.unit
    + '）</th><th scope="col">實測 W</th><th scope="col">效能／千元</th><th scope="col">效能／瓦</th></tr></thead><tbody>'
    + rows.map((row, i) => '<tr><td>' + (row[order] === null ? "—" : i + 1)
      + '</td><td><a title="' + (row.part.sku || row.part.name) + '" href="' + retail(row.part) + '" target="_blank" rel="noopener">'
      + row.part.name + '</a> · ' + (kind === "gpu" ? row.part.vram + "GB" : row.part.platform)
      + '</td><td>' + num(row.price) + (row.part.bundle ? " 搭機" : "")
      + "</td><td>" + fmt(row.performance, 1) + "</td><td>" + num(row.part.watts, 1)
      + (row.part.powerNote ? "（" + row.part.powerNote + "）" : "")
      + "</td><td>" + fmt(row.value, 3) + "</td><td>" + fmt(row.efficiency, 3) + "</td></tr>").join("")
    + "</tbody></table>";
}

function updateBenchmarks() {
  const kind = byId("rank-kind").value;
  options(byId("rank-bench"), benchmarks[kind]);
  if (kind === "gpu") byId("rank-bench").value = "raster1";
  renderRanking();
}

function renderSources() {
  byId("sources").innerHTML = `
    <p><strong>台灣報價</strong>　採 2026 年 11 月 8 日原價屋及其報價追蹤快照。這是單一通路的選樣，價格可能含搭機或活動條件，庫存請向商家確認。樣本涵蓋有當期標價的 AM5、LGA1851 與主流獨顯。RTX 5090 和 Arc B580 未納入本次報價樣本。完整估價含 CPU、GPU、主機板、RAM、SSD、散熱器、PSU、機殼，另計作業系統、周邊、運費及組裝費。</p>
    <p><strong>零件實測</strong>　CPU 採 Tweakers 的遊戲與生產力指數、Cinebench 26 多核與 EPS＋ATX12V 供電量測。GPU 採 Tom’s Hardware 的原生 Ultra FPS，以及 Tweakers 的 Cyberpunk 2077 Ultra 顯卡功耗（預設 1440p，RTX 5080 用 4K Ultra，RTX 5050 用 ComputerBase 的《Star Wars Outlaws》量測）。跨測項每瓦只供趨勢比較。Cyberpunk 2077 專欄列同場景實測每瓦。</p>
    <p><strong>整機效能指數</strong>　以 Ryzen 7 9700X＋RTX 5070 為 100。CPU 遊戲與 GPU FPS 以幾何加權，CPU 比重在 1080p／1440p／4K 分別為 35%／20%／10%，光柵與光追依滑桿混合。再依用途權重，與 CPU 生產力指數作幾何平均。這是選配模型，實際 FPS 會隨遊戲和設定改變。CUDA 選項篩選相容性。GPU 生產力與編碼、RAM／SSD 容量帶來的效能變化由使用者依工作需求評估。</p>
    <p><strong>整機功耗與電源</strong>　（CPU 多核負載 W ＋ GPU 遊戲負載 W ＋ 其他元件預留 40 W）÷ 0.90，為插座端同時負載情境估算。遊戲、待機、短暫峰值與全年耗電會不同。PSU 依顯卡級距、估算直流負載 × 1.25 及高功耗 CPU 配置選擇。下單時按實際顯卡型號核對電源建議與接頭。</p>
    <p><strong>甜蜜點</strong>　先套用平台、預算、功耗、VRAM、搭機與 CUDA 限制。圖中綠點是三目標前緣，代表找不到同時更便宜、更省電、效能更高或相等且至少一項更佳的方案。推薦分數 = 混合效能指數 × (50000 ÷ 價格)<sup>價格懲罰</sup> × (300 ÷ 功耗)<sup>功耗懲罰</sup>。兩個懲罰滑桿換算為 0 到 1。提高懲罰會讓較便宜或較省電的配置更容易勝出。</p>
    <p><strong>相容性</strong>　主機板按腳位配對，高負載 CPU 優先使用供電較充裕的板型；較新 CPU 可能需要更新 BIOS。預算組用 16 GB 單條，雙通道和部分遊戲的實際表現會有差異。</p>
    <ul>${Object.values(data.sources).map(source => '<li><a href="' + source.url
      + '" target="_blank" rel="noopener">' + source.name + "</a></li>").join("")}</ul>`;
}

function updateQuoteInput() {
  byId("quote-price").value = quotes[byId("quote-part").value] ?? "";
}

options(control("ram"), data.ram);
options(control("ssd"), data.ssd);
options(control("gpu"), data.gpus, "自動選配");
options(byId("quote-part"), editable);
updateQuoteInput();
updateBenchmarks();
renderSources();
applyPreset(activePreset);

form.addEventListener("submit", event => event.preventDefault());
form.addEventListener("input", event => {
  if (!event.target.name) return;
  if (event.target.name === "platform") updatePlatformOptions();
  activePreset = undefined;
  selectedId = undefined;
  renderPlanner();
});
form.addEventListener("click", event => {
  const button = event.target.closest("[data-preset]");
  if (button) applyPreset(button.dataset.preset);
});
byId("axis").addEventListener("change", chart);
for (const region of ["chart", "alternatives"]) {
  byId(region).addEventListener("click", event => {
    const target = event.target.closest("[data-build]");
    if (!target) return;
    selectBuild(target.dataset.build);
    if (region === "alternatives") byId("chart-selection").scrollIntoView({ block: "nearest" });
  });
}
byId("chart").addEventListener("keydown", event => {
  if (event.target.dataset.build && [" ", "Enter"].includes(event.key)) {
    event.preventDefault();
    selectBuild(event.target.dataset.build);
  }
});
byId("rank-kind").addEventListener("change", updateBenchmarks);
byId("rank-bench").addEventListener("change", () => {
  if (byId("rank-bench").value === "cyber") byId("rank-order").value = "efficiency";
  renderRanking();
});
byId("rank-order").addEventListener("change", renderRanking);
byId("quote-part").addEventListener("change", updateQuoteInput);
byId("quote-price").addEventListener("input", event => {
  const id = byId("quote-part").value;
  if (event.target.validity.badInput) return;
  if (!event.target.value) delete quotes[id];
  else if (event.target.validity.valid) quotes[id] = event.target.valueAsNumber;
  else return;
  saveQuotes();
  renderPlanner();
  renderRanking();
});
byId("clear-quotes").addEventListener("click", () => {
  quotes = {};
  saveQuotes();
  updateQuoteInput();
  renderPlanner();
  renderRanking();
});
