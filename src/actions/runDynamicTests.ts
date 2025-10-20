/**
 * Dynamic Testing Action
 * 
 * Deploys contracts to Arbitrum Sepolia testnet and runs test transactions
 */

import { ethers } from 'ethers';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import { createLogger } from '../utils/logger';
import { config } from '../utils/config';

const logger = createLogger('DynamicTests');

export interface TestTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  status: 'success' | 'reverted';
  blockNumber: number;
  error?: string;
}

export interface DeploymentInfo {
  contractName: string;
  address: string;
  deployer: string;
  txHash: string;
  gasUsed: string;
  blockNumber: number;
}

export interface DynamicTestResult {
  success: boolean;
  deployments: DeploymentInfo[];
  transactions: TestTransaction[];
  summary: {
    totalDeployed: number;
    totalTransactions: number;
    successfulTx: number;
    failedTx: number;
    totalGasUsed: string;
  };
  rpcUrl: string;
  chainId: number;
  duration: number;
  error?: string;
}

/**
 * Selects the best responding RPC URL
 */
async function selectBestRPC(rpcUrls: string[]): Promise<string> {
  logger.info('Testing RPC URLs for best response...');
  
  const tests = rpcUrls.map(async (url) => {
    try {
      const start = Date.now();
      const provider = new ethers.JsonRpcProvider(url);
      await provider.getBlockNumber();
      const latency = Date.now() - start;
      logger.debug(`RPC ${url} responded in ${latency}ms`);
      return { url, latency };
    } catch (error) {
      logger.warn(`RPC ${url} failed: ${error}`);
      return { url, latency: Infinity };
    }
  });
  
  const results = await Promise.all(tests);
  const best = results.sort((a, b) => a.latency - b.latency)[0];
  
  if (best.latency === Infinity) {
    throw new Error('No working RPC URLs found');
  }
  
  logger.info(`Selected RPC: ${best.url} (${best.latency}ms)`);
  return best.url;
}

/**
 * Compiles contracts using Hardhat
 */
async function compileContracts(repoPath: string): Promise<boolean> {
  logger.info('Compiling contracts with Hardhat...');
  
  return new Promise((resolve) => {
    const compile = spawn('npx', ['hardhat', 'compile'], {
      cwd: repoPath,
      shell: true,
      stdio: 'pipe',
    });
    
    compile.on('close', (code) => {
      if (code === 0) {
        logger.info('Contracts compiled successfully');
        resolve(true);
      } else {
        logger.error('Contract compilation failed');
        resolve(false);
      }
    });
    
    compile.on('error', () => {
      logger.error('Failed to run Hardhat');
      resolve(false);
    });
  });
}

/**
 * Deploys contracts to testnet
 */
async function deployContracts(
  repoPath: string,
  provider: ethers.JsonRpcProvider,
  wallet: ethers.Wallet
): Promise<DeploymentInfo[]> {
  logger.info('Deploying contracts to Arbitrum Sepolia...');
  
  const deployments: DeploymentInfo[] = [];
  
  try {
    // Look for artifacts
    const artifactsPath = path.join(repoPath, 'artifacts', 'contracts');
    
    try {
      await fs.access(artifactsPath);
    } catch {
      logger.warn('No artifacts found, contracts may not be compiled');
      return deployments;
    }
    
    // Find deployable contracts (not interfaces or abstract)
    const contractFiles = await findContractArtifacts(artifactsPath);
    
    logger.info(`Found ${contractFiles.length} contract artifacts`);
    
    // Deploy up to 3 contracts for demo
    const toDeploy = contractFiles.slice(0, 3);
    
    for (const contractFile of toDeploy) {
      try {
        const artifact = JSON.parse(await fs.readFile(contractFile, 'utf-8'));
        
        if (!artifact.bytecode || artifact.bytecode === '0x') {
          logger.debug(`Skipping ${artifact.contractName} - no bytecode`);
          continue;
        }
        
        const factory = new ethers.ContractFactory(
          artifact.abi,
          artifact.bytecode,
          wallet
        );
        
        logger.info(`Deploying ${artifact.contractName}...`);
        const contract = await factory.deploy();
        await contract.waitForDeployment();
        
        const address = await contract.getAddress();
        const deployTx = contract.deploymentTransaction();
        
        if (deployTx) {
          const receipt = await deployTx.wait();
          
          deployments.push({
            contractName: artifact.contractName,
            address,
            deployer: wallet.address,
            txHash: deployTx.hash,
            gasUsed: receipt?.gasUsed.toString() || '0',
            blockNumber: receipt?.blockNumber || 0,
          });
          
          logger.info(`Deployed ${artifact.contractName} at ${address}`);
        }
      } catch (error) {
        logger.error(`Failed to deploy contract: ${error}`);
      }
    }
  } catch (error) {
    logger.error(`Deployment error: ${error}`);
  }
  
  return deployments;
}

