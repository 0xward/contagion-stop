'use client';

import * as React from 'react';
import {
  createFilteredRowModel,
  createSortedRowModel,
  flexRender,
  stockFeatures,
  tableFeatures,
  useTable,
  type ColumnDef,
  type SortingState
} from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Icons } from '@/components/icons';
import { EXPLORERS } from '@/lib/contracts';
import type { Incident } from '@/lib/types';
import { getChainName } from '@/lib/wagmi';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* TanStack Table v9 feature set (sorting + global filtering)          */
/* ------------------------------------------------------------------ */

const incidentFeatures = tableFeatures({
  ...stockFeatures,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel()
});

type IncidentFeatures = typeof incidentFeatures;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function truncateHex(value: string): string {
  if (value.length <= 13) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function formatTimestamp(unixSeconds: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  }).format(new Date(unixSeconds * 1000));
}

function explorerTxUrl(chainId: number, txHash: string): string {
  const base = EXPLORERS[chainId as keyof typeof EXPLORERS] ?? '';
  return `${base}/tx/${txHash}`;
}

/* ------------------------------------------------------------------ */
/* Columns                                                             */
/* ------------------------------------------------------------------ */

const columns: ColumnDef<IncidentFeatures, Incident, unknown>[] = [
  {
    accessorKey: 'originAddress',
    header: 'Origin',
    cell: ({ row }) => {
      const incident = row.original;
      return (
        <div className='flex flex-col gap-0.5'>
          <span className='text-sm font-medium'>
            Vault {incident.originSiblingId}
            <span className='text-muted-foreground'> · {getChainName(incident.originChainId)}</span>
          </span>
          <span className='font-mono text-xs text-muted-foreground tabular-nums'>
            {truncateHex(incident.originAddress)}
          </span>
        </div>
      );
    }
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ row }) => {
      const incident = row.original;
      return (
        <div className='flex flex-col items-start gap-1'>
          <span className='font-mono text-xs tabular-nums'>{truncateHex(incident.reason)}</span>
          {incident.reasonLabel ? (
            <Badge variant='outline' className='font-mono text-[11px]'>
              {incident.reasonLabel}
            </Badge>
          ) : null}
        </div>
      );
    }
  },
  {
    accessorKey: 'trippedAt',
    header: 'Tripped At',
    cell: ({ row }) => (
      <span className='font-mono text-xs whitespace-nowrap tabular-nums'>
        {formatTimestamp(row.original.trippedAt)}
        <span className='text-muted-foreground'> UTC</span>
      </span>
    )
  },
  {
    accessorKey: 'containedInSeconds',
    header: 'Time to CONTAINED',
    cell: ({ row }) => {
      const seconds = row.original.containedInSeconds;
      return (
        <span className='font-mono text-xs tabular-nums'>
          {seconds === null ? '—' : `${seconds.toFixed(1)} s`}
        </span>
      );
    }
  },
  {
    accessorKey: 'confirmedCount',
    header: 'Confirmation',
    cell: ({ row }) => {
      const incident = row.original;
      return (
        <div className='flex flex-col gap-0.5'>
          <span className='font-mono text-xs font-medium tabular-nums'>
            {incident.confirmedCount}/{incident.confirmedTotal}
          </span>
          <span className='text-xs text-muted-foreground'>
            {incident.confirmedSiblings.map((id) => (
              <span key={id} className='mr-2 text-foreground'>
                {id} ✓
              </span>
            ))}
            {incident.pendingSiblings.map((id) => (
              <span key={id} className='mr-2'>
                {id} …
              </span>
            ))}
            {incident.confirmedSiblings.length === 0 && incident.pendingSiblings.length === 0
              ? '—'
              : null}
          </span>
        </div>
      );
    }
  },
  {
    accessorKey: 'status',
    header: 'Final status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant='outline'
          className={cn(
            status === 'CONTAINED'
              ? 'border-border bg-muted text-muted-foreground'
              : 'border-border bg-muted text-muted-foreground'
          )}
        >
          {status === 'CONTAINED' ? <Icons.check className='size-3' /> : <Icons.warning className='size-3' />}
          {status === 'CONTAINED' ? '✓ CONTAINED' : '⚠ ACTIVE'}
        </Badge>
      );
    }
  },
  {
    accessorKey: 'emergencyPauseTxHash',
    header: 'Tx',
    enableSorting: false,
    cell: ({ row }) => {
      const incident = row.original;
      return (
        <a
          href={explorerTxUrl(incident.originChainId, incident.emergencyPauseTxHash)}
          target='_blank'
          rel='noreferrer'
          className='inline-flex items-center gap-1 font-mono text-xs text-primary underline underline-offset-2 hover:text-[#0847c4] hover:underline tabular-nums'
        >
          {truncateHex(incident.emergencyPauseTxHash)}
          <Icons.externalLink className='size-3' />
        </a>
      );
    }
  }
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export interface IncidentTableProps {
  incidents: Incident[];
}

export function IncidentTable({ incidents }: IncidentTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'trippedAt', desc: true }
  ]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const isMock = incidents.some((incident) => incident.isMock);

  const table = useTable({
    features: incidentFeatures,
    data: incidents,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const needle = String(filterValue).toLowerCase();
      const incident = row.original;
      return (
        incident.originAddress.toLowerCase().includes(needle) ||
        incident.originSiblingId.toLowerCase().includes(needle) ||
        incident.reason.toLowerCase().includes(needle) ||
        (incident.reasonLabel ?? '').toLowerCase().includes(needle) ||
        getChainName(incident.originChainId).toLowerCase().includes(needle)
      );
    }
  });

  return (
    <Card>
      <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
        <div className='min-w-0'>
          <CardTitle>Incident history</CardTitle>
          <CardDescription>
            Recorded trips of the watcher on testnet — static snapshot of incidents #1–#3
            (14 Nov 2026), not live-polled.
          </CardDescription>
        </div>
        {isMock ? (
          <Badge variant='outline' className='border-border bg-muted text-muted-foreground'>
            RECORDED RUN — TESTNET
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <div className='relative max-w-sm'>
          <Icons.search className='absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder='Filter by origin, reason, chain…'
            className='pl-8'
            aria-label='Filter incidents'
          />
        </div>
        <div className='overflow-x-auto rounded-lg border'>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className='whitespace-nowrap'>
                      {header.isPlaceholder ? null : (
                        <button
                          type='button'
                          onClick={
                            header.column.getCanSort()
                              ? () => header.column.toggleSorting()
                              : undefined
                          }
                          className={cn(
                            'inline-flex items-center gap-1 text-left',
                            header.column.getCanSort() && 'cursor-pointer hover:text-foreground'
                          )}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() ? (
                            header.column.getIsSorted() === 'asc' ? (
                              <Icons.chevronUp className='size-3' />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <Icons.chevronDown className='size-3' />
                            ) : (
                              <Icons.chevronsUpDown className='size-3 text-muted-foreground' />
                            )
                          ) : null}
                        </button>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className='py-8 text-center text-muted-foreground'>
                    No incidents match this filter.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <p className='text-xs text-muted-foreground'>
          {table.getFilteredRowModel().rows.length} incident
          {table.getFilteredRowModel().rows.length === 1 ? '' : 's'} shown. Unpause is a manual,
          per-deployment human action — the watcher does not track it, so it never appears here.
        </p>
      </CardContent>
    </Card>
  );
}
