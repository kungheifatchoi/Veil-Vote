'use client';

import { useEffect, useState } from 'react';
import { ConnectWallet } from '@/components/ConnectWallet';
import { StatusBar } from '@/components/StatusBar';
import { PollList } from '@/components/PollList';
import { initializeFhevm, getFhevmInstance, getInitError } from '@/lib/fhevm';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [fhevmStatus, setFhevmStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    setMounted(true);
    
    // Initialize FHEVM SDK
    initializeFhevm().then((instance) => {
      if (instance) {
        setFhevmStatus('ready');
      } else {
        setFhevmStatus('error');
        console.error('FHEVM init error:', getInitError());
      }
    });
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <main className="min-h-screen bg-alabaster text-slate selection:bg-aegean/10">
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-stone-200 bg-alabaster/90 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl text-aegean">🏛️</div>
              <h1 className="text-2xl font-cinzel font-bold text-black tracking-wide">
                VEIL VOTE
              </h1>
            </div>
            <ConnectWallet />
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="mb-6 inline-block px-5 py-2 border-2 border-gold/40 rounded-full bg-white/50 text-gold text-base font-cinzel font-bold tracking-widest uppercase shadow-sm">
            Democracy • Privacy • Integrity
          </div>
          <h2 className="text-5xl md:text-6xl font-cinzel font-bold text-black mb-8 leading-tight tracking-tight drop-shadow-sm">
            Vote Behind
            <span className="text-aegean italic">
              {' '}the Veil{' '}
            </span>
          </h2>
          
          <p className="text-black text-xl max-w-3xl mx-auto mb-14 font-inter font-medium leading-relaxed">
            The sanctity of your choice is preserved by FHE.
          </p>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
            <div className="p-8 bg-[#FAF8F3] rounded-sm border border-[#E8E2D6] shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-aegean/20 group-hover:bg-aegean transition-colors"></div>
              <div className="text-4xl mb-4 text-aegean group-hover:scale-110 transition-transform duration-300">🔐</div>
              <h3 className="text-black font-bold font-cinzel text-xl mb-3">Encrypted Ballot</h3>
              <p className="text-black text-base leading-relaxed font-inter font-medium">Your vote is sealed with FHE encryption before it ever leaves your device.</p>
            </div>
            <div className="p-8 bg-[#FAF8F3] rounded-sm border border-[#E8E2D6] shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gold/20 group-hover:bg-gold transition-colors"></div>
              <div className="text-4xl mb-4 text-gold group-hover:scale-110 transition-transform duration-300">⚖️</div>
              <h3 className="text-black font-bold font-cinzel text-xl mb-3">Blind Justice</h3>
              <p className="text-black text-base leading-relaxed font-inter font-medium">The smart contract counts votes mathematically without ever seeing the contents.</p>
            </div>
            <div className="p-8 bg-[#FAF8F3] rounded-sm border border-[#E8E2D6] shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-clay/20 group-hover:bg-clay transition-colors"></div>
              <div className="text-4xl mb-4 text-clay group-hover:scale-110 transition-transform duration-300">👁️</div>
              <h3 className="text-black font-bold font-cinzel text-xl mb-3">Public Verifiability</h3>
              <p className="text-black text-base leading-relaxed font-inter font-medium">Results are decrypted only when the poll closes, verifiable by everyone.</p>
            </div>
          </div>

          {/* Status Bar - inside hero section for tighter layout */}
          <div className="max-w-3xl mx-auto">
            <StatusBar />
          </div>
        </section>

        {/* Poll List */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="border-t border-stone-200 pt-16">
            <PollList />
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-stone-200 py-12 bg-white">
          <div className="max-w-6xl mx-auto px-6 text-center">
                <div className="mb-4 text-2xl text-stone-300">🏛️</div>
                <p className="text-black text-base font-cinzel font-bold tracking-widest uppercase">
                  Powered by <span className="text-aegean">Zama FHEVM</span>
                </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
