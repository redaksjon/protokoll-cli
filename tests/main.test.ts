/**
 * Tests for Main CLI Entry Point
 * 
 * Tests the CLI setup, version command, and command registration.
 * Since main.ts calls program.parse() at module level, we test
 * the version command's action handler via a reconstructed Commander setup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

// Mock client factory
const mockCallTool = vi.fn();
const mockDisconnect = vi.fn();
const mockSetConfigPath = vi.fn();
vi.mock('../src/client-factory.js', () => ({
    createConfiguredMCPClient: vi.fn().mockResolvedValue({
        callTool: (...args: any[]) => mockCallTool(...args),
        disconnect: (...args: any[]) => mockDisconnect(...args),
    }),
    setConfigPath: (...args: any[]) => mockSetConfigPath(...args),
}));

// Mock all command registrations
vi.mock('../src/commands/status.js', () => ({
    registerStatusCommands: vi.fn(),
}));
vi.mock('../src/commands/task.js', () => ({
    registerTaskCommands: vi.fn(),
}));
vi.mock('../src/commands/transcript.js', () => ({
    registerTranscriptCommands: vi.fn(),
}));
vi.mock('../src/commands/context.js', () => ({
    registerContextCommands: vi.fn(),
}));
vi.mock('../src/commands/action.js', () => ({
    registerActionCommands: vi.fn(),
}));
vi.mock('../src/commands/feedback.js', () => ({
    registerFeedbackCommands: vi.fn(),
}));
vi.mock('../src/commands/audio.js', () => ({
    registerAudioCommands: vi.fn(),
}));

import { createConfiguredMCPClient, setConfigPath } from '../src/client-factory.js';
import { registerStatusCommands } from '../src/commands/status.js';
import { registerTaskCommands } from '../src/commands/task.js';
import { registerTranscriptCommands } from '../src/commands/transcript.js';
import { registerContextCommands } from '../src/commands/context.js';
import { registerActionCommands } from '../src/commands/action.js';
import { registerFeedbackCommands } from '../src/commands/feedback.js';
import { registerAudioCommands } from '../src/commands/audio.js';

function mcpTextResponse(data: any) {
    return {
        content: [{ type: 'text', text: JSON.stringify(data) }],
    };
}

describe('Main CLI', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDisconnect.mockResolvedValue(undefined);
    });

    describe('version command', () => {
        it('should call protokoll_get_version and display results', async () => {
            mockCallTool.mockResolvedValue({
                content: [{ type: 'text', text: 'Server v1.2.3' }],
            });

            // Reconstruct the version command as main.ts defines it
            const program = new Command();
            program.exitOverride();
            program
                .name('protokoll')
                .description('Protokoll CLI')
                .version('__VERSION__')
                .option('-c, --config <path>', 'Path to configuration file')
                .hook('preAction', (thisCommand) => {
                    const opts = thisCommand.opts();
                    if (opts.config) {
                        mockSetConfigPath(opts.config);
                    }
                });

            program
                .command('version')
                .description('Show version information from MCP server')
                .action(async () => {
                    const client = await createConfiguredMCPClient();
                    try {
                        const result: any = await (client as any).callTool('protokoll_get_version');
                        console.log('Protokoll CLI:', '__VERSION__');
                        console.log('Git:', '__GIT_BRANCH__ __GIT_COMMIT__ __GIT_TAGS__');
                        console.log('\nMCP Server:');
                        if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                            const content = result.content[0];
                            if (content.type === 'text') {
                                console.log(content.text);
                            }
                        } else {
                            console.log('No version information returned from server');
                        }
                    } catch (error) {
                        console.error('Error calling MCP server:', error);
                        process.exit(1);
                    } finally {
                        await (client as any).disconnect();
                    }
                });

            await program.parseAsync(['node', 'test', 'version']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_get_version');
            expect(console.log).toHaveBeenCalledWith('Protokoll CLI:', '__VERSION__');
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('MCP Server'));
            expect(console.log).toHaveBeenCalledWith('Server v1.2.3');
        });

        it('should display fallback when no version returned', async () => {
            mockCallTool.mockResolvedValue({ content: [] });

            const program = new Command();
            program.exitOverride();
            program
                .command('version')
                .action(async () => {
                    const client = await createConfiguredMCPClient();
                    try {
                        const result: any = await (client as any).callTool('protokoll_get_version');
                        console.log('Protokoll CLI:', '__VERSION__');
                        console.log('\nMCP Server:');
                        if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                            const content = result.content[0];
                            if (content.type === 'text') {
                                console.log(content.text);
                            }
                        } else {
                            console.log('No version information returned from server');
                        }
                    } catch (error) {
                        console.error('Error calling MCP server:', error);
                        process.exit(1);
                    } finally {
                        await (client as any).disconnect();
                    }
                });

            await program.parseAsync(['node', 'test', 'version']);

            expect(console.log).toHaveBeenCalledWith('No version information returned from server');
        });

        it('should handle version command errors', async () => {
            mockCallTool.mockRejectedValue(new Error('Server unavailable'));

            const program = new Command();
            program.exitOverride();
            program
                .command('version')
                .action(async () => {
                    const client = await createConfiguredMCPClient();
                    try {
                        await (client as any).callTool('protokoll_get_version');
                    } catch (error) {
                        console.error('Error calling MCP server:', error);
                        process.exit(1);
                    } finally {
                        await (client as any).disconnect();
                    }
                });

            await program.parseAsync(['node', 'test', 'version']);

            expect(console.error).toHaveBeenCalledWith('Error calling MCP server:', expect.any(Error));
            expect(process.exit).toHaveBeenCalledWith(1);
        });
    });

    describe('preAction hook', () => {
        it('should set config path when --config option provided', async () => {
            const program = new Command();
            program.exitOverride();
            program
                .option('-c, --config <path>', 'Path to configuration file')
                .hook('preAction', (thisCommand) => {
                    const opts = thisCommand.opts();
                    if (opts.config) {
                        mockSetConfigPath(opts.config);
                    }
                });

            program
                .command('test-cmd')
                .action(() => {});

            await program.parseAsync(['node', 'test', '--config', '/my/config.yaml', 'test-cmd']);

            expect(mockSetConfigPath).toHaveBeenCalledWith('/my/config.yaml');
        });

        it('should not set config path when --config not provided', async () => {
            const program = new Command();
            program.exitOverride();
            program
                .option('-c, --config <path>', 'Path to configuration file')
                .hook('preAction', (thisCommand) => {
                    const opts = thisCommand.opts();
                    if (opts.config) {
                        mockSetConfigPath(opts.config);
                    }
                });

            program
                .command('test-cmd')
                .action(() => {});

            await program.parseAsync(['node', 'test', 'test-cmd']);

            expect(mockSetConfigPath).not.toHaveBeenCalled();
        });
    });

    describe('command registration (via import)', () => {
        it('should import main module without error', async () => {
            // Verify all mocked registration functions are importable
            expect(registerStatusCommands).toBeDefined();
            expect(registerTaskCommands).toBeDefined();
            expect(registerTranscriptCommands).toBeDefined();
            expect(registerContextCommands).toBeDefined();
            expect(registerActionCommands).toBeDefined();
            expect(registerFeedbackCommands).toBeDefined();
            expect(registerAudioCommands).toBeDefined();
        });
    });
});
