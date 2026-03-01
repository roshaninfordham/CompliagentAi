require("dotenv").config();
const { ethers } = require("ethers");
const { getUnlink } = require("../unlink-service");

const MOCK_USDC = "0x18c945c79f85f994A10356Aa4945371Ec4cD75D4";

const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");
const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

const ERC20_ABI = [
    "function mint(address to, uint256 amount)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
];

const MOCK_USDC_CONTRACT = new ethers.Contract(MOCK_USDC, ERC20_ABI, deployer);

async function main() {
    const unlink = await getUnlink();
    const account = await unlink.sdk.accounts.getActive();
    console.log("Unlink active account address:", account?.address);

    const DEPOSIT_AMOUNT = ethers.parseUnits("5000", 6);

    // 1. Ensure deployer has MockUSDC
    console.log("Minting 5000 MockUSDC to deployer...");
    const tx1 = await MOCK_USDC_CONTRACT.mint(deployer.address, DEPOSIT_AMOUNT);
    await tx1.wait();
    console.log("Minted.");

    // 2. Request calldata from Unlink SDK (backend must be synced so it knows poolAddress etc)
    console.log("Requesting deposit calldata from Unlink SDK...");
    const depositRes = await unlink.deposit({
        depositor: deployer.address,
        deposits: [
            {
                token: MOCK_USDC,
                amount: DEPOSIT_AMOUNT
            }
        ]
    });
    console.log("Relay ID:", depositRes.relayId);
    console.log("Tx to:", depositRes.to);

    // 3. Approve Unlink pool to spend MockUSDC
    console.log("Approving Pool to spend MockUSDC...");
    const poolAddress = depositRes.to;
    const approveTx = await MOCK_USDC_CONTRACT.approve(poolAddress, DEPOSIT_AMOUNT);
    await approveTx.wait();
    console.log("Approved.");

    // 4. Send the deposit transaction from the deployer EOA
    console.log("Executing Deposit transaction on chain...");
    const depositTx = await deployer.sendTransaction({
        to: depositRes.to,
        data: depositRes.calldata,
        value: depositRes.value || 0n
    });
    console.log("Sent tx:", depositTx.hash);
    await depositTx.wait();
    console.log("Tx confirmed!");

    // 5. Tell SDK to confirm deposit
    console.log("Reconciling deposit in Unlink SDK...");
    const syncRes = await unlink.confirmDeposit(depositRes.relayId);
    console.log("Deposit synced! New shielded notes count:", syncRes.notes.length);

    const balances = await unlink.getBalances();
    console.log("Current shielded balances:", balances);

    process.exit(0);
}

main().catch(console.error);
