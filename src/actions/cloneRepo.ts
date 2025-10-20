/**
 * Clone Repository Action
 * 
 * Clones a GitHub repository to local disk for analysis.
 * Uses simple-git for reliable git operations.
 */

import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../utils/logger';

const logger = createLogger('CloneRepo');

export interface CloneRepoInput {
  repoUrl: string;
  branch?: string;
  targetDir?: string;
}

export interface CloneRepoResult {
  success: boolean;
  localPath: string;
  repoUrl: string;
  branch: string;
  commit: string;
  error?: string;
}

/**
 * Clones a GitHub repository to a local directory
 */
export async function cloneRepository(input: CloneRepoInput): Promise<CloneRepoResult> {
  const { repoUrl, branch = 'main', targetDir } = input;
  
  logger.info(`Starting clone of ${repoUrl} (branch: ${branch})`);
  
  try {
    // Extract repo name from URL
    const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
    const timestamp = Date.now();
    const clonePath = targetDir || path.join(process.cwd(), 'cloned-repos', `${repoName}-${timestamp}`);
    
    // Ensure parent directory exists
    await fs.mkdir(path.dirname(clonePath), { recursive: true });
    
    // Initialize git
    const git: SimpleGit = simpleGit();
    
    // Clone repository
    logger.info(`Cloning to ${clonePath}...`);
    await git.clone(repoUrl, clonePath, ['--depth', '1', '--branch', branch]);
    
    // Get current commit hash
    const gitRepo = simpleGit(clonePath);
    const log = await gitRepo.log(['-1']);
    const commit = log.latest?.hash || 'unknown';
    
    logger.info(`Successfully cloned ${repoUrl} at commit ${commit}`);
    
    return {
      success: true,
      localPath: clonePath,
      repoUrl,
      branch,
      commit,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to clone repository: ${errorMsg}`);
    
    return {
      success: false,
      localPath: '',
      repoUrl,
      branch,
      commit: '',
      error: errorMsg,
    };
  }
}

/**
 * Validates that a cloned repository contains Solidity contracts
 */
export async function validateSolidityRepo(localPath: string): Promise<{
  isValid: boolean;
  contractFiles: string[];
  error?: string;
}> {
  try {
    const contractFiles: string[] = [];
    
    // Recursively find .sol files
    async function findSolFiles(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
          await findSolFiles(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.sol')) {
          contractFiles.push(fullPath);
        }
      }
    }
    
    await findSolFiles(localPath);
    
    if (contractFiles.length === 0) {
      return {
        isValid: false,
        contractFiles: [],
        error: 'No Solidity (.sol) files found in repository',
      };
    }
    
    logger.info(`Found ${contractFiles.length} Solidity files`);
    
    return {
      isValid: true,
      contractFiles,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      isValid: false,
      contractFiles: [],
      error: errorMsg,
    };
  }
}
