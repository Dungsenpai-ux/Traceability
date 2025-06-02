const Manufacturer = artifacts.require("./contracts/Manufacturer.sol");

module.exports = function(deployer) {
  deployer.deploy(Manufacturer);
};
