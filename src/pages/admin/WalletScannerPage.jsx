import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import WalletScanner from '../../components/admin/WalletScanner';

const WalletScannerPage = () => {
  return (
    <AdminLayout title="Wallet Scanner">
      <WalletScanner />
    </AdminLayout>
  );
};

export default WalletScannerPage; 