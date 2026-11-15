/**
 * RECORDED RUN — snapshot TEREKAM dari run testnet nyata (14 Nov 2026).
 *
 * File ini DULU berisi data mock buatan (alamat 0x0000...000A, tx
 * 0x1111..., latensi contoh 31 dtk). Sejak live wiring 14 Nov 2026, SEMUA
 * nilai di sini adalah HASIL UKUR NYATA dari deploy + uji loop testnet
 * (sumber: ../deploy-log.md dan ../VERIFICATION.md — terverifikasi
 * on-chain via cast code/receipt/block).
 *
 * Arti `isMock: true` di file ini SUDAH BERUBAH: flag itu sekarang berarti
 * "STATIC SNAPSHOT — tidak di-poll live", BUKAN "data karangan". Nilainya
 * sendiri nyata: alamat deploy, tx hash, stempel blok, gas, dan saldo
 * semuanya hasil ukur. Badge UI yang dulu "MOCK — DEMO DATA" kini
 * "RECORDED RUN — TESTNET".
 *
 * Skenario utama: incident #1 (design.md §3.7, skenario 1 deploy):
 *   emergencyPause (A, Unichain) -> react() (Lasna) -> callback pause() B
 *   (Base) -> callback pause() C (Unichain) -> CONTAINED -> deposit() revert.
 *
 * Reason bytes32 adalah keccak256("EXPLOIT-00N") — BUKAN ASCII-padded:
 *   EXPLOIT-001 = 0x7f0eaae48c946e791c889b5c394c39018598b2bfa392aa8825a7f0ee88240dd1
 *   EXPLOIT-002 = 0xcc3f99d8958521c31a89269c92baa437a7b04c96131de05b71f2eaecfa515101
 *   EXPLOIT-003 = 0xa9d235545ea9e17c71763092be500d21e363ad4f222323a4edb78a5fae5b5c0e
 * (dihitung programatis, terverifikasi dari log EmergencyPaused on-chain).
 *
 * LATENSI (UKUR NYATA, stempel blok, granularitas 1 dtk; jam antar-chain
 * bisa selisih ±1 dtk):
 *   T0  = 1794668458 (2026-11-14 22:01:01 WIB, trip di Unichain, blok 67816030)
 *   T1  = 1794668458 (+0 dtk, react di Lasna, blok 8335436)
 *   T2a = 1794668460 (+2 dtk, callback pause B di Base, blok 58732960)
 *   T2b = 1794668461 (+3 dtk, callback pause C di Unichain, blok 67816033)
 *   Loop penuh = 3,0 dtk; CONTAINED setelah 2 dtk (blok Lasna 8335438).
 *   Gas: trip 29.913; react 349.263; callback B 78.314; callback C 78.304.
 */

import type {
  DashboardMockState,
  FundingHealth,
  Incident,
  LatencyMetrics,
  Sibling,
  TimelineStep,
} from "./types";

export const REASON_EXPLOIT =
  "0x7f0eaae48c946e791c889b5c394c39018598b2bfa392aa8825a7f0ee88240dd1" as const;
export const REASON_EXPLOIT_LABEL = "EXPLOIT-001" as const;

/** keccak256("EXPLOIT-002") — dipakai incident riwayat #2. */
export const REASON_EXPLOIT_002 =
  "0xcc3f99d8958521c31a89269c92baa437a7b04c96131de05b71f2eaecfa515101" as const;
/** keccak256("EXPLOIT-003") — dipakai incident riwayat #3. */
export const REASON_EXPLOIT_003 =
  "0xa9d235545ea9e17c71763092be500d21e363ad4f222323a4edb78a5fae5b5c0e" as const;

export const RECORDED_SIBLING_A_ADDRESS =
  "0xb18A213bfa8c1888af39AF100d7dd54Aa376F7b5" as const;
export const RECORDED_SIBLING_B_ADDRESS =
  "0xa7e3ceb5686f8d3b03e688efdc6a5a64ed80ca4a" as const;
export const RECORDED_SIBLING_C_ADDRESS =
  "0xb07a380104ac093485566cfc964540b04518b354" as const;
export const RECORDED_WATCHER_ADDRESS =
  "0xb18a213bfa8c1888af39af100d7dd54aa376f7b5" as const;

/* ------------------------------------------------------------------ */
/* Sibling — keadaan saat incident #1 aktif (A/B/C semua PAUSED)      */
/* Saldo = saat trip (A/B didanai 0,02 ETH; C 0,00045). totalDeposited */
/* = 0 saat trip — deposit uji baru terjadi di skenario 5 (setelah     */
/* unpause).                                                           */
/* ------------------------------------------------------------------ */

