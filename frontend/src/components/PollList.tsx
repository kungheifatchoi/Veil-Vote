'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { VEIL_VOTE_ADDRESS, VEIL_VOTE_ABI } from '@/lib/contracts';
import { PollCard } from './PollCard';
import { CreatePollModal } from './CreatePollModal';

export function PollList() {
  const { isConnected } = useAccount();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'ended'>('all');

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

  const handleCreateSuccess = () => {
    refetchPolls();
  };

  // Filter polls based on status
  const filteredPollIds = (pollIds || []).filter((pollId, index) => {
    if (filter === 'all') return true;
    
    const statusResult = pollStatuses?.[index];
    if (!statusResult || statusResult.status !== 'success') return true; // Show if status unknown
    
    const status = Number(statusResult.result);
    // status: 0 = Active, 1 = Ended
    if (filter === 'active') return status === 0;
    if (filter === 'ended') return status === 1;
    return true;
  });

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
      <div className="flex gap-3 border-b border-stone-200 pb-1">
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
      </div>

      {/* Poll Grid */}
      {reversedPollIds.length > 0 ? (
        <div className="grid gap-8 md:grid-cols-2">
          {reversedPollIds.map((pollId) => (
            <PollCard 
              key={Number(pollId)} 
              pollId={Number(pollId)} 
              onVoteSuccess={refetchPolls}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-stone-200 rounded-sm shadow-sm">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-stone-50 border border-stone-100 mb-6">
            <svg className="w-12 h-12 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-black text-xl mb-3 font-cinzel font-bold">
            {filter === 'all' ? 'No Polls Yet' : `No ${filter} polls`}
          </p>
          <p className="text-black text-base font-inter font-medium">
            {filter === 'all' && isConnected && 'Be the first to create a poll.'}
            {filter === 'all' && !isConnected && 'Connect wallet to create a poll.'}
            {filter === 'active' && 'No active polls.'}
            {filter === 'ended' && 'No ended polls yet.'}
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
