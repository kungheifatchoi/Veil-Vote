# Veil Vote - Product Requirements Document (PRD)

---

## 📋 Table of Contents

1. [Product Overview](#1-product-overview)
2. [Core Features](#2-core-features)
3. [User Flow](#3-user-flow)
4. [Technical Architecture](#4-technical-architecture)
5. [UI/UX Design](#5-uiux-design)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Deliverables & Success Metrics](#7-deliverables--success-metrics)
8. [Risk Assessment](#8-risk-assessment)
9. [Future Roadmap](#9-future-roadmap)
10. [Appendix](#10-appendix)

---

## 1. Product Overview

### 1.1 Product Name

**Veil Vote**

### 1.2 Slogan

> *"Vote Behind the Veil"*

### 1.3 One-Line Description

An on-chain confidential voting application based on Fully Homomorphic Encryption (FHE), where votes are encrypted but results are transparent.

### 1.4 Problem & Solution

| Problem | Solution |
|---------|----------|
| Traditional on-chain voting is public | Votes stored in FHE encrypted form |
| Voters can see others' choices → herd mentality | Individual votes remain secret until end |
| Vote manipulation through visibility | Encrypted tallying, only final results revealed |

### 1.5 Why FHE is Essential

> ⚠️ **Without FHE, this product cannot exist**

| Without FHE | With FHE |
|-------------|----------|
| All votes visible on-chain | Votes encrypted, only ciphertext visible |
| Voters influenced by seeing others' choices | Independent voting decisions |
| Unfair elections | Fair, secret ballot |

**FHE Value: ⭐⭐⭐⭐⭐** — FHE is not optional, it's fundamental to the product!

### 1.6 Development Principles

> ⚠️ **Core Principle: No compromises or mock operations allowed**

- No mock data - all data must come from real on-chain interactions
- No fake encryption - must use real FHE encryption
- Must deploy to Ethereum Sepolia - end-to-end verifiable
- **Contract must be verified** - source code must be verified on Etherscan

---

## 2. Core Features

### 2.1 Feature List

| Priority | Feature | Description | MVP |
|----------|---------|-------------|-----|
| P0 | Wallet Connection | Support MetaMask + WalletConnect | ✅ |
| P0 | Create Poll | Anyone can create a new poll with title & description | ✅ |
| P0 | Encrypted Voting | Vote choice (Yes/No) is encrypted before submission | ✅ |
| P0 | View Polls | List all active and ended polls | ✅ |
| P0 | Reveal Results | Decrypt and display final results (off-chain only) | ✅ |
| P1 | Voter Count | Show number of participants (not choices) | ✅ |

### 2.2 Feature Specifications

**Create Poll**
- Input: Title, Description (optional), Duration
- Options: Fixed Yes/No voting
- Logic: Store poll metadata → Initialize encrypted counters to 0
- Acceptance: Poll visible in list, voting enabled

**Encrypted Voting**
- Input: Poll ID, Encrypted choice (1=Yes, 0=No)
- Logic: Frontend encrypts choice → Contract receives ciphertext → FHE.add to encrypted counter → Mark as voted
- Acceptance: Vote recorded, **individual choice completely hidden**, one vote per address

**Reveal Results**
- Trigger: Poll end time reached
- Logic: Anyone calls requestDecryptionAccess → SDK decrypts off-chain → Display in frontend
- Storage: **Results NOT stored on-chain** — only ciphertext remains
- Acceptance: Final vote counts shown in UI, blockchain only contains encrypted data

### 2.3 Poll States

```
┌──────────┐     time passes     ┌──────────┐    SDK decrypt    ┌──────────┐
│  Active  │ ──────────────────► │  Ended   │ ────────────────► │ Viewable │
│  (vote)  │                     │ (on-chain)│                  │ (in UI)  │
└──────────┘                     └──────────┘                   └──────────┘
                                      │
                                      └── Only ciphertext stored on-chain
```

---

## 3. User Flow

### 3.1 Create Poll Flow

```
User → Connect Wallet → Click "Create Poll"
                              ↓
                     Fill: Title, Description (optional), Duration
                              ↓
                     Confirm Transaction
                              ↓
                     Poll Created & Listed
```

### 3.2 Voting Flow

```
User → Browse Polls → Select Active Poll
                              ↓
                     Choose Yes or No
                              ↓
              Frontend encrypts choice (einput)
                              ↓
                     Confirm Transaction
                              ↓
              Vote recorded (encrypted on-chain)
              Individual choice NEVER visible
```

### 3.3 Results Flow

```
Poll End Time Reached → Anyone clicks "View Results"
                              ↓
                     Call requestDecryptionAccess() on-chain
                              ↓
                     Sign EIP-712 message for decryption
                              ↓
                     SDK calls Relayer to decrypt
                              ↓
                     Display in UI: "Yes: 15, No: 8"
                              ↓
                     (Results NOT stored on-chain - only in browser)
```

> 🔒 **Privacy Note**: Blockchain only stores encrypted vote counts. Plaintext results exist only in the user's browser.

---

## 4. Technical Architecture

### 4.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  User Browser (Next.js + wagmi + @zama-fhe/relayer-sdk)     │
└─────────────────────────────────────────────────────────────┘
                              ↓ JSON-RPC
┌─────────────────────────────────────────────────────────────┐
│  Ethereum Sepolia + Zama FHEVM Infrastructure               │
│  ├── VeilVote.sol (Encrypted vote storage & tallying)       │
│  ├── ACL Contract (Access control)                          │
│  ├── KMS Verifier (Decryption verification)                 │
│  └── Relayer (Decryption service)                           │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Tech Stack

| Layer | Technology | Description |
|-------|------------|-------------|
| Smart Contract | Solidity ^0.8.24 + @fhevm/solidity 0.9.1 | FHE encrypted contract |
| Framework | Hardhat | Contract dev/test/deploy |
| Frontend | Next.js 14 + React 19 + wagmi v3 | Web3 interaction |
| FHE SDK | @zama-fhe/relayer-sdk 0.3.0 | Encryption/Decryption |
| Styling | Tailwind CSS | UI styling |
| Deployment | Vercel + Ethereum Sepolia | Frontend hosting + Testnet |

### 4.3 Smart Contract Interface

```solidity
interface IVeilVote {
    // Events
    event PollCreated(uint256 indexed pollId, address indexed creator, string title, uint256 startTime, uint256 endTime);
    event VoteCast(uint256 indexed pollId, address indexed voter, uint256 timestamp);
    
    // Create a new poll (fixed Yes/No options)
    function createPoll(
        string memory title,
        string memory description,
        uint256 duration
    ) external returns (uint256 pollId);
    
    // Cast encrypted vote (1=Yes, 0=No, encrypted)
    function vote(
        uint256 pollId,
        externalEuint64 encryptedChoice,
        bytes calldata inputProof
    ) external;
    
    // Grant decryption access (anyone can call after poll ends)
    function requestDecryptionAccess(uint256 pollId) external;
    
    // Get encrypted result handles for off-chain decryption
    function getEncryptedResults(uint256 pollId) external view returns (bytes32 yesHandle, bytes32 noHandle);
    
    // View functions
    function pollCount() external view returns (uint256);
    function getPollInfo(uint256 pollId) external view returns (
        uint256 id,
        address creator,
        string memory title,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 totalVoters,
        bool isActive,
        bool hasEnded
    );
    function hasVoted(uint256 pollId, address voter) external view returns (bool);
}
```

### 4.4 FHE Operations Used

| Operation | Purpose | Code |
|-----------|---------|------|
| `FHE.asEuint64()` | Convert plaintext to encrypted | Initialize counters |
| `FHE.fromExternal()` | Convert einput to euint64 | Process encrypted vote |
| `FHE.add()` | Encrypted addition | Tally votes |
| `FHE.gt()` | Encrypted comparison | Check if vote is Yes (>0) |
| `FHE.select()` | Conditional selection | Route vote to correct counter |
| `FHE.allow()` | ACL authorization | Permit decryption access |

### 4.5 Deployed Contract

| Network | Address | Status |
|---------|---------|--------|
| Ethereum Sepolia | `0x1a03f874a5CE8CD02B673C35D381F0DF85F740D1` | ✅ Verified |

---

## 5. UI/UX Design

### 5.1 Design Theme

**Athenian Democracy Style** - Clean, elegant, conveying fairness and transparency

### 5.2 Visual Style

| Element | Specification |
|---------|---------------|
| **Primary Colors** | Aegean Blue (#1e40af), Alabaster (#fafaf9) |
| **Accent Colors** | Olive (#84cc16), Clay (#c2410c), Muted Gold (#a16207) |
| **Typography** | Cinzel (headings), Inter (body) |
| **Cards** | Warm stone backgrounds, subtle shadows |

### 5.3 Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo + Connect Wallet Button                       │
├─────────────────────────────────────────────────────────────┤
│  Hero Section                                               │
│  "Vote Behind the Veil"                                     │
│  Your choice stays veiled on-chain...                       │
├─────────────────────────────────────────────────────────────┤
│  Status Bar                                                 │
│  • Network: Sepolia ✅  • FHEVM: Ready ✅  • Contract: 0x1a..│
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [+ Create Poll]                                    │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  Filter: [All] [Active] [Ended]                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Poll Card 1  │  │ Poll Card 2  │  │ Poll Card 3  │       │
│  │ 🟢 Active    │  │ 🟢 Active    │  │ 🔴 Ended     │       │
│  │ 5 Votes      │  │ 8 Votes      │  │ [View Results]│      │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
├─────────────────────────────────────────────────────────────┤
│  Feature Cards: Encrypted Votes | On-Chain Tallying | Fair  │
├─────────────────────────────────────────────────────────────┤
│  Footer: Built with Zama FHEVM                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Poll Card States

| State | Visual | Actions |
|-------|--------|---------|
| **Active** | 🟢 Green badge, countdown timer | Yes/No vote buttons |
| **Voted** | ✅ "Vote Submitted (Encrypted)" | Buttons disabled |
| **Ended** | 🔴 Red badge, "Ended" | View Results button |
| **Decrypted** | 📊 Results bar chart | View only |

### 5.5 Create Poll Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Create Poll                                          [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Title *                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Should we adopt a 4-day work week?                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Description (optional)                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Proposal to change company work policy...           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Duration *                                                 │
│  ┌───────────────────────┐                                  │
│  │ ⏱️ 1 minute       ▼   │  (1min ~ 15 days)               │
│  └───────────────────────┘                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              🗳️ Create Poll                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.6 Voting Interface

```
┌─────────────────────────────────────────────────────────────┐
│  🗳️ Should we adopt a 4-day work week?                     │
│  Proposal to change company work policy...                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │      ✅ Yes         │    │      ❌ No          │         │
│  └─────────────────────┘    └─────────────────────┘         │
│                                                             │
│  5 Votes  •  ⏰ 2h 34m remaining                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │               🗳️ Vote Now                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  🔒 Your vote is encrypted. No one can see your choice.    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Non-Functional Requirements

| Category | Requirements |
|----------|--------------|
| **Performance** | Page load < 3s, Vote submit < 5s, Decrypt < 15s |
| **Security** | Votes encrypted end-to-end, one vote per address |
| **Compatibility** | Chrome/Firefox/Safari/Edge, MetaMask + WalletConnect |

---

## 7. Deliverables & Success Metrics

### 7.1 Deliverables Checklist

| Deliverable | Format | Status |
|-------------|--------|--------|
| Smart contract source code | .sol | ✅ |
| Contract test code | .ts | ✅ |
| Frontend source code | Next.js | ✅ |
| Deployed contract address | Verified on Etherscan | ✅ |
| Live Demo | URL | ✅ |
| README documentation | .md | ✅ |
| Demo video | MP4/YouTube | Pending |

### 7.2 Zama Developer Program Scoring Reference

| Criteria | Weight | Our Preparation |
|----------|--------|-----------------|
| Original tech architecture | 35% | FHE encrypted voting + tallying + userDecrypt |
| Working demo deployment | 15% | Ethereum Sepolia + Verified Contract |
| Test coverage | 10% | Hardhat unit tests |
| UI/UX design | 10% | Athenian Democracy themed interface |
| Demo video | 10% | Complete voting cycle demonstration |
| Development effort | 10% | Full-stack implementation |
| Business potential | 10% | DAO governance, community decisions |

### 7.3 Demo Video Script

1. **Intro** (30s): Explain the problem of public on-chain voting
2. **Create Poll** (30s): Create a new poll with 5-minute duration
3. **Vote** (1min): Vote with 2-3 different wallets, show encryption
4. **Wait** (show fast-forward): Wait for poll to end
5. **Reveal** (30s): Decrypt and show final results
6. **Conclusion** (30s): Emphasize FHE value - votes secret, results fair

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| FHEVM SDK changes | Medium | High | Use stable version, track docs |
| Relayer service issues | Medium | Medium | Retry mechanism (3 attempts) |
| Long decryption delay | Low | Medium | Loading states, progress indicators |
| Gas fees spike | Low | Low | Optimize contract, batch operations |

---

## 9. Future Roadmap

| Phase | Features | Business Value |
|-------|----------|----------------|
| **Short-term** | Multiple choice options, Poll categories | More flexible voting |
| **Mid-term** | Weighted voting, Token-gated polls | DAO governance |
| **Long-term** | Delegation, Quadratic voting, Cross-chain | Enterprise governance |

**Target Market**: DAOs, Communities, Organizations, Token holders

**Business Model**: Premium features, White-label solution, Enterprise licensing

---

## 10. Appendix

### 10.1 References

| Resource | Link |
|----------|------|
| Zama Official Docs | https://docs.zama.org/ |
| FHEVM GitHub | https://github.com/zama-ai/fhevm |
| Relayer SDK | https://www.npmjs.com/package/@zama-fhe/relayer-sdk |
| Contract Addresses | https://docs.zama.org/protocol/solidity-guides/smart-contract/configure/contract_addresses |

### 10.2 Glossary

| Term | Definition |
|------|------------|
| **FHE** | Fully Homomorphic Encryption - compute on encrypted data |
| **FHEVM** | Zama's FHE-enhanced EVM |
| **euint64** | Encrypted 64-bit unsigned integer type |
| **einput** | Encrypted input from frontend |
| **Relayer** | Zama's service for handling decryption requests |

### 10.3 Duration Options

| Option | Seconds | Use Case |
|--------|---------|----------|
| ⚡ 1 minute | 60 | Quick testing |
| 5 minutes | 300 | Demo/Video recording |
| 1 hour | 3,600 | Quick polls |
| 6 hours | 21,600 | Short-term |
| 24 hours | 86,400 | Standard |
| 3 days | 259,200 | Important decisions |
| 7 days | 604,800 | Major governance |
| 15 days | 1,296,000 | Long-term decisions |

---

**End of Document**
