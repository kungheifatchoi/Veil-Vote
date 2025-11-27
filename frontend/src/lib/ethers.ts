import { useMemo } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import type { WalletClient } from 'viem';

/**
 * Convert viem WalletClient to ethers Signer
 */
function walletClientToSigner(walletClient: WalletClient): JsonRpcSigner {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain?.id ?? 11155111,
    name: chain?.name ?? 'sepolia',
    ensAddress: chain?.contracts?.ensRegistry?.address,
  };
  const provider = new BrowserProvider(transport, network);
  const signer = new JsonRpcSigner(provider, account?.address ?? '');
  return signer;
}

/**
 * Hook to get ethers Signer from wagmi
 */
export function useEthersSigner() {
  const { data: walletClient } = useWalletClient();

  return useMemo(() => {
    if (!walletClient) return undefined;
    return walletClientToSigner(walletClient);
  }, [walletClient]);
}

