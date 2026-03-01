// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title AffiliateSettler
 * @dev Manages affiliate programs for CompliAgent.
 *      - Register programs with commission rates
 *      - Process affiliate payments (splits revenue between vendor and affiliate)
 *      - All payments settled in USDC on Monad
 */
contract AffiliateSettler {
    address public owner;
    IERC20 public token; // MockUSDC

    struct AffiliateProgram {
        string name;
        address affiliate;       // affiliate wallet
        uint256 commissionBps;   // basis points (100 = 1%)
        uint256 totalEarned;
        bool active;
    }

    // programId => AffiliateProgram
    mapping(uint256 => AffiliateProgram) public programs;
    uint256 public programCount;

    // affiliate address => total earned across all programs
    mapping(address => uint256) public affiliateEarnings;

    event ProgramRegistered(uint256 indexed programId, string name, address affiliate, uint256 commissionBps);
    event ProgramToggled(uint256 indexed programId, bool active);
    event AffiliatePayment(
        uint256 indexed programId,
        address indexed vendor,
        address indexed affiliate,
        uint256 vendorAmount,
        uint256 affiliateAmount
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _token) {
        owner = msg.sender;
        token = IERC20(_token);
    }

    /// @notice Register a new affiliate program
    function registerProgram(
        string calldata name,
        address affiliate,
        uint256 commissionBps
    ) external onlyOwner returns (uint256 programId) {
        require(commissionBps <= 5000, "Commission too high (max 50%)");
        require(affiliate != address(0), "Invalid affiliate");

        programId = programCount++;
        programs[programId] = AffiliateProgram({
            name: name,
            affiliate: affiliate,
            commissionBps: commissionBps,
            totalEarned: 0,
            active: true
        });

        emit ProgramRegistered(programId, name, affiliate, commissionBps);
    }

    /// @notice Toggle a program on/off
    function toggleProgram(uint256 programId, bool active) external onlyOwner {
        require(programId < programCount, "Invalid program");
        programs[programId].active = active;
        emit ProgramToggled(programId, active);
    }

    /// @notice Process a payment with affiliate split
    /// @dev Caller must have approved this contract to spend `totalAmount` of token
    function processPayment(
        uint256 programId,
        address vendor,
        uint256 totalAmount
    ) external onlyOwner {
        require(programId < programCount, "Invalid program");
        AffiliateProgram storage prog = programs[programId];
        require(prog.active, "Program not active");

        uint256 affiliateAmount = (totalAmount * prog.commissionBps) / 10000;
        uint256 vendorAmount = totalAmount - affiliateAmount;

        // Pull USDC from caller
        require(token.transferFrom(msg.sender, address(this), totalAmount), "Transfer failed");

        // Pay vendor
        require(token.transfer(vendor, vendorAmount), "Vendor payment failed");

        // Pay affiliate
        require(token.transfer(prog.affiliate, affiliateAmount), "Affiliate payment failed");

        prog.totalEarned += affiliateAmount;
        affiliateEarnings[prog.affiliate] += affiliateAmount;

        emit AffiliatePayment(programId, vendor, prog.affiliate, vendorAmount, affiliateAmount);
    }

    /// @notice Get program details
    function getProgram(uint256 programId) external view returns (
        string memory name,
        address affiliate,
        uint256 commissionBps,
        uint256 totalEarned,
        bool active
    ) {
        require(programId < programCount, "Invalid program");
        AffiliateProgram memory p = programs[programId];
        return (p.name, p.affiliate, p.commissionBps, p.totalEarned, p.active);
    }
}
