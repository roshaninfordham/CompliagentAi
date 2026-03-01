// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

/**
 * @title BudgetVault
 * @dev Manages enterprise budget allocations for AI agents.
 *      - Enterprise deposits USDC into the vault
 *      - Owner allocates budgets per agent
 *      - Agents can execute payments to vendors within their budget
 *      - Tracks utilization per agent
 */
contract BudgetVault {
    address public owner;
    IERC20 public token; // MockUSDC

    struct AgentBudget {
        uint256 allocated;
        uint256 spent;
        bool active;
    }

    // agent address => budget info
    mapping(address => AgentBudget) public agentBudgets;

    // Total deposited by enterprise
    uint256 public totalDeposited;

    event BudgetDeposited(address indexed from, uint256 amount);
    event BudgetAllocated(address indexed agent, uint256 amount);
    event PaymentExecuted(address indexed agent, address indexed vendor, uint256 amount);
    event AgentStatusChanged(address indexed agent, bool active);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _token) {
        owner = msg.sender;
        token = IERC20(_token);
    }

    /// @notice Enterprise deposits USDC into the vault
    function depositBudget(uint256 amount) external {
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        totalDeposited += amount;
        emit BudgetDeposited(msg.sender, amount);
    }

    /// @notice Allocate budget to an agent
    function allocateAgentBudget(address agent, uint256 amount) external onlyOwner {
        require(getAvailableBudget() >= amount, "Insufficient vault balance");
        agentBudgets[agent].allocated += amount;
        agentBudgets[agent].active = true;
        emit BudgetAllocated(agent, amount);
    }

    /// @notice Agent pays a vendor (called by CompliAgent middleware)
    function executeAgentPayment(address agent, address vendor, uint256 amount) external onlyOwner {
        AgentBudget storage budget = agentBudgets[agent];
        require(budget.active, "Agent not active");
        require(budget.allocated - budget.spent >= amount, "Exceeds agent budget");
        require(token.transfer(vendor, amount), "Payment transfer failed");
        budget.spent += amount;
        emit PaymentExecuted(agent, vendor, amount);
    }

    /// @notice Get agent's remaining budget
    function getAgentUtilization(address agent) external view returns (
        uint256 allocated,
        uint256 spent,
        uint256 remaining,
        bool active
    ) {
        AgentBudget memory b = agentBudgets[agent];
        return (b.allocated, b.spent, b.allocated - b.spent, b.active);
    }

    /// @notice Get available (unallocated) budget in the vault
    function getAvailableBudget() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    /// @notice Pause/unpause an agent
    function setAgentStatus(address agent, bool active) external onlyOwner {
        agentBudgets[agent].active = active;
        emit AgentStatusChanged(agent, active);
    }

    /// @notice Emergency withdraw (owner only)
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        require(token.transfer(to, amount), "Withdraw failed");
    }
}
