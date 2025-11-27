import { Abi } from 'viem';

// VeilVote contract deployed on Sepolia (v5 - fresh for demo video)
export const VEIL_VOTE_ADDRESS = '0x3C10C793CAE53B9d781D569beB8E26D46584c335' as `0x${string}`;
export const SEPOLIA_CHAIN_ID = 11155111;

export const VEIL_VOTE_ABI = [
  // Events
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "pollId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "creator", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "title", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "endTime", "type": "uint256" }
    ],
    "name": "PollCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "pollId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "voter", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "VoteCast",
    "type": "event"
  },
  // Duration constants
  {
    "inputs": [],
    "name": "DURATION_30_SECONDS",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DURATION_5_MINUTES",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DURATION_1_HOUR",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DURATION_6_HOURS",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DURATION_24_HOURS",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DURATION_3_DAYS",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DURATION_7_DAYS",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  // State variables
  {
    "inputs": [],
    "name": "pollCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  // Core functions
  {
    "inputs": [
      { "internalType": "string", "name": "_title", "type": "string" },
      { "internalType": "string", "name": "_description", "type": "string" },
      { "internalType": "uint256", "name": "_duration", "type": "uint256" }
    ],
    "name": "createPoll",
    "outputs": [{ "internalType": "uint256", "name": "pollId", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "pollId", "type": "uint256" },
      { "internalType": "einput", "name": "encryptedChoice", "type": "bytes32" },
      { "internalType": "bytes", "name": "inputProof", "type": "bytes" }
    ],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // View functions
  {
    "inputs": [{ "internalType": "uint256", "name": "pollId", "type": "uint256" }],
    "name": "getEncryptedResults",
    "outputs": [
      { "internalType": "bytes32", "name": "yesHandle", "type": "bytes32" },
      { "internalType": "bytes32", "name": "noHandle", "type": "bytes32" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "pollId", "type": "uint256" }],
    "name": "getPollInfo",
    "outputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "address", "name": "creator", "type": "address" },
      { "internalType": "string", "name": "title", "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" },
      { "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "internalType": "uint256", "name": "endTime", "type": "uint256" },
      { "internalType": "uint256", "name": "totalVoters", "type": "uint256" },
      { "internalType": "bool", "name": "isActive", "type": "bool" },
      { "internalType": "bool", "name": "hasEnded", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllPollIds",
    "outputs": [{ "internalType": "uint256[]", "name": "ids", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "pollId", "type": "uint256" },
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "hasUserVoted",
    "outputs": [{ "internalType": "bool", "name": "voted", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "pollId", "type": "uint256" }],
    "name": "getTimeRemaining",
    "outputs": [{ "internalType": "uint256", "name": "remaining", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "pollId", "type": "uint256" }],
    "name": "getPollStatus",
    "outputs": [{ "internalType": "uint8", "name": "status", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "pollId", "type": "uint256" }],
    "name": "requestDecryptionAccess",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "polls",
    "outputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "address", "name": "creator", "type": "address" },
      { "internalType": "string", "name": "title", "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" },
      { "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "internalType": "uint256", "name": "endTime", "type": "uint256" },
      { "internalType": "euint64", "name": "encryptedYesVotes", "type": "uint256" },
      { "internalType": "euint64", "name": "encryptedNoVotes", "type": "uint256" },
      { "internalType": "uint256", "name": "totalVoters", "type": "uint256" },
      { "internalType": "bool", "name": "isActive", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "hasVoted",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Duration options for UI
export const DURATION_OPTIONS = [
  { label: '⚡ 1 minute', value: 60, description: 'Quick test' },
  { label: '5 minutes', value: 300, description: '' },
  { label: '1 hour', value: 3600, description: '' },
  { label: '6 hours', value: 21600, description: '' },
  { label: '24 hours', value: 86400, description: '' },
  { label: '3 days', value: 259200, description: '' },
  { label: '7 days', value: 604800, description: '' },
  { label: '15 days', value: 1296000, description: '' },
];
