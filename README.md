# Traceability

Dự án Traceability là một hệ thống truy xuất nguồn gốc sử dụng công nghệ Blockchain để đảm bảo tính minh bạch và an toàn cho chuỗi cung ứng. Dự án sử dụng các công nghệ chính: **Solidity** (Smart Contract), **Truffle** (Blockchain dev framework), **Node.js** (Backend), **MongoDB** (Database), và **Ganache** (Blockchain local test).

## Mục tiêu

- Cung cấp khả năng truy xuất nguồn gốc sản phẩm xuyên suốt chuỗi cung ứng.
- Đảm bảo tính minh bạch, không thể thay đổi dữ liệu nhờ Blockchain.

## Công nghệ sử dụng

- **Solidity:** Viết Smart Contract cho Ethereum.
- **Truffle:** Quản lý, biên dịch, triển khai và test Smart Contract.
- **Node.js:** Server backend, giao tiếp với Smart Contract và cơ sở dữ liệu.
- **MongoDB:** Lưu trữ dữ liệu bổ sung ngoài blockchain.
- **Ganache:** Blockchain cá nhân để phát triển, test nhanh.

## Hướng dẫn cài đặt & chạy dự án

### 1. Chuẩn bị môi trường

- Cài đặt [Node.js](https://nodejs.org/)
- Cài đặt [MongoDB](https://www.mongodb.com/)
- Cài đặt [Truffle](https://trufflesuite.com/truffle/)
- Cài đặt [Ganache](https://trufflesuite.com/ganache/)

### 2. Clone dự án

```bash
git clone https://github.com/Dungsenpai-ux/Traceability.git
cd Traceability
```

### 3. Triển khai Smart Contract

Di chuyển vào thư mục `blockchain` và chạy lệnh sau:

```bash
cd blockchain
truffle migrate
```

### 4. Cài đặt thư viện Node.js

Quay lại thư mục gốc và cài đặt các dependencies:

```bash
npm install
```

### 5. Khởi động MongoDB và Ganache

- Đảm bảo MongoDB đã chạy trên máy (thường ở cổng 27017).
- Mở Ganache để khởi tạo blockchain local (mặc định cổng 7545).

### 6. Chạy ứng dụng

```bash
npm start
```

Ứng dụng sẽ được khởi động trên `http://localhost:3000` (hoặc cổng đã cấu hình).

## Tham khảo

- [Truffle Documentation](https://trufflesuite.com/docs/)
- [Ganache Documentation](https://trufflesuite.com/ganache/)
- [Solidity Documentation](https://docs.soliditylang.org/)
