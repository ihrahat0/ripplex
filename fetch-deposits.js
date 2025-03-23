#!/usr/bin/env node

/**
 * Blockchain Deposit Fetcher Script
 * Fetches deposits directly from blockchain nodes via public RPCs
 * Runs every minute to poll for new transactions
 */

// Load environment variables
require('dotenv').config();
const admin = require('firebase-admin');
const { ethers } = require('ethers');
const { Connection, PublicKey } = require('@solana/web3.js');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Set up logging with timestamps
const logToFile = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  
  // Also append to log file
  fs.appendFileSync('blockchain-deposits.log', logMessage);
};

// Initialize Firebase
let app;
let db;

try {
  // Try loading from serviceAccountKey.json
  const serviceAccount = require('./serviceAccountKey.json');
  app = initializeApp({
    credential: cert(serviceAccount)
  });
  logToFile('Firebase initialized with service account key');
} catch (error) {
  logToFile('Failed to initialize Firebase with service account key: ' + error.message);
  logToFile('Falling back to environment variables...');
  
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing required Firebase environment variables');
    }
    
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
    logToFile('Firebase initialized with environment variables');
  } catch (envError) {
    logToFile('Failed to initialize Firebase with environment variables: ' + envError.message);
    process.exit(1);
  }
}

// Get Firestore instance
db = getFirestore(app);

// Use reliable public RPC endpoints
const rpcEndpoints = {
  ethereum: 'https://ethereum.publicnode.com',
  bsc: 'https://bsc-dataseed1.binance.org',
  polygon: 'https://polygon-rpc.com',
  solana: 'https://api.mainnet-beta.solana.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  base: 'https://mainnet.base.org'
};

// Initialize blockchain providers
const providers = {};
const evmChains = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'base'];

// Set up EVM providers with retry logic and fallbacks
evmChains.forEach(chain => {
  try {
    // Define fallback RPCs for better reliability
    const fallbackRpcs = {
      ethereum: [
        'https://ethereum.publicnode.com',
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth'
      ],
      bsc: [
        'https://bsc-dataseed1.binance.org',
        'https://bsc-dataseed.binance.org',
        'https://binance.llamarpc.com'
      ],
      polygon: [
        'https://polygon-rpc.com',
        'https://polygon.llamarpc.com',
        'https://polygon-mainnet.public.blastapi.io'
      ],
      arbitrum: [
        'https://arb1.arbitrum.io/rpc',
        'https://arbitrum.llamarpc.com',
        'https://arbitrum-one.public.blastapi.io'
      ],
      base: [
        'https://mainnet.base.org',
        'https://base.llamarpc.com',
        'https://base-mainnet.public.blastapi.io'
      ]
    };

    // Try to initialize with fallbacks
    let connected = false;
    for (const rpc of fallbackRpcs[chain]) {
      try {
        providers[chain] = new ethers.providers.JsonRpcProvider(rpc);
        // Test the connection
        providers[chain].getBlockNumber().then(() => {
          if (!connected) {
            logToFile(`Connected to ${chain} RPC at ${rpc}`);
            connected = true;
          }
        }).catch(e => {
          logToFile(`Failed connection test to ${chain} RPC at ${rpc}: ${e.message}`);
        });
        break; // Break on first working RPC
      } catch (error) {
        logToFile(`Failed to connect to ${chain} RPC at ${rpc}: ${error.message}`);
      }
    }
  } catch (error) {
    logToFile(`Failed to initialize ${chain} provider: ${error.message}`);
  }
});

// Set up Solana connection with retry logic
try {
  const solanaEndpoints = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-mainnet.public.blastapi.io',
    'https://solana.public-rpc.com'
  ];
  
  let solanaConnected = false;
  for (const endpoint of solanaEndpoints) {
    try {
      providers.solana = new Connection(endpoint, 'confirmed');
      // Test the connection
      providers.solana.getLatestBlockhash().then(() => {
        if (!solanaConnected) {
          logToFile(`Connected to Solana RPC at ${endpoint}`);
          solanaConnected = true;
        }
      }).catch(e => {
        logToFile(`Failed connection test to Solana RPC at ${endpoint}: ${e.message}`);
      });
      break; // Break on first working RPC
    } catch (error) {
      logToFile(`Failed to connect to Solana RPC at ${endpoint}: ${error.message}`);
    }
  }
} catch (error) {
  logToFile(`Failed to initialize Solana provider: ${error.message}`);
}

