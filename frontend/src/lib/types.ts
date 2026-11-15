/**
 * ContagionStop — TypeScript types for the dashboard (LIVE).
 *
 * These types are the shared contract between `mock-data.ts` (data) and the
 * dashboard components. When the data shape changes, update the types here
 * first, then adjust the data to match.
 *
 * All timestamps are UNIX timestamps (seconds, UTC). All latency values are
 * seconds with 1 decimal. All addresses/tx hashes are `0x...` hex strings
 * (real deployed addresses, testnet).
 */

export type ChainId = 1301 | 84532 | 5318007;

export type SiblingId = "A" | "B" | "C";

export type SiblingRole = "ORIGIN" | "SIBLING";

export type SiblingStatus = "ACTIVE" | "PAUSED";

export interface Sibling {
  /** "A" = origin, "B"/"C" = sibling tujuan. */
  id: SiblingId;
  /** Label kartu, mis. "A — Origin". */
  label: string;
  role: SiblingRole;
  chainId: ChainId;
  chainName: string;
  /** Alamat kontrak vault (alamat deploy nyata, testnet). */
  address: string;
  explorerUrl: string;
  status: SiblingStatus;
  /** Block timestamp saat `Paused` ter-emit; `null` bila ACTIVE. */
  pausedAt: number | null;
  /** Saldo ETH vault (mock: string desimal, mis. "0.02"). */
  balanceEth: string;
  /** `totalDeposited()` — ETH deposit tercatat (bukan fee funding). */
  totalDepositedEth: string;
  /** "Reserves" = saldo ETH untuk fee callback (tidak ada `reserves()` on-chain). */
  reservesEth: string;
  /** Utang callback — dibaca dari system contract/proxy, BUKAN dari vault. */
  debtEth: string;
  /** `true` = static snapshot (data terekam, bukan live-polling). */
  isMock: boolean;
}

export type IncidentStatus = "ACTIVE" | "CONTAINED";

export interface Incident {
  id: string;
  originSiblingId: SiblingId;
  originAddress: string;
  originChainId: ChainId;
  /** Reason bytes32 hex, mis. `0x4558504c4f4954...` untuk "EXPLOIT". */
  reason: string;
  /** Label manusia untuk reason, mis. "EXPLOIT". */
  reasonLabel: string;
  /** `trippedAt` watcher (block.timestamp Lasna saat trip dicatat). */
  trippedAt: number;
  status: IncidentStatus;
  /** Sibling tujuan yang sudah confirmed paused (tidak termasuk origin). */
  confirmedCount: number;
  /** Jumlah sibling tujuan yang harus confirmed (demo: 2). */
  confirmedTotal: number;
  confirmedSiblings: SiblingId[];
  pendingSiblings: SiblingId[];
  emergencyPauseTxHash: string;
  /** Durasi trip -> CONTAINED (detik); `null` bila masih ACTIVE. */
  containedInSeconds: number | null;
  isMock: boolean;
}

export type TimelineStepStatus = "done" | "pending";

export interface TimelineStep {
  step: 1 | 2 | 3 | 4;
  label: string;
  description: string;
  chainId: ChainId;
  chainName: string;
  explorerUrl: string;
  /** Tx hash nyata dari run testnet (tautkan ke explorer). */
  txHash: string;
  /** Block timestamp tx ini; `null` bila langkah belum terjadi. */
  blockTimestamp: number | null;
  /** Selisih dari langkah sebelumnya (detik); `null` untuk langkah 1 / pending. */
  deltaSecondsFromPrev: number | null;
  status: TimelineStepStatus;
  gasUsed: number | null;
  gasLimit: number | null;
  isMock: boolean;
}

export interface LatencyMetrics {
  /** T0 — block timestamp tx `emergencyPause` (Unichain Sepolia). */
  t0: number;
  /** T1 — block timestamp tx `react()` (Lasna). */
  t1: number;
  /** T2a — block timestamp callback `pause()` B (Base Sepolia). */
  t2a: number;
  /** T2b — block timestamp callback `pause()` C (Unichain Sepolia). */
  t2b: number;
  /** T1 - T0 (event -> react). */
  eventToReactSeconds: number;
  /** T2a - T1 (react -> callback Base). */
  reactToCallbackBaseSeconds: number;
  /** T2b - T1 (react -> callback Unichain). */
  reactToCallbackUnichainSeconds: number;
  /** T2a - T0 (trip -> B paused). */
  legBaseSeconds: number;
  /** T2b - T0 (trip -> C paused). */
  legUnichainSeconds: number;
  /** max(T2a, T2b) - T0 — metrik utama. */
  fullLoopSeconds: number;
  gasReact: number;
  gasReactLimit: number;
  gasCallbackBase: number;
  gasCallbackUnichain: number;
  gasCallbackLimit: number;
  isMock: boolean;
}

export interface WatcherFunding {
  /** lREACT di watcher (design.md §7c: 0,5 lREACT dipakai). */
  reservesLreact: string;
  debtLreact: string;
  status: "active" | "inactive";
}

export interface SiblingFunding {
  siblingId: SiblingId;
  reservesEth: string;
  debtEth: string;
}

export interface FundingHealth {
  watcher: WatcherFunding;
  siblings: SiblingFunding[];
  /** Angka biaya referensi (terukur, design.md §7c) — bukan angka mock loop ini. */
  costReference: {
    reactFallthroughLreact: string;
    reactWithCallbackLreact: string;
    deployWatcherLreact: string;
    fullLoopLreact: string;
    callbackBaseEth: string;
  };
  /** Peringatan amber bila reserves menipis / debt > 0; `null` bila sehat. */
  warning: string | null;
  isMock: boolean;
}

/** Bukti pembekuan: percobaan `deposit()` pasca-pause yang revert. */
export interface FreezeProof {
  description: string;
  siblingId: SiblingId;
  txHash: string;
  chainId: ChainId;
  explorerUrl: string;
  /** `true` = tx revert (bukti deployment membeku). */
  reverted: boolean;
  isMock: boolean;
}

/** Satu skenario dashboard lengkap (incident aktif ATAU keadaan tenang). */
export interface DashboardMockState {
  /** "active-incident" | "calm" — dipakai komponen untuk memilih hero. */
  scenario: "active-incident" | "calm";
  siblings: Sibling[];
  /** `null` bila tidak ada incident berjalan (keadaan tenang). */
  activeIncident: Incident | null;
  timeline: TimelineStep[];
  latency: LatencyMetrics | null;
  funding: FundingHealth;
  incidentHistory: Incident[];
  freezeProof: FreezeProof | null;
  isMock: boolean;
}
