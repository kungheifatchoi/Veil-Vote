'use client';

import { useAccount, useDisconnect } from 'wagmi';
import { useState, useEffect } from 'react';
import { WalletModal } from './WalletModal';

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!mounted) {
    return (
      <button
        disabled
        className="px-5 py-2 border border-stone-300 text-stone-400 font-cinzel text-base font-bold uppercase tracking-wider rounded-sm"
      >
        Connect Wallet
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <button
          onClick={handleCopyAddress}
          className="hidden sm:flex items-center gap-2 px-4 py-2 border border-stone-300 hover:border-aegean bg-white transition-colors group rounded-sm"
          title="Click to copy address"
        >
          <div className="w-2 h-2 bg-olive rotate-45 group-hover:scale-125 transition-transform" />
          <span className="text-black text-base font-inter font-medium group-hover:text-aegean transition-colors">
            {copied ? 'Copied!' : `${address.slice(0, 6)}...${address.slice(-4)}`}
          </span>
        </button>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 text-clay hover:text-white border border-clay hover:bg-clay transition-all duration-300 text-base font-cinzel font-bold uppercase tracking-wider rounded-sm"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="btn-primary px-6 py-2 text-base uppercase rounded-sm"
      >
        Connect Wallet
      </button>
      
      <WalletModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