export const RECORDED_SIBLINGS_PAUSED: Sibling[] = [
  {
    id: "A",
    label: "A — Origin",
    role: "ORIGIN",
    chainId: 1301,
    chainName: "Unichain Sepolia",
    address: RECORDED_SIBLING_A_ADDRESS,
    explorerUrl: "https://sepolia.uniscan.xyz",
    status: "PAUSED",
    pausedAt: 1794668458,
    balanceEth: "0.02",
    totalDepositedEth: "0",
    reservesEth: "0.02",
    debtEth: "0",
    isMock: true,
  },
  {
    id: "B",
    label: "B — Sibling",
    role: "SIBLING",
    chainId: 84532,
    chainName: "Base Sepolia",
    address: RECORDED_SIBLING_B_ADDRESS,
    explorerUrl: "https://sepolia.basescan.org",
    status: "PAUSED",
    pausedAt: 1794668460,
    balanceEth: "0.02",
    totalDepositedEth: "0",
    reservesEth: "0.02",
    debtEth: "0",
    isMock: true,
  },
  {
    id: "C",
    label: "C — Sibling",
    role: "SIBLING",
    chainId: 1301,
    chainName: "Unichain Sepolia",
    address: RECORDED_SIBLING_C_ADDRESS,
    explorerUrl: "https://sepolia.uniscan.xyz",
    status: "PAUSED",
    pausedAt: 1794668461,
    balanceEth: "0.00045",
    totalDepositedEth: "0",
    reservesEth: "0.00045",
    debtEth: "0",
    isMock: true,
  },
];

/* ------------------------------------------------------------------ */
/* Sibling — keadaan tenang (semua ACTIVE, tidak ada incident)         */
/* Saldo + totalDeposited = nilai TERUKUR via cast sesaat sebelum      */
/* live wiring (A 0,02045/0,0002; B 0,02010/0,0001; C 0,00045/0,0002).  */
/* ------------------------------------------------------------------ */

export const RECORDED_SIBLINGS_ACTIVE: Sibling[] = [
  { ...RECORDED_SIBLINGS_PAUSED[0], status: "ACTIVE" as const, pausedAt: null, balanceEth: "0.02045", totalDepositedEth: "0.0002", reservesEth: "0.02045" },
  { ...RECORDED_SIBLINGS_PAUSED[1], status: "ACTIVE" as const, pausedAt: null, balanceEth: "0.02010", totalDepositedEth: "0.0001", reservesEth: "0.02010" },
  { ...RECORDED_SIBLINGS_PAUSED[2], status: "ACTIVE" as const, pausedAt: null, balanceEth: "0.00045", totalDepositedEth: "0.0002", reservesEth: "0.00045" },
];

/* ------------------------------------------------------------------ */
/* Incident #1 (CONTAINED) — skenario 1 deploy, 14 Nov 2026           */
/* ------------------------------------------------------------------ */

export const RECORDED_ACTIVE_INCIDENT: Incident = {
  id: "incident-2026-11-14-1",
  originSiblingId: "A",
  originAddress: RECORDED_SIBLING_A_ADDRESS,
  originChainId: 1301,
  reason: REASON_EXPLOIT,
  reasonLabel: REASON_EXPLOIT_LABEL,
  trippedAt: 1794668458,
  status: "CONTAINED",
  confirmedCount: 2,
  confirmedTotal: 2,
  confirmedSiblings: ["B", "C"],
  pendingSiblings: [],
  emergencyPauseTxHash:
    "0xe9f11b6df0c2e2f8efc7929cce4aa0b7910e094c6defc18e1f59ddea427e2257",
  containedInSeconds: 3,
  isMock: true,
};

/* ------------------------------------------------------------------ */
/* Timeline 4 langkah — tx hash + stempel + gas UKUR NYATA             */
/* ------------------------------------------------------------------ */

