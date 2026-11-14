"use strict";

const tabLinks = [...document.querySelectorAll(".page-tabs a")];

function showPage() {
  const page = tabLinks.find(link => link.hash === location.hash) || tabLinks[0];
  for (const link of tabLinks) {
    const active = link === page;
    byId(link.hash.slice(1)).hidden = !active;
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", showPage);
showPage();

for (const button of form.querySelectorAll("[data-settings-group]")) {
  button.addEventListener("click", () => {
    for (const item of form.querySelectorAll("[data-settings-group]")) {
      item.setAttribute("aria-pressed", String(item === button));
    }
    for (const panel of form.querySelectorAll("[data-settings-panel]")) {
      panel.hidden = panel.dataset.settingsPanel !== button.dataset.settingsGroup;
    }
  });
}

const tierPicker = byId("tier");
const upgradeKind = byId("upgrade-kind");
const upgradePicker = byId("upgrade-option");
let tiers = [];
let tierBudget;
let upgrades = [];

function costOf(build) {
  const values = ["years", "hours", "rate"].map(id => {
    const input = byId(id);
    const value = input.valueAsNumber;
    return Number.isFinite(value) ? Math.min(Number(input.max), Math.max(Number(input.min), value))
      : Number(input.defaultValue);
  });
  return model.ownership(build, ...values);
}

function costMetrics(build) {
  const cost = costOf(build);
  return '<div class="cost-metrics">'
    + [["購機價", build.price], ["期間電費", cost.electricity], ["持有總成本", cost.total]]
      .map(([label, value]) => '<div><small>' + label + '</small><strong>' + money(value) + '</strong></div>').join("")
    + "</div>";
}

function plot(current) {
  const left = 36, right = 360, top = 23, bottom = 159;
  const plotRows = tiers.filter(row => row.build);
  const first = tiers[0].budget;
  const last = tiers.at(-1).budget;
  const x = budget => left + (right - left) * (budget - first) / Math.max(last - first, 1);
  const roundUp = (number, step) => Math.ceil(number / step) * step;
  const maxIndex = roundUp(Math.max(...plotRows.map(row => row.build.index)), 25);
  const maxMoney = roundUp(Math.max(...plotRows.map(row => costOf(row.build).total)), 20000);
  const y = (value, max) => bottom - (bottom - top) * value / max;
  let svg = '<svg viewBox="0 0 410 190" role="img" aria-labelledby="curve-title">'
    + '<title id="curve-title">不同購機預算的最高效能、實際購機價與持有總成本</title>';
  for (let i = 0; i <= 4; i++) {
    const ratio = i / 4;
    const py = y(ratio, 1);
    svg += '<path stroke="#d8e3db" d="M' + left + ' ' + py + 'H' + right + '"/>'
      + '<text text-anchor="end" x="31" y="' + (py + 4) + '">' + num(maxIndex * ratio) + '</text>'
      + '<text x="366" y="' + (py + 4) + '">' + num(maxMoney * ratio / 1000, 1).replace(/\.0$/, "") + 'k</text>';
  }
  const series = [
    ["#9aada2", maxMoney, build => build.price],
    ["#b0630c", maxMoney, build => costOf(build).total],
    ["#146950", maxIndex, build => build.index],
  ];
  for (const [color, max, valueOf] of series) {
    const points = plotRows.map(({ budget, build }) => x(budget) + "," + y(valueOf(build), max));
    svg += '<polyline points="' + points.join(" ") + '" fill="none" stroke="' + color + '" stroke-width="2.4"/>';
    for (const { budget, build } of plotRows) {
      svg += '<circle cx="' + x(budget) + '" cy="' + y(valueOf(build), max) + '" r="3" fill="' + color + '"/>';
    }
  }
  for (const { budget, build } of tiers) {
    const px = x(budget);
    const active = budget === Number(tierPicker.value);
    if (active) svg += '<path d="M' + px + ' ' + top + 'V' + bottom + '" stroke="#172522" stroke-dasharray="3 3"/>';
    if (budget !== current.budget || budget % 10000 === 0 || active) {
      svg += '<text x="' + px + '" y="177" text-anchor="middle">' + num(budget / 1000, budget % 1000 ? 1 : 0) + 'k</text>';
    }
    if (build) {
      svg += '<rect class="tier-hit" data-tier="' + budget + '" x="' + (px - 10) + '" y="' + top
        + '" width="20" height="' + (bottom - top + 22) + '" fill="transparent"/>';
    }
  }
  byId("investment-plot").innerHTML = svg + "</svg>";
}

function showTier() {
  const active = tiers.find(row => row.budget === Number(tierPicker.value));
  const bestValue = tiers.reduce((best, row) => {
    const value = row.build.index / costOf(row.build).total;
    return !best || value > best.value ? { row, value } : best;
  }, null);
  byId("curve-value").textContent = bestValue
    ? "曲線中每千元持有成本效能最高：" + money(bestValue.row.budget) + " 預算帶（"
      + num(bestValue.value * 1000, 2) + " 點／千元）" : "";
  const build = active?.build;
  if (!build) {
    byId("investment-plot").replaceChildren();
    byId("investment-result").textContent = "目前比較範圍沒有可行組合。請調整預算或零件限制。";
    return;
  }
  const prior = tiers[tiers.indexOf(active) - 1]?.build;
  let marginal = "此條件下第一個可行預算帶。";
  if (prior) {
    const gain = (build.index / prior.index - 1) * 100;
    const extra = costOf(build).total - costOf(prior).total;
    marginal = "較前一檔可行預算，效能 " + signed(gain, 1) + "%，持有成本 " + signed(extra, 0) + " 元。";
    if (gain > 0 && extra > 0) marginal += " 每多 NT$1,000 約提高 " + num(gain * 1000 / extra, 1) + "%。";
  }
  plot(settings());
  byId("investment-result").innerHTML = '<strong>' + titleOf(build) + '</strong>'
    + costMetrics(build) + '<p class="small">效能 ' + num(build.index, 1) + ' 點 · 約 '
    + num(costOf(build).annualEnergy) + ' 度／年 · ' + num(build.index * 1000 / costOf(build).total, 2) + ' 點／千元持有成本</p><p class="small">' + marginal + '</p>'
    + '<details><summary>查看此檔完整零件</summary>' + buildList(build) + '</details>';
}

function updateCurve() {
  const current = settings();
  const budgets = [40000, 50000, 60000, 70000, 80000, 90000, current.budget];
  const winner = result.winner;
  tiers = model.budgetCurve(result.candidates, current, budgets).filter(row => row.build);
  if (!tiers.length) tierBudget = undefined;
  options(tierPicker, tiers.map(row => ({
    id: String(row.budget), label: money(row.budget) + " 預算",
  })));
  const selected = tiers.find(row => row.budget === tierBudget)
    || tiers.find(row => row.budget === current.budget)
    || tiers.find(row => row.budget > current.budget)
    || tiers.at(-1);
  tierPicker.disabled = !selected;
  if (selected) tierPicker.value = selected.budget;
  const note = byId("balanced-note");
  note.textContent = winner ? "依你的權重，整機甜蜜點為 " + money(winner.price) + " · " + titleOf(winner)
    : "設定的預算內沒有推薦組合，可查看其他預算。";
  showTier();
}

const partIndex = { cpu: 0, gpu: 1, board: 2, ram: 3, ssd: 4 };

function updateUpgrades() {
  const base = result.winner;
  const key = upgradeKind.value;
  const index = partIndex[key];
  const lists = { cpu: data.cpus, gpu: data.gpus, board: data.boards, ram: data.ram, ssd: data.ssd };
  upgrades = [];
  if (base) {
    const pinned = { ...settings(), cpu: base.cpu.id, gpu: base.gpu.id, board: base.board.id };
    for (const part of lists[key]) {
      if (part.id === base.parts[index].id) continue;
      const [build] = model.buildCandidates(data, { ...pinned, [key]: part.id }, quotes);
      if (build && build.watts <= pinned.cap) upgrades.push({ build, part });
    }
  }
  options(upgradePicker, upgrades.map(({ part }) => ({ id: part.id, name: part.name })));
  upgradePicker.disabled = !upgrades.length;
  showUpgrade();
}

function showUpgrade() {
  const base = result.winner;
  const change = upgrades.find(({ part }) => part.id === upgradePicker.value);
  const panel = byId("upgrade-result");
  if (!change) {
    panel.textContent = "目前方案與限制下沒有可直接替換的選項。";
    return;
  }
  const { build } = change;
  const current = costOf(base);
  const next = costOf(build);
  const key = upgradeKind.value;
  const note = ["ram", "board", "ssd"].includes(key)
    ? "效能模型只採 CPU／GPU 實測。容量、I/O、供電和擴充需求請依用途評估，這三類零件目前只計價差。"
    : "維持其他主要零件，並重算需要搭配的散熱器與電源。跨平台組合可到選配頁切換比較。";
  panel.innerHTML = '<p class="small">基準 ' + titleOf(base) + ' · '
    + base.parts[partIndex[key]].name + '</p>' + costMetrics(build)
    + '<p class="small">比基準：購機 ' + signed(build.price - base.price, 0) + ' 元 · 電費 '
    + signed(next.electricity - current.electricity, 0) + ' 元 · 持有總成本 '
    + signed(next.total - current.total, 0) + ' 元 · 效能 '
    + signed((build.index / base.index - 1) * 100, 1) + '%</p><p class="small">' + note
    + (build.price > settings().budget ? " 此替換超出目前購機預算。" : "") + '</p>';
}

function refreshInvestment() {
  updateCurve();
  updateUpgrades();
}

function pickTier(budget) {
  tierBudget = Number(budget);
  tierPicker.value = budget;
  showTier();
}

tierPicker.addEventListener("change", () => pickTier(tierPicker.value));
byId("investment-plot").addEventListener("click", event => {
  if (event.target.dataset.tier) pickTier(event.target.dataset.tier);
});
for (const id of ["hours", "rate", "years"]) {
  byId(id).addEventListener("input", () => {
    showTier();
    showUpgrade();
  });
}
upgradeKind.addEventListener("change", updateUpgrades);
upgradePicker.addEventListener("change", showUpgrade);
document.addEventListener("planner-updated", refreshInvestment);
refreshInvestment();
