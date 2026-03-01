// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ComplianceRegistry
 * @dev Stores compliance stamps on-chain. Each transaction gets a ZK proof hash
 *      stamped by the CompliAgent middleware, verifiable by any auditor.
 *      Supports batch stamping for high throughput on Monad (~400ms blocks).
 */
contract ComplianceRegistry {
    address public owner;

    struct ComplianceStamp {
        bytes32 proofHash;
        uint256 timestamp;
        bool stamped;
    }

    // txHash => ComplianceStamp
    mapping(bytes32 => ComplianceStamp) public stamps;

    // Compliance rules stored on-chain
    struct Rule {
        string name;
        string ruleType;  // "budget_cap", "vendor_allowlist", "aml_threshold", "rate_limit"
        uint256 value;
        bool enabled;
    }

    Rule[] public rules;

    // Stats for audit
    uint256 public totalStamped;

    event ComplianceStamped(bytes32 indexed txHash, bytes32 proofHash, uint256 timestamp);
    event BatchStamped(uint256 count, uint256 timestamp);
    event RuleUpdated(uint256 indexed ruleIndex, string name, bool enabled);
    event AuditGenerated(bytes32 indexed auditHash, uint256 totalTransactions, uint256 passRate);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Stamp a transaction as compliant with a ZK proof hash
    function verifyAndStamp(bytes32 txHash, bytes32 proofHash) external onlyOwner {
        require(!stamps[txHash].stamped, "Already stamped");
        stamps[txHash] = ComplianceStamp({
            proofHash: proofHash,
            timestamp: block.timestamp,
            stamped: true
        });
        totalStamped++;
        emit ComplianceStamped(txHash, proofHash, block.timestamp);
    }

    /// @notice Batch stamp multiple transactions in a single call (high throughput)
    function batchVerifyAndStamp(
        bytes32[] calldata txHashes,
        bytes32[] calldata proofHashes
    ) external onlyOwner {
        require(txHashes.length == proofHashes.length, "Array length mismatch");
        require(txHashes.length <= 50, "Max 50 per batch");

        for (uint256 i = 0; i < txHashes.length; i++) {
            if (!stamps[txHashes[i]].stamped) {
                stamps[txHashes[i]] = ComplianceStamp({
                    proofHash: proofHashes[i],
                    timestamp: block.timestamp,
                    stamped: true
                });
                totalStamped++;
                emit ComplianceStamped(txHashes[i], proofHashes[i], block.timestamp);
            }
        }
        emit BatchStamped(txHashes.length, block.timestamp);
    }

    /// @notice Check if a transaction has been stamped as compliant
    function isCompliant(bytes32 txHash) external view returns (bool) {
        return stamps[txHash].stamped;
    }

    /// @notice Get the full compliance stamp for a transaction
    function getStamp(bytes32 txHash) external view returns (bytes32 proofHash, uint256 timestamp, bool stamped) {
        ComplianceStamp memory s = stamps[txHash];
        return (s.proofHash, s.timestamp, s.stamped);
    }

    /// @notice Add or update a compliance rule
    function setRule(string calldata name, string calldata ruleType, uint256 value, bool enabled) external onlyOwner {
        rules.push(Rule({
            name: name,
            ruleType: ruleType,
            value: value,
            enabled: enabled
        }));
        emit RuleUpdated(rules.length - 1, name, enabled);
    }

    /// @notice Update an existing rule's value and status
    function updateRule(uint256 ruleIndex, uint256 value, bool enabled) external onlyOwner {
        require(ruleIndex < rules.length, "Invalid rule index");
        rules[ruleIndex].value = value;
        rules[ruleIndex].enabled = enabled;
        emit RuleUpdated(ruleIndex, rules[ruleIndex].name, enabled);
    }

    /// @notice Toggle a rule on/off
    function toggleRule(uint256 ruleIndex, bool enabled) external onlyOwner {
        require(ruleIndex < rules.length, "Invalid rule index");
        rules[ruleIndex].enabled = enabled;
        emit RuleUpdated(ruleIndex, rules[ruleIndex].name, enabled);
    }

    /// @notice Get the number of rules
    function getRuleCount() external view returns (uint256) {
        return rules.length;
    }

    /// @notice Get a rule by index
    function getRule(uint256 ruleIndex) external view returns (
        string memory name,
        string memory ruleType,
        uint256 value,
        bool enabled
    ) {
        require(ruleIndex < rules.length, "Invalid rule index");
        Rule memory r = rules[ruleIndex];
        return (r.name, r.ruleType, r.value, r.enabled);
    }

    /// @notice Emit an audit event (for on-chain audit trail)
    function emitAudit(bytes32 auditHash, uint256 totalTransactions, uint256 passRate) external onlyOwner {
        emit AuditGenerated(auditHash, totalTransactions, passRate);
    }
}
