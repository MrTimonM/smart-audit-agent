/**
 * SmartAudit Agent Core
 * 
 * Main agent orchestrating the security audit workflow using ADK-TS
 */

import { AgentBuilder, createTool, InMemorySessionService, LlmAgent } from '@iqai/adk';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../utils/logger';
import { config } from '../utils/config';
import { cloneRepository, validateSolidityRepo } from '../actions/cloneRepo';
import { runStaticAnalysis, calculatePriorityScore } from '../actions/runStaticAnalysis';
import { runDynamicTests } from '../actions/runDynamicTests';
import { generateFixes } from '../actions/generateFixes';
import { createPR } from '../actions/createPR';
import * as telegram from '../telegram/telegramBot';

const logger = createLogger('SmartAuditAgent');

export interface AuditRequest {
  repoUrl: string;
  branch?: string;
  runDynamicTests?: boolean;
  createPullRequest?: boolean;
}

export interface AuditResult {
  success: boolean;
  auditId: string;
  repoUrl: string;
  findings: any[];
  fixes: any[];
  dynamicTestResult?: any;
  prUrl?: string;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
  duration: number;
  error?: string;
}

/**
 * Create planning tool for the agent
 */
const planAuditTool = createTool({
  name: 'plan_audit',
  description: 'Plans the security audit workflow based on repository type and configuration',
  schema: z.object({
    repoUrl: z.string().describe('GitHub repository URL'),
    hasSolidityFiles: z.boolean().describe('Whether the repo contains Solidity contracts'),
  }),
  fn: ({ repoUrl, hasSolidityFiles }, context) => {
    const plan = {
      steps: [
        'Clone repository',
        'Validate Solidity contracts',
        'Run static analysis (Slither, Solhint, Pattern checks)',
      ],
    };
    
    if (config.enableDynamicTesting && config.testnetPrivateKey) {
      plan.steps.push('Deploy to Arbitrum Sepolia testnet');
      plan.steps.push('Execute test transactions');
    }
    
    plan.steps.push('Generate automated fixes');
    
    if (config.enableAutoPR && config.githubToken) {
      plan.steps.push('Create GitHub Pull Request');
    }
    
    context.state.set('auditPlan', plan);
    
    return {
      success: true,
      plan,
      estimatedDuration: `${plan.steps.length * 2}-${plan.steps.length * 5} minutes`,
    };
  },
});

/**
 * Create audit execution tool
 */
