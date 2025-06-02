const Retailer= artifacts.require("./contracts/Retailer.sol");

module.exports = function(deployer) {
  deployer.deploy(Retailer);
};
