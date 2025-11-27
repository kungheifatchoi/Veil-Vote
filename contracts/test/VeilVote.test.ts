import { expect } from "chai";
import { ethers } from "hardhat";
import { VeilVote } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * VeilVote Unit Tests
 * 
 * ⚠️ IMPORTANT: FHE operations require Zama's FHEVM infrastructure.
 * 
 * These tests cover:
 * ✅ Contract deployment
 * ✅ Duration constants
 * ✅ Input validation (tested via expected reverts)
 * 
 * FHE-dependent features are manually tested on Sepolia:
 * - Poll creation (FHE.asEuint64)
 * - Encrypted voting (FHE.fromExternal, FHE.add, FHE.select)
 * - Result decryption (FHE.allow + SDK userDecrypt)
 * 
 * Deployed Contract: 0x3C10C793CAE53B9d781D569beB8E26D46584c335
 */
describe("VeilVote", function () {
  let veilVote: VeilVote;
  let owner: HardhatEthersSigner;
  let voter1: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, voter1] = await ethers.getSigners();
    
    const VeilVoteFactory = await ethers.getContractFactory("VeilVote");
    veilVote = await VeilVoteFactory.deploy() as VeilVote;
    await veilVote.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should deploy with pollCount = 0", async function () {
      expect(await veilVote.pollCount()).to.equal(0);
    });

    it("should have correct duration constants", async function () {
      expect(await veilVote.DURATION_1_MINUTE()).to.equal(60);
      expect(await veilVote.DURATION_5_MINUTES()).to.equal(300);
      expect(await veilVote.DURATION_1_HOUR()).to.equal(3600);
      expect(await veilVote.DURATION_6_HOURS()).to.equal(21600);
      expect(await veilVote.DURATION_24_HOURS()).to.equal(86400);
      expect(await veilVote.DURATION_3_DAYS()).to.equal(259200);
      expect(await veilVote.DURATION_7_DAYS()).to.equal(604800);
      expect(await veilVote.DURATION_15_DAYS()).to.equal(1296000);
    });
  });

  describe("Input Validation", function () {
    it("should reject empty title", async function () {
      await expect(
        veilVote.createPoll("", "Description", 300)
      ).to.be.revertedWith("Title cannot be empty");
    });

    it("should reject title longer than 200 characters", async function () {
      const longTitle = "a".repeat(201);
      await expect(
        veilVote.createPoll(longTitle, "Description", 300)
      ).to.be.revertedWith("Title too long");
    });

    it("should reject description longer than 1000 characters", async function () {
      const longDescription = "a".repeat(1001);
      await expect(
        veilVote.createPoll("Title", longDescription, 300)
      ).to.be.revertedWith("Description too long");
    });

    it("should reject duration less than 60 seconds", async function () {
      await expect(
        veilVote.createPoll("Title", "Description", 59)
      ).to.be.revertedWith("Invalid duration");
    });

    it("should reject duration more than 15 days", async function () {
      await expect(
        veilVote.createPoll("Title", "Description", 1296001)
      ).to.be.revertedWith("Invalid duration");
    });

    it("should reject non-existent poll queries", async function () {
      await expect(
        veilVote.getPollInfo(999)
      ).to.be.revertedWith("Poll does not exist");
    });

    it("should reject non-existent poll status queries", async function () {
      await expect(
        veilVote.getPollStatus(999)
      ).to.be.revertedWith("Poll does not exist");
    });
  });

  /**
   * ============================================================
   * FHE-DEPENDENT TESTS (Require Sepolia Testnet)
   * ============================================================
   * 
   * The following features have been manually verified on Sepolia:
   * 
   * 1. Poll Creation ✅
   *    - createPoll() initializes encrypted counters via FHE.asEuint64(0)
   *    - Emits PollCreated event with correct parameters
   * 
   * 2. Encrypted Voting ✅
   *    - vote() accepts encrypted input (einput + inputProof)
   *    - FHE.fromExternal() converts external input to euint64
   *    - FHE.gt() + FHE.select() routes vote to correct counter
   *    - FHE.add() tallies votes in ciphertext
   *    - Individual vote choices remain completely hidden
   * 
   * 3. Access Control ✅
   *    - requestDecryptionAccess() grants ACL permission after poll ends
   *    - FHE.allow() authorizes caller for decryption
   * 
   * 4. Result Decryption ✅
   *    - getEncryptedResults() returns ciphertext handles
   *    - SDK userDecrypt() with EIP-712 signature decrypts off-chain
   *    - Results displayed in frontend only, never stored on-chain
   * 
   * Live Demo: https://sepolia.etherscan.io/address/0x3C10C793CAE53B9d781D569beB8E26D46584c335
   */
});
