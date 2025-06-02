const Contracts_Factory = artifacts.require("./contracts/Contracts_Factory.sol");

module.exports = function(deployer) {
  deployer.deploy(Contracts_Factory);
};
