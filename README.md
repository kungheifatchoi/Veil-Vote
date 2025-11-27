# 🏛️ Veil Vote

> **Vote Behind the Veil** — Fully encrypted on-chain voting powered by FHE.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)

## ✨ What is Veil Vote?

Veil Vote is an encrypted voting application built on **Zama fhEVM**. Using Fully Homomorphic Encryption (FHE), all votes are encrypted **before** being sent to the blockchain and remain encrypted throughout the entire process.

### Key Features

- 🔐 **End-to-End Encryption**: Vote choices (Yes/No) are encrypted on your device before submission
- ⛓️ **On-Chain Computation**: FHE allows vote counting directly on ciphertext — no decryption needed
- 👁️ **Off-Chain Decryption**: Results are decrypted only in the browser, never stored as plaintext on-chain
- 🛡️ **Censorship Resistant**: No one can see individual votes or intermediate results

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Smart Contract | Solidity + `@fhevm/solidity` v0.9 |
| Frontend | Next.js 14 + React 19 + Tailwind CSS |
| Wallet | wagmi v3 + WalletConnect |
| FHE SDK | `@zama-fhe/relayer-sdk` v0.3 |
| Network | Ethereum Sepolia Testnet |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- MetaMask or WalletConnect-compatible wallet

### 1. Clone & Install

```bash
git clone https://github.com/kungheifatchoi/Veil-Vote.git
cd veil-vote

# Install contract dependencies
cd contracts
pnpm install

# Install frontend dependencies
cd ../frontend
pnpm install
```

### 2. Configure Environment

Create `.env` file in `contracts/` directory:

```env
SEPOLIA_RPC_URL=your_sepolia_rpc_url
PRIVATE_KEY=your_deployer_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 3. Deploy Contract

```bash
cd contracts
npx hardhat run scripts/deploy-vote.ts --network sepolia
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

Update the contract address in `frontend/src/lib/contracts.ts`.

### 4. Run Tests

```bash
cd contracts
pnpm test
```

**Test Results:**
```
  VeilVote
    Deployment
      ✔ should deploy with pollCount = 0
      ✔ should have correct duration constants
    Input Validation
      ✔ should reject empty title
      ✔ should reject title longer than 200 characters
      ✔ should reject description longer than 1000 characters
      ✔ should reject duration less than 60 seconds
      ✔ should reject duration more than 15 days
      ✔ should reject non-existent poll queries
      ✔ should reject non-existent poll status queries

  9 passing
```

> ⚠️ **Note**: FHE operations (voting, decryption) require Zama infrastructure and are tested on Sepolia testnet.

### 5. Run Frontend

```bash
cd frontend
pnpm dev
```

Open http://localhost:3000

## 📋 How It Works

### Create a Poll

1. Connect your wallet
2. Click **Create Poll**
3. Enter title and optional description
4. Select duration (1 minute to 15 days)
5. Confirm transaction

### Cast Your Vote

1. Find an active poll
2. Click **Vote Now**
3. Choose **Yes** or **No**
4. Your vote is encrypted locally, then sent to the contract
5. Confirm transaction

### View Results

- **During voting**: Only see total vote count (e.g., "5 Votes")
- **After poll ends**: Anyone can click **View Results** to decrypt

## 🏗️ Project Structure

```
veil-vote/
├── contracts/                 # Smart contracts
│   ├── contracts/
│   │   └── VeilVote.sol      # Main voting contract
│   ├── scripts/
│   │   └── deploy-vote.ts    # Deployment script
│   ├── test/
│   │   └── VeilVote.test.ts  # Unit tests
│   └── hardhat.config.ts
│
├── frontend/                  # Next.js application
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   ├── components/       # React components
│   │   │   ├── PollList.tsx
│   │   │   ├── PollCard.tsx
│   │   │   ├── CreatePollModal.tsx
│   │   │   └── WalletModal.tsx
│   │   └── lib/              # Utilities
│   │       ├── contracts.ts  # Contract config & ABI
│   │       ├── fhevm.ts      # FHE SDK wrapper
│   │       └── wagmi.ts      # Wallet config
│   └── package.json
│
└── README.md
```

## 📜 Smart Contract

**VeilVote**: [`0x1a03f874a5CE8CD02B673C35D381F0DF85F740D1`](https://sepolia.etherscan.io/address/0x1a03f874a5CE8CD02B673C35D381F0DF85F740D1#code)

### Core Functions

| Function | Description |
|----------|-------------|
| `createPoll(title, description, duration)` | Create a new poll |
| `vote(pollId, encryptedChoice, inputProof)` | Submit encrypted vote |
| `getEncryptedResults(pollId)` | Get encrypted vote handles |
| `requestDecryptionAccess(pollId)` | Grant ACL for decryption |
| `getPollInfo(pollId)` | Get poll metadata |

## 🔐 FHE Privacy Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        VOTE FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ENCRYPT (Frontend)                                          │
│     ┌─────────┐        ┌────────────────┐                       │
│     │ Yes = 1 │───────▶│ FHE.encrypt(1) │──▶ einput (ciphertext)│
│     │ No  = 0 │───────▶│ FHE.encrypt(0) │──▶ einput (ciphertext)│
│     └─────────┘        └────────────────┘                       │
│                                                                 │
│  2. COMPUTE (Smart Contract)                                    │
│     ┌────────────────────────────────────────────────────┐      │
│     │ euint64 choice = FHE.fromExternal(encryptedInput)  │      │
│     │ ebool isYes = FHE.gt(choice, 0)                    │      │
│     │ yesVotes = FHE.add(yesVotes, FHE.select(isYes,1,0))│      │
│     │ noVotes  = FHE.add(noVotes, FHE.select(isYes,0,1)) │      │
│     └────────────────────────────────────────────────────┘      │
│                                                                 │
│  3. DECRYPT (Frontend, after poll ends)                         │
│     ┌────────────────┐        ┌─────────┐                       │
│     │ Relayer SDK    │───────▶│ Yes: 12 │  (displayed only)     │
│     │ userDecrypt()  │───────▶│ No:  8  │  (not stored on-chain)│
│     └────────────────┘        └─────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### What's Private?

| Data | On-Chain Visibility |
|------|---------------------|
| Individual vote choice | ❌ Never visible |
| Encrypted vote handles | ✅ Visible (but meaningless without key) |
| Vote timestamp | ✅ Visible |
| Who voted | ✅ Visible (address only) |
| Decrypted results | ❌ Never stored on-chain |

## 💼 Use Cases

- **DAO Governance**: Truly anonymous on-chain proposals
- **Corporate Decisions**: Board voting, employee surveys
- **Community**: Creator polls, content decisions
- **Public Affairs**: Elections, opinion polls

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a PR.

## 📄 License

MIT

---

Built with [Zama FHEVM](https://docs.zama.ai/fhevm)
