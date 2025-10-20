/**
 * Dry Run Demo
 * 
 * Demonstrates the agent with mock data without connecting to real services
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('DryRunDemo');

interface MockFinding {
  id: string;
  file: string;
  line: number;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: 'high' | 'medium' | 'low';
  recommendation: string;
}

/**
 * Mock repository cloning
 */
async function mockCloneRepo(): Promise<void> {
  logger.info('🔄 Step 1: Cloning repository...');
  await sleep(2000);
  logger.info('✅ Repository cloned successfully');
  logger.info('📁 Found 5 Solidity files');
}

/**
 * Mock static analysis
 */
async function mockStaticAnalysis(): Promise<MockFinding[]> {
  logger.info('🔍 Step 2: Running static analysis...');
  await sleep(3000);
  
  const findings: MockFinding[] = [
    {
      id: 'SLTH-001',
      file: 'contracts/Vault.sol',
      line: 45,
      title: 'Reentrancy vulnerability detected',
      description: 'Function withdraw() is vulnerable to reentrancy attacks. External call before state update.',
      severity: 'critical',
      confidence: 'high',
      recommendation: 'Use ReentrancyGuard or follow checks-effects-interactions pattern',
    },
    {
      id: 'SLTH-002',
      file: 'contracts/Token.sol',
      line: 123,
      title: 'Unchecked low-level call',
      description: 'Return value of low-level call is not checked',
      severity: 'high',
      confidence: 'medium',
      recommendation: 'Always check return values of low-level calls',
    },
    {
      id: 'PTRN-001',
      file: 'contracts/Governance.sol',
      line: 78,
      title: 'Use of tx.origin for authentication',
      description: 'tx.origin should not be used for authentication',
      severity: 'high',
      confidence: 'high',
      recommendation: 'Use msg.sender instead',
    },
    {
      id: 'SLNT-001',
      file: 'contracts/Helper.sol',
      line: 34,
      title: 'Function visibility not specified',
      description: 'Function should explicitly specify visibility',
      severity: 'medium',
      confidence: 'high',
      recommendation: 'Add public/external/internal/private visibility modifier',
    },
    {
      id: 'SLTH-003',
      file: 'contracts/Vault.sol',
      line: 89,
      title: 'Timestamp dependency',
      description: 'Contract uses block.timestamp which can be manipulated',
      severity: 'low',
      confidence: 'medium',
      recommendation: 'Avoid using block.timestamp for critical logic',
    },
  ];
  
  logger.info('✅ Static analysis complete');
  logger.info(`📊 Found ${findings.length} issues:`);
  logger.info(`   🔴 Critical: ${findings.filter(f => f.severity === 'critical').length}`);
  logger.info(`   🟠 High: ${findings.filter(f => f.severity === 'high').length}`);
  logger.info(`   🟡 Medium: ${findings.filter(f => f.severity === 'medium').length}`);
  logger.info(`   🔵 Low: ${findings.filter(f => f.severity === 'low').length}`);
  
  return findings;
}

/**
 * Mock dynamic testing
 */
async function mockDynamicTesting(): Promise<void> {
  logger.info('🧪 Step 3: Running dynamic tests on Arbitrum Sepolia...');
  await sleep(1000);
  logger.info('📦 Compiling contracts...');
  await sleep(2000);
  logger.info('✅ Contracts compiled');
  
  await sleep(1000);
  logger.info('🚀 Deploying Vault contract...');
  await sleep(2000);
  logger.info('✅ Vault deployed at 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0');
  
  await sleep(1000);
  logger.info('🚀 Deploying Token contract...');
  await sleep(2000);
  logger.info('✅ Token deployed at 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199');
  
  await sleep(1000);
  logger.info('🔄 Executing test transactions...');
  await sleep(2000);
  logger.info('✅ Transaction 1: Success (0x1a2b3c...)');
  await sleep(1000);
  logger.info('✅ Transaction 2: Success (0x4d5e6f...)');
  
  logger.info('✅ Dynamic testing complete');
  logger.info('📊 Results: 2 contracts deployed, 2 transactions executed, 0 failures');
}

