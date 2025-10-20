/**
 * Static Analysis Action
 * 
 * Runs multiple static analysis tools (Slither, Solhint) on smart contracts
 * and normalizes findings into a unified schema.
 */

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../utils/logger';

const logger = createLogger('StaticAnalysis');

export interface Finding {
  id: string;
  file: string;
  line: number;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: 'high' | 'medium' | 'low';
  recommendation: string;
  tool: string;
  category: string;
}

export interface StaticAnalysisResult {
  success: boolean;
  findings: Finding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
  toolsRun: string[];
  duration: number;
  error?: string;
}

/**
 * Severity mapping for different tools
 */
const SEVERITY_MAP: Record<string, Finding['severity']> = {
  // Slither
  'High': 'high',
  'Medium': 'medium',
  'Low': 'low',
  'Informational': 'info',
  
  // Solhint
  'error': 'high',
  'warning': 'medium',
  'info': 'info',
};

/**
 * Runs Slither static analyzer
 */
async function runSlither(repoPath: string): Promise<Finding[]> {
  logger.info('Running Slither analysis...');
  
  return new Promise((resolve) => {
    const findings: Finding[] = [];
    const outputFile = path.join(repoPath, 'slither-report.json');
    
    // Run slither with JSON output
    const slither = spawn('slither', ['.', '--json', outputFile], {
      cwd: repoPath,
      shell: true,
    });
    
    slither.on('close', async (code) => {
      try {
        // Slither returns non-zero even on success if issues found
        const reportExists = await fs.access(outputFile).then(() => true).catch(() => false);
        
        if (reportExists) {
          const reportData = await fs.readFile(outputFile, 'utf-8');
          const report = JSON.parse(reportData);
          
          // Parse Slither JSON output
          if (report.results && report.results.detectors) {
            let idCounter = 1;
            for (const detector of report.results.detectors) {
              const finding: Finding = {
                id: `SLTH-${String(idCounter).padStart(3, '0')}`,
                file: detector.elements?.[0]?.source_mapping?.filename_relative || 'unknown',
                line: detector.elements?.[0]?.source_mapping?.lines?.[0] || 0,
                title: detector.check || 'Unknown Issue',
                description: detector.description || '',
                severity: SEVERITY_MAP[detector.impact] || 'info',
                confidence: (detector.confidence?.toLowerCase() as Finding['confidence']) || 'medium',
                recommendation: detector.markdown || 'Review the code carefully',
                tool: 'Slither',
                category: detector.check || 'general',
              };
              
              findings.push(finding);
              idCounter++;
            }
          }
        }
        
        logger.info(`Slither found ${findings.length} issues`);
      } catch (error) {
        logger.error(`Error parsing Slither output: ${error}`);
      }
      
      resolve(findings);
    });
    
    slither.on('error', (error) => {
      logger.warn(`Slither not available: ${error.message}`);
      resolve([]);
    });
  });
}

/**
 * Runs Solhint linter
 */
async function runSolhint(repoPath: string): Promise<Finding[]> {
  logger.info('Running Solhint analysis...');
  
  return new Promise((resolve) => {
    const findings: Finding[] = [];
    let output = '';
    
    // Run solhint
    const solhint = spawn('npx', ['solhint', '**/*.sol', '--formatter', 'json'], {
      cwd: repoPath,
      shell: true,
    });
    
    solhint.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    solhint.on('close', async () => {
      try {
        if (output.trim()) {
          const reports = JSON.parse(output);
          let idCounter = 1;
          
          for (const report of reports) {
            if (report.reports) {
              for (const issue of report.reports) {
                const finding: Finding = {
                  id: `SLNT-${String(idCounter).padStart(3, '0')}`,
                  file: report.filePath || 'unknown',
                  line: issue.line || 0,
                  title: issue.ruleId || 'Style Issue',
                  description: issue.message || '',
                  severity: SEVERITY_MAP[issue.severity] || 'info',
                  confidence: 'medium',
                  recommendation: 'Follow Solidity best practices',
                  tool: 'Solhint',
                  category: issue.ruleId || 'style',
                };
                
                findings.push(finding);
                idCounter++;
              }
            }
          }
        }
        
        logger.info(`Solhint found ${findings.length} issues`);
      } catch (error) {
        logger.warn(`Error parsing Solhint output: ${error}`);
      }
      
      resolve(findings);
    });
    
    solhint.on('error', (error) => {
      logger.warn(`Solhint not available: ${error.message}`);
      resolve([]);
    });
  });
}

