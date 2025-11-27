'use client';

import { useConnect, Connector } from 'wagmi';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Get wallet display info based on connector
function getWalletInfo(connector: Connector): { name: string; icon: string; description: string } {
  const id = connector.id.toLowerCase();
  const name = connector.name;
  
  if (id.includes('metamask') || name.toLowerCase().includes('metamask')) {
    return {
      name: 'MetaMask',
      icon: '🦊',
      description: 'Connect with MetaMask',
    };
  }
  if (id.includes('coinbase') || name.toLowerCase().includes('coinbase')) {
    return {
      name: 'Coinbase Wallet',
      icon: '🔵',
      description: 'Connect with Coinbase',
    };
  }
  if (id.includes('walletconnect')) {
    return {
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Scan with mobile wallet',
    };
  }
  if (id.includes('brave') || name.toLowerCase().includes('brave')) {
    return {
      name: 'Brave Wallet',
      icon: '🦁',
      description: 'Connect with Brave',
    };
  }
  if (id === 'injected' || id.includes('inject')) {
    return {
      name: 'Browser Wallet',
      icon: '🌐',
      description: 'MetaMask, Brave, etc.',
    };
  }
  
  return {
    name: connector.name || 'Wallet',
    icon: '💼',
    description: 'Connect wallet',
  };
}

function ModalContent({ onClose }: { onClose: () => void }) {
  const { connectors, connect, isPending } = useConnect();

  const handleConnect = async (connector: Connector) => {
    try {
      connect({ connector });
      onClose();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  // Filter out duplicate connectors and keep only one MetaMask
  const uniqueConnectors = connectors.filter((connector, index, self) => {
    const id = connector.id.toLowerCase();
    const name = connector.name.toLowerCase();
    
    // Check if this is a MetaMask-like connector
    const isMetaMask = id.includes('metamask') || name.includes('metamask') || id === 'injected';
    
    if (isMetaMask) {
      // Only keep the first MetaMask-like connector
      const firstMetaMaskIndex = self.findIndex((c) => {
        const cId = c.id.toLowerCase();
        const cName = c.name.toLowerCase();
        return cId.includes('metamask') || cName.includes('metamask') || cId === 'injected';
      });
      return index === firstMetaMaskIndex;
    }
    
    // For non-MetaMask connectors, filter by unique id
    return index === self.findIndex((c) => c.id === connector.id);
  });

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Backdrop */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        style={{
          position: 'relative',
          backgroundColor: '#FAF8F5',
          borderRadius: '2px',
          border: '1px solid rgba(181, 145, 71, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '28rem',
          overflow: 'hidden',
        }}
      >
        {/* Decorative top border */}
        <div style={{ height: '4px', background: 'linear-gradient(to right, #2E5A6B, #B59147, #2E5A6B)' }} />

        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '24px', 
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: 'white',
        }}>
          <h2 className="text-xl font-cinzel font-bold text-black flex items-center gap-3">
            <span className="text-xl text-aegean">🔐</span> Connect Wallet
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-black hover:text-clay transition-colors rounded-full hover:bg-stone-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Wallet Options */}
        <div style={{ padding: '24px', backgroundColor: '#FAF8F5' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {uniqueConnectors.length > 0 ? (
              uniqueConnectors.map((connector) => {
                const info = getWalletInfo(connector);
                
                return (
                  <button
                    key={connector.uid}
                    onClick={() => handleConnect(connector)}
                    disabled={isPending}
                    className="w-full p-4 bg-white border border-stone-200 rounded-sm hover:border-aegean hover:shadow-md transition-all duration-200 flex items-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-3xl group-hover:scale-110 transition-transform">
                      {info.icon}
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-black font-cinzel font-bold text-base group-hover:text-aegean transition-colors">
                        {info.name}
                      </div>
                      <div className="text-black/60 text-sm font-inter">
                        {info.description}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-stone-400 group-hover:text-aegean transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-black font-inter font-medium">No wallet detected</p>
                <p className="text-black/60 text-sm font-inter mt-2">
                  Please install MetaMask or another Web3 wallet
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid #E5E7EB', backgroundColor: 'white' }}>
          <p className="text-black/50 text-sm font-inter text-center">
            New to crypto wallets?{' '}
            <a 
              href="https://metamask.io/download/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-aegean hover:underline"
            >
              Get MetaMask
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  // Use portal to render outside the normal DOM hierarchy
  return createPortal(
    <ModalContent onClose={onClose} />,
    document.body
  );
}
