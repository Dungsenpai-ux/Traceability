import express from "express";
import db from "../models/index.mjs";
import {
    web3,
    retailer_ABI,
    product_ABI,
    distributor_ABI,
    factory,
    transport_ABI
} from "../blockchain/blockchain.conn.mjs";

const router = express.Router();

// Middleware kiểm tra cookie
router.use((req, res, next) => {
    if (req.path !== '/approve-raw-material-tender' && (!req.cookies.accessToken || !req.cookies.accessToken.ContractAddress)) {
        console.error('Cookie accessToken không hợp lệ:', req.cookies);
        return res.status(401).json({ error: 'Không tìm thấy thông tin người dùng' });
    }
    next();
});

router.post('/create-product', async (req, res) => {
    try {
        const user = req.cookies.accessToken;
        const product = {
            Owner: user.ContractAddress,
            Product: req.body.Product,
            Price: req.body.Price,
            Requirement: []
        };

        product.Requirement.push({ _material: req.body.material_1, _capacity: req.body.capacity_1, _price: req.body.price_1 });

        if (req.body.material_2) {
            product.Requirement.push({ _material: req.body.material_2, _capacity: req.body.capacity_2, _price: req.body.price_2 });
        }
        if (req.body.material_3) {
            product.Requirement.push({ _material: req.body.material_3, _capacity: req.body.capacity_3, _price: req.body.price_3 });
        }

        console.log('Tạo sản phẩm:', product);

        await db.product.create(product);
        return res.redirect('/retailer-page');
    } catch (error) {
        console.error('Lỗi trong /create-product:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
    }
});

router.post('/setup-raw-material-request', async (req, res) => {
    try {
        const user = req.cookies.accessToken;
        if (!user || !user.eth_Account || !user.ContractAddress) {
            console.error('Dữ liệu người dùng không hợp lệ:', user);
            return res.status(401).json({ error: 'Dữ liệu người dùng không hợp lệ' });
        }

        await factory.createProduct(user.ContractAddress, { from: process.env.defaultAccount });
        const index = await factory.getProductSize();
        const allProducts = await factory.allProducts();
        const ContractAddress = allProducts[index - 1];
        const productContract = new web3.eth.Contract(product_ABI, ContractAddress);

        console.log('Tạo hợp đồng sản phẩm:', { Product: req.body.Product, Owner: user.ContractAddress, ContractAddress });

        const product = await db.product.findOne({
            Product: req.body.Product,
            Owner: user.ContractAddress
        });

        if (!product) {
            console.error('Không tìm thấy sản phẩm trong cơ sở dữ liệu:', req.body.Product);
            return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        }

        for (const element of product.Requirement) {
            await db.productRequest.create({
                Product: ContractAddress,
                Owner: user.ContractAddress,
                Material: element._material,
                Capacity: element._capacity,
                Price: element._price,
                currentOwner: user.ContractAddress,
                Status: 'Request-raised'
            });

            await web3.eth.sendTransaction({
                from: process.env.defaultAccount,
                to: ContractAddress,
                value: element._price
            });

            await productContract.methods.setRequests(element._material).send({
                from: process.env.defaultAccount
            });
        }

        return res.redirect('/retailer-page');
    } catch (error) {
        console.error('Lỗi trong /setup-raw-material-request:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
    }
});

router.post('/approve-raw-material-tender', async (req, res) => {
    try {
        console.log('Dữ liệu đầu vào /approve-raw-material-tender:', req.body);

        const user = req.body.Owner;

        if (!user) {
            console.error('Thiếu thông tin Owner trong req.body:', req.body);
            return res.status(400).json({ error: 'Thiếu thông tin nhà sản xuất' });
        }

        // Cập nhật rawMaterialTender
        const tenderUpdate = await db.rawMaterialTender.updateOne(
            { Material: req.body.Material, Product: req.body.Product, Owner: user },
            { $set: { Status: "Approved", IsActive: false } }
        );

        if (tenderUpdate.matchedCount === 0) {
            console.error('Không tìm thấy rawMaterialTender:', { Material: req.body.Material, Product: req.body.Product, Owner: user });
            return res.status(404).json({ error: 'Không tìm thấy đề xuất nguyên liệu' });
        }

        // Tìm productRequest
        const result = await db.productRequest.findOne({
            Product: req.body.Product,
            Material: req.body.Material,
            IsActive: true
        });

        if (!result) {
            console.error('Không tìm thấy productRequest:', { Product: req.body.Product, Material: req.body.Material });
            return res.redirect('/retailer-Page');
        }

        console.log('productRequest tìm thấy:', result);

        const productContract = new web3.eth.Contract(product_ABI, result.Product);

        // Tìm rawMaterial
        let docs = await db.rawMaterial.findOne({
            Owner: user,
            Material: { $regex: `^${result.Material}$`, $options: 'i' },
            IsActive: true
        });

        if (!docs) {
            console.error('Không tìm thấy rawMaterial:', { Owner: user, Material: result.Material });
            return res.status(404).json({ error: 'Không tìm thấy nguyên liệu thô. Vui lòng tạo nguyên liệu thô trước.' });
        }

        if (!docs.CertificateID) {
            console.error('Thiếu CertificateID trong rawMaterial:', docs);
            return res.status(400).json({ error: 'Nguyên liệu thô thiếu CertificateID' });
        }

        console.log('rawMaterial tìm thấy:', docs);

        // Tạo tracking
        await db.tracking.create({
            CertificateID: docs.CertificateID,
            Operation: "Approve-raw-material-tender",
            From: docs.Owner,
            To: user
        });

        if (parseInt(docs.Capacity) >= parseInt(result.Capacity)) {
            // Chấp nhận yêu cầu trên blockchain
            await productContract.methods.acceptRequest(result.Material).send({ from: process.env.defaultAccount });

            // Cập nhật productRequest
            await db.productRequest.updateOne(result, {
                $set: { Status: "Transport-request-raised", IsAcceptedbyManufacturer: true }
            });

            // Tạo hợp đồng vận chuyển
            await factory.createTransport(user, { from: process.env.defaultAccount });
            const alltransport = await factory.allTransports();
            const index = await factory.getTransportSize();
            const TransportAddress = alltransport[index - 1];
            const Transport = new web3.eth.Contract(transport_ABI, TransportAddress);

            // Thiết lập yêu cầu vận chuyển
            await Transport.methods.setRequests(result.Material).send({ from: process.env.defaultAccount });

            await db.transportRequest.create({
                Transport: TransportAddress,
                Product: result.Product,
                Material: result.Material,
                Capacity: result.Capacity,
                Retailer: result.Owner,
                Manufacturer: user,
                currentOwner: user,
                Status: "Setup request"
            });

            // Gửi tiền cho hợp đồng vận chuyển
            await web3.eth.sendTransaction({
                from: process.env.defaultAccount,
                to: TransportAddress,
                value: process.env.transportCost
            });

            console.log('Phê duyệt tender thành công:', { Product: req.body.Product, Material: req.body.Material, TransportAddress });
            return res.redirect('/retailer-Page');
        } else {
            console.log('Không đủ dung lượng nguyên liệu:', {
                Available: docs.Capacity,
                Requested: result.Capacity
            });
            return res.redirect('/retailer-Page');
        }
    } catch (error) {
        console.error('Lỗi trong /approve-raw-material-tender:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
    }
});

router.post('/confirm-fulfillment-of-request', async (req, res) => {
    try {
        const user = req.cookies.accessToken;

        const result = await db.transportRequest.findOne({
            Transport: req.body.TransportAddress,
            IsActive: true
        });

        if (!result) {
            console.error('Không tìm thấy transportRequest:', req.body.TransportAddress);
            return res.status(404).json({ error: 'Không tìm thấy yêu cầu vận chuyển' });
        }

        const productContract = new web3.eth.Contract(product_ABI, req.body.ProductAddress);
        await productContract.methods.fulfillRequest(result.Material).send({ from: process.env.defaultAccount });

        const transportContract = new web3.eth.Contract(transport_ABI, result.Transport);
        await transportContract.methods.fulfillRequest(result.Material).send({ from: process.env.defaultAccount });

        await db.productRequest.updateOne(
            { Product: req.body.ProductAddress },
            {
                $set: {
                    currentOwner: user.ContractAddress,
                    Status: "Raw material received by retailer",
                    IsActive: false,
                    Isfulfilled: true
                }
            }
        );

        await db.transportRequest.updateOne(
            { Transport: req.body.TransportAddress },
            {
                $set: {
                    currentOwner: user.ContractAddress,
                    Status: "Raw material received by retailer",
                    IsActive: false,
                    Isfulfilled: true
                }
            }
        );

        const transport = await db.transportRequest.findOne({ Transport: req.body.TransportAddress });
        await db.rawMaterial.updateOne(
            { Material: transport.Material, Owner: transport.Manufacturer },
            { $set: { Owner: user.ContractAddress } }
        );

        const docs = await db.rawMaterial.findOne({
            Material: transport.Material,
            Owner: user.ContractAddress
        });

        if (!docs) {
            console.error('Không tìm thấy rawMaterial sau khi cập nhật Owner:', {
                Material: transport.Material,
                Owner: user.ContractAddress
            });
            return res.status(404).json({ error: 'Không tìm thấy nguyên liệu thô' });
        }

        if (!docs.CertificateID) {
            console.error('Thiếu CertificateID trong rawMaterial:', docs);
            return res.status(400).json({ error: 'Nguyên liệu thô thiếu CertificateID' });
        }

        await db.tracking.create({
            CertificateID: docs.CertificateID,
            Operation: "Confirm-delivery-of-Goods",
            From: req.body.TransportAddress,
            To: user.ContractAddress
        });

        console.log('Xác nhận giao hàng thành công:', { ProductAddress: req.body.ProductAddress, TransportAddress: req.body.TransportAddress });
        return res.redirect('/retailer-page');
    } catch (error) {
        console.error('Lỗi trong /confirm-fulfillment-of-request:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
    }
});

export default router;