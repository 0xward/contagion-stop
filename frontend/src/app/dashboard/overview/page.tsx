'use client';

import { useMemo, useState } from 'react';
import type { Address } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { BootSequence } from '@/components/terminal/boot-sequence';
import { LiveLog } from '@/components/terminal/live-log';
import { HeroStatus } from '@/components/contagion/hero-status';
import { SiblingGrid } from '@/components/contagion/sibling-grid';
import { EmergencyPauseDialog } from '@/components/contagion/action-dialogs';
import { LoopTimeline } from '@/components/contagion/loop-timeline';
import { IncidentTable } from '@/components/contagion/incident-table';
import { FundingHealth } from '@/components/contagion/funding-health';
import { CONTRACTS, LIVE } from '@/lib/config';
import { SIBLING_VAULT_ABI } from '@/lib/contracts';
import {
  ACTIVE_INCIDENT_SCENARIO,
  CALM_STATE,
  REASON_EXPLOIT,
  RECORDED_WATCHER_ADDRESS
} from '@/lib/mock-data';
import type { DashboardMockState, SiblingId } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * ContagionStop overview (ux-ui-notes §2).
 *
 * Order: demo control → hero → sibling grid → loop timeline →
 * incident table → funding health → actions.
 *
 * Contracts are DEPLOYED on testnet (`LIVE === true`): owner/balance are
 * read live via wagmi and the action buttons send REAL transactions.
 * The incident/timeline/history/funding shown below is a RECORDED RUN —
 * the real measured testnet run #1–#3 (14 Nov 2026, real tx hashes),
 * a static snapshot, not live-polled data.
 */

/** Intermediate state after a mock emergencyPause: TRIPPED, 0/2 confirmed. */
function buildTrippedState(reasonHex: `0x${string}`): DashboardMockState {
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
  const [state, setState] = useState<DashboardMockState>(ACTIVE_INCIDENT_SCENARIO);

  // Live mode only: owner of vault A (origin) for the prominent action below.
  const { data: ownerA } = useReadContract({
    address: CONTRACTS.vaultA.address as Address,
    abi: SIBLING_VAULT_ABI,
    functionName: 'owner',
    query: { enabled: LIVE }
  });
  const isOwnerA = LIVE
    ? ownerA !== undefined &&
      connectedAddress !== undefined &&
      ownerA.toLowerCase() === connectedAddress.toLowerCase()
    : connectedAddress !== undefined;

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
      `> WATCHER ${watcher} CONNECTED — LASNA 5318007`,
      '> 3 VAULTS LINKED — UNICHAIN 1301 / BASE 84532',
      '> RECORDED RUN #1 — 14 NOV 2026 — FULL LOOP 3.0 S',
      status
    ];
  }, [state.activeIncident]);

  function selectScenario(next: 'calm' | 'incident') {
    setScenario(next);
    setState(next === 'calm' ? CALM_STATE : ACTIVE_INCIDENT_SCENARIO);
  }

  /** Mock emergencyPause: A pauses, incident becomes TRIPPED (0/2). */
  function handleMockEmergencyPause(reasonHex: `0x${string}`) {
    setScenario('incident');
    setState(buildTrippedState(reasonHex));
  }

  /** Mock unpause: this vault returns to ACTIVE. */
  function handleMockUnpause(siblingId: SiblingId) {
    setState((prev) => ({
      ...prev,
      siblings: prev.siblings.map((s) =>
        s.id === siblingId ? { ...s, status: 'ACTIVE' as const, pausedAt: null } : s
      )
    }));
  }

  return (
    <PageContainer
      pageTitle='Overview'
      pageDescription='Cross-chain circuit breaker — one emergencyPause freezes every sibling vault.'
      pageHeaderAction={
        LIVE ? (
          <Badge variant='outline' className='border-primary/40 text-primary'>
            <Icons.circleCheck className='mr-1 size-3.5' />
            RECORDED RUN — TESTNET
          </Badge>
        ) : (
          <Badge variant='outline' className='border-primary/40 text-primary'>
            <Icons.warning className='mr-1 size-3.5' />
            DEMO DATA — contracts not deployed yet
          </Badge>
        )
      }
    >
      <div className='flex flex-1 flex-col gap-4'>
        {/* ---- Boot sequence (terminal, once per tab session) ---- */}
        <BootSequence lines={bootLines} />

        {/* ---- Demo control (recorded run) ---- */}
        <Card>
          <CardHeader className='pb-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <CardTitle className='text-sm'>DEMO CONTROL — recorded run</CardTitle>
              <Badge variant='outline' className='border-primary/40 text-primary'>
                RECORDED
              </Badge>
            </div>
            <CardDescription>
              Switches between the recorded incident #1 (real testnet run, 14
              Nov 2026 — real tx hashes, measured 3 s loop) and the calm state
              (current on-chain state, all ACTIVE). Actions below send REAL
              transactions when connected as the vault owner.
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
              Calm (all ACTIVE)
            </Button>
            <Button
              variant={scenario === 'incident' ? 'default' : 'outline'}
              size='sm'
              onClick={() => selectScenario('incident')}
              aria-pressed={scenario === 'incident'}
            >
              <Icons.warning className='size-4' />
              Incident (TRIPPED → CONTAINED)
            </Button>
          </CardContent>
        </Card>

        {/* ---- Hero: incident banner + confirmation ring + latency ---- */}
        <HeroStatus incident={state.activeIncident} latency={state.latency} />

        {/* ---- Sibling grid: A (Origin), B, C ---- */}
        <section id='vaults' aria-label='Vaults' className='scroll-mt-20'>
          <SiblingGrid
            siblings={state.siblings}
            live={LIVE}
            connectedAddress={connectedAddress}
            onMockEmergencyPause={handleMockEmergencyPause}
            onMockUnpause={handleMockUnpause}
          />
        </section>

        {/* ---- Loop timeline: event → react → callbacks ---- */}
        <LoopTimeline
          steps={state.timeline}
          latency={state.latency}
          freezeProof={state.freezeProof}
        />

        {/* ---- Live log: wallet state (LIVE) + recorded run (RECORDED) ---- */}
        <LiveLog
          steps={state.timeline}
          incidents={state.incidentHistory}
          freezeProof={state.freezeProof}
        />

        {/* ---- Incident history ---- */}
        <section id='history' aria-label='Incident history' className='scroll-mt-20'>
          <IncidentTable incidents={state.incidentHistory} />
        </section>

        {/* ---- Funding health ---- */}
        <FundingHealth health={state.funding} />

        {/* ---- Actions ---- */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Actions</CardTitle>
            <CardDescription>
              One emergencyPause on vault A (Origin) triggers the whole
              containment loop. Unpause and the test deposit live on each
              sibling card above.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-3'>
            <div className='flex flex-wrap items-center gap-3'>
              <EmergencyPauseDialog
                sibling={originA}
                isOwner={isOwnerA}
                live={LIVE}
                onMockConfirm={handleMockEmergencyPause}
              />
              {!LIVE ? (
                <span className='text-muted-foreground text-xs'>
                  Mock mode — this runs a local simulation (TRIPPED, 0/2) and
                  sends no transaction. Use DEMO CONTROL above to jump
                  straight to the CONTAINED state.
                </span>
              ) : null}
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
