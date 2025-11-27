import { ethers } from "hardhat";

async function main() {
  console.log("🗳️ Deploying VeilVote contract...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy VeilVote
  const VeilVote = await ethers.getContractFactory("VeilVote");
  const veilVote = await VeilVote.deploy();
  
  await veilVote.waitForDeployment();
  
  const address = await veilVote.getAddress();
  console.log("✅ VeilVote deployed to:", address);
  console.log("\n📋 Next steps:");
  console.log("1. Update frontend/src/lib/contracts.ts with the new address");
  console.log("2. Verify the contract on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${address}`);
  console.log("\n🔗 Etherscan URL:");
  console.log(`   https://sepolia.etherscan.io/address/${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

