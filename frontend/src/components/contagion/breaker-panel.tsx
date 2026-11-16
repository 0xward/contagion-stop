'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { stringToHex, type Address } from 'viem';
import {
  useAccount,
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract
} from 'wagmi';
import { Win98Window } from '@/components/win98/win98-window';
import { Icons } from '@/components/icons';
import { useMotionAllowed } from '@/components/terminal/use-motion-allowed';
import ChainSwitchError from '@/components/web3/chain-switch-error';
import WriteErrorNotice from '@/components/web3/write-error-notice';
import { failureOrNull, useChainSwitcher, type SwitchChainFailure } from '@/lib/switch-chain';
import {
  EXPLORERS,
  PUBLIC_V3_CONTRACTS,
  PUBLIC_V3_E2E,
  PUBLIC_V3_WATCHER_BALANCE_AT_HANDOVER_LREACT
} from '@/lib/config';
import { PUBLIC_V3_ABI, PUBLIC_V3_ERC20_ABI } from '@/lib/contracts';
import { cn } from '@/lib/utils';

/**
 * Containment Grid — Breaker Panel.
 *
 * One Win98 machine card: the v3 5-vault set as a circuit-breaker panel.
 * The graph is schematic: idle pulses are a heartbeat diagram, NOT
 * transactions (labelled in the panel). Replay replays the recorded v3
 * E2E run (trip 0xac35… → react Lasna #8419547 → all five vaults
 * paused, CONTAINED, loop 0.1514 lREACT). Live TRIP sends a real trip()
 * on Uni #0 and flips each breaker only when its on-chain paused()
 * confirms it.
 *
 * Honest labels vs the v3 set (2 Uni ETH + 1 Base ETH + USDC Uni +
 * USDC Base): UNI-01 / UNI-02 / BASE-01 / UNI-03 (USDC) / BASE-02 (USDC).
 */

const UNICHAIN_SEPOLIA_CHAIN_ID = 1301;
const BASE_SEPOLIA_CHAIN_ID = 84532;
const LASNA_CHAIN_ID = 5318007;

const CHAIN_PINK = '#F50DB4'; // Unichain (official pink)
const CHAIN_BLUE = '#0052FF'; // Base (official blue)
const CHAIN_VIOLET = '#2756FC'; // Reactive / Lasna Royal
const CABLE_HOT = '#FF2B2B';
const CABLE_DRAINED = '#5a5a5a';

/** React block of the recorded v3 E2E run (v3-public-deploy-log.md). */
const V3_REACT_BLOCK = 8419547;
const V3_LOOP_COST = '0.1514 lREACT';
const V3_LOOP_SECONDS = '3.0s';
/** Fixed ASCII reason for a live trip from this card (bytes32-padded). */
const TRIP_REASON = 'CG-TRIP-001';

/** Replay choreography: each breaker flips ~300 ms after the previous. */
const FLIP_TIMES = [1000, 1300, 1600, 1900, 2200] as const;
const REPLAY_END_MS = 2500;

type BreakerId = 'uni-01' | 'uni-02' | 'base-01' | 'uni-03' | 'base-02';

interface BreakerDef {
  id: BreakerId;
  label: string;
  asset: 'ETH' | 'USDC';
  chainId: number;
  chainShort: string;
  address: Address;
}

const BREAKERS: BreakerDef[] = [
  {
    id: 'uni-01',
    label: 'UNI-01',
    asset: 'ETH',
    chainId: UNICHAIN_SEPOLIA_CHAIN_ID,
    chainShort: 'UNI',
    address: PUBLIC_V3_CONTRACTS.vaultUni0.address
  },
  {
    id: 'uni-02',
    label: 'UNI-02',
    asset: 'ETH',
    chainId: UNICHAIN_SEPOLIA_CHAIN_ID,
    chainShort: 'UNI',
    address: PUBLIC_V3_CONTRACTS.vaultUni1.address
  },
  {
    id: 'base-01',
    label: 'BASE-01',
    asset: 'ETH',
    chainId: BASE_SEPOLIA_CHAIN_ID,
    chainShort: 'BASE',
    address: PUBLIC_V3_CONTRACTS.vaultBase0.address
  },
  {
    id: 'uni-03',
    label: 'UNI-03',
    asset: 'USDC',
    chainId: UNICHAIN_SEPOLIA_CHAIN_ID,
    chainShort: 'UNI',
    address: PUBLIC_V3_CONTRACTS.vaultUsdc.address
  },
  {
    id: 'base-02',
    label: 'BASE-02',
    asset: 'USDC',
    chainId: BASE_SEPOLIA_CHAIN_ID,
    chainShort: 'BASE',
    address: PUBLIC_V3_CONTRACTS.vaultUsdcBase.address
  }
];

