// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AnnotationPlatform {

    // ─── Data structures ───────────────────────────────────────────────
    struct Annotation {
        address annotator;
        string  taskId;
        string  itemId;
        string  label;
        uint256 timestamp;
        bool    rewarded;
    }

    struct Task {
        string  taskId;
        address creator;
        uint256 rewardPerAnnotation; // in wei
        bool    active;
        uint256 totalAnnotations;
    }

    struct AnnotatorStats {
        uint256 totalAnnotations;
        uint256 totalRewardEarned; // in wei
        bool    exists;
    }

    // ─── State ─────────────────────────────────────────────────────────
    mapping(string => Task)                       public tasks;
    mapping(bytes32 => Annotation)                public annotations;
    mapping(address => AnnotatorStats)            public annotatorStats;
    // taskId => itemId => annotator => annotationId
    mapping(string => mapping(string => mapping(address => bytes32))) public annotationIndex;

    address public owner;
    uint256 public totalAnnotationsGlobal;

    // ─── Events ────────────────────────────────────────────────────────
    event TaskCreated(string indexed taskId, address indexed creator, uint256 rewardPerAnnotation);
    event AnnotationSubmitted(bytes32 indexed annotationId, string taskId, string itemId, address indexed annotator, string label);
    event RewardPaid(address indexed annotator, uint256 amount, bytes32 annotationId);
    event FundsDeposited(string indexed taskId, uint256 amount);

    // ─── Modifiers ─────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier taskExists(string memory taskId) {
        require(bytes(tasks[taskId].taskId).length > 0, "Task not found");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ─── Admin functions ───────────────────────────────────────────────

    function createTask(string memory taskId, uint256 rewardPerAnnotation) external onlyOwner {
        require(bytes(tasks[taskId].taskId).length == 0, "Task already exists");
        tasks[taskId] = Task({
            taskId: taskId,
            creator: msg.sender,
            rewardPerAnnotation: rewardPerAnnotation,
            active: true,
            totalAnnotations: 0
        });
        emit TaskCreated(taskId, msg.sender, rewardPerAnnotation);
    }

    function depositFunds(string memory taskId) external payable onlyOwner taskExists(taskId) {
        require(msg.value > 0, "Must send ETH");
        emit FundsDeposited(taskId, msg.value);
    }

    function toggleTask(string memory taskId, bool active) external onlyOwner taskExists(taskId) {
        tasks[taskId].active = active;
    }

    // Allow plain ETH deposits
    receive() external payable {}

    // ─── Annotator functions ───────────────────────────────────────────

    function submitAnnotation(
        string memory taskId,
        string memory itemId,
        string memory label
    ) external taskExists(taskId) returns (bytes32) {
        require(tasks[taskId].active, "Task not active");
        require(
            annotationIndex[taskId][itemId][msg.sender] == bytes32(0),
            "Already annotated this item"
        );

        bytes32 annotationId = keccak256(
            abi.encodePacked(taskId, itemId, msg.sender, block.timestamp)
        );

        annotations[annotationId] = Annotation({
            annotator:  msg.sender,
            taskId:     taskId,
            itemId:     itemId,
            label:      label,
            timestamp:  block.timestamp,
            rewarded:   false
        });

        annotationIndex[taskId][itemId][msg.sender] = annotationId;

        if (!annotatorStats[msg.sender].exists) {
            annotatorStats[msg.sender].exists = true;
        }
        annotatorStats[msg.sender].totalAnnotations++;
        tasks[taskId].totalAnnotations++;
        totalAnnotationsGlobal++;

        emit AnnotationSubmitted(annotationId, taskId, itemId, msg.sender, label);
        return annotationId;
    }

    // ─── Reward function (called by backend after Kappa validation) ────

    function payReward(address payable annotator, bytes32 annotationId) external onlyOwner {
        Annotation storage ann = annotations[annotationId];
        require(ann.annotator == annotator, "Annotator mismatch");
        require(!ann.rewarded, "Already rewarded");

        uint256 reward = tasks[ann.taskId].rewardPerAnnotation;
        require(address(this).balance >= reward, "Insufficient contract balance");

        ann.rewarded = true;
        annotatorStats[annotator].totalRewardEarned += reward;

        annotator.transfer(reward);
        emit RewardPaid(annotator, reward, annotationId);
    }

    // ─── View functions ────────────────────────────────────────────────

    function getAnnotatorStats(address annotator) external view returns (
        uint256 totalAnnotations,
        uint256 totalRewardEarned
    ) {
        AnnotatorStats memory s = annotatorStats[annotator];
        return (s.totalAnnotations, s.totalRewardEarned);
    }

    function getAnnotation(bytes32 annotationId) external view returns (Annotation memory) {
        return annotations[annotationId];
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
