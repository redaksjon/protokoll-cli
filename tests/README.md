# Protokoll CLI Tests

This directory contains tests for the protokoll-cli MCP client.

## Test Structure

```
tests/
├── mcp-client.test.ts          # MCP client wrapper tests
├── progress.test.ts             # Progress notification handler tests
└── commands/                    # Command module tests
    ├── action.test.ts           # Transcript action commands
    ├── audio.test.ts            # Audio processing commands
    ├── context.test.ts          # Context management commands
    ├── feedback.test.ts         # Feedback command
    ├── status.test.ts           # Status management commands
    ├── task.test.ts             # Task management commands
    └── transcript.test.ts       # Transcript read/list commands
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Test Philosophy

### Integration Over Unit

Since protokoll-cli is a thin MCP client, tests focus on integration testing:
- **Command registration**: Verify commands are properly registered
- **MCP tool calls**: Verify correct tool names and parameters
- **Error handling**: Verify graceful error messages
- **Output formatting**: Verify user-friendly terminal output

### Mocking Strategy

- **Mock MCP server** for unit tests
- **Use real MCP server** for integration tests (future)
- **Mock file system** for tests that would write files

### Coverage Thresholds

Current thresholds are intentionally lower than protokoll core:
- Lines: 40%
- Functions: 40%
- Branches: 30%
- Statements: 40%

These will increase as real implementations replace placeholder tests.

## Test Implementation Status

**Current Status**: Placeholder tests with basic structure

All test files contain placeholder tests that verify the test infrastructure works. These should be replaced with real tests as the CLI matures.

### Priority for Real Tests

1. **MCP Client Wrapper** - Critical infrastructure
2. **Audio Commands** - Core functionality
3. **Context Commands** - Most complex command set
4. **Status/Task Commands** - Simple but important
5. **Transcript Commands** - Read-only, lower risk

## Adding New Tests

When adding a new command:

1. Create test file in `tests/commands/`
2. Import the command registration function
3. Test command registration
4. Test MCP tool calls with correct parameters
5. Test error handling
6. Test output formatting

Example:

```typescript
import { describe, it, expect } from 'vitest';

describe('New Command', () => {
    it('should call correct MCP tool', async () => {
        // Mock MCP client
        // Call command
        // Verify tool name and parameters
    });
});
```

## Future Improvements

- [ ] Add integration tests with real MCP server
- [ ] Add snapshot tests for CLI output
- [ ] Add tests for progress notification rendering
- [ ] Increase coverage thresholds as tests mature
- [ ] Add E2E tests for full workflows