// Get deposit addresses from Firestore to monitor
async function getDepositAddresses() {
  try {
    // Fetch all user wallets from Firestore
    const walletsSnapshot = await db.collection('wallets').get();
    const addresses = {
      ethereum: [],
      bsc: [],
      polygon: [],
      solana: [],
      arbitrum: [],
      base: []
    };
    
    const addressToUserMap = {};
    
    walletsSnapshot.forEach(doc => {
      const wallet = doc.data();
      const userId = wallet.userId;
      
      // Map addresses to their respective chains and users
      Object.entries(wallet).forEach(([key, value]) => {
        if (key.includes('Address') && value && value.length > 30) {
          const chain = key.replace('Address', '').toLowerCase();
          if (addresses[chain]) {
            addresses[chain].push(value);
            addressToUserMap[value.toLowerCase()] = userId;
          }
        }
      });
    });
    
    logToFile(`Loaded deposit addresses: ${Object.keys(addresses).map(chain => 
      `${chain}: ${addresses[chain].length}`).join(', ')}`);
      
    return { addresses, addressToUserMap };
  } catch (error) {
    logToFile(`Error fetching deposit addresses: ${error.message}`);
    return { addresses: {}, addressToUserMap: {} };
  }
}

// Fetch EVM blockchain transactions for an address with improved error handling
async function fetchEvmTransactions(chain, addresses) {
  if (!providers[chain] || addresses.length === 0) return [];
  
  const transactions = [];
  try {
    const provider = providers[chain];
    
    // Get current block number with retry
    let currentBlock;
    try {
      currentBlock = await provider.getBlockNumber();
      logToFile(`Current ${chain} block: ${currentBlock}`);
    } catch (error) {
      logToFile(`Error getting ${chain} block number: ${error.message}`);
      return [];
    }
    
    // Get the last 100 blocks (~20-30 minutes of transactions)
    const fromBlock = Math.max(currentBlock - 100, 0);
    
    // Process in smaller batches to avoid timeouts
    const batchSize = 5;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const addressBatch = addresses.slice(i, i + batchSize);
      
      await Promise.all(addressBatch.map(async (address) => {
        try {
          // For EVM chains, we'll use the safe method of getting transaction history
          if (!ethers.utils.isAddress(address)) {
            logToFile(`Invalid ${chain} address: ${address}`);
            return;
          }
          
          // First check balance to see if it's worth querying
          const balance = await provider.getBalance(address);
          if (balance.isZero()) {
            // Skip addresses with zero balance
            return;
          }
          
          // For each valid address, get recent transactions
          // Since ethers.js getHistory is not reliable for all RPCs, we'll use a different approach
          
          // For Ethereum-compatible chains, we need to scan blocks
          // This is a simplified version - in production you would use an indexer or API
          for (let blockNumber = currentBlock; blockNumber > fromBlock; blockNumber -= 5) {
            try {
              const block = await provider.getBlock(blockNumber, true);
              if (!block || !block.transactions) continue;
              
              // Check for transactions to this address
              for (const tx of block.transactions) {
                if (tx.to && tx.to.toLowerCase() === address.toLowerCase() && tx.value.gt(0)) {
                  const ethValue = ethers.utils.formatEther(tx.value);
                  transactions.push({
                    chain,
                    fromAddress: tx.from,
                    toAddress: tx.to,
                    amount: ethValue,
                    token: chain === 'ethereum' ? 'ETH' : 
                           chain === 'bsc' ? 'BNB' : 
                           chain === 'polygon' ? 'MATIC' :
                           chain === 'arbitrum' ? 'ETH' :
                           chain === 'base' ? 'ETH' : 'UNKNOWN',
                    transactionHash: tx.hash,
                    blockNumber: tx.blockNumber || blockNumber,
                    timestamp: block.timestamp ? new Date(block.timestamp * 1000).toISOString() : new Date().toISOString(),
                    status: 'completed'
                  });
                }
              }
            } catch (blockError) {
              // Skip errors for individual blocks
              continue;
            }
          }
        } catch (addressError) {
          logToFile(`Error processing ${chain} address ${address}: ${addressError.message}`);
        }
      }));
    }
    
    logToFile(`Fetched ${transactions.length} ${chain} transactions`);
    return transactions;
  } catch (error) {
    logToFile(`Error fetching ${chain} transactions: ${error.message}`);
    return [];
  }
}

