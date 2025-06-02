const DigiChambers = artifacts.require("./contracts/DigiChambers.sol");

module.exports = function(deployer) {
  deployer.deploy(DigiChambers);
};