const executeAuditTool = createTool({
  name: 'execute_audit',
  description: 'Executes the complete security audit workflow',
  schema: z.object({
    repoUrl: z.string().describe('GitHub repository URL'),
    branch: z.string().default('main').describe('Branch to audit'),
  }),
  fn: async ({ repoUrl, branch }) => {
    logger.info(`Starting audit for ${repoUrl}`);
    
    const auditId = `audit-${Date.now()}`;
    const startTime = Date.now();
    
    try {
      // Step 1: Clone repository
      logger.info('Step 1: Cloning repository...');
      const cloneResult = await cloneRepository({ repoUrl, branch });
      
      if (!cloneResult.success) {
        throw new Error(`Clone failed: ${cloneResult.error}`);
      }
      
      // Step 2: Validate Solidity files
      logger.info('Step 2: Validating Solidity contracts...');
      const validation = await validateSolidityRepo(cloneResult.localPath);
      
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.error}`);
      }
      
      logger.info(`Found ${validation.contractFiles.length} Solidity files`);
      
      // Step 3: Run static analysis
      logger.info('Step 3: Running static analysis...');
      const staticResult = await runStaticAnalysis(cloneResult.localPath);
      
      if (!staticResult.success) {
        throw new Error(`Static analysis failed: ${staticResult.error}`);
      }
      
      logger.info(`Static analysis found ${staticResult.summary.total} issues`);
      
      // Step 4: Run dynamic tests (if enabled)
      let dynamicResult;
      if (config.enableDynamicTesting && config.testnetPrivateKey && config.rpcUrls.length > 0) {
        logger.info('Step 4: Running dynamic tests on Arbitrum Sepolia...');
        dynamicResult = await runDynamicTests(cloneResult.localPath);
        
        if (dynamicResult.success) {
          logger.info(`Dynamic tests complete - ${dynamicResult.summary.totalDeployed} contracts deployed`);
        } else {
          logger.warn(`Dynamic tests failed: ${dynamicResult.error}`);
        }
      }
      
      // Step 5: Generate fixes
      logger.info('Step 5: Generating automated fixes...');
      const fixesResult = await generateFixes(staticResult.findings, cloneResult.localPath);
      
      logger.info(`Generated ${fixesResult.fixes.length} automated fixes`);
      
      // Step 6: Create PR (if enabled)
      let prResult;
      if (config.enableAutoPR && config.githubToken) {
        logger.info('Step 6: Creating GitHub Pull Request...');
        prResult = await createPR({
          repoPath: cloneResult.localPath,
          repoUrl,
          findings: staticResult.findings,
          fixes: fixesResult.fixes,
          dynamicTestResult: dynamicResult,
          auditId,
        });
        
        if (prResult.success) {
          logger.info(`PR created: ${prResult.prUrl}`);
        } else {
          logger.warn(`PR creation failed: ${prResult.error}`);
        }
      }
      
      // Save audit report
      const memoryDir = path.join(process.cwd(), 'memory', auditId);
      await fs.mkdir(memoryDir, { recursive: true });
      
      const report = {
        auditId,
        repoUrl,
        branch,
        timestamp: new Date().toISOString(),
        clone: cloneResult,
        staticAnalysis: staticResult,
        dynamicTests: dynamicResult,
        fixes: fixesResult,
        pr: prResult,
        duration: Date.now() - startTime,
      };
      
      await fs.writeFile(
        path.join(memoryDir, 'full-report.json'),
        JSON.stringify(report, null, 2),
        'utf-8'
      );
      
      logger.info(`Audit complete! ID: ${auditId}`);
      
      return {
        success: true,
        auditId,
        summary: staticResult.summary,
        findingsCount: staticResult.findings.length,
        fixesCount: fixesResult.fixes.length,
        prUrl: prResult?.prUrl,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Audit failed: ${errorMsg}`);
      
      return {
        success: false,
        auditId,
        error: errorMsg,
        duration: Date.now() - startTime,
      };
    }
  },
});

/**
 * Creates the SmartAudit Agent
 */
export async function createSmartAuditAgent() {
  logger.info('Initializing SmartAudit Agent...');
  
  const sessionService = new InMemorySessionService();
  
  const { runner } = await AgentBuilder.create('smart_audit_agent')
    .withModel(config.llmModel)
    .withDescription('Autonomous smart contract security audit agent that analyzes, tests, and reports vulnerabilities')
    .withInstruction(`
You are SmartAudit Agent, an expert smart contract security auditor powered by AI.

Your mission:
1. Clone and analyze Solidity smart contracts from GitHub
2. Run comprehensive static analysis using multiple tools
3. Deploy contracts to Arbitrum Sepolia testnet for dynamic testing
4. Generate automated security fixes
5. Create detailed Pull Requests with findings and recommendations

Workflow:
- Plan: Understand the repository structure and create an audit plan
- Execute: Run all audit steps systematically
- Monitor: Track progress and handle errors gracefully
- Report: Generate comprehensive, actionable security reports

You have access to tools for planning and executing audits. Use them to provide
thorough security analysis for smart contracts.

Always prioritize:
- Critical and High severity findings
- Issues with high confidence levels
- Automated fixes that are safe to apply
- Clear, actionable recommendations

Current configuration:
- Model: ${config.llmModel}
- Chain: Arbitrum Sepolia (${config.chainId})
- Static Analysis: ${config.enableStaticAnalysis ? 'Enabled' : 'Disabled'}
- Dynamic Testing: ${config.enableDynamicTesting ? 'Enabled' : 'Disabled'}
- Auto PR: ${config.enableAutoPR ? 'Enabled' : 'Disabled'}
`)
    .withTools(planAuditTool, executeAuditTool)
    .withSessionService(sessionService)
    .build();
  
  logger.info('SmartAudit Agent initialized successfully');
  
  return { runner, sessionService };
}

