'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWalletClient, usePublicClient } from 'wagmi';
import { VEIL_VOTE_ADDRESS, VEIL_VOTE_ABI } from '@/lib/contracts';
import { initializeFhevm, requestBatchUserDecryption, encryptValue } from '@/lib/fhevm';
import { parseAbiItem } from 'viem';

// Helper to shorten hash for display
const shortenHash = (hash: string) => `${hash.slice(0, 6)}...${hash.slice(-4)}`;

// Etherscan link component
const EtherscanTxLink = ({ hash, label }: { hash: string; label?: string }) => (
  <a
    href={`https://sepolia.etherscan.io/tx/${hash}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-aegean hover:text-aegean/80 hover:underline font-mono text-sm transition-colors"
    title={hash}
  >
    <span>🔗</span>
    <span>{label || shortenHash(hash)}</span>
  </a>
);

// Helper to save vote to localStorage
const saveVoteToHistory = (address: string, pollId: number, txHash: string) => {
  if (typeof window === 'undefined') return;
  try {
    const key = `veil-vote-history-${address.toLowerCase()}`;
    const existing = localStorage.getItem(key);
    const history = existing ? JSON.parse(existing) : {};
    history[pollId.toString()] = txHash;
    localStorage.setItem(key, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save vote history:', error);
  }
};

// Helper to get vote hash from localStorage
const getVoteHashFromHistory = (address: string, pollId: number): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const key = `veil-vote-history-${address.toLowerCase()}`;
    const existing = localStorage.getItem(key);
    if (!existing) return null;
    const history = JSON.parse(existing);
    return history[pollId.toString()] || null;
  } catch {
    return null;
  }
};

interface PollCardProps {
  pollId: number;
  onVoteSuccess?: () => void;
}

interface PollInfo {
  id: bigint;
  creator: string;
  title: string;
  description: string;
  startTime: bigint;
  endTime: bigint;
  totalVoters: bigint;
  isActive: boolean;
  hasEnded: boolean;
}

export function PollCard({ pollId, onVoteSuccess }: PollCardProps) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isVoting, setIsVoting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedResults, setDecryptedResults] = useState<{ yes: number; no: number } | null>(null);
  const [voteChoice, setVoteChoice] = useState<boolean | null>(null);
  const [showVoteButtons, setShowVoteButtons] = useState(false);
  const [voteTxHash, setVoteTxHash] = useState<string | null>(null);
  const [decryptTxHash, setDecryptTxHash] = useState<string | null>(null);

  // Fetch vote tx hash from blockchain events
  useEffect(() => {
    const fetchVoteTxHash = async () => {
      if (!address || !publicClient || !pollId) return;
      
      try {
        const logs = await publicClient.getLogs({
          address: VEIL_VOTE_ADDRESS,
          event: parseAbiItem('event VoteCast(uint256 indexed pollId, address indexed voter, uint256 timestamp)'),
          args: {
            pollId: BigInt(pollId),
            voter: address,
          },
          fromBlock: 'earliest',
          toBlock: 'latest',
        });
        
        if (logs.length > 0) {
          setVoteTxHash(logs[0].transactionHash);
        }
      } catch (error) {
        console.error('Failed to fetch vote tx hash:', error);
        // Fallback to localStorage
        const savedHash = getVoteHashFromHistory(address, pollId);
        if (savedHash) {
          setVoteTxHash(savedHash);
        }
      }
    };

    fetchVoteTxHash();
  }, [address, publicClient, pollId]);

  // Fetch poll info
  const { data: pollInfo, refetch: refetchPollInfo } = useReadContract({
    address: VEIL_VOTE_ADDRESS,
    abi: VEIL_VOTE_ABI,
    functionName: 'getPollInfo',
    args: [BigInt(pollId)],
    query: { enabled: !!pollId }
  });

  // Check if user has voted
  const { data: hasVoted, refetch: refetchHasVoted } = useReadContract({
    address: VEIL_VOTE_ADDRESS,
    abi: VEIL_VOTE_ABI,
    functionName: 'hasUserVoted',
    args: address ? [BigInt(pollId), address] : undefined,
    query: { enabled: !!pollId && !!address }
  });

  // Get encrypted results (only after poll ends)
  const { data: encryptedResults } = useReadContract({
    address: VEIL_VOTE_ADDRESS,
    abi: VEIL_VOTE_ABI,
    functionName: 'getEncryptedResults',
    args: [BigInt(pollId)],
    query: { enabled: !!pollId && pollInfo?.[8] === true } // hasEnded
  });

  // Vote transaction
  const { writeContract, data: txHash, isPending: isWriting, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Update countdown timer
  useEffect(() => {
    if (!pollInfo) return;
    
    const endTime = Number(pollInfo[5]) * 1000;
    
    const updateTimer = () => {
      const now = Date.now();
      const remaining = endTime - now;
      
      if (remaining <= 0) {
        setTimeRemaining('Ended');
        refetchPollInfo();
        return;
      }
      
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      
      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [pollInfo, refetchPollInfo]);

  // Handle vote confirmation
  useEffect(() => {
    if (isConfirmed && txHash && address) {
      setIsVoting(false);
      setVoteTxHash(txHash); // Save vote transaction hash
      saveVoteToHistory(address, pollId, txHash); // Persist to localStorage
      refetchHasVoted();
      refetchPollInfo();
      setShowVoteButtons(false);
      setVoteChoice(null);
      reset();
      onVoteSuccess?.();
    }
  }, [isConfirmed, txHash, address, pollId, refetchHasVoted, refetchPollInfo, reset, onVoteSuccess]);

  // Reset isVoting when transaction starts (writeContract succeeded)
  useEffect(() => {
    if (txHash) {
      setIsVoting(false); // Encryption done, now waiting for confirmation
    }
  }, [txHash]);

  const handleVote = useCallback(async (voteYes: boolean) => {
    if (!isConnected || !address) return;
    
    setIsVoting(true);
    setVoteChoice(voteYes);
    
    try {
      // Initialize FHEVM SDK
      await initializeFhevm();
      
      // Encrypt the vote choice: 1 = Yes, 0 = No
      const encrypted = await encryptValue(
        voteYes ? 1 : 0,
        VEIL_VOTE_ADDRESS,
        address
      );
      
      if (!encrypted) {
        console.error('Failed to encrypt vote');
        setIsVoting(false);
        return;
      }
      
      console.log('🔐 Vote encrypted:', { voteYes, handle: encrypted.handle });
      
      // Send encrypted vote to contract
      writeContract({
        address: VEIL_VOTE_ADDRESS,
        abi: VEIL_VOTE_ABI,
        functionName: 'vote',
        args: [BigInt(pollId), encrypted.handle as `0x${string}`, encrypted.inputProof as `0x${string}`],
      });
    } catch (error) {
      console.error('Vote encryption failed:', error);
      setIsVoting(false);
    }
  }, [isConnected, address, pollId, writeContract]);

  // Request decryption access transaction
  const { writeContract: requestAccess, data: accessTxHash, isPending: isRequestingAccess } = useWriteContract();
  const { isLoading: isAccessConfirming, isSuccess: isAccessConfirmed } = useWaitForTransactionReceipt({ hash: accessTxHash });

  // Decrypt results (batch - single signature)
  const handleDecrypt = useCallback(async () => {
    if (!walletClient || !encryptedResults || !address) return;

    setIsDecrypting(true);
    try {
      // Step 1: Request decryption access on-chain
      requestAccess({
        address: VEIL_VOTE_ADDRESS,
        abi: VEIL_VOTE_ABI,
        functionName: 'requestDecryptionAccess',
        args: [BigInt(pollId)],
      });
    } catch (error) {
      console.error('Failed to request access:', error);
      setIsDecrypting(false);
    }
  }, [walletClient, encryptedResults, address, pollId, requestAccess]);

  // Step 2: After access granted, perform decryption
  useEffect(() => {
    if (!isAccessConfirmed || !walletClient || !encryptedResults || !address) return;

    // Save decrypt access transaction hash
    if (accessTxHash) {
      setDecryptTxHash(accessTxHash);
    }

    const performDecryption = async () => {
      try {
        await initializeFhevm();
        
        const [yesHandle, noHandle] = encryptedResults;
        
        // Batch decrypt both YES and NO votes with single signature
        const result = await requestBatchUserDecryption(
          [yesHandle as string, noHandle as string],
          VEIL_VOTE_ADDRESS,
          address,
          async (params) => {
            return await walletClient.signTypedData({
              domain: params.domain as any,
              types: params.types as any,
              primaryType: params.primaryType,
              message: params.message as any,
            });
          }
        );

        if (result.success && result.values) {
          setDecryptedResults({
            yes: Number(result.values[yesHandle as string] || 0n),
            no: Number(result.values[noHandle as string] || 0n),
          });
        }
      } catch (error) {
        console.error('Decryption failed:', error);
      } finally {
        setIsDecrypting(false);
      }
    };

    performDecryption();
  }, [isAccessConfirmed, accessTxHash, walletClient, encryptedResults, address]);

  if (!pollInfo) {
    return (
      <div className="animate-pulse bg-white rounded-sm p-8 border border-stone-200 shadow-sm">
        <div className="h-8 bg-stone-200 rounded w-3/4 mb-6"></div>
        <div className="h-4 bg-stone-100 rounded w-1/2"></div>
      </div>
    );
  }

  const [id, creator, title, description, startTime, endTime, totalVoters, isActive, hasEnded] = pollInfo;
  const isCreator = address?.toLowerCase() === creator.toLowerCase();
  const canVote = isConnected && !hasVoted && !hasEnded && isActive;
  const canDecrypt = hasEnded && isConnected && !decryptedResults;

  return (
    <div className="stone-card p-8 rounded-sm hover:shadow-md transition-all duration-500 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 pr-4">
          <h3 className="text-2xl font-cinzel font-black text-black mb-3 group-hover:text-aegean transition-colors leading-tight">{title}</h3>
          {description && (
            <p className="text-black text-lg font-inter font-medium leading-relaxed line-clamp-3">{description}</p>
          )}
        </div>
        <div className={`px-3 py-1 border-2 text-sm font-cinzel font-black tracking-widest uppercase ${
          hasEnded 
            ? 'border-clay text-clay bg-clay/5' 
            : 'border-olive text-olive bg-olive/5'
        }`}>
          {hasEnded ? 'Closed' : 'Open'}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 mb-6 text-base text-black font-bold font-cinzel uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗳️</span>
          <span>{Number(totalVoters)} Votes</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl">⏳</span>
          <span>{timeRemaining}</span>
        </div>
      </div>

      {/* Creator badge */}
      {isCreator && (
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 bg-stone-100 border border-stone-200 text-sm text-black font-cinzel font-bold uppercase tracking-wider">
          <span>✏️</span>
          You are the author
        </div>
      )}

      {/* Vote Status - Show for both active and ended polls if user voted */}
      {hasVoted && (
        <div className={`mb-6 p-4 ${hasEnded ? 'bg-stone-100 border-2 border-stone-300' : 'bg-olive/5 border-2 border-olive/30'}`}>
          <div className={`text-base font-cinzel font-black uppercase tracking-wide flex items-center gap-3 ${hasEnded ? 'text-black/70 mb-1' : 'text-olive mb-2'}`}>
            <span className="text-xl">✓</span>
            {hasEnded ? 'You Voted' : 'Vote Submitted (Encrypted)'}
          </div>
          {voteTxHash && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-black/60 font-inter">Vote Tx:</span>
              <EtherscanTxLink hash={voteTxHash} />
            </div>
          )}
        </div>
      )}

      {/* Decrypted Results */}
      {decryptedResults && (
        <div className="mb-6 p-6 bg-stone-50 border-2 border-stone-200">
          <h4 className="text-black font-cinzel font-black text-lg mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-stone-200 pb-2">
            <span className="text-gold">📊</span>
            Results
          </h4>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center p-4 bg-white border border-stone-100 shadow-sm">
              <div className="text-4xl font-cinzel font-black text-olive mb-1">{decryptedResults.yes}</div>
              <div className="text-sm text-black font-cinzel font-bold uppercase tracking-widest">Yes</div>
            </div>
            <div className="text-center p-4 bg-white border border-stone-100 shadow-sm">
              <div className="text-4xl font-cinzel font-black text-clay mb-1">{decryptedResults.no}</div>
              <div className="text-sm text-black font-cinzel font-bold uppercase tracking-widest">No</div>
            </div>
          </div>
          {decryptedResults.yes + decryptedResults.no > 0 && (
            <div className="mt-4">
              <div className="flex h-2 bg-stone-200">
                <div 
                  className="bg-olive transition-all duration-1000 ease-out"
                  style={{ width: `${(decryptedResults.yes / (decryptedResults.yes + decryptedResults.no)) * 100}%` }}
                />
                <div 
                  className="bg-clay transition-all duration-1000 ease-out"
                  style={{ width: `${(decryptedResults.no / (decryptedResults.yes + decryptedResults.no)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] font-cinzel text-mist uppercase">
                <span>{(decryptedResults.yes / (decryptedResults.yes + decryptedResults.no) * 100).toFixed(1)}%</span>
                <span>{(decryptedResults.no / (decryptedResults.yes + decryptedResults.no) * 100).toFixed(1)}%</span>
              </div>
            </div>
          )}
          {decryptTxHash && (
            <div className="mt-4 pt-3 border-t border-stone-200 flex items-center gap-2 text-sm">
              <span className="text-black/60 font-inter">Decrypt Tx:</span>
              <EtherscanTxLink hash={decryptTxHash} />
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 pt-2">
        {canVote && !showVoteButtons && (
          <button
            onClick={() => setShowVoteButtons(true)}
            className="btn-primary flex-1 py-3 text-sm uppercase rounded-sm"
          >
            Vote Now
          </button>
        )}

        {showVoteButtons && canVote && (
          <>
            <button
              onClick={() => handleVote(true)}
              disabled={isVoting || isWriting || isConfirming}
              className={`flex-1 py-3 font-cinzel font-bold uppercase tracking-wider border-2 transition-all duration-200 active:scale-95 rounded-sm ${
                voteChoice === true && isVoting
                  ? 'bg-olive text-white border-olive'
                  : 'bg-transparent text-olive border-olive hover:bg-olive hover:text-white'
              } disabled:opacity-50`}
            >
              {isVoting && voteChoice === true ? 'Encrypting...' : 'Yes'}
            </button>
            <button
              onClick={() => handleVote(false)}
              disabled={isVoting || isWriting || isConfirming}
              className={`flex-1 py-3 font-cinzel font-bold uppercase tracking-wider border-2 transition-all duration-200 active:scale-95 rounded-sm ${
                voteChoice === false && isVoting
                  ? 'bg-clay text-white border-clay'
                  : 'bg-transparent text-clay border-clay hover:bg-clay hover:text-white'
              } disabled:opacity-50`}
            >
              {isVoting && voteChoice === false ? 'Encrypting...' : 'No'}
            </button>
          </>
        )}

        {canDecrypt && (
          <button
            onClick={handleDecrypt}
            disabled={isDecrypting || isRequestingAccess || isAccessConfirming}
            className="btn-secondary flex-1 py-3 text-sm uppercase rounded-sm"
          >
            {isRequestingAccess || isAccessConfirming ? 'Requesting Access...' : isDecrypting ? 'Decrypting...' : 'View Results'}
          </button>
        )}

        {hasEnded && !isConnected && !decryptedResults && (
          <div className="flex-1 py-3 text-center text-mist text-sm font-cinzel italic border border-stone-200 bg-stone-50">
            Connect wallet to view results
          </div>
        )}
      </div>
    </div>
  );
}
