require("dotenv").config();
const { ethers } = require("ethers");
const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");
const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

async function main() {
    const burnerAddresses = [
        "0xb4061d26DBdEeb1866F188Df76e130Bb32516b17", // agent 8
        "0xc738dE92fC07f48fb769Fb2f0A7b18E9F85992C1", // agent 0?
    ];
    for (let addr of burnerAddresses) {
        console.log("Funding", addr, "with MON");
        const tx = await deployer.sendTransaction({
            to: addr,
            value: ethers.parseEther("0.1")
        });
        await tx.wait();
        console.log("Funded", addr);
    }
}
main().catch(console.error);
