"use strict";

const SweetData = (() => {
  const tracker = "https://troywhitetw.github.io/coolpc-crawler/c/";
  const source = (name, url) => ({ name, url });
  const sources = {
    cpu: source("原價屋報價快照｜CPU", tracker + "cpu.html"),
    gpu: source("原價屋報價快照｜顯示卡", tracker + "vga.html"),
    board: source("原價屋報價快照｜主機板", tracker + "motherboard.html"),
    ram: source("原價屋報價快照｜記憶體", tracker + "ram.html"),
    ssd: source("原價屋報價快照｜SSD", tracker + "ssd.html"),
    cooler: source("原價屋報價快照｜空冷散熱", tracker + "cooler.html"),
    liquid: source("原價屋報價快照｜水冷散熱", tracker + "liquid-cooling.html"),
    case: source("原價屋報價快照｜機殼", tracker + "case.html"),
    psu: source("原價屋報價快照｜電源", tracker + "psu.html"),
    promo: source("原價屋雙 11 活動標價（個別品項另有活動條件）", "https://www.coolpc.com.tw/tw/timeline/coolpc-shopee1111-2026/"),
    cpuGame: source("Tweakers｜CPU 遊戲指數 2026-1", "https://tweakers.net/best-buy-guide/processors/beste-gaming-processor"),
    cpuWork: source("Tweakers｜CPU 生產力指數 2026-2", "https://tweakers.net/best-buy-guide/processors/beste-productiviteit-processor"),
    cpuPower: source("Tweakers｜Cinebench 26 多核、CPU 供電功耗", "https://tweakers.net/best-buy-guide/processors/benchmarks"),
    gpuFps: source("Tom’s Hardware｜2026 GPU Hierarchy 原生光柵／光追 FPS", "https://www.tomshardware.com/reviews/gpu-hierarchy%2C4388.html"),
    gpuPower: source("Tweakers｜Cyberpunk 2077 Ultra GPU 功耗與 FPS/W", "https://tweakers.net/best-buy-guide/videokaarten/benchmarks"),
    gpu5050: source("ComputerBase｜RTX 5050 遊戲功耗實測", "https://www.computerbase.de/artikel/grafikkarten/nvidia-geforce-rtx-5050-test.93679/seite-7"),
    msiSupport: source("MSI｜B650M GAMING PLUS WIFI CPU 支援與 BIOS", "https://www.msi.com/Motherboard/B650M-GAMING-PLUS-WIFI/support"),
    am5Support: source("ASUS｜TUF B650M-PLUS WIFI CPU 支援", "https://www.asus.com/motherboards-components/motherboards/tuf-gaming/tuf-gaming-b650m-plus-wifi/helpdesk_qvl_cpu/"),
    intelSupport: source("ASUS｜TUF B860M-PLUS WIFI CPU 支援", "https://www.asus.com/tw/motherboards-components/motherboards/tuf-gaming/tuf-gaming-b860m-plus-wifi/helpdesk_qvl_cpu/"),
  };

  const part = (id, name, price, source, details = {}) => ({ id, name, price, source, ...details });
  const cpu = (id, name, platform, price, game, work, cine, watts, cooler, details) =>
    part(id, name, price, "cpu", { platform, game, work, cine, watts, cooler, ...details });

  const cpus = [
    cpu("7500f", "Ryzen 5 7500F", "AM5", 4890, 154.4, 132.8, 3407, 95.55, "stock", { sku: "Ryzen 5 7500F MPK" }),
    cpu("7700", "Ryzen 7 7700", "AM5", 7290, 173.8, 168.1, 4519, 100.76, "stock", { sku: "Ryzen 7 7700 MPK" }),
    cpu("7800x3d", "Ryzen 7 7800X3D", "AM5", 10290, 204.6, 167.5, 4501, 100.22, "tower", { sku: "Ryzen 7 7800X3D Tray（三年保）" }),
    cpu("9600x", "Ryzen 5 9600X", "AM5", 8150, 179.9, 167.5, 4051, 99.40, "tower"),
    cpu("9700x", "Ryzen 7 9700X", "AM5", 11550, 187.3, 197.3, 5016, 100.64, "tower"),
    cpu("9800x3d", "Ryzen 7 9800X3D", "AM5", 15000, 221.3, 221.5, 5550, 166.67, "dual"),
    cpu("9850x3d", "Ryzen 7 9850X3D", "AM5", 17050, 224.7, 230, 5722, 157.53, "dual"),
    cpu("9900x", "Ryzen 9 9900X", "AM5", 14450, 186.4, 285.5, 7524, 187.68, "dual", { heavy: true }),
    cpu("9900x3d", "Ryzen 9 9900X3D", "AM5", 20450, 212.8, 291.5, 7687, 178.99, "dual", { heavy: true }),
    cpu("9950x", "Ryzen 9 9950X", "AM5", 20350, 191.1, 351.5, 9442, 232.68, "aio", { heavy: true }),
    cpu("9950x3d", "Ryzen 9 9950X3D", "AM5", 23950, 218.4, 362.3, 9916, 232.55, "aio", { heavy: true }),
    cpu("9950x3d2", "Ryzen 9 9950X3D2", "AM5", 31450, 220.7, 374.5, 10315, 275.89, "aio", { heavy: true }),
    cpu("225f", "Core Ultra 5 225F", "LGA1851", 4880, 163.5, 135.8, 3825, 73.95, "tower"),
    cpu("245k", "Core Ultra 5 245K", "LGA1851", 6650, 178.8, 189.2, 5866, 148.13, "dual"),
    cpu("250k", "Core Ultra 5 250K Plus", "LGA1851", 7150, 193.2, 230, 7464, 168.09, "dual"),
    cpu("265k", "Core Ultra 7 265K", "LGA1851", 10700, 187.7, 247, 8202, 198.23, "dual", { heavy: true, source: "promo" }),
    cpu("270k", "Core Ultra 7 270K Plus", "LGA1851", 11500, 198, 297.8, 10163, 263.63, "aio", { heavy: true }),
    cpu("285k", "Core Ultra 9 285K", "LGA1851", 21500, 191.2, 281.9, 9751, 255.56, "aio", { heavy: true }),
  ];

  const gpu = (id, name, sku, price, vram, raster, ray, watts, cyber, psu, details) =>
    part(id, name, price, "gpu", { sku, vram, raster, ray, watts, cyber, psu, cuda: name.startsWith("RTX"), ...details });

  const gpus = [
    gpu("5050", "RTX 5050", "INNO3D RTX 5050 TWIN X2", 12888, 8, [69.3,45.2,17], [31.2,18.7,6.2], 130, null, 550, { powerNote: "ComputerBase《Star Wars Outlaws》" }),
    gpu("5060", "RTX 5060", "ASUS DUAL RTX 5060 O8G A", 16290, 8, [88.5,59.8,21.8], [40.9,24.6,6.8], 138.60, 0.49, 550),
    gpu("5060ti8", "RTX 5060 Ti 8GB", "INNO3D RTX 5060 Ti 8GB TWIN X2", 19488, 8, [100.4,68.6,28.1], [46,26.6,7.2], 155.84, 0.50, 600),
    gpu("5060ti16", "RTX 5060 Ti 16GB", "ASUS DUAL RTX 5060 Ti O16G", 25590, 16, [105.2,73.4,40.2], [56.2,38.9,20.6], 158.11, 0.50, 600),
    gpu("5070", "RTX 5070", "MSI RTX 5070 12G VENTUS 2X OC", 31500, 12, [132.6,96.4,54.3], [74.1,51.5,22.7], 245.53, 0.43, 650),
    gpu("5070ti", "RTX 5070 Ti", "ASUS PRIME RTX 5070 Ti O16G", 45990, 16, [155.4,116.8,68.6], [90.4,66.2,36.7], 289.14, 0.45, 750, { bundle: true }),
    gpu("5080", "RTX 5080", "ZOTAC RTX 5080 SOLID OC White Edition", 65990, 16, [166.9,128.3,77.4], [98.3,74,42.1], 324.20, null, 850, { bundle: true, powerNote: "4K Ultra" }),
    gpu("9060xt8", "RX 9060 XT 8GB", "GIGABYTE RX 9060 XT GAMING OC 8G", 17890, 8, [93.2,62.5,29.7], [33,20.2,7.3], 132.78, null, 500),
    gpu("9060xt16", "RX 9060 XT 16GB", "ASRock RX 9060 XT Challenger 16GB OC", 19490, 16, [98.3,67.3,35.2], [45.3,31,14.9], 147.70, 0.50, 550),
    gpu("9070gre", "RX 9070 GRE", "Sapphire PULSE RX 9070 GRE GAMING 12GB", 21490, 12, [120.6,86.6,46.3], [58.4,37.3,15.5], 213.71, 0.45, 650, { deal: { price: 18990, sku: "ASUS ATS RX 9070 GRE O12G" } }),
    gpu("9070", "RX 9070", "ASUS PRIME RX 9070 O16G EVO", 26000, 16, [140.9,104,57.7], [67.6,47.6,25.8], 208.79, 0.55, 650),
    gpu("9070xt", "RX 9070 XT", "ASRock RX 9070 XT Challenger 16GB", 29890, 16, [156.6,116.5,65.8], [77.8,55.5,30.1], 322.19, 0.45, 750),
  ];

  const boards = [
    part("b650msi", "MSI B650M GAMING PLUS WIFI", 4390, "board", { platform: "AM5" }),
    part("b650tuf", "ASUS TUF GAMING B650M-PLUS WIFI", 4690, "board", { platform: "AM5", heavy: true }),
    part("b850tuf", "ASUS TUF GAMING B850M-PLUS WIFI7", 6990, "board", { platform: "AM5", heavy: true }),
    part("b860tuf", "ASUS TUF GAMING B860M-PLUS WIFI", 6490, "board", { platform: "LGA1851", heavy: true }),
  ];
  const ram = [
    part("ram16", "UMAX DDR5-5600 16GB ×1", 7300, "ram", { label: "16 GB · 單條" }),
    part("ram32", "UMAX DDR5-5600 16GB ×2", 14500, "ram", { label: "32 GB · 雙通道" }),
    part("ram64", "UMAX DDR5-5600 32GB ×2", 29500, "ram", { label: "64 GB · 雙通道" }),
  ];
  const ssd = [
    part("ssd1", "致態小翼 e7 1TB Gen4 QLC", 4799, "ssd", { label: "1 TB · QLC" }),
    part("ssd2", "致態 Ti600 2TB Gen4 QLC", 7999, "ssd", { label: "2 TB · QLC" }),
    part("ssd2tlc", "WD Black SN850X 2TB Gen4 TLC", 12111, "ssd", { label: "2 TB · TLC" }),
  ];
  const coolers = {
    stock: part("stock", "CPU 隨附風扇", 0, "cpu"),
    tower: part("tower", "Thermalright Assassin King 120 SE", 690, "cooler"),
    dual: part("dual", "Thermalright Peerless Assassin 120 V3", 1190, "cooler"),
    aio: part("aio", "MSI MAG CoreLiquid A13 360 黑", 2990, "liquid"),
  };
  const psus = [
    part("psu650", "ASUS TUF GAMING 650W Gold EVO ATX 3.1", 2790, "psu", { capacity: 650 }),
    part("psu750", "Seasonic FOCUS GX-750 ATX 3.1", 3790, "psu", { capacity: 750 }),
    part("psu850", "Seasonic FOCUS GX-850 ATX 3.1", 4290, "psu", { capacity: 850 }),
    part("psu1000", "Seasonic FOCUS GX-1000 ATX 3.1", 5490, "psu", { capacity: 1000 }),
  ];

  return { sources, cpus, gpus, boards, ram, ssd, coolers, psus,
    case: part("case", "Montech AIR 903 BASE 黑", 1590, "case") };
})();

if (typeof module !== "undefined") module.exports = SweetData;