/**
 * Finds contract artifact JSON files
 */
async function findContractArtifacts(dir: string): Promise<string[]> {
  const artifacts: string[] = [];
  
  async function scan(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.includes('.dbg.')) {
        artifacts.push(fullPath);
      }
    }
  }
  
  await scan(dir);
  return artifacts;
}

/**
 * Runs sample test transactions
 */
async function runTestTransactions(
  deployments: DeploymentInfo[],
  provider: ethers.JsonRpcProvider,
  wallet: ethers.Wallet
): Promise<TestTransaction[]> {
  logger.info('Running test transactions...');
  
  const transactions: TestTransaction[] = [];
  
  for (const deployment of deployments) {
    try {
      // Test 1: Send small amount of ETH to contract
      const tx = await wallet.sendTransaction({
        to: deployment.address,
        value: ethers.parseEther('0.0001'),
      });
      
      const receipt = await tx.wait();
      
      transactions.push({
        hash: tx.hash,
        from: wallet.address,
        to: deployment.address,
        value: '0.0001',
        gasUsed: receipt?.gasUsed.toString() || '0',
        status: receipt?.status === 1 ? 'success' : 'reverted',
        blockNumber: receipt?.blockNumber || 0,
      });
      
      logger.info(`Test transaction to ${deployment.contractName}: ${tx.hash}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Test transaction failed: ${errorMsg}`);
      
      transactions.push({
        hash: '',
        from: wallet.address,
        to: deployment.address,
        value: '0',
        gasUsed: '0',
        status: 'reverted',
        blockNumber: 0,
        error: errorMsg,
      });
    }
  }
  
  return transactions;
}

/**
 * Main dynamic testing function
 */
export async function runDynamicTests(repoPath: string): Promise<DynamicTestResult> {
  const startTime = Date.now();
  logger.info('Starting dynamic testing on Arbitrum Sepolia');
  
  try {
    // Select best RPC
    const rpcUrl = await selectBestRPC(config.rpcUrls);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Setup wallet
    const wallet = new ethers.Wallet(config.testnetPrivateKey, provider);
    logger.info(`Using wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    logger.info(`Wallet balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther('0.001')) {
      logger.warn('Low wallet balance! Get test ETH from faucet');
    }
    
    // Compile contracts
    const compiled = await compileContracts(repoPath);
    if (!compiled) {
      throw new Error('Contract compilation failed');
    }
    
    // Deploy contracts
    const deployments = await deployContracts(repoPath, provider, wallet);
    
    // Run test transactions
    const transactions = await runTestTransactions(deployments, provider, wallet);
    
    // Calculate summary
    const totalGasUsed = [
      ...deployments.map(d => BigInt(d.gasUsed)),
      ...transactions.map(t => BigInt(t.gasUsed)),
    ].reduce((a, b) => a + b, BigInt(0));
    
    const summary = {
      totalDeployed: deployments.length,
      totalTransactions: transactions.length,
      successfulTx: transactions.filter(t => t.status === 'success').length,
      failedTx: transactions.filter(t => t.status === 'reverted').length,
      totalGasUsed: totalGasUsed.toString(),
    };
    
    const duration = Date.now() - startTime;
    logger.info(`Dynamic testing complete in ${duration}ms`);
    
    return {
      success: true,
      deployments,
      transactions,
      summary,
      rpcUrl,
      chainId: config.chainId,
      duration,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Dynamic testing failed: ${errorMsg}`);
    
    return {
      success: false,
      deployments: [],
      transactions: [],
      summary: {
        totalDeployed: 0,
        totalTransactions: 0,
        successfulTx: 0,
        failedTx: 0,
        totalGasUsed: '0',
      },
      rpcUrl: config.rpcUrls[0] || '',
      chainId: config.chainId,
      duration: Date.now() - startTime,
      error: errorMsg,
    };
  }
}
