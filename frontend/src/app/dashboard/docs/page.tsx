import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';

/**
 * Docs page — index of the ContagionStop project documents.
 * The documents live in the project folder (one level above frontend/), not
 * in the web repo — this page only indexes them, so readers and judges know
 * where the full specifications are.
 */
const DOCS = [
  {
    file: 'design.md',
    path: '../design.md',
    desc: 'Desain kontrak + protokol fan-out/retry (sumber kebenaran teknis).'
  },
  {
    file: 'README.md',
    path: '../README.md',
    desc: 'README submission: problem, solusi, tabel kontrak + tx hash (diisi setelah deploy).'
  },
  {
    file: 'DEPLOY-PLAN.md',
    path: '../DEPLOY-PLAN.md',
    desc: 'Langkah deploy testnet + uji loop (alamat kontrak diisi dari sini ke lib/config.ts).'
  },
  {
    file: 'ux-ui-notes.md',
    path: '../ux-ui-notes.md',
    desc: 'Spesifikasi UX/UI dashboard: struktur halaman, palette, font, komponen per bagian.'
  },
  {
    file: 'ux-ui-research.md',
    path: '../../ux-ui-research.md',
    desc: 'Paket riset UX/UI final (shell, komponen, hero, palette, font, README/video).'
  }
] as const;

export default function DocsPage() {
  return (
    <PageContainer
      pageTitle='Docs'
      pageDescription='Dokumen proyek ContagionStop — desain, rencana deploy, dan spesifikasi UX/UI.'
    >
      <div className='flex flex-1 flex-col gap-4'>
        <Card>
          <CardHeader>
            <div className='flex flex-wrap items-center gap-2'>
              <CardTitle>Project docs</CardTitle>
              <Badge variant='outline' className='border-primary/40 text-primary'>
                <Icons.circleCheck className='mr-1 size-3.5' />
                RECORDED RUN — TESTNET
              </Badge>
            </div>
            <CardDescription>
              Semua dokumen di bawah ini berada di folder proyek (di luar frontend/).
              Alamat kontrak sudah live (testnet) — lihat DEPLOY-PLAN.md dan
              VERIFICATION.md.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className='flex flex-col gap-3'>
              {DOCS.map((doc) => (
                <li key={doc.file} className='flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0'>
                  <span className='font-mono text-sm font-medium tabular-nums'>{doc.file}</span>
                  <span className='font-mono text-xs text-muted-foreground tabular-nums'>{doc.path}</span>
                  <span className='text-sm text-muted-foreground'>{doc.desc}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