type NodeId = 'uni' | 'lasna' | 'base';

const NODES: { id: NodeId; name: string; logo: string }[] = [
  { id: 'uni', name: 'UNICHIAN', logo: '/icons/chain-unichain.png' },
  { id: 'lasna', name: 'LASNA', logo: '/icons/chain-lasna.png' },
  { id: 'base', name: 'BASE', logo: '/icons/chain-base.svg' }
];

type CableState = 'idle' | 'hot' | 'drained';

interface CableDef {
  id: string;
  from: NodeId;
  to: NodeId;
  lane: 'top' | 'bottom';
  color: string;
}

const CABLES: CableDef[] = [
  { id: 'uni-lasna', from: 'uni', to: 'lasna', lane: 'top', color: CHAIN_PINK },
  { id: 'lasna-base', from: 'lasna', to: 'base', lane: 'top', color: CHAIN_BLUE },
  { id: 'lasna-uni', from: 'lasna', to: 'uni', lane: 'bottom', color: CHAIN_PINK }
];

type Phase = 'armed' | 'tripping' | 'propagating' | 'contained';
type Mode = 'replay' | 'live';
type BreakerState = 'active' | 'paused' | 'unknown';

interface LivePaused {
  data: boolean | undefined;
  isError: boolean;
  refetch: () => void;
}

/** Live paused() reads for the five v3 vaults (fixed hook order). */
function useLivePausedAll(enabled: boolean, fast: boolean): LivePaused[] {
  const query = { enabled, refetchInterval: fast ? 2000 : 30000, retry: 1, retryDelay: 1000 } as const;
  const uni01 = useReadContract({
    address: PUBLIC_V3_CONTRACTS.vaultUni0.address,
    abi: PUBLIC_V3_ABI,
    functionName: 'paused',
    chainId: UNICHAIN_SEPOLIA_CHAIN_ID,
    query
  });
  const uni02 = useReadContract({
    address: PUBLIC_V3_CONTRACTS.vaultUni1.address,
    abi: PUBLIC_V3_ABI,
    functionName: 'paused',
    chainId: UNICHAIN_SEPOLIA_CHAIN_ID,
    query
  });
  const base01 = useReadContract({
    address: PUBLIC_V3_CONTRACTS.vaultBase0.address,
    abi: PUBLIC_V3_ABI,
    functionName: 'paused',
    chainId: BASE_SEPOLIA_CHAIN_ID,
    query
  });
  const uni03 = useReadContract({
    address: PUBLIC_V3_CONTRACTS.vaultUsdc.address,
    abi: PUBLIC_V3_ERC20_ABI,
    functionName: 'paused',
    chainId: UNICHAIN_SEPOLIA_CHAIN_ID,
    query
  });
  const base02 = useReadContract({
    address: PUBLIC_V3_CONTRACTS.vaultUsdcBase.address,
    abi: PUBLIC_V3_ERC20_ABI,
    functionName: 'paused',
    chainId: BASE_SEPOLIA_CHAIN_ID,
    query
  });
  return [
    { data: uni01.data, isError: uni01.isError, refetch: () => void uni01.refetch() },
    { data: uni02.data, isError: uni02.isError, refetch: () => void uni02.refetch() },
    { data: base01.data, isError: base01.isError, refetch: () => void base01.refetch() },
    { data: uni03.data, isError: uni03.isError, refetch: () => void uni03.refetch() },
    { data: base02.data, isError: base02.isError, refetch: () => void base02.refetch() }
  ];
}

