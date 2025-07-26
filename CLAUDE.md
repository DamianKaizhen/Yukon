# Claude Code Configuration

## Repository Information
- **Repository URL**: https://github.com/DamianKaizhen/Yukon.git
- **Default Branch**: master
- **Owner**: DamianKaizhen
- **Repo Name**: Yukon

## Git Configuration
- **User Email**: damian.k@yudezign.com
- **User Name**: Damian

## Available MCP Tools
- **GitHub MCP**: Available for direct repository interaction
  - Use `mcp__github__*` tools for pushing/pulling files
  - Handles authentication automatically
  - Can bypass local git setup when needed

## Claude Code Configuration
- **Settings file**: `.claude/settings.local.json`
- **Permissions**: Configured for git operations and MCP tools
- **Note**: When updating Claude settings, remember to commit changes to `.claude/` folder

## Notes
This repository is configured to push to the Yukon project on GitHub. Use MCP GitHub tools for direct repo interaction when local git isn't available or convenient. The `.claude` folder is tracked in git and should be updated when Claude Code configuration changes.