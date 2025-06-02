const Distributor= artifacts.require("./contracts/Distributor.sol");

module.exports = function(deployer) {
  deployer.deploy(Distributor);
};