// Fetch Solana transactions with improved error handling
async function fetchSolanaTransactions(addresses) {
  if (!providers.solana || addresses.length === 0) return [];
  
  const transactions = [];
  
  try {
    // Process in smaller batches to avoid timeouts
    const batchSize = 3;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const addressBatch = addresses.slice(i, i + batchSize);
      
      for (const address of addressBatch) {
        try {
          // Validate Solana address
          let pubKey;
          try {
            pubKey = new PublicKey(address);
          } catch (error) {
            logToFile(`Invalid Solana address: ${address}`);
            continue;
          }
          
          // Get recent signatures (transactions)
          let signatures;
          try {
            signatures = await providers.solana.getSignaturesForAddress(pubKey, { limit: 20 });
            logToFile(`Found ${signatures.length} Solana signatures for ${address.substr(0, 8)}...`);
          } catch (error) {
            logToFile(`Error getting signatures for Solana address ${address}: ${error.message}`);
            continue;
          }
          
          if (!signatures || signatures.length === 0) continue;
          
          // Process each signature
          for (const sig of signatures) {
            try {
              if (!sig.signature) continue;
              
              const tx = await providers.solana.getTransaction(sig.signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
              });
              
              if (!tx || !tx.meta) continue;
              
              // Find the account index for this address
              const accountIndex = tx.transaction.message.accountKeys.findIndex(
                key => key.toString() === pubKey.toString()
              );
              
              if (accountIndex < 0 || !tx.meta.preBalances || !tx.meta.postBalances) continue;
              
              const preBalance = tx.meta.preBalances[accountIndex];
              const postBalance = tx.meta.postBalances[accountIndex];
              
              // If balance increased, it's an incoming transaction
              if (postBalance > preBalance) {
                const amountSol = (postBalance - preBalance) / 1000000000; // Convert lamports to SOL
                
                if (amountSol > 0) {
                  transactions.push({
                    chain: 'solana',
                    fromAddress: tx.transaction.message.accountKeys[0].toString(),
                    toAddress: address,
                    amount: amountSol.toString(),
                    token: 'SOL',
                    transactionHash: sig.signature,
                    blockNumber: tx.slot,
                    timestamp: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : new Date().toISOString(),
                    status: 'completed'
                  });
                }
              }
            } catch (txError) {
              logToFile(`Error processing Solana transaction ${sig.signature}: ${txError.message}`);
              continue;
            }
          }
        } catch (addressError) {
          logToFile(`Error processing Solana address ${address}: ${addressError.message}`);
          continue;
        }
      }
    }
    
    logToFile(`Fetched ${transactions.length} Solana transactions`);
    return transactions;
  } catch (error) {
    logToFile(`Error fetching Solana transactions: ${error.message}`);
    return [];
  }
}

