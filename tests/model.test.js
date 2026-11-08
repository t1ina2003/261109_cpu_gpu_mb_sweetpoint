"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const data = require("../docs/data");
const model = require("../docs/model");
const scenario = overrides => ({ ...model.defaults, ...overrides });

test("all presets yield compatible eight-part builds within their constraints", () => {
  for (const settings of Object.values(model.presets)) {
    const { winner } = model.selectBuilds(data, settings);
    assert.ok(winner);
    assert.ok(winner.price <= settings.budget);
    assert.ok(winner.watts <= settings.cap);
    assert.ok(model.isCompatible(winner.cpu, winner.board));
    assert.equal(winner.parts.length, 8);
    assert.equal(winner.price, winner.parts.reduce((total, part) => total + part.price, 0));
  }
});

test("a stricter power cap changes the recommendation while preserving budget", () => {
  const { winner: original } = model.selectBuilds(data, model.defaults);
  const { winner } = model.selectBuilds(data, scenario({ cap: 400 }));
  assert.ok(original.watts > 400);
  assert.ok(winner.watts <= 400);
  assert.notEqual(winner.id, original.id);
});

test("board, VRAM and CUDA requirements filter combinations", () => {
  const candidates = model.buildCandidates(data, scenario({ board: "b860tuf", vram: 16, cuda: true }));
  assert.ok(candidates.length);
  assert.ok(candidates.every(build => build.cpu.platform === "LGA1851"
    && build.board.id === "b860tuf" && build.gpu.vram >= 16 && build.gpu.cuda));
  assert.equal(model.selectBuilds(data, scenario({ board: "b860tuf", cpu: "7700" })).winner, undefined);
});

test("assembly price, retail fallback and custom price apply exactly once", () => {
  const prices = { cpu: "7500f", gpu: "9070gre", board: "b650msi" };
  const [deal] = model.buildCandidates(data, scenario(prices));
  const [retail] = model.buildCandidates(data, scenario({ ...prices, bundle: false }));
  const [quote] = model.buildCandidates(data, scenario(prices), { "9070gre": 20000 });
  assert.equal(deal.gpu.price, 18990);
  assert.equal(retail.gpu.price, 21490);
  assert.equal(quote.price - deal.price, 1010);
  assert.equal(retail.price - deal.price, 2500);
  assert.equal(model.buildCandidates(data, scenario({ gpu: "5070ti", bundle: false })).length, 0);
});

test("recommendation is on the three-objective frontier", () => {
  const { winner, sorted, frontier } = model.selectBuilds(data, model.defaults);
  assert.ok(frontier.includes(winner));
  assert.ok(frontier.length < sorted.length);
  assert.ok(frontier.every(build => !sorted.some(other => other.price <= build.price
    && other.watts <= build.watts && other.index >= build.index
    && (other.price < build.price || other.watts < build.watts || other.index > build.index))));
});

test("normalization is fixed at 100 across resolutions and work/game weights", () => {
  const cpu = data.cpus.find(part => part.id === "9700x");
  const gpu = data.gpus.find(part => part.id === "5070");
  for (const resolution of [0, 1, 2]) {
    for (const game of [0, 60, 100]) {
      assert.equal(model.performance(cpu, gpu, scenario({ resolution, game })), 100);
    }
  }
});

test("impossible budget exposes the minimum cost for the selected conditions", () => {
  const result = model.selectBuilds(data, scenario({ budget: 1 }));
  assert.equal(result.winner, undefined);
  assert.ok(result.minimumPrice > 1);
  assert.equal(result.minimumWatts, undefined);
});
