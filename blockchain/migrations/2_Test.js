const test = artifacts.require("./contracts/Test.sol");

module.exports = function(deployer) {
  deployer.deploy(test);
};
