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

## Current Status - Cabinet Quoting System (July 28, 2025)

### IMMEDIATE TASKS TO COMPLETE:

#### 1. Fix Runtime Error in Product Details Page (HIGH PRIORITY)
- **File**: `cabinet-quoting-system/frontend/src/components/product-details.tsx`
- **Issue**: Line 95 uses `selectedVariant` before it's declared on line 101 (temporal dead zone error)
- **Error**: "ReferenceError: Cannot access 'selectedVariant' before initialization"
- **Fix**: Move `selectedVariant` declaration (line 101) above the useEffect that uses it (lines 94-98)

#### 2. Fix Pagination - Show All 324 Products Instead of 24 (HIGH PRIORITY)  
- **File**: `cabinet-quoting-system/frontend/src/components/catalog/catalog-content.tsx`
- **Issue**: Line 22 defaults to `limit: 24`, only showing 24 of 324 available products
- **Fix**: Change `limit: parseInt(searchParams.get('limit') || '24')` to use higher default (100+)

### CURRENT STATE:
- ✅ Database has 324 unique products with 1,584 variants imported from CSV
- ✅ Backend API properly groups products and shows price ranges
- ✅ Frontend displays correct pricing ($285.63 - $385.24 format)
- ✅ Product cards show basic information correctly
- ❌ Product details page crashes with runtime error when clicking "View Details"
- ❌ Catalog only shows 24 products instead of all 324

### SCREENSHOTS ANALYZED:
- `currentbug2.png`: Shows runtime error in product-details.tsx at line 101
- `currentbug3.png`: Shows catalog with only "24 cabinets found" but working pricing

### SYSTEM STATUS:
- Docker containers: Running
- Frontend: http://localhost:3000 (functional but limited)
- Backend API: http://localhost:3002 (working correctly)
- Database: Populated with full dataset

### NEXT STEPS AFTER FIXES:
1. Test product details page functionality
2. Verify all 324 products are visible in catalog
3. Test variant selection and quote building features