export const RECORDED_TIMELINE: TimelineStep[] = [
  {
    step: 1,
    label: "EmergencyPaused — trigger",
    description:
      "Vault A owner calls emergencyPause(EXPLOIT-001); A pauses itself.",
    chainId: 1301,
    chainName: "Unichain Sepolia",
    explorerUrl: "https://sepolia.uniscan.xyz",
    txHash:
      "0xe9f11b6df0c2e2f8efc7929cce4aa0b7910e094c6defc18e1f59ddea427e2257",
    blockTimestamp: 1794668458,
    deltaSecondsFromPrev: null,
    status: "done",
    gasUsed: 29913,
    gasLimit: null,
    isMock: true,
  },
  {
    step: 2,
    label: "react() — watcher Lasna",
    description:
      "Watcher records the incident and requests 2 pause() callbacks (fan-out).",
    chainId: 5318007,
    chainName: "Lasna",
    explorerUrl: "https://lasna.reactscan.net",
    txHash:
      "0x98dd6dad4b360201ebae842be7280ee0da47051dd4607b6cafac6ef73f21293a",
    blockTimestamp: 1794668458,
    deltaSecondsFromPrev: 0,
    status: "done",
    gasUsed: 349263,
    gasLimit: 900000,
    isMock: true,
  },
  {
    step: 3,
    label: "Callback pause() B",
    description: "Callback via proxy Base Sepolia; B paused, emit Paused.",
    chainId: 84532,
    chainName: "Base Sepolia",
    explorerUrl: "https://sepolia.basescan.org",
    txHash:
      "0xe84c258d1ebc313c7fe19f016bfa0805ba28fe93dd61811e4544627b734c506b",
    blockTimestamp: 1794668460,
    deltaSecondsFromPrev: 2,
    status: "done",
    gasUsed: 78314,
    gasLimit: 200000,
    isMock: true,
  },
  {
    step: 4,
    label: "Callback pause() C",
    description: "Callback via proxy Unichain Sepolia; C paused, emit Paused.",
    chainId: 1301,
    chainName: "Unichain Sepolia",
    explorerUrl: "https://sepolia.uniscan.xyz",
    txHash:
      "0x60e534047a2e279cf8c3c9dcacc21d949ed396f773a6e9f82c1c8eab444e5912",
    blockTimestamp: 1794668461,
    deltaSecondsFromPrev: 1,
    status: "done",
    gasUsed: 78304,
    gasLimit: 200000,
    isMock: true,
  },
];

/* ------------------------------------------------------------------ */
/* Latensi — UKUR NYATA (cek: 0 + 2 + 1 = 3)                          */
/* ------------------------------------------------------------------ */

export const RECORDED_LATENCY: LatencyMetrics = {
  t0: 1794668458,
  t1: 1794668458,
  t2a: 1794668460,
  t2b: 1794668461,
  eventToReactSeconds: 0,
  reactToCallbackBaseSeconds: 2,
  reactToCallbackUnichainSeconds: 3,
  legBaseSeconds: 2,
  legUnichainSeconds: 3,
  fullLoopSeconds: 3,
  gasReact: 349263,
  gasReactLimit: 900000,
  gasCallbackBase: 78314,
  gasCallbackUnichain: 78304,
  gasCallbackLimit: 200000,
  isMock: true,
};

/* ------------------------------------------------------------------ */
/* Riwayat incident — 3 incident NYATA, semua CONTAINED                */
/* #2: trip blok 67816497 (ts 1794668925), containment Lasna 8335875   */
/* (ts 1794668926) = 1 dtk. #3: trip 1794668984, containment via      */
/* retry manual 1794669589 = 605 dtk — angka ini TERMASUK stall        */
/* terekayasa + retry manual, BUKAN latensi loop (lihat VERIFICATION.md). */
/* ------------------------------------------------------------------ */

export const RECORDED_INCIDENT_HISTORY: Incident[] = [
  {
    id: "incident-2026-11-14-1",
    originSiblingId: "A",
    originAddress: RECORDED_SIBLING_A_ADDRESS,
    originChainId: 1301,
    reason: REASON_EXPLOIT,
    reasonLabel: REASON_EXPLOIT_LABEL,
    trippedAt: 1794668458,
    status: "CONTAINED",
    confirmedCount: 2,
    confirmedTotal: 2,
    confirmedSiblings: ["B", "C"],
    pendingSiblings: [],
    emergencyPauseTxHash:
      "0xe9f11b6df0c2e2f8efc7929cce4aa0b7910e094c6defc18e1f59ddea427e2257",
    containedInSeconds: 3,
    isMock: true,
  },
  {
    id: "incident-2026-11-14-2",
    originSiblingId: "A",
    originAddress: RECORDED_SIBLING_A_ADDRESS,
    originChainId: 1301,
    reason: REASON_EXPLOIT_002,
    reasonLabel: "EXPLOIT-002",
    trippedAt: 1794668925,
    status: "CONTAINED",
    confirmedCount: 2,
    confirmedTotal: 2,
    confirmedSiblings: ["B", "C"],
    pendingSiblings: [],
    emergencyPauseTxHash:
      "0x9f28948126ba3a025fbb1270f5e3b30e73cc56d15ae76c80fd92e6bf7e540051",
    containedInSeconds: 1,
    isMock: true,
  },
  {
    id: "incident-2026-11-14-3",
    originSiblingId: "A",
    originAddress: RECORDED_SIBLING_A_ADDRESS,
    originChainId: 1301,
    reason: REASON_EXPLOIT_003,
    reasonLabel: "EXPLOIT-003",
    trippedAt: 1794668984,
    status: "CONTAINED",
    confirmedCount: 2,
    confirmedTotal: 2,
    confirmedSiblings: ["B", "C"],
    pendingSiblings: [],
    emergencyPauseTxHash:
      "0xa9c1ed92ef8be00e84796e97284a371297827755f369db59531ddda084f3d44b",
    containedInSeconds: 605,
    isMock: true,
  },
];

