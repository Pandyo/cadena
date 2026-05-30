const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const CDA = await ethers.getContractFactory("CDA");
  const cda = await CDA.deploy(deployer.address);
  await cda.waitForDeployment();

  const address = await cda.getAddress();
  console.log("CDA deployed to:", address);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