interface Pt {
  x: number;
  y: number;
}

interface Geom {
  w: number;
  h: number;
  nodes: Record<NodeId, { cx: number; cy: number; hw: number; hh: number }>;
}

function topPath(a: Pt, b: Pt, lift: number): string {
  const dx = Math.max(24, (b.x - a.x) * 0.38);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y - lift}, ${b.x - dx} ${b.y - lift}, ${b.x} ${b.y}`;
}

function bottomPath(a: Pt, b: Pt, sag: number): string {
  const dx = Math.max(24, Math.abs(a.x - b.x) * 0.3);
  return `M ${a.x} ${a.y} C ${a.x - dx} ${a.y + sag}, ${b.x + dx} ${b.y + sag}, ${b.x} ${b.y}`;
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

export function BreakerPanel() {
  const motionAllowed = useMotionAllowed();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchToChain, isSwitching } = useChainSwitcher();
  const [switchError, setSwitchError] = useState<SwitchChainFailure | null>(null);

  const [mode, setMode] = useState<Mode>('replay');
  const [phase, setPhase] = useState<Phase>('armed');
  const [pausedAnim, setPausedAnim] = useState(false);
  const [replayElapsed, setReplayElapsed] = useState(0);
  const [replayRunning, setReplayRunning] = useState(false);
  const [liveTripHash, setLiveTripHash] = useState<`0x${string}` | null>(null);

  const livePaused = useLivePausedAll(mode === 'live', phase === 'propagating');
  const livePausedCount = livePaused.filter((p) => p.data === true).length;
  const liveReadFailed = livePaused.some((p) => p.isError);

  const tripWrite = useWriteContract();
  const tripReceipt = useWaitForTransactionReceipt({
    hash: tripWrite.data,
    chainId: UNICHAIN_SEPOLIA_CHAIN_ID,
    query: { enabled: tripWrite.data !== undefined }
  });

  /* ---- Measured geometry: cables follow the real node positions ---- */
  const graphRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nodeRefs = useRef<Record<NodeId, HTMLDivElement | null>>({
    uni: null,
    lasna: null,
    base: null
  });
  const [geom, setGeom] = useState<Geom | null>(null);

  const measure = useCallback(() => {
    const el = graphRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    const nodes = {} as Geom['nodes'];
    (['uni', 'lasna', 'base'] as const).forEach((id) => {
      const n = nodeRefs.current[id];
      if (!n) return;
      const nr = n.getBoundingClientRect();
      nodes[id] = {
        cx: nr.left - r.left + nr.width / 2,
        cy: nr.top - r.top + nr.height / 2,
        hw: nr.width / 2,
        hh: nr.height / 2
      };
    });
    if (nodes.uni && nodes.lasna && nodes.base) {
      setGeom({ w: r.width, h: r.height, nodes });
    }
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const el = graphRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  /* ---- Replay clock (frozen by pause, skipped when motion is off) ---- */
  useEffect(() => {
    if (mode !== 'replay' || !replayRunning || pausedAnim || !motionAllowed) return;
    const id = window.setInterval(() => setReplayElapsed((e) => e + 50), 50);
    return () => window.clearInterval(id);
  }, [mode, replayRunning, pausedAnim, motionAllowed]);

  useEffect(() => {
    if (mode === 'replay' && replayRunning && replayElapsed >= REPLAY_END_MS) {
      setReplayRunning(false);
      setPhase('contained');
    }
  }, [mode, replayRunning, replayElapsed]);

  useEffect(() => {
    if (!motionAllowed && replayRunning) {
      setReplayElapsed(REPLAY_END_MS);
      setReplayRunning(false);
      setPhase('contained');
    }
  }, [motionAllowed, replayRunning]);

  /* ---- Live trip lifecycle ---- */
  useEffect(() => {
    if (tripReceipt.isSuccess && tripWrite.data) {
      setLiveTripHash(tripWrite.data);
      setPhase('propagating');
    }
  }, [tripReceipt.isSuccess, tripWrite.data]);

  useEffect(() => {
    if (tripWrite.isError) setPhase('armed');
  }, [tripWrite.isError]);

  useEffect(() => {
    if (mode === 'live' && phase === 'propagating' && livePausedCount === 5) {
      setPhase('contained');
    }
  }, [mode, phase, livePausedCount]);

  /* ---- User pause freezes SMIL pulses too ---- */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      if (pausedAnim) svg.pauseAnimations();
      else svg.unpauseAnimations();
    } catch {
      /* chrome-headless-shell and older engines may not implement it */
    }
  }, [pausedAnim, geom]);

  /* ---- Derived states ---- */
  const breakerState = (i: number): BreakerState => {
    if (mode === 'replay') {
      if (phase === 'contained') return 'paused';
      if (phase === 'propagating') return replayElapsed >= FLIP_TIMES[i] ? 'paused' : 'active';
      return 'active';
    }
    const p = livePaused[i];
    if (p.data === true) return 'paused';
    if (p.data === false) return 'active';
    return 'unknown';
  };

  const flippedCount =
    mode === 'replay'
      ? FLIP_TIMES.filter((t) => replayElapsed >= t).length
      : livePausedCount;

  const cableState = (id: string): CableState => {
    if (mode === 'replay') {
      if (phase === 'contained') return 'drained';
      if (phase !== 'propagating') return 'idle';
      if (id === 'uni-lasna') return 'hot';
      return replayElapsed >= 1000 ? 'hot' : 'idle';
    }
    if (phase === 'contained') return 'drained';
    if (phase === 'tripping' || phase === 'propagating') return 'hot';
    return 'idle';
  };

  /** Node status word under each logo. */
  const nodeStatus = (id: NodeId): { text: string; tone: string; ring: boolean; ringColor: string } => {
    if (mode === 'replay') {
      if (phase === 'contained') return { text: 'PAUSED', tone: 'text-[#ff5555]', ring: false, ringColor: '' };
      if (phase === 'propagating') {
        if (id === 'uni' && replayElapsed >= 0)
          return { text: 'FAULT', tone: 'text-[#ff5555]', ring: true, ringColor: 'border-[#ff2b2b]' };
        if (id === 'lasna' && replayElapsed >= 500)
          return { text: 'VALIDATING', tone: 'text-[#62d0ff]', ring: true, ringColor: 'border-[#62d0ff]' };
      }
      return { text: 'LIVE', tone: 'text-[#00e63f]', ring: false, ringColor: '' };
    }
    const idx = id === 'uni' ? 0 : id === 'base' ? 2 : -1;
    if (idx >= 0) {
      const s = breakerState(idx);
      if (s === 'paused') return { text: 'PAUSED', tone: 'text-[#ff5555]', ring: false, ringColor: '' };
      if (s === 'unknown') return { text: '…', tone: 'text-[#9ca3af]', ring: false, ringColor: '' };
      return { text: 'LIVE', tone: 'text-[#00e63f]', ring: false, ringColor: '' };
    }
    if (phase === 'propagating')
      return { text: 'VALIDATING', tone: 'text-[#62d0ff]', ring: true, ringColor: 'border-[#62d0ff]' };
    if (phase === 'contained') return { text: 'PAUSED', tone: 'text-[#ff5555]', ring: false, ringColor: '' };
    return { text: 'LIVE', tone: 'text-[#00e63f]', ring: false, ringColor: '' };
  };

  const lcdText = (): string => {
    if (phase === 'tripping') return 'TRIP PENDING — CONFIRM IN WALLET…';
    if (phase === 'contained') {
      return mode === 'replay'
        ? `CONTAINED 5/5 · ${V3_LOOP_SECONDS} — ${V3_LOOP_COST}`
        : 'CONTAINED 5/5 · LIVE';
    }
    if (phase === 'propagating') {
      if (mode === 'replay') {
        if (replayElapsed < 500) return 'TRIP UNI-01 · FAULT DETECTED';
        if (replayElapsed < 1000) return `REACT #${V3_REACT_BLOCK} — VALIDATING`;
        return `FAN-OUT ${flippedCount}/5 PAUSED`;
      }
      return `AWAITING CALLBACKS — ${livePausedCount}/5 PAUSED (LIVE)`;
    }
    if (mode === 'live') {
      if (liveReadFailed) return 'LIVE READ FAILED — RETRY';
      if (livePausedCount > 0) return `SET PAUSED ON-CHAIN — ${livePausedCount}/5 PAUSED`;
      return 'STATUS: ARMED — 5/5 ACTIVE (LIVE)';
    }
    return 'STATUS: ARMED — 5/5 ACTIVE';
  };

  /* ---- Handlers ---- */
  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setPhase('armed');
    setReplayElapsed(0);
    setReplayRunning(false);
    setLiveTripHash(null);
    tripWrite.reset();
  };

  const handleTripReplay = () => {
    if (phase !== 'armed') return;
    if (!motionAllowed) {
      setReplayElapsed(REPLAY_END_MS);
      setPhase('contained');
      return;
    }
    setReplayElapsed(0);
    setReplayRunning(true);
    setPhase('propagating');
  };

  const handleTripLive = () => {
    if (phase !== 'armed' || !isConnected || chainId !== UNICHAIN_SEPOLIA_CHAIN_ID) return;
    setPhase('tripping');
    tripWrite.writeContract({
      address: PUBLIC_V3_CONTRACTS.vaultUni0.address,
      abi: PUBLIC_V3_ABI,
      functionName: 'trip',
      args: [stringToHex(TRIP_REASON, { size: 32 })],
      chainId: UNICHAIN_SEPOLIA_CHAIN_ID
    });
  };

  const handleTrip = () => (mode === 'replay' ? handleTripReplay() : handleTripLive());

  const handleReset = () => {
    tripWrite.reset();
    setLiveTripHash(null);
    if (mode === 'replay') {
      setReplayElapsed(0);
      setReplayRunning(false);
      setPhase('armed');
      return;
    }
    livePaused.forEach((p) => p.refetch());
    setPhase(livePausedCount === 5 ? 'contained' : 'armed');
  };

  const handleSwitchToUni = async () => {
    const result = await switchToChain(UNICHAIN_SEPOLIA_CHAIN_ID);
    const failure = failureOrNull(result);
    if (failure) setSwitchError(failure);
  };

  const uni01PausedLive = mode === 'live' && livePaused[0].data === true;
  const tripDisabled =
    phase !== 'armed' ||
    tripWrite.isPending ||
    (mode === 'live' && (!isConnected || chainId !== UNICHAIN_SEPOLIA_CHAIN_ID || liveReadFailed || uni01PausedLive));

  /* ---- Cable paths from measured node positions ---- */
  const cablePaths = geom
    ? CABLES.map((c) => {
        const from = geom.nodes[c.from];
        const to = geom.nodes[c.to];
        if (c.lane === 'top') {
          const a = { x: from.cx + from.hw, y: from.cy };
          const b = { x: to.cx - to.hw, y: to.cy };
          return { ...c, d: topPath(a, b, 14), end: b };
        }
        const a = { x: from.cx, y: from.cy + from.hh };
        const b = { x: to.cx, y: to.cy + to.hh };
        return { ...c, d: bottomPath(a, b, 18), end: b };
      })
    : [];

  const cableStart = (c: (typeof cablePaths)[number]): Pt => {
    if (c.lane === 'top') {
      const from = geom!.nodes[c.from];
      return { x: from.cx + from.hw, y: from.cy };
    }
    const from = geom!.nodes[c.from];
    return { x: from.cx, y: from.cy + from.hh };
  };

  return (
    <Win98Window title="CONTAINMENT GRID — BREAKER PANEL" showControls={false} className="w-full">
      <div className={cn('space-y-3', pausedAnim && 'cg-paused')} data-testid="breaker-panel">
        {/* Mode + pause row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] font-bold">MODE</span>
          <button
            type="button"
            aria-pressed={mode === 'replay'}
            onClick={() => switchMode('replay')}
            className={cn(mode === 'replay' && 'font-bold')}
            style={
              mode === 'replay'
                ? {
                    boxShadow:
                      'inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey',
                    background: '#dfdfdf'
                  }
                : undefined
            }
          >
            REPLAY
          </button>
          <button
            type="button"
            aria-pressed={mode === 'live'}
            onClick={() => switchMode('live')}
            className={cn(mode === 'live' && 'font-bold')}
            style={
              mode === 'live'
                ? {
                    boxShadow:
                      'inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey',
                    background: '#dfdfdf'
                  }
                : undefined
            }
          >
            LIVE
          </button>
          <span className="ml-auto flex items-center gap-2">
            {pausedAnim && (
              <span className="bg-[#ff8800] px-1 font-mono text-[10px] font-bold text-black">❚❚ PAUSED</span>
            )}
            <button
              type="button"
              onClick={() => setPausedAnim((p) => !p)}
              disabled={!motionAllowed}
              title={motionAllowed ? 'Bekukan semua animasi' : 'Animasi dimatikan (motion off)'}
              data-testid="breaker-pause"
            >
              {pausedAnim ? '▶ RESUME' : '❚❚ PAUSE'}
            </button>
          </span>
        </div>

        <p className="font-mono text-[10px] text-[#404040]">
          {mode === 'replay'
            ? 'Replay run v3 tercatat — tanpa wallet, tanpa transaksi.'
            : 'Trip nyata di Uni #0 (v3) — butuh wallet di Unichain Sepolia. Reopen owner-only.'}
        </p>

        {/* Sunken screen: node graph + layered cables */}
        <div className="cg-screen sunken-panel" style={{ backgroundColor: '#000' }}>
          <div ref={graphRef} className="relative">
            <svg
              ref={svgRef}
              className="pointer-events-none absolute inset-0 z-0"
              width="100%"
              height="100%"
              viewBox={geom ? `0 0 ${geom.w} ${geom.h}` : '0 0 100 100'}
              aria-hidden="true"
            >
              <defs>
                <filter id="cg-glow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="3" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {cablePaths.map((c, i) => {
                const state = cableState(c.id);
                const base = state === 'hot' ? CABLE_HOT : state === 'drained' ? CABLE_DRAINED : c.color;
                const start = cableStart(c);
                return (
                  <g key={c.id}>
                    {/* sheath */}
                    <path d={c.d} fill="none" stroke={base} strokeWidth={11} opacity={0.15} strokeLinecap="round" />
                    {/* conductor */}
                    <path d={c.d} fill="none" stroke={base} strokeWidth={3.5} opacity={0.75} strokeLinecap="round" />
                    {/* bright core */}
                    <path
                      d={c.d}
                      fill="none"
                      stroke={state === 'drained' ? '#888888' : '#eafff0'}
                      strokeWidth={1.5}
                      opacity={state === 'drained' ? 0.5 : 0.9}
                      strokeLinecap="round"
                    />
                    {/* marching flow (static when motion is off: not rendered) */}
                    {motionAllowed && state !== 'drained' && (
                      <path
                        d={c.d}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={2}
                        strokeDasharray="1 11"
                        strokeLinecap="round"
                        opacity={0.9}
                        className="cg-dash"
                      />
                    )}
                    {/* rivet dots at both ends */}
                    {[start, c.end].map((p, j) => (
                      <g key={j}>
                        <circle cx={p.x} cy={p.y} r={4.5} fill="#000" stroke={base} strokeWidth={1.5} />
                        <circle cx={p.x} cy={p.y} r={1.6} fill="#ffffff" />
                      </g>
                    ))}
                    {/* travelling pulse (SMIL; frozen by svg.pauseAnimations) */}
                    {motionAllowed && state !== 'drained' && (
                      <g filter="url(#cg-glow)">
                        <animateMotion
                          dur={state === 'hot' ? '1.2s' : '2.4s'}
                          begin={`${-i * 0.8}s`}
                          repeatCount="indefinite"
                        >
                          <mpath href={`#cg-path-${c.id}`} />
                        </animateMotion>
                        <circle r={5} fill={base} opacity={0.35} />
                        <circle r={2.5} fill="#ffffff" />
                      </g>
                    )}
                    {/* lock dot when the conduit is drained */}
                    {state === 'drained' && <circle cx={c.end.x} cy={c.end.y} r={3.5} fill="#ff8800" />}
                    {/* invisible anchor path for mpath */}
                    <path id={`cg-path-${c.id}`} d={c.d} fill="none" stroke="none" />
                  </g>
                );
              })}
            </svg>

            {/* Nodes (above the cables) */}
            <div className="relative z-10 flex items-start justify-between px-3 pt-3 sm:px-6">
              {NODES.map((node) => {
                const s = nodeStatus(node.id);
                return (
                  <div key={node.id} className="flex flex-col items-center gap-1">
                    <div
                      ref={(el) => {
                        nodeRefs.current[node.id] = el;
                      }}
                      className={cn('relative h-8 w-8', motionAllowed && 'cg-breathe')}
                    >
                      <img
                        src={node.logo}
                        alt={node.name}
                        width={32}
                        height={32}
                        className="h-8 w-8 object-contain"
                        draggable={false}
                      />
                      {s.ring && (
                        <span
                          className={cn(
                            'cg-ring pointer-events-none absolute -inset-1 rounded-full border-2',
                            s.ringColor
                          )}
                        />
                      )}
                    </div>
                    <span className="font-mono text-[10px] font-bold text-white">{node.name}</span>
                    <span className={cn('font-mono text-[10px]', s.tone)}>{s.text}</span>
                  </div>
                );
              })}
            </div>
            {/* Bottom lane for the callback conduit */}
            <div className="h-[34px]" />
          </div>
          <p className="border-t border-[#1f1f1f] px-2 py-1 font-mono text-[10px] text-[#9ca3af]">
            &gt; HEARTBEAT — BUKAN TRANSAKSI
          </p>
        </div>

        {/* Breakers */}
        <fieldset>
          <legend>BREAKERS</legend>
          <div className="flex flex-wrap gap-2">
            {BREAKERS.map((b, i) => {
              const s = breakerState(i);
              return (
                <div
                  key={b.id}
                  className="flex min-w-[62px] flex-1 flex-col items-center gap-1 border border-[#808080] bg-[#DFDFDF] p-1.5"
                  title={`${b.label} · ${b.chainShort} ${b.asset} · ${b.address}`}
                >
                  <span className="font-mono text-[10px] font-bold text-black">{b.label}</span>
                  <span className="font-mono text-[9px] text-[#404040]">
                    {b.chainShort} · {b.asset}
                  </span>
                  <div
                    className={cn(
                      'cg-switch flex h-[23px] w-[52px] items-center justify-center',
                      s === 'paused' && 'cg-switch-paused'
                    )}
                    role="status"
                    aria-label={`${b.label} ${s === 'paused' ? 'paused' : s === 'unknown' ? 'unknown' : 'active'}`}
                  >
                    <span className="font-mono text-[9px] font-bold text-black">
                      {s === 'paused' ? 'PAUSED' : s === 'unknown' ? '?' : 'ACTIVE'}
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <span
                      className={cn(
                        'inline-block h-2 w-2 rounded-full',
                        s === 'paused' ? 'bg-[#ff0000]' : s === 'unknown' ? 'bg-[#808080]' : 'bg-[#00c853] cg-led'
                      )}
                    />
                    <span className="font-mono text-[9px] text-black">
                      {s === 'paused' ? 'PAUSED' : s === 'unknown' ? 'UNKNOWN' : 'LIVE'}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </fieldset>

        {/* Action row: TRIP / RESET / LCD */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="breaker-trip"
            onClick={handleTrip}
            disabled={tripDisabled}
            className="cg-trip flex items-center justify-center gap-2 px-4"
          >
            {phase === 'tripping' ? (
              <Icons.spinner className="h-4 w-4 animate-spin" />
            ) : (
              <Icons.warning className="h-4 w-4" />
            )}
            TRIP
          </button>
          <button type="button" onClick={handleReset} data-testid="breaker-reset">
            RESET
          </button>
          <div
            className="sunken-panel min-w-[220px] flex-1 px-2 py-1.5"
            style={{ backgroundColor: '#000' }}
            role="status"
            aria-live="polite"
          >
            <span className="block truncate font-mono text-[10px] text-[#00ff00] sm:text-[11px]">{lcdText()}</span>
          </div>
        </div>

        {/* Live-mode wallet / chain gating */}
        {mode === 'live' && !isConnected && (
          <p className="font-mono text-[10px] text-[#404040]">
            Hubungkan wallet dari taskbar untuk trip live — atau pakai REPLAY tanpa wallet.
          </p>
        )}
        {mode === 'live' && isConnected && chainId !== UNICHAIN_SEPOLIA_CHAIN_ID && (
          <button type="button" onClick={handleSwitchToUni} disabled={isSwitching} data-testid="breaker-switch">
            {isSwitching ? 'Switching…' : 'Switch to Unichain Sepolia'}
          </button>
        )}
        {mode === 'live' && uni01PausedLive && phase === 'armed' && (
          <p className="font-mono text-[10px] text-[#404040]">
            Uni #0 sudah PAUSED on-chain — trip akan revert. Reopen owner-only.
          </p>
        )}
        {switchError && (
          <ChainSwitchError failure={switchError} onDismiss={() => setSwitchError(null)} />
        )}
        {tripWrite.isError && (
          <WriteErrorNotice
            error={tripWrite.error}
            chainId={UNICHAIN_SEPOLIA_CHAIN_ID}
            txHash={tripWrite.data}
            crossChainWrite
          />
        )}

        {/* Evidence line */}
        {mode === 'replay' ? (
          <p className="font-mono text-[10px] text-[#404040]">
            RECORDED E2E v3 —{' '}
            <a
              href={`${EXPLORERS[UNICHAIN_SEPOLIA_CHAIN_ID].url}/tx/${PUBLIC_V3_E2E.trip}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              trip {shortHash(PUBLIC_V3_E2E.trip)}
            </a>{' '}
            ·{' '}
            <a
              href={`${EXPLORERS[LASNA_CHAIN_ID].url}/tx/${PUBLIC_V3_E2E.react}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              react {shortHash(PUBLIC_V3_E2E.react)}
            </a>{' '}
            ·{' '}
            <a
              href={`${EXPLORERS[LASNA_CHAIN_ID].url}/block/${V3_REACT_BLOCK}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Lasna #{V3_REACT_BLOCK}
            </a>
          </p>
        ) : (
          <p className="font-mono text-[10px] text-[#404040]">
            {liveTripHash ? (
              <>
                LIVE TRIP —{' '}
                <a
                  href={`${EXPLORERS[UNICHAIN_SEPOLIA_CHAIN_ID].url}/tx/${liveTripHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {shortHash(liveTripHash)}
                </a>{' '}
                · breaker membalik saat paused() on-chain terkonfirmasi.
              </>
            ) : (
              'Belum ada trip live dari kartu ini.'
            )}
          </p>
        )}

        {/* Status bar */}
        <div className="status-bar">
          <span className="status-bar-field">
            {mode === 'replay'
              ? 'RECORDED RUN — TESTNET'
              : liveTripHash
                ? `LIVE — TRIP ${shortHash(liveTripHash)}`
                : 'LIVE — NO TRIP YET'}
          </span>
          <span className="status-bar-field">
            Lasna #{V3_REACT_BLOCK} · {Number(PUBLIC_V3_WATCHER_BALANCE_AT_HANDOVER_LREACT).toFixed(2)} lREACT
          </span>
        </div>
      </div>
    </Win98Window>
  );
}
