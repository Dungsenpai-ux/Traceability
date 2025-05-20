import express from "express";
import {
    web3,
    factory,
    manufacturer_ABI,
    distributor_ABI,
    transport_ABI,
    product_ABI,
    DigiChambers
} from "../blockchain/blockchain.conn.mjs";

import db from "../models/index.mjs";

const router = express.Router();

// Middleware kiểm tra cookie
router.use((req, res, next) => {
    if (!req.cookies.accessToken || !req.cookies.accessToken.ContractAddress) {
        console.error('Cookie accessToken không hợp lệ:', req.cookies);
        return res.status(401).json({ error: 'Không tìm thấy thông tin người dùng' });
    }
    next();
});

router.post('/produce-material', async (req, res) => {
    try {
        const user = req.cookies.accessToken;
        const _material = req.body.Material;
        const _capacity = req.body.Capacity;

        if (!_material || !_capacity) {
            console.error('Thiếu Material hoặc Capacity:', req.body);
            return res.status(400).json({ error: 'Thiếu thông tin Material hoặc Capacity' });
        }

        console.log('Tạo yêu cầu chứng chỉ:', { Material: _material, Capacity: _capacity, Owner: user.ContractAddress });

        // Tạo yêu cầu chứng chỉ
        const certificate = await db.certificateRequest.create({
            Owner: user.ContractAddress,
            CurrentPossesion: user.ContractAddress,
            Material: _material,
            Capacity: parseInt(_capacity),
            CertificateID: (Math.random() + 1).toString(36).substring(7),
            Status: "Request Raised for Certificate of Origin"
        });

        // Tạo hoặc cập nhật rawMaterial
        const existingMaterial = await db.rawMaterial.findOne({
            Owner: user.ContractAddress,
            Material: _material
        });

        if (!existingMaterial) {
            console.log('Tạo mới rawMaterial:', { Material: _material, Capacity: _capacity });
            await db.rawMaterial.create({
                Owner: user.ContractAddress,
                Material: _material,
                Capacity: parseInt(_capacity),
                CertificateID: certificate.CertificateID,
                IsActive: true
            });
        } else {
            console.log('Cập nhật rawMaterial:', { Material: _material, NewCapacity: parseInt(existingMaterial.Capacity) + parseInt(_capacity) });
            await db.rawMaterial.updateOne(existingMaterial, {
                $set: {
                    Capacity: parseInt(existingMaterial.Capacity) + parseInt(_capacity),
                    CertificateID: certificate.CertificateID
                }
            });
        }

        return res.redirect('/manufacturer-Page');
    } catch (error) {
        console.error('Lỗi trong /produce-material:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
    }
});

router.post('/accept-request', async (req, res) => {
    try {
        const user = req.cookies.accessToken;

        const result = await db.productRequest.findOne({
            Product: req.body.Product,
            Material: req.body.Material,
            IsActive: true
        });

        console.log('Kết quả tìm productRequest:', result);

        if (!result) {
            console.log('Không tìm thấy productRequest cho Product:', req.body.Product, 'và Material:', req.body.Material);
            return res.redirect('/manufacturer-Page');
        }

        const productContract = await new web3.eth.Contract(product_ABI, result.Product);

        const docs = await db.rawMaterial.findOne({
            Owner: user.ContractAddress,
            Material: result.Material,
            IsActive: true
        });

        if (!docs) {
            console.log('Không tìm thấy rawMaterial cho Owner:', user.ContractAddress, 'và Material:', result.Material);
            return res.redirect('/manufacturer-Page');
        }

        if (parseInt(docs.Capacity) >= parseInt(result.Capacity)) {
            // Chấp nhận yêu cầu
            await productContract.methods.acceptRequest(result.Material).send({ from: process.env.defaultAccount });

            // Cập nhật productRequests
            await db.productRequest.updateOne(result, {
                $set: { Status: "Transport-request-raised", IsAcceptedbyManufacturer: true }
            });

            // Cập nhật rawMaterial
            if (parseInt(docs.Capacity) === parseInt(result.Capacity)) {
                await db.rawMaterial.updateOne(docs, { $set: { Capacity: 0 } });
            } else {
                await db.rawMaterial.updateOne(docs, {
                    $set: { Capacity: parseInt(docs.Capacity) - parseInt(result.Capacity) }
                });
            }

            // Tạo yêu cầu vận chuyển
            await factory.createTransport(user.ContractAddress, { from: process.env.defaultAccount });
            const alltransport = await factory.allTransports();
            const index = await factory.get_transport_SIZE();
            const TransportAddress = alltransport[index - 1];
            const Transport = await new web3.eth.Contract(transport_ABI, TransportAddress);

            // Thiết lập yêu cầu vận chuyển
            await Transport.methods.setRequests(result.Material).send({ from: process.env.defaultAccount });

            await db.transportRequest.create({
                Transport: TransportAddress,
                Product: result.Product,
                Material: result.Material,
                Capacity: result.Capacity,
                Retailer: result.Owner,
                Manufacturer: user.ContractAddress,
                currentOwner: user.ContractAddress,
                Status: "Setup request"
            });

            // Gửi tiền cho hợp đồng vận chuyển
            await web3.eth.sendTransaction({
                from: user.eth_Account,
                to: TransportAddress,
                value: process.env.transportCost
            });

            console.log('Giao dịch vận chuyển hoàn tất:', { TransportAddress, Material: result.Material });
            return res.redirect('/manufacturer-Page');
        } else {
            console.log('Không đủ dung lượng để đáp ứng yêu cầu:', {
                Available: docs.Capacity,
                Requested: result.Capacity
            });
            return res.redirect('/manufacturer-Page');
        }
    } catch (error) {
        console.error('Lỗi trong /accept-request:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
    }
});

router.post('/send-raw-material-tender', async (req, res) => {
    try {
        console.log('Dữ liệu đầu vào /send-raw-material-tender:', req.body);

        const user = req.cookies.accessToken;

        // Tạo rawMaterialTender
        await db.rawMaterialTender.create({
            Owner: user.ContractAddress,
            Product: req.body.Product,
            Retailer: req.body.Retailer,
            Material: req.body.Material,
            Capacity: req.body.Capacity,
            Price: req.body.Price,
            Status: "Send Proposal for raw material request."
        });

        // Tìm rawMaterial
        let docs = await db.rawMaterial.findOne({
            Owner: user.ContractAddress,
            Material: req.body.Material
        });

        if (!docs) {
            console.warn('Không tìm thấy rawMaterial, tạo mới:', { Owner: user.ContractAddress, Material: req.body.Material });
            docs = await db.rawMaterial.create({
                Owner: user.ContractAddress,
                Material: req.body.Material,
                Capacity: parseInt(req.body.Capacity) || 0,
                CertificateID: (Math.random() + 1).toString(36).substring(7),
                IsActive: true
            });
        }

        if (!docs.CertificateID) {
            console.error('Thiếu CertificateID trong tài liệu rawMaterial:', docs);
            return res.status(400).json({ error: 'Tài liệu nguyên liệu thô thiếu CertificateID' });
        }

        // Tạo tracking
        await db.tracking.create({
            CertificateID: docs.CertificateID,
            Operation: "Sent-Proposal-for-raw-material-sell",
            From: user.ContractAddress,
            To: req.body.Retailer
        });

        console.log('Tạo tracking thành công:', { CertificateID: docs.CertificateID });
        return res.redirect('/manufacturer-page');
    } catch (error) {
        console.error('Lỗi trong /send-raw-material-tender:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
    }
});

export default router;