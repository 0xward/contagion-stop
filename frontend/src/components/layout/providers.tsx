'use client';
import React from 'react';
import { ActiveThemeProvider } from '@/components/themes/active-theme';
import Web3Provider from '@/components/web3/web3-provider';
import QueryProvider from '@/components/layout/query-provider';

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <ActiveThemeProvider initialTheme={activeThemeValue}>
        <QueryProvider>
          <Web3Provider>{children}</Web3Provider>
        </QueryProvider>
      </ActiveThemeProvider>
    </>
  );
}
