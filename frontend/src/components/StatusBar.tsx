'use client';

import { useEffect, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { getFhevmInstance, getInitError } from '@/lib/fhevm';
import { SEPOLIA_CHAIN_ID, VEIL_VOTE_ADDRESS } from '@/lib/contracts';

export function StatusBar() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [mounted, setMounted] = useState(false);
  const [fhevmStatus, setFhevmStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    setMounted(true);
    
    // Check FHEVM status periodically
    const checkFhevm = () => {
      const instance = getFhevmInstance();
      const error = getInitError();
      
      if (instance) {
        setFhevmStatus('ready');
      } else if (error) {
        setFhevmStatus('error');
      } else {
        setFhevmStatus('loading');
      }
    };
    
    checkFhevm();
    const interval = setInterval(checkFhevm, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  const isCorrectNetwork = chainId === SEPOLIA_CHAIN_ID;
  const isContractDeployed = VEIL_VOTE_ADDRESS !== '0x0000000000000000000000000000000000000000';

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6 p-4 border-y border-stone-200 bg-marble/50">
      {/* Network Status */}
      <div className="flex items-center gap-2 font-cinzel text-base">
        <span className="text-black font-bold uppercase tracking-widest">Network</span>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rotate-45 ${
            !isConnected 
              ? 'bg-black' 
              : isCorrectNetwork 
                ? 'bg-olive' 
                : 'bg-clay'
          }`} />
          <span className={`font-black ${
            !isConnected 
              ? 'text-black' 
              : isCorrectNetwork 
                ? 'text-olive' 
                : 'text-clay'
          }`}>
            {!isConnected ? 'Disconnected' : isCorrectNetwork ? 'Sepolia' : 'Wrong Network'}
          </span>
        </div>
      </div>

      <div className="w-px h-5 bg-stone-400 hidden sm:block"></div>

      {/* FHEVM Status */}
      <div className="flex items-center gap-2 font-cinzel text-base">
        <span className="text-black font-bold uppercase tracking-widest">FHEVM</span>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rotate-45 ${
            fhevmStatus === 'ready' 
              ? 'bg-olive' 
              : fhevmStatus === 'loading' 
                ? 'bg-gold animate-pulse' 
                : 'bg-clay'
          }`} />
          <span className={`font-black ${
            fhevmStatus === 'ready' 
              ? 'text-olive' 
              : fhevmStatus === 'loading' 
                ? 'text-gold' 
                : 'text-clay'
          }`}>
            {fhevmStatus === 'ready' && 'Active'}
            {fhevmStatus === 'loading' && 'Initializing...'}
            {fhevmStatus === 'error' && 'Error'}
          </span>
        </div>
      </div>

      <div className="w-px h-5 bg-stone-400 hidden sm:block"></div>

      {/* Contract Status */}
      <div className="flex items-center gap-2 font-cinzel text-base">
        <span className="text-black font-bold uppercase tracking-widest">Contract</span>
        {isContractDeployed ? (
          <a
            href={`https://sepolia.etherscan.io/address/${VEIL_VOTE_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-aegean hover:text-aegean/70 transition-colors font-black flex items-center gap-1 group"
          >
            <span className="border-b-2 border-aegean/30 group-hover:border-aegean transition-all font-mono">
              {VEIL_VOTE_ADDRESS.slice(0, 6)}...{VEIL_VOTE_ADDRESS.slice(-4)}
            </span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ) : (
          <span className="text-clay font-black">Pending</span>
        )}
      </div>

      <div className="w-px h-5 bg-stone-400 hidden sm:block"></div>

      {/* GitHub Link */}
      <a
        href="https://github.com/kungheifatchoi/Veil-Vote"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-black hover:text-aegean transition-colors group"
        title="View source on GitHub"
      >
        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
        </svg>
      </a>
    </div>
  );
}