/**
 * Performs manual pattern-based checks for common vulnerabilities
 */
async function runPatternChecks(repoPath: string): Promise<Finding[]> {
  logger.info('Running pattern-based checks...');
  const findings: Finding[] = [];
  let idCounter = 1;
  
  try {
    // Find all Solidity files
    const solFiles: string[] = [];
    
    async function findSolFiles(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
          await findSolFiles(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.sol')) {
          solFiles.push(fullPath);
        }
      }
    }
    
    await findSolFiles(repoPath);
    
    // Pattern checks
    const patterns = [
      {
        regex: /\.call\{value:/gi,
        title: 'Low-level call detected',
        severity: 'medium' as const,
        recommendation: 'Consider using transfer() or send() with proper error handling',
      },
      {
        regex: /tx\.origin/gi,
        title: 'tx.origin usage detected',
        severity: 'high' as const,
        recommendation: 'Use msg.sender instead of tx.origin to prevent phishing attacks',
      },
      {
        regex: /selfdestruct/gi,
        title: 'selfdestruct usage detected',
        severity: 'medium' as const,
        recommendation: 'Ensure selfdestruct is properly protected and necessary',
      },
      {
        regex: /delegatecall/gi,
        title: 'delegatecall usage detected',
        severity: 'high' as const,
        recommendation: 'Ensure delegatecall target is trusted and immutable',
      },
    ];
    
    for (const filePath of solFiles) {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      for (const pattern of patterns) {
        lines.forEach((line, index) => {
          if (pattern.regex.test(line)) {
            findings.push({
              id: `PTRN-${String(idCounter).padStart(3, '0')}`,
              file: path.relative(repoPath, filePath),
              line: index + 1,
              title: pattern.title,
              description: `Found suspicious pattern: ${line.trim().substring(0, 100)}`,
              severity: pattern.severity,
              confidence: 'medium',
              recommendation: pattern.recommendation,
              tool: 'PatternCheck',
              category: 'security',
            });
            idCounter++;
          }
        });
      }
    }
    
    logger.info(`Pattern checks found ${findings.length} issues`);
  } catch (error) {
    logger.error(`Error in pattern checks: ${error}`);
  }
  
  return findings;
}

/**
 * Main static analysis function
 */
export async function runStaticAnalysis(repoPath: string): Promise<StaticAnalysisResult> {
  const startTime = Date.now();
  logger.info(`Starting static analysis on ${repoPath}`);
  
  try {
    // Run all analyzers in parallel
    const [slitherFindings, solhintFindings, patternFindings] = await Promise.all([
      runSlither(repoPath),
      runSolhint(repoPath),
      runPatternChecks(repoPath),
    ]);
    
    // Combine all findings
    const allFindings = [...slitherFindings, ...solhintFindings, ...patternFindings];
    
    // Calculate summary
    const summary = {
      critical: allFindings.filter(f => f.severity === 'critical').length,
      high: allFindings.filter(f => f.severity === 'high').length,
      medium: allFindings.filter(f => f.severity === 'medium').length,
      low: allFindings.filter(f => f.severity === 'low').length,
      info: allFindings.filter(f => f.severity === 'info').length,
      total: allFindings.length,
    };
    
    const duration = Date.now() - startTime;
    const toolsRun = ['PatternCheck'];
    if (slitherFindings.length > 0) toolsRun.push('Slither');
    if (solhintFindings.length > 0) toolsRun.push('Solhint');
    
    logger.info(`Static analysis complete in ${duration}ms - found ${summary.total} issues`);
    
    return {
      success: true,
      findings: allFindings,
      summary,
      toolsRun,
      duration,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Static analysis failed: ${errorMsg}`);
    
    return {
      success: false,
      findings: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 },
      toolsRun: [],
      duration: Date.now() - startTime,
      error: errorMsg,
    };
  }
}

/**
 * Calculate priority score for a finding
 */
export function calculatePriorityScore(finding: Finding): number {
  const severityScores = { critical: 10, high: 7, medium: 4, low: 2, info: 1 };
  const confidenceScores = { high: 3, medium: 2, low: 1 };
  
  return severityScores[finding.severity] * confidenceScores[finding.confidence];
}
