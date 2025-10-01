"use client";

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import ConnectWallet from './ConnectWallet';
import { isAdminWallet } from '@/utils/adminCheck';

export default function Navbar() {
  const { address } = useAccount();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const showAdmin = isClient && isAdminWallet(address);

  return (
    <header className="bg-mahogany text-marble shadow-md">
      <nav className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" className="text-2xl font-serif font-bold hover:text-brass transition-colors">
          Identity DApp
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/profile" className="text-lg hover:text-brass transition-colors">
            Profile
          </Link>
          
          {/* Admin Link - Only visible to admin wallets after client-side hydration */}
          {showAdmin && (
            <Link 
              href="/admin" 
              className="text-lg hover:text-brass transition-colors bg-brass/20 px-3 py-1 rounded-md"
            >
              Admin
            </Link>
          )}
          
          <ConnectWallet />
        </div>
      </nav>
    </header>
  );
}