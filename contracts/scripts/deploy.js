const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AnnotationPlatform with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const Contract = await ethers.getContractFactory("AnnotationPlatform");
  console.log("Deploying...");
  const contract = await Contract.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ AnnotationPlatform deployed to:", address);
  console.log("📋 Add this to your backend .env:");
  console.log(`   CONTRACT_ADDRESS=${address}`);
  console.log("\n📁 Copy ABI to backend:");
  console.log("   cp artifacts/contracts/AnnotationPlatform.sol/AnnotationPlatform.json ../backend/app/abi/");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
