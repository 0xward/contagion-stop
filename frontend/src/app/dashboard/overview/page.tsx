'use client';

import { useMemo, useState } from 'react';
import type { Address } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Win98BootLog } from '@/components/win98/boot-log';
import { LiveLog } from '@/components/terminal/live-log';
import { HeroStatus } from '@/components/contagion/hero-status';
import { BreakerPanel } from '@/components/contagion/breaker-panel';
import { SiblingGrid } from '@/components/contagion/sibling-grid';
import { EthVaultGrid } from '@/components/contagion/eth-vault-grid';
import { UsdcVaultGrid } from '@/components/contagion/usdc-vault-grid';
import { PublicTestInstance } from '@/components/contagion/public-test-instance';
import { EmergencyPauseDialog } from '@/components/contagion/action-dialogs';
import { LoopTimeline } from '@/components/contagion/loop-timeline';
import { IncidentTable } from '@/components/contagion/incident-table';
import { FundingHealth } from '@/components/contagion/funding-health';
import { CONTRACTS } from '@/lib/config';
import { SIBLING_VAULT_ABI } from '@/lib/contracts';
import {
  ACTIVE_INCIDENT_SCENARIO,
  CALM_STATE,
  REASON_EXPLOIT,
  RECORDED_WATCHER_ADDRESS
} from '@/lib/recorded-run-data';
import type { DashboardRecordedState } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * ContagionStop overview (ux-ui-notes §2).
 *
 * Order: recorded-run control → hero → main vaults (live) → try it live
 * (public test deployment) → loop timeline (recorded) → event log →
 * incident history (recorded) → funding health → actions.
 *
 * Two kinds of data, labeled where they appear:
 * - LIVE: vault paused()/balance/totalDeposited(), watcher balance/debt,
 *   and the public test instance — read via wagmi, re-fetched after
 *   every confirmed transaction.
 * - RECORDED: the incident, timeline, history, and funding snapshot —
 *   the real measured testnet run #1–#3 (14 Nov 2026, real tx hashes),
 *   a static snapshot, not live-polled data.
 */

/**
 * Expected state right after a REAL emergencyPause confirms: TRIPPED,
 * 0/2 confirmed, steps 2–4 pending. The callbacks are expected, not yet
 * confirmed on-chain — the hero and timeline say so explicitly.
 */
function buildExpectedTrippedState(reasonHex: `0x${string}`): DashboardRecordedState {
  const base = ACTIVE_INCIDENT_SCENARIO;
  return {
    ...base,
    scenario: 'active-incident',
    siblings: base.siblings.map((s) =>
      s.id === 'A' ? s : { ...s, status: 'ACTIVE' as const, pausedAt: null }
    ),
    activeIncident: base.activeIncident
      ? {
          ...base.activeIncident,
          status: 'ACTIVE' as const,
          reason: reasonHex,
          reasonLabel: reasonHex === REASON_EXPLOIT ? 'EXPLOIT' : 'CUSTOM',
          confirmedCount: 0,
          confirmedSiblings: [],
          pendingSiblings: ['B', 'C'],
          containedInSeconds: null
        }
      : null,
    timeline: base.timeline.map((step) =>
      step.step === 1
        ? step
        : {
            ...step,
            status: 'pending' as const,
            blockTimestamp: null,
            deltaSecondsFromPrev: null,
            txHash: '',
            gasUsed: null
          }
    ),
    latency: null,
    freezeProof: null
  };
}

