const admin = require('firebase-admin');
const { ethers } = require('ethers');
const serviceAccount = require('./src/firebase/new-private-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Function to get EVM balance (Ethereum, BSC, Polygon)
async function getEVMBalance(address, chain) {
  try {
    let rpcUrl;
    switch (chain) {
      case 'ethereum':
        rpcUrl = 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'; // Public Infura endpoint
        break;
      case 'bsc':
        rpcUrl = 'https://bsc-dataseed.binance.org/';
        break;
      case 'polygon':
        rpcUrl = 'https://polygon-rpc.com';
        break;
      default:
        throw new Error(`Unsupported chain: ${chain}`);
    }
    
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  } catch (error) {
    console.error(`Error getting ${chain} balance for ${address}:`, error.message);
    return '0';
  }
}

async function checkUserWalletBalances(userId) {
  try {
    console.log(`Checking wallet balances for user ${userId}`);
    
    // Get user's wallet addresses
    const walletDoc = await db.collection('walletAddresses').doc(userId).get();
    
    if (!walletDoc.exists) {
      console.log(`No wallet found for user ${userId}`);
      return null;
    }
    
    const walletData = walletDoc.data();
    console.log('Wallet addresses:', walletData.wallets);
    
    // Check balances for each chain
    const balances = {};
    
    // Check Ethereum balance
    if (walletData.wallets.ethereum) {
      balances.ethereum = await getEVMBalance(walletData.wallets.ethereum, 'ethereum');
      console.log(`Ethereum balance: ${balances.ethereum} ETH`);
    }
    
    // Check BSC balance
    if (walletData.wallets.bsc) {
      balances.bsc = await getEVMBalance(walletData.wallets.bsc, 'bsc');
      console.log(`BSC balance: ${balances.bsc} BNB`);
    }
    
    // Check Polygon balance
    if (walletData.wallets.polygon) {
      balances.polygon = await getEVMBalance(walletData.wallets.polygon, 'polygon');
      console.log(`Polygon balance: ${balances.polygon} MATIC`);
    }
    
    return {
      userId,
      wallets: walletData.wallets,
      balances
    };
  } catch (error) {
    console.error(`Error checking wallet balances for user ${userId}:`, error);
    return null;
  }
}

async function main() {
  // Get user ID from command line arguments
  const userId = process.argv[2];
  
  if (!userId) {
    console.error('Please provide a user ID as a command line argument');
    process.exit(1);
  }
  
  try {
    const result = await checkUserWalletBalances(userId);
    
    if (result) {
      console.log('\nWallet balance summary:');
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Cleanup
    admin.app().delete();
  }
}

main().catch(console.error); 