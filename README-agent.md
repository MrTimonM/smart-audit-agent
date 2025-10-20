# 🔒 SmartAudit Agent

**Production-Quality Autonomous Smart Contract Security Auditor**

SmartAudit Agent is a fully autonomous AI-powered security auditor that clones GitHub smart contract repositories, performs comprehensive static and dynamic analysis, deploys to Arbitrum Sepolia testnet, generates automated fixes, and creates detailed Pull Requests with findings.

Built with **ADK-TS** (Agent Development Kit for TypeScript) and powered by **Gemini 2.5 Flash**.

---

## ✨ Features

### 🤖 Autonomous Agent Workflow
- **Plan** → **Execute** → **Monitor** → **Report**
- Built on ADK-TS with multi-agent composition
- Intelligent error handling and retry logic
- Real-time progress tracking

### 🔍 Comprehensive Analysis
- **Static Analysis**:
  - Slither (Python-based analyzer)
  - Solhint (Linter)
  - Custom pattern-based security checks
  - Unified findings schema with severity scoring

- **Dynamic Testing**:
  - Deploys contracts to Arbitrum Sepolia testnet
  - Executes sample transactions
  - Monitors gas usage and transaction traces
  - Detects runtime vulnerabilities

### 🔧 Automated Fixes
- AI-powered fix generation using Gemini 2.5 Flash
- Confidence-based recommendations
- Automated patch file generation
- High/Medium/Low confidence ratings

### 📊 Beautiful Web Dashboard
- Real-time progress visualization
- Color-coded severity indicators
- Live log streaming
- Responsive modern UI
- One-click audit initiation

### 💬 Telegram Notifications
- Audit start/complete notifications
- Top security findings alerts
- PR creation updates
- Dynamic testing results
- Webhook and polling support

### 🔗 GitHub Integration
- Automatic Pull Request creation
- Detailed markdown reports
- Code suggestions and diffs
- Link to deployed contracts on Arbiscan

---

## 📋 Prerequisites

- **Node.js** >= 22.0
- **pnpm** (recommended) or npm
- **Git**
- **Python 3** with pip (for Slither)
- **Arbitrum Sepolia testnet ETH** (for dynamic testing)

---

## 🚀 Quick Start

### 1. Clone and Setup

\`\`\`bash
cd smart-audit-agent
cp .env.example .env
\`\`\`

### 2. Configure Environment Variables

Edit `.env` and fill in your actual values:

\`\`\`bash
# REQUIRED
GEMINI_API_KEY=your_gemini_api_key_here

# OPTIONAL (but recommended for full functionality)
GITHUB_TOKEN=your_github_token_here
TESTNET_PRIVATE_KEY=your_testnet_private_key_here
TELEGRAM_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# RPC URLs (comma-separated, auto-selects best)
RPC_URLS=https://arbitrum-sepolia-rpc.publicnode.com,https://endpoints.omniatech.io/v1/arbitrum/sepolia/public
\`\`\`

### 3. Install Dependencies

\`\`\`bash
pnpm install

# Optional: Install Slither for enhanced static analysis
pip install slither-analyzer solc-select
\`\`\`

### 4. Start the Server

\`\`\`bash
# Development mode (with hot reload)
pnpm dev:server

# Production mode
pnpm build
pnpm start
\`\`\`

### 5. Access the Dashboard

Open your browser to:
\`\`\`
http://localhost:3000
\`\`\`

---

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

\`\`\`bash
# 1. Configure .env file
cp .env.example .env
# Edit .env with your values

# 2. Build and run
docker-compose up -d

# 3. View logs
docker-compose logs -f

# 4. Stop
docker-compose down
\`\`\`

### Using Docker directly

\`\`\`bash
docker build -t smart-audit-agent .
docker run -p 3000:3000 --env-file .env smart-audit-agent
\`\`\`

---

## 📖 Usage Guide

### Web UI

1. Navigate to `http://localhost:3000`
2. Enter a GitHub repository URL (e.g., `https://github.com/owner/smart-contracts`)
3. Select branch (default: `main`)
4. Choose options:
   - ✅ Run Dynamic Tests on Arbitrum Sepolia
   - ✅ Create Pull Request with Fixes
