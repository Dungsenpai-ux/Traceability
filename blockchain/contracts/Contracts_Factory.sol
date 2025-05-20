// SPDX-License-Identifier: MIT
pragma solidity 0.5.0;
pragma experimental ABIEncoderV2;

import "./Manufacturer.sol";
import "./Distributor.sol";
import "./Retailer.sol";
import "./Customer.sol";
import "./Product.sol";
import "./Transport.sol";

contract Contracts_Factory {
    // --- State Variables ---

    // Owner of the factory
    address public owner;

    // Common Section
    uint256 public index = 0;
    // Hardcoded accounts (consider dynamic mapping for production)
    string[] private accounts = [
        "0x535ec26742feD9Fe9Bd98D851F60B17e621ca68e",
        "0x71219f7633948D72B6ED5c50Abdef47714310aDb",
        "0x008AE1ca67F69C743D8JI4e051D6b5e7aC7EE90B",
        "0xc68483F14a9e608f6c4f28b1354621d673E532b3",
        "0xd23752B4Cb567D914ea99Cf7E9138e1a6652f4AA",
        "0xFAC89d080476c67853e2D20cDf47BD9C36177616",
        "0xC085446132434a1584793015F3BcC569360f6DDf",
        "0xc0B03B26E74a7B6048cE4677073E2Aa3E64FD375",
        "0x149BA351e0Fb4368E3308841433Bb31CfA071758",
        "0x2cfd4FC4Ae8BA69a8E3CA3e514246F2B2f69d977"
    ];

    // --- Events ---

    event ManufacturerCreated(address indexed manufacturer);
    event DistributorCreated(address indexed distributor);
    event RetailerCreated(address indexed retailer);
    event CustomerCreated(address indexed customer);
    event ProductCreated(address indexed product, string owner);
    event TransportCreated(address indexed transport, string owner);

    // --- Modifiers ---

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    // --- Constructor ---

    constructor() public {
        owner = msg.sender;
    }

    // --- Common Functions ---

    function getEthAccount() public view returns (string[] memory) {
        return accounts;
    }

    function getIndex() public view returns (uint256) {
        return index;
    }

    function incrementIndex() public onlyOwner {
        index++;
    }

    // --- Manufacturer Section ---

    int256 private manufacturerSize = 0;
    Manufacturer[] private manufacturers;

    function createManufacturer() public onlyOwner {
        Manufacturer newManufacturer = new Manufacturer();
        manufacturers.push(newManufacturer);
        manufacturerSize++;
        emit ManufacturerCreated(address(newManufacturer));
    }

    function allManufacturers() public view returns (Manufacturer[] memory) {
        return manufacturers;
    }

    function getManufacturerSize() public view returns (int256) {
        return manufacturerSize;
    }

    // --- Distributor Section ---

    int256 private distributorSize = 0;
    Distributor[] private distributors;

    function createDistributor() public onlyOwner {
        Distributor newDistributor = new Distributor();
        distributors.push(newDistributor);
        distributorSize++;
        emit DistributorCreated(address(newDistributor));
    }

    function allDistributors() public view returns (Distributor[] memory) {
        return distributors;
    }

    function getDistributorSize() public view returns (int256) {
        return distributorSize;
    }

    // --- Retailer Section ---

    int256 private retailerSize = 0;
    Retailer[] private retailers;

    function createRetailer() public onlyOwner {
        Retailer newRetailer = new Retailer();
        retailers.push(newRetailer);
        retailerSize++;
        emit RetailerCreated(address(newRetailer));
    }

    function allRetailers() public view returns (Retailer[] memory) {
        return retailers;
    }

    function getRetailerSize() public view returns (int256) {
        return retailerSize;
    }

    // --- Customer Section ---

    int256 private customerSize = 0;
    Customer[] private customers;

    function createCustomer() public onlyOwner {
        Customer newCustomer = new Customer();
        customers.push(newCustomer);
        customerSize++;
        emit CustomerCreated(address(newCustomer));
    }

    function allCustomers() public view returns (Customer[] memory) {
        return customers;
    }

    function getCustomerSize() public view returns (int256) {
        return customerSize;
    }

    // --- Product Section ---

    int256 private productSize = 0;
    Product[] private products;

    function createProduct(string memory owner_) public onlyOwner {
        Product newProduct = new Product(owner_);
        products.push(newProduct);
        productSize++;
        emit ProductCreated(address(newProduct), owner_);
    }

    function allProducts() public view returns (Product[] memory) {
        return products;
    }

    function getProductSize() public view returns (int256) {
        return productSize;
    }

    // --- Transport Section ---

    int256 private transportSize = 0;
    Transport[] private transports;

    function createTransport(string memory owner_) public onlyOwner {
        Transport newTransport = new Transport(owner_);
        transports.push(newTransport);
        transportSize++;
        emit TransportCreated(address(newTransport), owner_);
    }

    function allTransports() public view returns (Transport[] memory) {
        return transports;
    }

    function getTransportSize() public view returns (int256) {
        return transportSize;
    }
}