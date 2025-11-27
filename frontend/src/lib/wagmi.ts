import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors/injected';
import { walletConnect } from 'wagmi/connectors/walletConnect';

// WalletConnect Project ID
const projectId = 'b56e18d47c72ab683b10814fe9495694';

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    walletConnect({
      projectId,
      metadata: {
        name: 'Veil Vote',
        description: 'Encrypted On-Chain Voting powered by FHE',
        url: 'https://veil-vote.vercel.app',
        icons: ['https://avatars.githubusercontent.com/u/37784886'],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/4v01_k6CcRCovwqh7tiSh'),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