// Main function to fetch blockchain deposits with improved error handling
async function fetchBlockchainDeposits() {
  logToFile('Starting blockchain deposit fetch cycle...');
  
  try {
    // First get user deposit addresses from Firestore
    const { addresses, addressToUserMap } = await getDepositAddresses();
    
    // Fetch user details for reference
    const usersSnapshot = await db.collection('users').get();
    const usersData = {};
    
    usersSnapshot.forEach((doc) => {
      usersData[doc.id] = doc.data();
    });
    
    logToFile(`Fetched ${Object.keys(usersData).length} users for reference`);
    
    // Fetch transactions from each blockchain
    const allBlockchainTxs = [];
    
    // EVM chains (Ethereum, BSC, Polygon, etc.)
    for (const chain of evmChains) {
      if (addresses[chain] && addresses[chain].length > 0) {
        try {
          const chainTxs = await fetchEvmTransactions(chain, addresses[chain]);
          allBlockchainTxs.push(...chainTxs);
        } catch (error) {
          logToFile(`Failed to fetch ${chain} transactions: ${error.message}`);
        }
      }
    }
    
    // Solana
    if (addresses.solana && addresses.solana.length > 0) {
      try {
        const solanaTxs = await fetchSolanaTransactions(addresses.solana);
        allBlockchainTxs.push(...solanaTxs);
      } catch (error) {
        logToFile(`Failed to fetch Solana transactions: ${error.message}`);
      }
    }
    
    // Log all found transactions
    if (allBlockchainTxs.length > 0) {
      logToFile(`Found transactions: ${allBlockchainTxs.map(tx => 
        `${tx.chain}:${tx.transactionHash.substring(0, 8)}... (${tx.amount} ${tx.token})`).join(', ')}`);
    }
    
    // Enrich transactions with user data
    const enrichedTransactions = allBlockchainTxs.map(tx => {
      const toAddressLower = tx.toAddress ? tx.toAddress.toLowerCase() : '';
      const userId = addressToUserMap[toAddressLower];
      const user = userId ? usersData[userId] : null;
      
      return {
        ...tx,
        userId,
        userEmail: user?.email || 'No email available',
        userName: user?.displayName || user?.username || user?.nickname || 
                 (userId ? `User ${userId.slice(0,6)}` : 'Unknown User'),
        type: 'deposit',
        direction: 'IN'
      };
    });
    
    logToFile(`Enriched ${enrichedTransactions.length} total blockchain deposits with user data`);
    
    // Compare with existing transactions in Firestore to find new ones
    let existingTxHashes = [];
    try {
      const existingTxs = await db.collection('transactions')
        .where('type', '==', 'deposit')
        .select('transactionHash')
        .get();
      
      existingTxHashes = existingTxs.docs
        .map(doc => doc.data().transactionHash)
        .filter(hash => hash); // Remove undefined/null hashes
      
      logToFile(`Found ${existingTxHashes.length} existing transaction hashes in Firestore`);
    } catch (error) {
      logToFile(`Error fetching existing transactions: ${error.message}`);
    }
    
    // Filter out transactions that already exist in Firestore
    const newTransactions = enrichedTransactions.filter(tx => 
      !existingTxHashes.includes(tx.transactionHash)
    );
    
    logToFile(`Found ${newTransactions.length} new blockchain deposits`);
    
    // Log details of the new transactions
    if (newTransactions.length > 0) {
      logToFile('New transactions details:');
      newTransactions.forEach((tx, i) => {
        logToFile(`${i+1}. ${tx.chain} - User: ${tx.userName} (${tx.userId || 'unknown'})`);
        logToFile(`   Amount: ${tx.amount} ${tx.token}`);
        logToFile(`   Hash: ${tx.transactionHash}`);
        logToFile(`   Time: ${tx.timestamp}`);
      });
    }
    
    // Save new transactions to Firestore if needed
    if (newTransactions.length > 0) {
      try {
        const batch = db.batch();
        
        for (const tx of newTransactions) {
          const txRef = db.collection('transactions').doc();
          const timestamp = admin.firestore.Timestamp.fromDate(new Date(tx.timestamp));
          
          batch.set(txRef, {
            ...tx,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            timestamp: timestamp,
            isRealBlockchainTx: true
          });
          
          // Also update user balance
          if (tx.userId) {
            const userRef = db.collection('users').doc(tx.userId);
            const tokenBalance = `balances.${tx.token}`;
            
            // Use increment to safely update balance
            batch.update(userRef, {
              [tokenBalance]: admin.firestore.FieldValue.increment(parseFloat(tx.amount))
            });
          }
        }
        
        await batch.commit();
        logToFile(`Saved ${newTransactions.length} new blockchain deposits to Firestore and updated balances`);
      } catch (error) {
        logToFile(`Error saving new transactions to Firestore: ${error.message}`);
      }
    }
    
    // Save data to JSON file for frontend access
    fs.writeFileSync('blockchain-deposits.json', JSON.stringify({
      lastUpdated: new Date().toISOString(),
      allDeposits: enrichedTransactions,
      newDeposits: newTransactions
    }, null, 2));
    
    logToFile('Blockchain deposit data saved to blockchain-deposits.json');
    logToFile('Blockchain deposit fetch cycle completed');
    
  } catch (error) {
    logToFile(`Error in blockchain deposit fetch: ${error.message}`);
    if (error.stack) {
      logToFile(`Stack trace: ${error.stack}`);
    }
  }
}

// Run immediately and then every minute
fetchBlockchainDeposits();
logToFile('Initial blockchain fetch completed, now running every minute');

const interval = setInterval(fetchBlockchainDeposits, 60000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  clearInterval(interval);
  logToFile('Blockchain deposit fetcher stopped');
  process.exit(0);
});

logToFile('Blockchain deposit fetcher started. Press Ctrl+C to stop.'); 