export default function OverviewPage() {
  const { address: connectedAddress } = useAccount();
  const [scenario, setScenario] = useState<'calm' | 'incident'>('incident');
  const [state, setState] = useState<DashboardRecordedState>(ACTIVE_INCIDENT_SCENARIO);
  /** A real trip that just confirmed: {txHash, reason} — cleared on scenario switch. */
  const [liveTrip, setLiveTrip] = useState<{ txHash: `0x${string}`; reasonHex: `0x${string}` } | null>(null);

  // Live: owner of vault A (origin) for the action below.
  const { data: ownerA } = useReadContract({
    address: CONTRACTS.vaultA.address as Address,
    abi: SIBLING_VAULT_ABI,
    functionName: 'owner',
    chainId: CONTRACTS.vaultA.chainId
  });
  const isOwnerA =
    ownerA !== undefined &&
    connectedAddress !== undefined &&
    ownerA.toLowerCase() === connectedAddress.toLowerCase();

  const originA = state.siblings.find((s) => s.id === 'A') ?? state.siblings[0];

  /** Boot lines from RECORDED data (watcher address + run #1 facts). */
  const bootLines = useMemo(() => {
    const watcher = `${RECORDED_WATCHER_ADDRESS.slice(0, 6)}…${RECORDED_WATCHER_ADDRESS.slice(-4)}`;
    const status = state.activeIncident
      ? state.activeIncident.status === 'CONTAINED'
        ? '> STATUS: CONTAINED — ALL SIBLINGS PAUSED'
        : '> STATUS: TRIPPED — CONTAINMENT IN PROGRESS'
      : '> STATUS: ALL ACTIVE — NO INCIDENT IN PROGRESS';
    return [
      '> INITIALIZING CONTAINMENT GRID... OK',
      `> WATCHER ${watcher} — LASNA 5318007`,
      '> 3 VAULTS — UNICHAIN 1301 / BASE 84532',
      '> RECORDED RUN #1 — 14 NOV 2026 — FULL LOOP 3.0 S',
      status
    ];
  }, [state.activeIncident]);

  function selectScenario(next: 'calm' | 'incident') {
    setScenario(next);
    setLiveTrip(null);
    setState(next === 'calm' ? CALM_STATE : ACTIVE_INCIDENT_SCENARIO);
  }

  /** A real emergencyPause confirmed: show the expected tripped state. */
  function handleLiveEmergencyPause(reasonHex: `0x${string}`, hash: `0x${string}`) {
    setScenario('incident');
    setLiveTrip({ txHash: hash, reasonHex });
    setState(buildExpectedTrippedState(reasonHex));
  }

  return (
    <PageContainer
      pageTitle='Overview'
      pageDescription='Cross-chain circuit breaker — one emergencyPause freezes every sibling vault.'
      pageHeaderAction={
        <Badge variant='outline' className='border-primary/40 text-primary'>
          <Icons.circleCheck className='mr-1 size-3.5' />
          RECORDED RUN — TESTNET
        </Badge>
      }
    >
      <div className='flex flex-1 flex-col gap-4'>
        {/* ---- Boot log (Win98 window, once per tab session) ---- */}
        <Win98BootLog lines={bootLines} />

        {/* ---- Recorded run control ---- */}
        <Card>
          <CardHeader className='pb-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <CardTitle className='text-sm'>RECORDED RUN — control</CardTitle>
              <Badge variant='outline' className='border-primary/40 text-primary'>
                RECORDED
              </Badge>
            </div>
            <CardDescription>
              Switches between the recorded incident #1 (real testnet run, 14
              Nov 2026 — real tx hashes, measured 3 s loop) and the recorded
              calm snapshot (14 Nov 2026, all ACTIVE). This switch only changes
              which recorded snapshot is shown — it sends no transaction and
              does not change any live state. The vault cards below are live;
              to trigger a real loop yourself, use Try it live.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-wrap gap-2'>
            <Button
              variant={scenario === 'calm' ? 'default' : 'outline'}
              size='sm'
              onClick={() => selectScenario('calm')}
              aria-pressed={scenario === 'calm'}
            >
              <Icons.circleCheck className='size-4' />
              Calm — recorded snapshot
            </Button>
            <Button
              variant={scenario === 'incident' ? 'default' : 'outline'}
              size='sm'
              onClick={() => selectScenario('incident')}
              aria-pressed={scenario === 'incident'}
            >
              <Icons.warning className='size-4' />
              Incident #1 — recorded (CONTAINED)
            </Button>
          </CardContent>
        </Card>

        {/* ---- Hero: incident banner + confirmation ring + latency ---- */}
        <HeroStatus
          incident={state.activeIncident}
          latency={state.latency}
          liveTrip={
            liveTrip
              ? {
                  txHash: liveTrip.txHash,
                  reasonLabel:
                    liveTrip.reasonHex === REASON_EXPLOIT ? 'EXPLOIT' : 'CUSTOM'
                }
              : null
          }
        />

        {/* ---- Containment Grid: breaker panel (v3 set) ---- */}
        <BreakerPanel />

        {/* ---- Sibling grid: A (Origin), B, C — live reads ---- */}
        <section id='vaults' aria-label='Vaults — live on-chain state' className='scroll-mt-20'>
          <p className='mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
            Main deployment — live on-chain state (owner-only actions)
          </p>
          <SiblingGrid
            siblings={state.siblings}
            connectedAddress={connectedAddress}
            onEmergencyPauseSuccess={handleLiveEmergencyPause}
          />
        </section>

        {/* ---- ETH vaults v2: live reads + deposit, next to the USDC vaults ---- */}
        <section id='vaults-eth-v2' aria-label='ETH vaults v2 — live on-chain state' className='scroll-mt-20'>
          <p className='mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
            Vaults v2 — ETH (ERC-20 shares) — live on-chain state
          </p>
          <EthVaultGrid />
          <p className='mt-2 text-xs text-muted-foreground'>
            Both ETH vaults are watched by watcher v2 on Lasna. They hold
            0.003 ETH totalAssets each (15 Nov 2026) — the cards show the
            live totalAssets, not a placeholder. Deposit ETH to receive
            shares; withdraw stays open while paused.
          </p>
        </section>

        {/* ---- USDC vaults v2: live reads, next to the main deployment ---- */}
        <section id='vaults-usdc' aria-label='USDC vaults — live on-chain state' className='scroll-mt-20'>
          <p className='mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
            Vaults v2 — USDC (ERC-20 shares) — live on-chain state
          </p>
          <UsdcVaultGrid />
          <p className='mt-2 text-xs text-muted-foreground'>
            Both USDC vaults are watched by watcher v2 on Lasna. They are
            funded with 20 USDC each (15 Nov 2026) — the cards show the
            live totalAssets, not a placeholder. To create a vault of your own,
            use{' '}
            <a
              href='/dashboard/deploy'
              className='text-primary underline underline-offset-2 hover:underline'
            >
              Deploy your own
            </a>
            .
          </p>
        </section>

        {/* ---- Try it live: public test deployment ---- */}
        <PublicTestInstance />

        {/* ---- Loop timeline: event → react → callbacks (recorded) ---- */}
        <LoopTimeline
          steps={state.timeline}
          latency={state.latency}
          freezeProof={state.freezeProof}
        />

        {/* ---- Event log: wallet state (LIVE) + recorded run (RECORDED) ---- */}
        <LiveLog
          steps={state.timeline}
          incidents={state.incidentHistory}
          freezeProof={state.freezeProof}
        />

        {/* ---- Incident history (recorded) ---- */}
        <section id='history' aria-label='Incident history' className='scroll-mt-20'>
          <IncidentTable incidents={state.incidentHistory} />
        </section>

        {/* ---- Funding health ---- */}
        <FundingHealth health={state.funding} />

        {/* ---- Actions (main deployment, owner only) ---- */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Actions — main deployment</CardTitle>
            <CardDescription>
              One emergencyPause on vault A (Origin) triggers the whole
              containment loop. Unpause and the test deposit live on each
              sibling card above. These actions are owner-only; any wallet can
              trigger the same loop on the public test deployment above.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-3'>
            <div className='flex flex-wrap items-center gap-3'>
              <EmergencyPauseDialog
                sibling={originA}
                isOwner={isOwnerA}
                onConfirmed={(hash, reasonHex) =>
                  handleLiveEmergencyPause(reasonHex, hash)
                }
              />
            </div>
            <p className={cn('text-muted-foreground text-xs')}>
              There is deliberately no pause() button: pause(address) is only
              callable via the watcher callback proxy — a direct UI call
              would revert NotAuthorized.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