/**
 * Mock fix generation
 */
async function mockGenerateFixes(findings: MockFinding[]): Promise<void> {
  logger.info('🔧 Step 4: Generating automated fixes...');
  await sleep(2000);
  
  const fixableFindings = findings.filter(f => 
    f.severity === 'medium' || f.title.includes('visibility')
  );
  
  logger.info(`✅ Generated ${fixableFindings.length} automated fixes`);
  logger.info('💾 Patch file created: security-fixes.patch');
}

/**
 * Mock PR creation
 */
async function mockCreatePR(): Promise<string> {
  logger.info('📝 Step 5: Creating GitHub Pull Request...');
  await sleep(2000);
  logger.info('🌿 Created branch: security-audit/audit-1234567890');
  await sleep(1000);
  logger.info('📤 Pushing changes...');
  await sleep(2000);
  logger.info('✅ Pull Request created');
  
  const prUrl = 'https://github.com/mock-owner/mock-repo/pull/42';
  logger.info(`🔗 PR URL: ${prUrl}`);
  
  return prUrl;
}

/**
 * Display summary
 */
function displaySummary(findings: MockFinding[], prUrl: string): void {
  console.log('\n' + '='.repeat(70));
  console.log('🎉 AUDIT COMPLETE!');
  console.log('='.repeat(70));
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Total Issues Found: ${findings.length}`);
  console.log(`   🔴 Critical: ${findings.filter(f => f.severity === 'critical').length}`);
  console.log(`   🟠 High: ${findings.filter(f => f.severity === 'high').length}`);
  console.log(`   🟡 Medium: ${findings.filter(f => f.severity === 'medium').length}`);
  console.log(`   🔵 Low: ${findings.filter(f => f.severity === 'low').length}`);
  console.log('');
  console.log('🔧 Automated Fixes: 2 fixes applied');
  console.log('📦 Contracts Deployed: 2 on Arbitrum Sepolia');
  console.log(`🔗 Pull Request: ${prUrl}`);
  console.log('');
  console.log('🎯 Top Issues:');
  findings.slice(0, 3).forEach((finding, index) => {
    const emoji = finding.severity === 'critical' ? '🔴' : finding.severity === 'high' ? '🟠' : '🟡';
    console.log(`   ${index + 1}. ${emoji} ${finding.title}`);
    console.log(`      📁 ${finding.file}:${finding.line}`);
    console.log(`      💡 ${finding.recommendation}`);
    console.log('');
  });
  console.log('='.repeat(70));
  console.log('');
  console.log('✨ This was a DRY RUN with mock data.');
  console.log('   To run a real audit, use: pnpm demo:live');
  console.log('');
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main demo function
 */
async function runDryRunDemo(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('🔒 SmartAudit Agent - DRY RUN DEMO');
  console.log('='.repeat(70));
  console.log('');
  console.log('This demo simulates a complete audit workflow with mock data.');
  console.log('No real GitHub repos will be cloned, no blockchain transactions made.');
  console.log('');
  
  try {
    // Step 1: Clone
    await mockCloneRepo();
    console.log('');
    
    // Step 2: Static Analysis
    const findings = await mockStaticAnalysis();
    console.log('');
    
    // Step 3: Dynamic Testing
    await mockDynamicTesting();
    console.log('');
    
    // Step 4: Generate Fixes
    await mockGenerateFixes(findings);
    console.log('');
    
    // Step 5: Create PR
    const prUrl = await mockCreatePR();
    console.log('');
    
    // Display Summary
    displaySummary(findings, prUrl);
    
  } catch (error) {
    logger.error(`Demo failed: ${error}`);
    process.exit(1);
  }
}

// Run the demo
runDryRunDemo().catch(console.error);
