const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
  if (!CONTRACT_ADDRESS) throw new Error("Set CONTRACT_ADDRESS in .env");

  const [owner] = await ethers.getSigners();
  const artifact = require("../artifacts/contracts/AnnotationPlatform.sol/AnnotationPlatform.json");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, owner);

  const AMOUNT_ETH = "0.05"; // change as needed
  const TASK_ID    = process.env.TASK_ID || "task-1";

  console.log(`Depositing ${AMOUNT_ETH} ETH to contract for task: ${TASK_ID}`);
  const tx = await contract.depositFunds(TASK_ID, {
    value: ethers.parseEther(AMOUNT_ETH),
  });
  await tx.wait();

  const balance = await contract.getContractBalance();
  console.log("✅ Done. Contract balance:", ethers.formatEther(balance), "ETH");
  console.log("Tx hash:", tx.hash);
}

main().catch((e) => { console.error(e); process.exit(1); });
