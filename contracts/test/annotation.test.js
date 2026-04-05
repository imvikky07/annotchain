const { expect } = require("chai");
const { ethers }  = require("hardhat");

describe("AnnotationPlatform", function () {
  let contract, owner, annotator, annotator2;

  beforeEach(async () => {
    [owner, annotator, annotator2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AnnotationPlatform");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  describe("Task management", () => {
    it("creates a task with correct reward", async () => {
      await contract.createTask("task-1", ethers.parseEther("0.001"));
      const task = await contract.tasks("task-1");
      expect(task.active).to.be.true;
      expect(task.rewardPerAnnotation).to.equal(ethers.parseEther("0.001"));
      expect(task.creator).to.equal(owner.address);
    });

    it("reverts when creating duplicate task", async () => {
      await contract.createTask("task-1", ethers.parseEther("0.001"));
      await expect(
        contract.createTask("task-1", ethers.parseEther("0.001"))
      ).to.be.revertedWith("Task already exists");
    });

    it("only owner can create task", async () => {
      await expect(
        contract.connect(annotator).createTask("task-2", ethers.parseEther("0.001"))
      ).to.be.revertedWith("Not owner");
    });

    it("deposits funds and emits event", async () => {
      await contract.createTask("task-1", ethers.parseEther("0.001"));
      const amount = ethers.parseEther("0.1");
      await expect(contract.depositFunds("task-1", { value: amount }))
        .to.emit(contract, "FundsDeposited")
        .withArgs("task-1", amount);
      const balance = await contract.getContractBalance();
      expect(balance).to.equal(amount);
    });

    it("can toggle task active status", async () => {
      await contract.createTask("task-1", ethers.parseEther("0.001"));
      await contract.toggleTask("task-1", false);
      const task = await contract.tasks("task-1");
      expect(task.active).to.be.false;
    });
  });

  describe("Annotation submission", () => {
    beforeEach(async () => {
      await contract.createTask("task-1", ethers.parseEther("0.001"));
    });

    it("submits annotation and emits AnnotationSubmitted event", async () => {
      const tx = await contract.connect(annotator)
        .submitAnnotation("task-1", "item-1", "positive");
      const receipt = await tx.wait();

      const event = receipt.logs
        .map(log => { try { return contract.interface.parseLog(log); } catch { return null; } })
        .find(e => e?.name === "AnnotationSubmitted");

      expect(event).to.not.be.null;
      expect(event.args.label).to.equal("positive");
      expect(event.args.annotator).to.equal(annotator.address);
      expect(event.args.taskId).to.equal("task-1");
      expect(event.args.itemId).to.equal("item-1");
    });

    it("prevents duplicate annotation by same annotator on same item", async () => {
      await contract.connect(annotator).submitAnnotation("task-1", "item-1", "positive");
      await expect(
        contract.connect(annotator).submitAnnotation("task-1", "item-1", "negative")
      ).to.be.revertedWith("Already annotated this item");
    });

    it("allows different annotators to annotate same item", async () => {
      await contract.connect(annotator).submitAnnotation("task-1", "item-1", "positive");
      await expect(
        contract.connect(annotator2).submitAnnotation("task-1", "item-1", "negative")
      ).to.not.be.reverted;
    });

    it("reverts on inactive task", async () => {
      await contract.toggleTask("task-1", false);
      await expect(
        contract.connect(annotator).submitAnnotation("task-1", "item-1", "positive")
      ).to.be.revertedWith("Task not active");
    });

    it("tracks annotator stats correctly", async () => {
      await contract.connect(annotator).submitAnnotation("task-1", "item-1", "positive");
      await contract.connect(annotator).submitAnnotation("task-1", "item-2", "negative");
      const [total] = await contract.getAnnotatorStats(annotator.address);
      expect(total).to.equal(2n);
    });

    it("increments global annotation counter", async () => {
      await contract.connect(annotator).submitAnnotation("task-1", "item-1", "positive");
      await contract.connect(annotator2).submitAnnotation("task-1", "item-2", "positive");
      expect(await contract.totalAnnotationsGlobal()).to.equal(2n);
    });
  });

  describe("Reward payment", () => {
    let annotationId;

    beforeEach(async () => {
      await contract.createTask("task-1", ethers.parseEther("0.001"));
      // Fund contract
      await owner.sendTransaction({
        to: await contract.getAddress(),
        value: ethers.parseEther("0.1"),
      });

      const tx = await contract.connect(annotator)
        .submitAnnotation("task-1", "item-1", "positive");
      const receipt = await tx.wait();
      const event = receipt.logs
        .map(log => { try { return contract.interface.parseLog(log); } catch { return null; } })
        .find(e => e?.name === "AnnotationSubmitted");
      annotationId = event.args.annotationId;
    });

    it("pays reward to annotator and emits RewardPaid", async () => {
      const balanceBefore = await ethers.provider.getBalance(annotator.address);
      await expect(contract.payReward(annotator.address, annotationId))
        .to.emit(contract, "RewardPaid")
        .withArgs(annotator.address, ethers.parseEther("0.001"), annotationId);

      const balanceAfter = await ethers.provider.getBalance(annotator.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("0.001"));
    });

    it("prevents double reward payment", async () => {
      await contract.payReward(annotator.address, annotationId);
      await expect(
        contract.payReward(annotator.address, annotationId)
      ).to.be.revertedWith("Already rewarded");
    });

    it("reverts on annotator address mismatch", async () => {
      await expect(
        contract.payReward(annotator2.address, annotationId)
      ).to.be.revertedWith("Annotator mismatch");
    });

    it("tracks total reward earned in annotator stats", async () => {
      await contract.payReward(annotator.address, annotationId);
      const [, totalReward] = await contract.getAnnotatorStats(annotator.address);
      expect(totalReward).to.equal(ethers.parseEther("0.001"));
    });
  });
});
