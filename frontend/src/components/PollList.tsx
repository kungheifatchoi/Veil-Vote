'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { VEIL_VOTE_ADDRESS, VEIL_VOTE_ABI } from '@/lib/contracts';
import { PollCard } from './PollCard';
import { CreatePollModal } from './CreatePollModal';

// Helper to get vote history from localStorage
const getVoteHistory = (address: string): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const history = localStorage.getItem(`veil-vote-history-${address.toLowerCase()}`);
    return history ? JSON.parse(history) : {};
  } catch {
    return {};
  }
};

// Helper to shorten hash
const shortenHash = (hash: string) => `${hash.slice(0, 6)}...${hash.slice(-4)}`;

export function PollList() {
  const { isConnected, address } = useAccount();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'ended' | 'my-votes'>('all');
  const [voteHistory, setVoteHistory] = useState<Record<string, string>>({});

  // Fetch all poll IDs
  const { data: pollIds, refetch: refetchPolls } = useReadContract({
    address: VEIL_VOTE_ADDRESS,
    abi: VEIL_VOTE_ABI,
    functionName: 'getAllPollIds',
    query: {
      refetchInterval: 10000, // Refresh every 10 seconds
    }
  });

  // Fetch poll count
  const { data: pollCount } = useReadContract({
    address: VEIL_VOTE_ADDRESS,
    abi: VEIL_VOTE_ABI,
    functionName: 'pollCount',
  });

  // Fetch status for all polls
  const { data: pollStatuses } = useReadContracts({
    contracts: (pollIds || []).map((pollId) => ({
      address: VEIL_VOTE_ADDRESS,
      abi: VEIL_VOTE_ABI,
      functionName: 'getPollStatus',
      args: [pollId],
    })),
    query: {
      enabled: !!pollIds && pollIds.length > 0,
      refetchInterval: 5000, // Check status every 5 seconds
    }
  });

  // Load vote history from localStorage
  useEffect(() => {
    if (address) {
      setVoteHistory(getVoteHistory(address));
    }
  }, [address]);

  // Fetch user's vote status for all polls
  const { data: userVoteStatuses } = useReadContracts({
    contracts: (pollIds || []).map((pollId) => ({
      address: VEIL_VOTE_ADDRESS,
      abi: VEIL_VOTE_ABI,
      functionName: 'hasUserVoted',
      args: [pollId, address],
    })),
    query: {
      enabled: !!pollIds && pollIds.length > 0 && !!address,
      refetchInterval: 10000,
    }
  });

  const handleCreateSuccess = () => {
    refetchPolls();
  };

  // Refresh vote history when a vote is cast
  const handleVoteSuccess = () => {
    refetchPolls();
    if (address) {
      // Small delay to ensure localStorage is updated
      setTimeout(() => {
        setVoteHistory(getVoteHistory(address));
      }, 500);
    }
  };

  // Filter polls based on status
  const filteredPollIds = (pollIds || []).filter((pollId, index) => {
    if (filter === 'all') return true;
    
    // My Votes filter
    if (filter === 'my-votes') {
      const voteResult = userVoteStatuses?.[index];
      return voteResult?.status === 'success' && Boolean(voteResult.result) === true;
    }
    
    const statusResult = pollStatuses?.[index];
    if (!statusResult || statusResult.status !== 'success') return true; // Show if status unknown
    
    const status = Number(statusResult.result);
    // status: 0 = Active, 1 = Ended
    if (filter === 'active') return status === 0;
    if (filter === 'ended') return status === 1;
    return true;
  });

  // Count user's votes
  const myVotesCount = (pollIds || []).filter((_, index) => {
    const voteResult = userVoteStatuses?.[index];
    return voteResult?.status === 'success' && Boolean(voteResult.result) === true;
  }).length;

  const reversedPollIds = [...filteredPollIds].reverse();

  // Count active and ended polls
  const activePollsCount = (pollIds || []).filter((_, index) => {
    const statusResult = pollStatuses?.[index];
    return statusResult?.status === 'success' && Number(statusResult.result) === 0;
  }).length;

  const endedPollsCount = (pollIds || []).filter((_, index) => {
    const statusResult = pollStatuses?.[index];
    return statusResult?.status === 'success' && Number(statusResult.result) === 1;
  }).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-cinzel font-bold text-black flex items-center gap-3">
          <span className="text-2xl">📜</span> Polls
        </h2>

        {isConnected && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary px-6 py-3 rounded-sm flex items-center gap-2 text-base"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Poll
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 border-b border-stone-200 pb-1 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-base font-cinzel font-bold tracking-wide transition-all border-b-2 ${
            filter === 'all'
              ? 'border-aegean text-aegean'
              : 'border-transparent text-black hover:text-aegean hover:border-stone-300'
          }`}
        >
          All ({Number(pollCount || 0)})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 text-base font-cinzel font-bold tracking-wide transition-all border-b-2 ${
            filter === 'active'
              ? 'border-olive text-olive'
              : 'border-transparent text-black hover:text-olive hover:border-stone-300'
          }`}
        >
          <span className="flex items-center gap-1.5">
            Active ({activePollsCount})
          </span>
        </button>
        <button
          onClick={() => setFilter('ended')}
          className={`px-4 py-2 text-base font-cinzel font-bold tracking-wide transition-all border-b-2 ${
            filter === 'ended'
              ? 'border-clay text-clay'
              : 'border-transparent text-black hover:text-clay hover:border-stone-300'
          }`}
        >
          Ended ({endedPollsCount})
        </button>
        {isConnected && (
          <button
            onClick={() => setFilter('my-votes')}
            className={`px-4 py-2 text-base font-cinzel font-bold tracking-wide transition-all border-b-2 ${
              filter === 'my-votes'
                ? 'border-gold text-gold'
                : 'border-transparent text-black hover:text-gold hover:border-stone-300'
            }`}
          >
            <span className="flex items-center gap-1.5">
              🗳️ My Votes ({myVotesCount})
            </span>
          </button>
        )}
      </div>

      {/* Poll Grid */}
      {reversedPollIds.length > 0 ? (
        <>
          {/* My Votes History Header */}
          {filter === 'my-votes' && Object.keys(voteHistory).length > 0 && (
            <div className="bg-gold/5 border border-gold/30 rounded-sm p-4 mb-6">
              <h3 className="text-base font-cinzel font-bold text-black mb-3 flex items-center gap-2">
                <span>📋</span> Vote Transaction History
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.entries(voteHistory).map(([pollId, txHash]) => (
                  <div key={pollId} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-stone-100">
                    <span className="text-black font-inter">Poll #{pollId}</span>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-aegean hover:underline font-mono flex items-center gap-1"
                    >
                      🔗 {shortenHash(txHash)}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-8 md:grid-cols-2">
            {reversedPollIds.map((pollId) => (
              <PollCard 
                key={Number(pollId)} 
                pollId={Number(pollId)} 
                onVoteSuccess={handleVoteSuccess}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-20 bg-white border border-stone-200 rounded-sm shadow-sm">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-stone-50 border border-stone-100 mb-6">
            <svg className="w-12 h-12 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-black text-xl mb-3 font-cinzel font-bold">
            {filter === 'all' ? 'No Polls Yet' : filter === 'my-votes' ? 'No Votes Yet' : `No ${filter} polls`}
          </p>
          <p className="text-black text-base font-inter font-medium">
            {filter === 'all' && isConnected && 'Be the first to create a poll.'}
            {filter === 'all' && !isConnected && 'Connect wallet to create a poll.'}
            {filter === 'active' && 'No active polls.'}
            {filter === 'ended' && 'No ended polls yet.'}
            {filter === 'my-votes' && 'You have not voted on any polls yet.'}
          </p>
        </div>
      )}

      {/* Create Modal */}
      <CreatePollModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
