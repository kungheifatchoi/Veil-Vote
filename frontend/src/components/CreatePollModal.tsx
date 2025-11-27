'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { VEIL_VOTE_ADDRESS, VEIL_VOTE_ABI, DURATION_OPTIONS } from '@/lib/contracts';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePollModal({ isOpen, onClose, onSuccess }: CreatePollModalProps) {
  const { isConnected } = useAccount();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60); // Default 1 minute
  const [showSuccess, setShowSuccess] = useState(false);

  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setTitle('');
        setDescription('');
        setDuration(300);
        reset();
        onSuccess();
        onClose();
      }, 2000);
    }
  }, [isConfirmed, reset, onSuccess, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !isConnected) return;

    writeContract({
      address: VEIL_VOTE_ADDRESS,
      abi: VEIL_VOTE_ABI,
      functionName: 'createPoll',
      args: [title.trim(), description.trim(), BigInt(duration)],
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-alabaster rounded-sm border border-gold/30 shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Decorative top border */}
        <div className="h-1 w-full bg-gradient-to-r from-aegean via-gold to-aegean"></div>

        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-stone-200 bg-white">
          <h2 className="text-2xl font-cinzel font-bold text-black flex items-center gap-3">
            <span className="text-2xl text-aegean">📝</span> Create Poll
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-black hover:text-clay transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-alabaster">
          {/* Title */}
          <div>
            <label className="block text-base font-cinzel font-bold text-black mb-3 uppercase tracking-wider">
              Title <span className="text-clay">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Should we adopt the 4-day work week?"
              maxLength={200}
              className="w-full px-4 py-3 bg-white border border-stone-300 rounded-sm text-black text-base placeholder-stone-400 focus:outline-none focus:border-aegean focus:ring-1 focus:ring-aegean/20 transition-all font-inter font-medium"
              required
            />
            <p className="mt-2 text-sm text-black text-right font-inter font-medium">{title.length}/200</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-base font-cinzel font-bold text-black mb-3 uppercase tracking-wider">
              Details <span className="text-black/50 font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Elaborate on the details of your proposal..."
              maxLength={1000}
              rows={4}
              className="w-full px-4 py-3 bg-white border border-stone-300 rounded-sm text-black text-base placeholder-stone-400 focus:outline-none focus:border-aegean focus:ring-1 focus:ring-aegean/20 transition-all resize-none font-inter font-medium"
            />
            <p className="mt-2 text-sm text-black text-right font-inter font-medium">{description.length}/1000</p>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-base font-cinzel font-bold text-black mb-3 uppercase tracking-wider">
              Duration <span className="text-clay">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDuration(option.value)}
                  className={`px-4 py-3 text-left transition-all border rounded-sm ${
                    duration === option.value
                      ? 'bg-aegean text-white border-aegean shadow-md'
                      : 'bg-white border-stone-200 text-black hover:border-aegean/50'
                  }`}
                >
                  <div className={`font-cinzel font-bold text-base ${duration === option.value ? 'text-white' : 'text-black'}`}>
                    {option.label}
                  </div>
                  {option.description && (
                    <div className={`text-sm mt-1 font-inter font-medium ${duration === option.value ? 'text-white/80' : 'text-black/60'}`}>
                      {option.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-clay/5 border border-clay/20 text-clay text-base font-inter font-medium flex items-start gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {error.message?.includes('User rejected') 
                  ? 'Transaction rejected by user.' 
                  : 'Failed to create poll. Please try again.'}
              </span>
            </div>
          )}

          {/* Success */}
          {showSuccess && (
            <div className="p-4 bg-olive/5 border border-olive/20 text-olive text-base font-inter font-bold flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Poll created successfully!</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-black text-base font-cinzel font-bold uppercase tracking-wider hover:text-clay transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isPending || isConfirming || !isConnected}
              className="flex-1 btn-primary py-3 text-base uppercase rounded-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isConfirming ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>Create Poll</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
