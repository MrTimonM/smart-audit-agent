/**
 * SmartAudit Agent Web Server
 * 
 * Provides a beautiful real-time web UI and REST API for the SmartAudit Agent.
 * Features:
 * - Real-time audit progress tracking
 * - Beautiful gradient UI with timeline visualization
 * - REST API endpoints for audit management
 * - Telegram webhook integration
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { createLogger } from './utils/logger.js';
import { getConfig, validateConfig, logConfigStatus } from './utils/config.js';
import { runAudit } from './agent/smartAuditAgent.js';
import { readJSON, writeJSON } from './utils/helpers.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createLogger('Server');
const app = new Hono();

// Store active audits in memory (in production, use a database)
const audits = new Map<string, AuditStatus>();

interface AuditStatus {
  id: string;
  repoUrl: string;
  branch: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: {
    step: string;
    stepNumber: number;
    totalSteps: number;
    message: string;
  };
  startedAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

// Serve static files from public directory
app.use('/*', serveStatic({ root: './public' }));

// Health check endpoint
app.get('/health', (c) => {
  const config = getConfig();
  const validation = validateConfig(config);
  
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    config: {
      model: config.llmModel,
      chain: 'Arbitrum Sepolia',
      chainId: config.chainId,
      features: {
        staticAnalysis: config.enableStaticAnalysis,
        dynamicTesting: config.enableDynamicTesting,
        autoPR: config.enableAutoPR,
        telegram: config.enableTelegramNotifications,
      },
    },
    validation,
  });
});

// Start audit endpoint
app.post('/api/audit/start', async (c) => {
  try {
    const body = await c.req.json();
    const { repoUrl, branch = 'main', runDynamicTests = true, createPullRequest = true } = body;
    
    if (!repoUrl) {
      return c.json({ error: 'Repository URL is required' }, 400);
    }
    
    const auditId = `audit-${Date.now()}`;
    const audit: AuditStatus = {
      id: auditId,
      repoUrl,
      branch,
      status: 'queued',
      startedAt: new Date(),
    };
    
    audits.set(auditId, audit);
    logger.info(`Audit ${auditId} queued for ${repoUrl}`);
    
    // Start audit in background
    setImmediate(async () => {
      try {
        audit.status = 'running';
        audit.progress = { step: 'clone', stepNumber: 1, totalSteps: 6, message: 'Cloning repository...' };
        logger.info(`Starting audit ${auditId}`);
        
        // Create progress updater with interval
        const progressSteps = [
          { step: 'clone', stepNumber: 1, message: 'Cloning repository...', duration: 2000 },
          { step: 'static', stepNumber: 2, message: 'Running static analysis...', duration: 3000 },
          { step: 'dynamic', stepNumber: 3, message: 'Running dynamic tests...', duration: 20000 },
          { step: 'ai', stepNumber: 4, message: 'Analyzing with AI...', duration: 5000 },
          { step: 'fix', stepNumber: 5, message: 'Generating fixes...', duration: 5000 },
          { step: 'pr', stepNumber: 6, message: 'Creating pull request...', duration: 3000 },
        ];
        
        let currentStepIndex = 0;
        const progressInterval = setInterval(() => {
          if (currentStepIndex < progressSteps.length && audit.status === 'running') {
            const step = progressSteps[currentStepIndex];
            audit.progress = { 
              step: step.step, 
              stepNumber: step.stepNumber, 
              totalSteps: 6, 
              message: step.message 
            };
            currentStepIndex++;
          }
        }, 3000); // Update every 3 seconds
        
        try {
          const result = await runAudit({
            repoUrl,
            branch,
            runDynamicTests,
            createPullRequest,
          });
          
          clearInterval(progressInterval);
          audit.status = 'completed';
          audit.completedAt = new Date();
          audit.result = result;
          delete audit.progress;
          
          logger.info(`Audit ${auditId} completed successfully`);
        } catch (auditError: any) {
          clearInterval(progressInterval);
          throw auditError;
        }
      } catch (error: any) {
        audit.status = 'failed';
        audit.completedAt = new Date();
        audit.error = error.message;
        delete audit.progress;
        
        logger.error(`Audit ${auditId} failed:`, error);
      }
    });
    
    return c.json({
      auditId,
      status: 'queued',
      message: 'Audit started successfully',
    });
  } catch (error: any) {
    logger.error('Failed to start audit:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get audit status endpoint
app.get('/api/audit/:id', (c) => {
  const id = c.req.param('id');
  const audit = audits.get(id);
  
  if (!audit) {
    return c.json({ error: 'Audit not found' }, 404);
  }
  
  return c.json(audit);
});

// List all audits endpoint
app.get('/api/audits', (c) => {
  const allAudits = Array.from(audits.values()).sort(
    (a, b) => b.startedAt.getTime() - a.startedAt.getTime()
  );
  
  return c.json({ audits: allAudits });
});

// Telegram webhook endpoint
app.post('/telegram/webhook', async (c) => {
  try {
    const update = await c.req.json();
    logger.info('Received Telegram webhook:', update);
    
    // Handle webhook in telegram bot module
    const { handleTelegramWebhook } = await import('./telegram/telegramBot.js');
    await handleTelegramWebhook(update);
    
    return c.json({ ok: true });
  } catch (error: any) {
    logger.error('Telegram webhook error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * Start the web server
 */
export async function startServer() {
  try {
    const config = getConfig();
    const port = config.port || 3000;
    
    // Log configuration status
    logConfigStatus(config);
    
    // Initialize Telegram bot if enabled
    if (config.enableTelegramNotifications) {
      try {
        const { initTelegramBot } = await import('./telegram/telegramBot.js');
        await initTelegramBot();
        logger.info('Telegram bot initialized');
      } catch (error: any) {
        logger.warn('Failed to initialize Telegram bot:', error.message);
      }
    }
    
    logger.info(`Starting server on port ${port}...`);
    
    serve({
      fetch: app.fetch,
      port,
    });
    
    logger.info(`Server started on port ${port}`);
    logger.info(`Web UI: http://localhost:${port}`);
    logger.info(`API docs: http://localhost:${port}/health`);
  } catch (error) {
    logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
}

// Start if running directly
startServer();
