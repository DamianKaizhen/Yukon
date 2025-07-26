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

### GitHub MCP
- Use `mcp__github__*` tools for direct repository interaction
- Handles authentication automatically
- Can bypass local git setup when needed
- Use for: Creating repos, pushing files, managing issues/PRs, forking repositories

### Context7 MCP
- Provides up-to-date documentation and code examples for any library/framework
- **When to use**: Before implementing features with any library/framework
- **How to use**:
  1. First call `mcp__context7__resolve-library-id` with library name (e.g., "react", "nextjs", "tailwind")
  2. Then call `mcp__context7__get-library-docs` with the returned library ID
  3. Use `topic` parameter to focus on specific areas (e.g., "hooks", "routing", "authentication")
- **Best for**: Getting current best practices, API references, and working code examples

### shadcn/ui MCP
- Access to 46 high-quality React components and pre-built blocks
- **When to use**: Building React applications with polished UI components
- **Available tools**:
  - `mcp__shadcn-ui__list_components`: Get all available components (button, card, dialog, etc.)
  - `mcp__shadcn-ui__get_component`: Get source code for specific components
  - `mcp__shadcn-ui__get_component_demo`: Get usage examples
  - `mcp__shadcn-ui__list_blocks`: Browse pre-built layouts (dashboard, login, sidebar, calendar)
  - `mcp__shadcn-ui__get_block`: Get complete block implementations
- **Best for**: Rapid prototyping, consistent design systems, production-ready UI components

### Testsprite MCP
- Automated testing framework for frontend and backend applications
- **When to use**: Quality assurance, regression testing, test automation
- **Available tools**:
  - `mcp__testsprite__testsprite_bootstrap_tests`: Initialize testing environment (requires localPort)
  - `mcp__testsprite__testsprite_generate_code_summary`: Analyze and summarize project codebase
  - `mcp__testsprite__testsprite_generate_prd`: Generate structured Product Requirements Document
  - `mcp__testsprite__testsprite_generate_frontend_test_plan`: Create comprehensive frontend test plans
  - `mcp__testsprite__testsprite_generate_backend_test_plan`: Create backend API test plans
  - `mcp__testsprite__testsprite_generate_code_and_execute`: Generate and run automated tests
- **Best for**: Comprehensive testing, test plan generation, automated QA workflows, code analysis

## Development Workflow with MCPs

### For New Projects:
1. Use **Context7** to get latest documentation for your tech stack
2. Use **shadcn/ui** for UI components and layout blocks
3. Use **GitHub MCP** for repository management
4. Use **Testsprite** to generate PRD and analyze codebase structure

### For Feature Development:
1. **Context7**: Research best practices for the feature
2. **shadcn/ui**: Find relevant components/blocks for UI
3. Implement feature following documented patterns
4. **Testsprite**: Generate and run automated tests for new features
5. **GitHub MCP**: Push changes and manage PRs

### For Quality Assurance:
1. **Testsprite**: Bootstrap testing environment and generate test plans
2. **Testsprite**: Execute automated frontend/backend tests
3. Analyze test results and fix issues

### For Learning/Debugging:
1. **Context7**: Get specific documentation and examples
2. Use focused topics (e.g., "hooks", "state management", "forms")
3. **Testsprite**: Generate code summaries for understanding complex codebases

## Claude Code Configuration
- **Settings file**: `.claude/settings.local.json`
- **Permissions**: Configured for git operations and MCP tools
- **Note**: When updating Claude settings, remember to commit changes to `.claude/` folder

## Notes
This repository is configured to push to the Yukon project on GitHub. Use MCP GitHub tools for direct repo interaction when local git isn't available or convenient. The `.claude` folder is tracked in git and should be updated when Claude Code configuration changes.