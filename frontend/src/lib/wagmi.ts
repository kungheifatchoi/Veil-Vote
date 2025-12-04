import { http, createConfig, createConnector } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { getAddress } from 'viem';

// WalletConnect Project ID
const projectId = 'b56e18d47c72ab683b10814fe9495694';

// Injected connector (MetaMask, Brave, etc.)
const injectedConnector = createConnector((config) => ({
  id: 'injected',
  name: 'MetaMask',
  type: 'injected' as const,
  async connect() {
    const provider = await this.getProvider();
    const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
    const chainId = await this.getChainId();
    return {
      accounts: accounts.map((account) => getAddress(account)) as readonly `0x${string}`[],
      chainId,
    } as any;
  },
  async disconnect() {},
  async getAccounts() {
    const provider = await this.getProvider();
    const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
    return accounts.map((account) => getAddress(account)) as readonly `0x${string}`[];
  },
  async getChainId() {
    const provider = await this.getProvider();
    const chainId = await provider.request({ method: 'eth_chainId' }) as string;
    return Number(chainId);
  },
  async getProvider() {
    if (typeof window === 'undefined') throw new Error('No window');
    const provider = (window as any).ethereum;
    if (!provider) throw new Error('No injected provider');
    return provider;
  },
  async isAuthorized() {
    // Always return false to prevent auto-reconnect on page refresh
    return false;
  },
  onAccountsChanged(accounts: string[]) {
    if (accounts.length === 0) {
      config.emitter.emit('disconnect');
    } else {
      config.emitter.emit('change', {
        accounts: accounts.map((account) => getAddress(account)) as readonly `0x${string}`[],
      });
    }
  },
  onChainChanged(chainId: string) {
    config.emitter.emit('change', { chainId: Number(chainId) });
  },
  onDisconnect() {
    config.emitter.emit('disconnect');
  },
  async setup() {
    if (typeof window === 'undefined') return;
    const provider = await this.getProvider().catch(() => null);
    if (provider) {
      provider.on('accountsChanged', this.onAccountsChanged.bind(this));
      provider.on('chainChanged', this.onChainChanged.bind(this));
      provider.on('disconnect', this.onDisconnect.bind(this));
    }
  },
}));

// WalletConnect connector - lazy load to avoid SSR issues
let walletConnectProvider: any = null;

const walletConnectConnector = createConnector((config) => ({
  id: 'walletConnect',
  name: 'WalletConnect',
  type: 'walletConnect' as const,
  async connect() {
    if (typeof window === 'undefined') throw new Error('No window');
    const provider = await this.getProvider() as any;
    await provider.connect();
    const accounts = (provider.accounts || []) as string[];
    const chainId = provider.chainId ?? sepolia.id;
    return {
      accounts: accounts.map((account) => getAddress(account)) as readonly `0x${string}`[],
      chainId,
    } as any;
  },
  async disconnect() {
    if (walletConnectProvider) {
      await walletConnectProvider.disconnect();
      walletConnectProvider = null;
    }
  },
  async getAccounts() {
    if (!walletConnectProvider) return [];
    return (walletConnectProvider.accounts || []).map((account: string) =>
      getAddress(account),
    ) as readonly `0x${string}`[];
  },
  async getChainId() {
    if (!walletConnectProvider) return sepolia.id;
    return walletConnectProvider.chainId || sepolia.id;
  },
  async getProvider() {
    if (typeof window === 'undefined') throw new Error('No window');

    if (!walletConnectProvider) {
      // Dynamically import to avoid SSR issues
      const { default: EthereumProvider } = await import('@walletconnect/ethereum-provider');
      walletConnectProvider = await EthereumProvider.init({
        projectId,
        chains: [sepolia.id],
        showQrModal: true,
        metadata: {
          name: 'Veil Vote',
          description: 'Encrypted On-Chain Voting powered by FHE',
          url: typeof window !== 'undefined' ? window.location.origin : 'https://veil-vote.vercel.app',
          icons: ['https://avatars.githubusercontent.com/u/37784886'],
        },
      });
    }
    return walletConnectProvider;
  },
  async isAuthorized() {
    // Always return false to prevent auto-reconnect on page refresh
    return false;
  },
  onAccountsChanged(accounts: string[]) {
    if (accounts.length === 0) {
      config.emitter.emit('disconnect');
      walletConnectProvider = null;
    } else {
      config.emitter.emit('change', {
        accounts: accounts.map((account) => getAddress(account)) as readonly `0x${string}`[],
      });
    }
  },
  onChainChanged(chainId: string) {
    config.emitter.emit('change', { chainId: Number(chainId) });
  },
  onDisconnect() {
    config.emitter.emit('disconnect');
    walletConnectProvider = null;
  },
  async setup() {
    // Provider will be initialized on first connect (client-side only)
  },
}));

export const config = createConfig({
  chains: [sepolia],
  connectors: [injectedConnector, walletConnectConnector],
  transports: {
    [sepolia.id]: http('https://rpc.sepolia.org'),
  },
  // Disable auto-reconnect on page load
  syncConnectedChain: false,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