5. Click **Start Audit**
6. Monitor real-time progress
7. View results and access the generated PR

### REST API

#### Start Audit
\`\`\`bash
curl -X POST http://localhost:3000/api/audit/start \\
  -H "Content-Type: application/json" \\
  -d '{
    "repoUrl": "https://github.com/owner/repo",
    "branch": "main",
    "runDynamicTests": true,
    "createPullRequest": true
  }'
\`\`\`

#### Get Audit Status
\`\`\`bash
curl http://localhost:3000/api/audit/audit-1234567890
\`\`\`

#### List All Audits
\`\`\`bash
curl http://localhost:3000/api/audits
\`\`\`

---

## 🧪 Demo

### Dry Run (Mock Data)

Test the agent with mock data without connecting to real services:

\`\`\`bash
pnpm demo:dry
\`\`\`

### Live Demo

Run a complete audit on a real repository:

\`\`\`bash
# Ensure .env is configured with all required keys
pnpm demo:live
\`\`\`

---

## 🏗️ Architecture

### Agent Composition (ADK-TS)

\`\`\`
SmartAudit Agent (Main)
  ├─ Plan Agent (analyzes repo, creates audit plan)
  ├─ Execution Agent
  │   ├─ Clone Action
  │   ├─ Static Analysis Action
  │   ├─ Dynamic Testing Action
  │   └─ Fix Generation Action
  └─ Reporting Agent (creates PR with findings)
\`\`\`

### Workflow

\`\`\`
1. Clone Repository → 2. Validate Contracts → 3. Static Analysis
                                                       ↓
6. Create PR ← 5. Generate Fixes ← 4. Dynamic Testing (Arbitrum Sepolia)
\`\`\`

### Technology Stack

- **Framework**: ADK-TS (Agent Development Kit)
- **Model**: Gemini 2.5 Flash
- **Web Server**: Hono (lightweight, fast)
- **Blockchain**: ethers.js v6
- **Git Operations**: simple-git
- **Static Analysis**: Slither, Solhint, Custom Patterns
- **Notifications**: node-telegram-bot-api
- **Language**: TypeScript 5.9

---

## 📂 Project Structure

\`\`\`
smart-audit-agent/
├─ src/
│  ├─ actions/              # Core audit actions
│  │  ├─ cloneRepo.ts       # Repository cloning
│  │  ├─ runStaticAnalysis.ts  # Static analysis (Slither, Solhint, patterns)
│  │  ├─ runDynamicTests.ts    # Testnet deployment & testing
│  │  ├─ generateFixes.ts      # AI-powered fix generation
│  │  └─ createPR.ts           # GitHub PR creation
│  ├─ agent/                # Agent core
│  │  └─ smartAuditAgent.ts    # Main agent with ADK-TS tools
│  ├─ telegram/             # Telegram integration
│  │  └─ telegramBot.ts        # Bot handlers & notifications
│  ├─ utils/                # Utilities
│  │  ├─ config.ts             # Environment configuration
│  │  └─ logger.ts             # Logging utilities
│  ├─ demo/                 # Demo scripts
│  ├─ index.ts              # Main entry point
│  └─ server.ts             # Web server & UI
├─ memory/                  # Audit reports & logs (gitignored)
├─ cloned-repos/            # Cloned repositories (gitignored)
├─ Dockerfile
├─ docker-compose.yml
├─ package.json
├─ tsconfig.json
├─ .env.example
└─ README-agent.md
\`\`\`

---

## 🔐 Security Checklist

### ⚠️ CRITICAL: Before Deployment

- [ ] **Never commit `.env` to version control**
- [ ] Replace all placeholder keys in `.env` with real values
- [ ] Use a dedicated testnet wallet (never mainnet keys!)
- [ ] Ensure GitHub token has minimal required permissions
- [ ] Keep `TESTNET_PRIVATE_KEY` secure and rotate regularly
- [ ] Fund testnet wallet with small amounts only
- [ ] Review all AI-generated fixes before merging
- [ ] Use environment-specific configurations (dev/staging/prod)

### 🛡️ Best Practices

- Store secrets in a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
- Use GitHub Actions secrets for CI/CD
- Enable 2FA on all service accounts
- Monitor API usage and set spending limits
- Regularly audit access logs
- Keep dependencies updated (`pnpm update`)

---

## 📊 Understanding the Output

### Finding Schema

\`\`\`typescript
{
  id: "SLTH-001",
  file: "contracts/VaultContract.sol",
  line: 123,
  title: "Reentrancy candidate",
  description: "Potential reentrancy vulnerability...",
  severity: "high",              // critical | high | medium | low | info
  confidence: "medium",           // high | medium | low
  recommendation: "Use ReentrancyGuard...",
  tool: "Slither",               // Slither | Solhint | PatternCheck
  category: "security"
}
\`\`\`

### Severity Levels

- **🔴 Critical**: Immediate threat, exploitable vulnerabilities
- **🟠 High**: Serious issues, likely exploitable
- **🟡 Medium**: Moderate risk, requires attention
- **🔵 Low**: Minor issues, best practice violations
- **ℹ️ Info**: Informational, code quality suggestions

---

## 🔧 Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | - | Gemini API key for AI analysis |
| `LLM_MODEL` | No | `gemini-2.5-flash` | AI model to use |
| `GITHUB_TOKEN` | No | - | GitHub PAT for PR creation |
| `TESTNET_PRIVATE_KEY` | No | - | Wallet private key for testnet |
| `RPC_URLS` | No | (provided) | Comma-separated RPC URLs |
| `TELEGRAM_TOKEN` | No | - | Telegram bot token |
| `TELEGRAM_CHAT_ID` | No | - | Your Telegram chat ID |
| `PORT` | No | `3000` | Server port |
| `ENABLE_STATIC_ANALYSIS` | No | `true` | Enable static analysis |
| `ENABLE_DYNAMIC_TESTING` | No | `true` | Enable dynamic testing |
| `ENABLE_AUTO_PR` | No | `true` | Enable auto PR creation |

---

## 🧠 ADK-TS Integration

This agent demonstrates advanced ADK-TS patterns:

### Tools
\`\`\`typescript
- planAuditTool: Plans audit workflow
- executeAuditTool: Executes complete audit
\`\`\`

### State Management
\`\`\`typescript
context.state.set('auditPlan', plan);
context.state.get('auditPlan');
\`\`\`

### Agent Composition
\`\`\`typescript
AgentBuilder.create('smart_audit_agent')
  .withModel('gemini-2.5-flash')
  .withTools(planAuditTool, executeAuditTool)
  .withInstruction('...expert instructions...')
  .build();
\`\`\`

---

## 🤝 Contributing

This is a demo project showcasing ADK-TS capabilities. For production use:

1. Add comprehensive error handling
2. Implement rate limiting
3. Add authentication/authorization
4. Expand test coverage
5. Add monitoring and alerting
6. Implement caching layers

---

## 📝 License

MIT License - See LICENSE file

---

## 🙏 Acknowledgments

- **ADK-TS Team** - Agent Development Kit
- **Google** - Gemini 2.5 Flash model
- **Arbitrum** - Sepolia testnet
- **Slither** - Static analysis tool
- Community contributors

---

## 📞 Support

For issues or questions:
- Check existing issues in the repository
- Review ADK-TS documentation
- Consult Arbitrum Sepolia docs for testnet issues

---

## 🎯 Roadmap

- [ ] Multi-chain support (Ethereum, Base, Optimism)
- [ ] Advanced vulnerability patterns
- [ ] Integration with more static analyzers
- [ ] Formal verification support
- [ ] Historical trend analysis
- [ ] Team collaboration features
- [ ] API rate limiting and quotas
- [ ] Detailed gas optimization reports

---

**Built with ❤️ using ADK-TS**

*Remember: This is an automated tool. Always perform manual security reviews for production smart contracts.*
