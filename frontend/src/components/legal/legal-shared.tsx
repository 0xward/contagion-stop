import Link from 'next/link';
import { Icons } from '@/components/icons';

/**
 * Shared bits for the legal pages (/faq, /privacy, /terms, /cookies).
 * Content is transcribed from the reviewed drafts in
 * ~/workspace/reactive-omni/legal-pages-previews/ — facts and numbers
 * are kept as drafted; nothing new is claimed here.
 */

export function LegalExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target='_blank'
      rel='noreferrer'
      className='inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline'
    >
      {children}
      <Icons.externalLink className='size-3.5 shrink-0' />
    </a>
  );
}

export function LegalInternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className='text-primary underline-offset-4 hover:underline'>
      {children}
    </Link>
  );
}

/** Numbered section inside a legal page, e.g. "1. What is ContagionStop?" */
export function LegalSection({
  number,
  title,
  children
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className='flex flex-col gap-2'>
      <h2 className='text-sm font-semibold'>
        {number}. {title}
      </h2>
      {children}
    </section>
  );
}

/** Small table with an overflow wrapper, same pattern as the Docs tables. */
export function LegalTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='border-b text-left text-muted-foreground'>
            {headers.map((header, i) => (
              <th key={header} className={i === headers.length - 1 ? 'py-2 font-medium' : 'py-2 pr-4 font-medium'}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join('|')} className='border-b align-top last:border-b-0'>
              {row.map((cell, i) => (
                <td key={i} className={i === row.length - 1 ? 'py-2' : 'py-2 pr-4'}>
                  {i === 0 ? <code className='font-mono text-xs'>{cell}</code> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
