# 🔑 GitHub Token Setup Guide

## Issue: "Resource not accessible by personal access token"

This error means your GitHub token doesn't have the required permissions to create Pull Requests.

---

## ✅ Solution: Create a Classic Token

### Step 1: Go to GitHub Settings

1. Open: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**

### Step 2: Configure Token

**Name:** `SmartAudit-Agent-Token`

**Expiration:** 
- `90 days` (recommended)
- Or `No expiration` (if you're okay with the security risk)

**Select scopes:**
✅ Check these boxes:
- ✅ **repo** (Full control of private repositories)
  - This includes:
    - repo:status
    - repo_deployment
    - public_repo
    - repo:invite
    - security_events

That's it! Just check **`repo`** and all sub-permissions will be included.

### Step 3: Generate Token

1. Scroll down and click **"Generate token"**
2. **Copy the token** (it looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
3. ⚠️ Save it somewhere safe - you won't see it again!

### Step 4: Add to .env File

Open your `.env` file and update:

```env
# GitHub Configuration
GITHUB_TOKEN=ghp_your_actual_token_here
```

Replace `your_github_token_here` with the token you just copied.

### Step 5: Restart Server

The server should auto-reload with tsx watch, but if not:
```powershell
# Press Ctrl+C to stop server
pnpm dev:server
```

---

## 🔒 Option B: Fix Fine-Grained Token (More Secure)

If you prefer fine-grained tokens, you need to grant these permissions:

### Go to Token Settings:
https://github.com/settings/tokens?type=beta

### Edit Your Token and Grant:

**Repository Access:**
- Select: **"Only select repositories"**
- Choose: `MrTimonM/smart-contracts`

**Repository Permissions:**
- ✅ **Contents:** Read and Write
- ✅ **Pull Requests:** Read and Write
- ✅ **Metadata:** Read-only (automatic)

**Save changes**

---

## ⚡ Quick Test

After updating your token, test it:

### In PowerShell:
```powershell
cd smart-audit-agent

# Test GitHub API access
$token = "YOUR_TOKEN_HERE"
$headers = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/vnd.github+json"
}
Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers
```

Should return your GitHub user info.

---

## 🐛 Common Issues

### Issue 1: Token Expired
**Error:** `401 Unauthorized`
**Solution:** Generate a new token

### Issue 2: Wrong Repository Access
**Error:** `403 Forbidden`  
**Solution:** Make sure token has access to `MrTimonM/smart-contracts`

### Issue 3: Missing Permissions
**Error:** `Resource not accessible`
**Solution:** Add `repo` scope (classic) or `Pull Requests: Write` (fine-grained)

---

## 📋 Token Comparison

| Feature | Classic Token | Fine-Grained Token |
|---------|--------------|-------------------|
| Setup | ✅ Easy (1 checkbox) | ⚠️ Complex (multiple settings) |
| Security | ⚠️ Access to ALL repos | ✅ Per-repository access |
| Expiration | Optional | Required (max 1 year) |
| Recommended For | Personal projects, demos | Production, team projects |

**For SmartAudit Agent Demo:** Use **Classic Token** ✅

---

## ✅ Final Checklist

Before running audit again:

- [ ] Generated GitHub token (classic recommended)
- [ ] Token has `repo` scope
- [ ] Added token to `.env` file
- [ ] Token value starts with `ghp_` (classic) or `github_pat_` (fine-grained)
- [ ] No extra spaces in `.env` file
- [ ] Server restarted to pick up new token

---

## 🎯 After Token is Set

Run a new audit and the PR creation will work:

1. Go to http://localhost:3000
2. Enter repo URL
3. Check ✅ "Create Pull Request with Findings"
4. Click 🚀 Start Audit
5. Wait for completion
6. See PR link in results! 🎉

The PR will include:
- 📊 Detailed findings table
- 🔧 Recommended fixes
- 📈 Severity breakdown
- 🔗 Links to deployed contracts (if any)
- 💡 Security recommendations

---

**Need help?** Check the error messages in terminal for specific issues.