/* ------------------------------------------------------------------ */
/* Kesehatan pendanaan — nilai TERUKUR akhir deploy (14 Nov 2026)      */
/* Watcher "reserves" = SALDO lREACT kontrak (1,2437). SYSTEM          */
/* reserves(watcher) terbaca 0 — transfer langsung hanya menaikkan      */
/* balance, bukan reserves (tidak ada depositTo di lib v0.1.0); react() */
/* menagih via saldo kontrak, jadi balance yang jadi metrik gating.    */
/* ------------------------------------------------------------------ */

export const RECORDED_FUNDING: FundingHealth = {
  watcher: {
    reservesLreact: "1.2437",
    debtLreact: "0",
    status: "active",
  },
  siblings: [
    { siblingId: "A", reservesEth: "0.02045", debtEth: "0" },
    { siblingId: "B", reservesEth: "0.02010", debtEth: "0" },
    { siblingId: "C", reservesEth: "0.00045", debtEth: "0" },
  ],
  costReference: {
    reactFallthroughLreact: "0.014",
    reactWithCallbackLreact: "0.03-0.045",
    deployWatcherLreact: "0.28",
    fullLoopLreact: "0.10-0.11",
    callbackBaseEth: "0.00000061",
  },
  warning: null,
  isMock: true,
};

/* ------------------------------------------------------------------ */
/* Skenario lengkap                                                    */
/* ------------------------------------------------------------------ */

/** Skenario incident aktif — rekaman incident #1 (design.md §3.7). */
export const ACTIVE_INCIDENT_SCENARIO: DashboardMockState = {
  scenario: "active-incident",
  siblings: RECORDED_SIBLINGS_PAUSED,
  activeIncident: RECORDED_ACTIVE_INCIDENT,
  timeline: RECORDED_TIMELINE,
  latency: RECORDED_LATENCY,
  funding: RECORDED_FUNDING,
  incidentHistory: RECORDED_INCIDENT_HISTORY,
  freezeProof: {
    description:
      "deposit() on vault B after the pause — reverts; funds frozen (Base Sepolia block 58733692, failed status).",
    siblingId: "B",
    txHash:
      "0x47c8e697935b07f03114277ae0f526d1f52e6e10240a631bc048e889ae03db76",
    chainId: 84532,
    explorerUrl: "https://sepolia.basescan.org",
    reverted: true,
    isMock: true,
  },
  isMock: true,
};

/** Keadaan tenang — tidak ada incident: semua ACTIVE, timeline kosong. */
export const CALM_STATE: DashboardMockState = {
  scenario: "calm",
  siblings: RECORDED_SIBLINGS_ACTIVE,
  activeIncident: null,
  timeline: [],
  latency: null,
  funding: RECORDED_FUNDING,
  incidentHistory: RECORDED_INCIDENT_HISTORY,
  freezeProof: null,
  isMock: true,
};

/* ------------------------------------------------------------------ */
/* Alias lama (nama MOCK_*) — dipertahankan supaya impor lama tidak    */
/* patah; semuanya menunjuk ke data TEREKAM yang sama di atas.         */
/* ------------------------------------------------------------------ */

export const MOCK_SIBLING_A_ADDRESS = RECORDED_SIBLING_A_ADDRESS;
export const MOCK_SIBLING_B_ADDRESS = RECORDED_SIBLING_B_ADDRESS;
export const MOCK_SIBLING_C_ADDRESS = RECORDED_SIBLING_C_ADDRESS;
export const MOCK_WATCHER_ADDRESS = RECORDED_WATCHER_ADDRESS;
export const MOCK_SIBLINGS_PAUSED = RECORDED_SIBLINGS_PAUSED;
export const MOCK_SIBLINGS_ACTIVE = RECORDED_SIBLINGS_ACTIVE;
export const MOCK_ACTIVE_INCIDENT = RECORDED_ACTIVE_INCIDENT;
export const MOCK_TIMELINE = RECORDED_TIMELINE;
export const MOCK_LATENCY = RECORDED_LATENCY;
export const MOCK_INCIDENT_HISTORY = RECORDED_INCIDENT_HISTORY;
export const MOCK_FUNDING = RECORDED_FUNDING;
