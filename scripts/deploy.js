const hre = require("hardhat");

async function main() {
    await hre.run("compile");

    //Deploy token
    const RPSToken = await hre.ethers.getContractFactory("RPSToken");
    const _RPSToken = await RPSToken.deploy(ethers.utils.parseUnits('10000000',"ether"));
    await _RPSToken.deployed();
    console.log("Deployed to:", _RPSToken.address);

    //Deploy contract
    const RockPaperScissors = await hre.ethers.getContractFactory("RockPaperScissors");
    const rockPaperScissors = await RockPaperScissors.deploy(_RPSToken.address);
    await rockPaperScissors.deployed();

    console.log("Deployed to:", rockPaperScissors.address);
}

main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});