/**
 * Runs a complete audit
 */
export async function runAudit(request: AuditRequest): Promise<AuditResult> {
  const auditId = `audit-${Date.now()}`;
  const startTime = Date.now();
  
  logger.info(`Starting audit ${auditId} for ${request.repoUrl}`);
  
  // Send audit start notification
  await telegram.notifyAuditStart(request.repoUrl, auditId);
  
  try {
    // Clone repository
    const cloneResult = await cloneRepository({
      repoUrl: request.repoUrl,
      branch: request.branch || 'main',
    });
    
    if (!cloneResult.success) {
      throw new Error(`Clone failed: ${cloneResult.error}`);
    }
    
    // Validate
    const validation = await validateSolidityRepo(cloneResult.localPath);
    if (!validation.isValid) {
      throw new Error(`No Solidity contracts found: ${validation.error}`);
    }
    
    // Notify clone complete
    await telegram.notifyCloneComplete(request.repoUrl, validation.contractFiles.length);
    
    // Static analysis
    const staticResult = await runStaticAnalysis(cloneResult.localPath);
    if (!staticResult.success) {
      throw new Error(`Static analysis failed: ${staticResult.error}`);
    }
    
    // Notify analysis complete with top 5 findings
    const topFindings = staticResult.findings
      .sort((a, b) => calculatePriorityScore(b) - calculatePriorityScore(a))
      .slice(0, 5);
    await telegram.notifyStaticAnalysisComplete(staticResult.findings, topFindings);
    
    // Dynamic tests (optional)
    let dynamicResult;
    if (request.runDynamicTests && config.enableDynamicTesting) {
      dynamicResult = await runDynamicTests(cloneResult.localPath);
      
      if (dynamicResult && dynamicResult.success) {
        const successRate = dynamicResult.summary.totalTransactions > 0
          ? (dynamicResult.summary.successfulTx / dynamicResult.summary.totalTransactions) * 100
          : 0;
        await telegram.notifyDynamicTestsComplete(
          dynamicResult.summary.totalDeployed,
          dynamicResult.summary.totalTransactions,
          successRate
        );
      }
    }
    
    // Generate fixes
    const fixesResult = await generateFixes(staticResult.findings, cloneResult.localPath);
    
    // Create PR (optional)
    let prUrl;
    if (request.createPullRequest && config.enableAutoPR) {
      const prResult = await createPR({
        repoPath: cloneResult.localPath,
        repoUrl: request.repoUrl,
        findings: staticResult.findings,
        fixes: fixesResult.fixes,
        dynamicTestResult: dynamicResult,
        auditId,
      });
      
      prUrl = prResult.prUrl;
      
      if (prUrl) {
        const topFindingTitles = topFindings.map(f => f.title);
        await telegram.notifyPRCreated(prUrl, fixesResult.fixes.length, topFindingTitles);
      }
    }
    
    // Save report
    const memoryDir = path.join(process.cwd(), 'memory', auditId);
    await fs.mkdir(memoryDir, { recursive: true });
    
    const report = {
      auditId,
      repoUrl: request.repoUrl,
      timestamp: new Date().toISOString(),
      staticAnalysis: staticResult,
      dynamicTests: dynamicResult,
      fixes: fixesResult,
      prUrl,
    };
    
    await fs.writeFile(
      path.join(memoryDir, 'audit-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    const result: AuditResult = {
      success: true,
      auditId,
      repoUrl: request.repoUrl,
      findings: staticResult.findings,
      fixes: fixesResult.fixes,
      dynamicTestResult: dynamicResult,
      prUrl,
      summary: staticResult.summary,
      duration: Date.now() - startTime,
    };
    
    // Send completion notification
    await telegram.notifyAuditComplete(result);
    
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Audit failed: ${errorMsg}`);
    
    // Send error notification
    await telegram.notifyAuditError(request.repoUrl, errorMsg);
    
    return {
      success: false,
      auditId,
      repoUrl: request.repoUrl,
      findings: [],
      fixes: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 },
      duration: Date.now() - startTime,
      error: errorMsg,
    };
  }
}
