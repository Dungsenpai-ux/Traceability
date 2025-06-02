const Customer= artifacts.require("./contracts/Customer.sol");

module.exports = function(deployer) {
  deployer.deploy(Customer);
};
