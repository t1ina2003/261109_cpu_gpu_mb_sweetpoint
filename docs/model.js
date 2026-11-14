"use strict";

const SweetModel = (() => {
  const defaults = {
    budget: 65000, cap: 9999, resolution: 1, vram: 8,
    ram: "ram32", ssd: "ssd1", platform: "", board: "", cpu: "", gpu: "",
    game: 60, rt: 20, cost: 35, power: 25, cuda: false, bundle: true,
  };

  const presets = {
    mixed: defaults,
    budget: { ...defaults, budget: 48000, cap: 350, resolution: 0, ram: "ram16", cost: 75, power: 40 },
    gaming: { ...defaults, budget: 75000, game: 90, rt: 10, vram: 16, cost: 30, power: 20 },
    work: { ...defaults, budget: 90000, game: 25, cuda: true, vram: 16, cost: 30, power: 20 },
  };

  const blend = (a, b, weightB) => a ** (1 - weightB) * b ** weightB;
  const effectivePrice = (part, quotes = {}) => {
    const value = quotes[part.id];
    return Number.isFinite(value) && value > 0 ? value : part.price;
  };

  function isCompatible(cpu, board) {
    return cpu.platform === board.platform && (!cpu.heavy || board.heavy);
  }

  function performance(cpu, gpu, settings) {
    const resolution = settings.resolution;
    const cpuShare = [0.35, 0.20, 0.10][resolution];
    const rtShare = settings.rt / 100;
    const gameShare = settings.game / 100;
    const gpuIndex = blend(gpu.raster[resolution] / [132.6, 96.4, 54.3][resolution],
      gpu.ray[resolution] / [74.1, 51.5, 22.7][resolution], rtShare);
    const gameIndex = blend(gpuIndex, cpu.game / 187.3, cpuShare);
    return 100 * blend(cpu.work / 197.3, gameIndex, gameShare);
  }

  function psuFor(data, cpu, gpu, load) {
    const target = Math.max(gpu.psu, load * 1.25, cpu.heavy && gpu.psu >= 750 ? 850 : 0);
    return data.psus.find(part => part.capacity >= target);
  }

  function buildCandidates(data, settings, quotes = {}) {
    const ram = data.ram.find(part => part.id === settings.ram);
    const ssd = data.ssd.find(part => part.id === settings.ssd);
    const builds = [];

    for (const cpu of data.cpus) {
      if ((settings.platform && cpu.platform !== settings.platform) || (settings.cpu && cpu.id !== settings.cpu)) continue;
      for (const board of data.boards) {
        if ((settings.board && settings.board !== board.id) || !isCompatible(cpu, board)) continue;
        for (const baseGpu of data.gpus) {
          const gpu = settings.bundle && baseGpu.deal && !quotes[baseGpu.id]
            ? { ...baseGpu, ...baseGpu.deal, bundle: true } : baseGpu;
          if (settings.gpu && gpu.id !== settings.gpu) continue;
          if (gpu.vram < settings.vram || (settings.cuda && !gpu.cuda) || (!settings.bundle && gpu.bundle)) continue;

          const load = cpu.watts + gpu.watts + 40;
          const watts = Math.round(load / 0.90);
          const cooler = data.coolers[cpu.cooler];
          const psu = psuFor(data, cpu, gpu, load);
          if (!psu) continue;
          const parts = [cpu, gpu, board, ram, ssd, cooler, psu, data.case];
          const price = parts.reduce((total, part) => total + effectivePrice(part, quotes), 0);
          const index = performance(cpu, gpu, settings);
          const score = index * (50000 / price) ** (settings.cost / 100)
            * (300 / watts) ** (settings.power / 100);
          builds.push({
            id: [cpu.id, gpu.id, board.id].join("/"), cpu, gpu, board, parts,
            price, watts, index, score, value: index / (price / 1000), efficiency: index / watts,
          });
        }
      }
    }
    return builds;
  }

  function dominates(a, b) {
    return a.price <= b.price && a.watts <= b.watts && a.index >= b.index
      && (a.price < b.price || a.watts < b.watts || a.index > b.index);
  }

  function compare(a, b) {
    return b.score - a.score || a.price - b.price || a.watts - b.watts || a.id.localeCompare(b.id);
  }

  function selectBuilds(data, settings, quotes = {}) {
    const candidates = buildCandidates(data, settings, quotes);
    const feasible = candidates.filter(build => build.price <= settings.budget && build.watts <= settings.cap);
    const sorted = feasible.sort(compare);
    const frontier = sorted.filter(build => !sorted.some(other => dominates(other, build)));
    const winner = frontier[0];
    const shortlist = [];
    const add = (label, build) => {
      if (build && build.id !== winner?.id && !shortlist.some(item => item.build.id === build.id)) {
        shortlist.push({ label, build });
      }
    };
    add("同條件最省預算", [...frontier].sort((a, b) => a.price - b.price || compare(a, b))[0]);
    add("同條件最低估算功耗", [...frontier].sort((a, b) => a.watts - b.watts || compare(a, b))[0]);
    add("同預算最高效能", [...frontier].sort((a, b) => b.index - a.index || compare(a, b))[0]);
    add("次佳平衡", frontier[1]);
    const cheapest = [...candidates].sort((a, b) => a.price - b.price || compare(a, b));
    const minimumPrice = cheapest.find(build => build.watts <= settings.cap)?.price;
    const underBudget = candidates.filter(build => build.price <= settings.budget);
    const minimumWatts = underBudget.length ? Math.min(...underBudget.map(build => build.watts)) : undefined;
    return { sorted, frontier, winner, shortlist, candidates, minimumPrice, minimumWatts,
      absoluteMinimum: cheapest[0]?.price };
  }

  function ownership(build, years, hours, rate) {
    const annualEnergy = build.watts * hours * 365 / 1000;
    const electricity = annualEnergy * years * rate;
    return { annualEnergy, electricity, total: build.price + electricity };
  }

  function budgetCurve(candidates, settings, budgets) {
    const eligible = candidates.filter(build => build.watts <= settings.cap)
      .sort((a, b) => b.index - a.index || a.price - b.price || a.watts - b.watts);
    return [...new Set(budgets)].sort((a, b) => a - b).map(budget => ({
      budget,
      build: eligible.find(build => build.price <= budget),
    }));
  }

  return { ownership, budgetCurve, defaults, presets, effectivePrice, isCompatible, performance, buildCandidates, selectBuilds };
})();

if (typeof module !== "undefined") module.exports = SweetModel;
