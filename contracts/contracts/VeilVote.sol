// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title VeilVote
 * @notice Encrypted voting system using Fully Homomorphic Encryption (FHE)
 * @dev Votes are encrypted on-chain, only decryptable by authorized users after poll ends
 * @dev Uses @fhevm/solidity v0.9 with userDecrypt model
 */
contract VeilVote is ZamaEthereumConfig {
    
    // ============ Structs ============
    
    struct Poll {
        uint256 id;
        address creator;
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        euint64 encryptedYesVotes;
        euint64 encryptedNoVotes;
        uint256 totalVoters;
        bool isActive;
    }
    
    // ============ State Variables ============
    
    uint256 public pollCount;
    mapping(uint256 => Poll) public polls;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    // Duration presets in seconds
    uint256 public constant DURATION_1_MINUTE = 60;
    uint256 public constant DURATION_5_MINUTES = 300;
    uint256 public constant DURATION_1_HOUR = 3600;
    uint256 public constant DURATION_6_HOURS = 21600;
    uint256 public constant DURATION_24_HOURS = 86400;
    uint256 public constant DURATION_3_DAYS = 259200;
    uint256 public constant DURATION_7_DAYS = 604800;
    uint256 public constant DURATION_15_DAYS = 1296000;
    
    // ============ Events ============
    
    event PollCreated(
        uint256 indexed pollId,
        address indexed creator,
        string title,
        uint256 startTime,
        uint256 endTime
    );
    
    event VoteCast(
        uint256 indexed pollId,
        address indexed voter,
        uint256 timestamp
    );
    
    // ============ Modifiers ============
    
    modifier pollExists(uint256 pollId) {
        require(pollId > 0 && pollId <= pollCount, "Poll does not exist");
        _;
    }
    
    modifier pollActive(uint256 pollId) {
        require(polls[pollId].isActive, "Poll is not active");
        require(block.timestamp < polls[pollId].endTime, "Poll has ended");
        _;
    }
    
    modifier pollEnded(uint256 pollId) {
        require(block.timestamp >= polls[pollId].endTime, "Poll has not ended yet");
        _;
    }
    
    modifier hasNotVoted(uint256 pollId) {
        require(!hasVoted[pollId][msg.sender], "Already voted");
        _;
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Create a new encrypted poll
     * @param _title The title of the poll
     * @param _description The description of the poll (optional)
     * @param _duration Duration in seconds (use preset constants)
     * @return pollId The ID of the created poll
     */
    function createPoll(
        string calldata _title,
        string calldata _description,
        uint256 _duration
    ) external returns (uint256 pollId) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_title).length <= 200, "Title too long");
        require(bytes(_description).length <= 1000, "Description too long");
        require(_duration >= 60 && _duration <= 1296000, "Invalid duration");
        
        pollCount++;
        pollId = pollCount;
        
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + _duration;
        
        // Initialize encrypted vote counts to 0
        euint64 zeroVotes = FHE.asEuint64(0);
        
        polls[pollId] = Poll({
            id: pollId,
            creator: msg.sender,
            title: _title,
            description: _description,
            startTime: startTime,
            endTime: endTime,
            encryptedYesVotes: zeroVotes,
            encryptedNoVotes: zeroVotes,
            totalVoters: 0,
            isActive: true
        });
        
        // Allow contract to perform FHE operations
        FHE.allow(polls[pollId].encryptedYesVotes, address(this));
        FHE.allow(polls[pollId].encryptedNoVotes, address(this));
        
        emit PollCreated(pollId, msg.sender, _title, startTime, endTime);
    }
    
    /**
     * @notice Cast an encrypted vote (fully private - choice is encrypted)
     * @param pollId The ID of the poll
     * @param encryptedChoice Encrypted vote handle: 1 = YES, 0 = NO
     * @param inputProof Proof for the encrypted input from frontend
     */
    function vote(uint256 pollId, externalEuint64 encryptedChoice, bytes calldata inputProof) 
        external 
        pollExists(pollId) 
        pollActive(pollId) 
        hasNotVoted(pollId) 
    {
        // Convert external encrypted input to euint64 (0 = No, 1 = Yes)
        euint64 choice = FHE.fromExternal(encryptedChoice, inputProof);
        
        // isYes = (choice > 0) - encrypted boolean
        ebool isYes = FHE.gt(choice, FHE.asEuint64(0));
        
        // Use select to determine what to add to each counter
        euint64 one = FHE.asEuint64(1);
        
        // Update counters using select
        _updateVoteCounts(pollId, isYes, one);
        
        // Mark as voted
        hasVoted[pollId][msg.sender] = true;
        polls[pollId].totalVoters++;
        
        emit VoteCast(pollId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Internal function to update vote counts (reduces stack depth)
     */
    function _updateVoteCounts(uint256 pollId, ebool isYes, euint64 one) internal {
        euint64 zero = FHE.asEuint64(0);
        
        // If Yes: add 1 to Yes counter, 0 to No counter
        // If No: add 0 to Yes counter, 1 to No counter
        polls[pollId].encryptedYesVotes = FHE.add(
            polls[pollId].encryptedYesVotes, 
            FHE.select(isYes, one, zero)
        );
        polls[pollId].encryptedNoVotes = FHE.add(
            polls[pollId].encryptedNoVotes, 
            FHE.select(isYes, zero, one)
        );
        
        // Allow contract to perform FHE operations
        FHE.allow(polls[pollId].encryptedYesVotes, address(this));
        FHE.allow(polls[pollId].encryptedNoVotes, address(this));
    }
    
    /**
     * @notice Request decryption authorization (anyone can call after poll ends)
     * @param pollId The ID of the poll
     * @dev Grants the caller permission to decrypt the results
     */
    function requestDecryptionAccess(uint256 pollId) 
        external 
        pollExists(pollId) 
        pollEnded(pollId) 
    {
        Poll storage poll = polls[pollId];
        
        // Grant decryption access to the requester
        FHE.allow(poll.encryptedYesVotes, msg.sender);
        FHE.allow(poll.encryptedNoVotes, msg.sender);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get encrypted vote handles for frontend decryption
     * @dev Only callable after poll ends
     * @param pollId The ID of the poll
     * @return yesHandle The encrypted YES votes handle
     * @return noHandle The encrypted NO votes handle
     */
    function getEncryptedResults(uint256 pollId) 
        external 
        view 
        pollExists(pollId) 
        pollEnded(pollId) 
        returns (bytes32 yesHandle, bytes32 noHandle) 
    {
        Poll storage poll = polls[pollId];
        yesHandle = bytes32(euint64.unwrap(poll.encryptedYesVotes));
        noHandle = bytes32(euint64.unwrap(poll.encryptedNoVotes));
    }
    
    /**
     * @notice Get basic poll information
     * @param pollId The ID of the poll
     */
    function getPollInfo(uint256 pollId) 
        external 
        view 
        pollExists(pollId) 
        returns (
            uint256 id,
            address creator,
            string memory title,
            string memory description,
            uint256 startTime,
            uint256 endTime,
            uint256 totalVoters,
            bool isActive,
            bool hasEnded
        ) 
    {
        Poll storage poll = polls[pollId];
        return (
            poll.id,
            poll.creator,
            poll.title,
            poll.description,
            poll.startTime,
            poll.endTime,
            poll.totalVoters,
            poll.isActive,
            block.timestamp >= poll.endTime
        );
    }
    
    /**
     * @notice Get all poll IDs (for listing)
     * @return ids Array of poll IDs
     */
    function getAllPollIds() external view returns (uint256[] memory ids) {
        ids = new uint256[](pollCount);
        for (uint256 i = 1; i <= pollCount; i++) {
            ids[i - 1] = i;
        }
    }
    
    /**
     * @notice Check if user has voted in a poll
     * @param pollId The ID of the poll
     * @param user The user address
     * @return voted Whether the user has voted
     */
    function hasUserVoted(uint256 pollId, address user) 
        external 
        view 
        pollExists(pollId) 
        returns (bool voted) 
    {
        return hasVoted[pollId][user];
    }
    
    /**
     * @notice Get time remaining for a poll
     * @param pollId The ID of the poll
     * @return remaining Seconds remaining, 0 if ended
     */
    function getTimeRemaining(uint256 pollId) 
        external 
        view 
        pollExists(pollId) 
        returns (uint256 remaining) 
    {
        if (block.timestamp >= polls[pollId].endTime) {
            return 0;
        }
        return polls[pollId].endTime - block.timestamp;
    }
    
    /**
     * @notice Get poll status
     * @param pollId The ID of the poll
     * @return status 0 = Active, 1 = Ended
     */
    function getPollStatus(uint256 pollId) 
        external 
        view 
        pollExists(pollId) 
        returns (uint8 status) 
    {
        if (block.timestamp >= polls[pollId].endTime) {
            return 1; // Ended
        }
        return 0; // Active
    }
}
