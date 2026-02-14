/**
 * Tests for Status Commands
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

// Mock client factory
const mockCallTool = vi.fn();
const mockDisconnect = vi.fn();
vi.mock('../../src/client-factory.js', () => ({
    createConfiguredMCPClient: vi.fn().mockResolvedValue({
        callTool: (...args: any[]) => mockCallTool(...args),
        disconnect: (...args: any[]) => mockDisconnect(...args),
    }),
}));

import { registerStatusCommands } from '../../src/commands/status.js';

function createProgram(): Command {
    const program = new Command();
    program.exitOverride(); // Prevent process.exit on commander errors
    registerStatusCommands(program);
    return program;
}

function mcpTextResponse(data: any) {
    return {
        content: [{ type: 'text', text: JSON.stringify(data) }],
    };
}

describe('Status Commands', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDisconnect.mockResolvedValue(undefined);
    });

    describe('status set', () => {
        it('should call protokoll_set_status with correct args', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                changed: true,
                previousStatus: 'initial',
                newStatus: 'reviewed',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'status', 'set', 'meeting.md', 'reviewed']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_set_status', {
                transcriptPath: 'meeting.md',
                status: 'reviewed',
            });
        });

        it('should display status change message', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                changed: true,
                previousStatus: 'initial',
                newStatus: 'reviewed',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'status', 'set', 'meeting.md', 'reviewed']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('initial'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('reviewed'));
        });

        it('should display already-set message when status unchanged', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                changed: false,
                newStatus: 'reviewed',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'status', 'set', 'meeting.md', 'reviewed']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining("already"));
        });

        it('should handle MCP errors', async () => {
            mockCallTool.mockRejectedValue(new Error('MCP connection failed'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'status', 'set', 'meeting.md', 'reviewed']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('MCP connection failed'));
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        it('should disconnect after success', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ changed: true, previousStatus: 'initial', newStatus: 'reviewed' }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'status', 'set', 'meeting.md', 'reviewed']);

            expect(mockDisconnect).toHaveBeenCalled();
        });

        it('should disconnect after error', async () => {
            mockCallTool.mockRejectedValue(new Error('fail'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'status', 'set', 'meeting.md', 'reviewed']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });

    describe('status show', () => {
        it('should call protokoll_read_transcript with correct args', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                filePath: 'meeting.md',
                title: 'Meeting Notes',
                metadata: { status: 'reviewed' },
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'status', 'show', 'meeting.md']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_read_transcript', {
                transcriptPath: 'meeting.md',
            });
        });

        it('should display file info and status', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                filePath: 'meeting.md',
                title: 'Meeting Notes',
                metadata: { status: 'reviewed' },
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'status', 'show', 'meeting.md']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('meeting.md'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Meeting Notes'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('reviewed'));
        });

        it('should default to reviewed when no status in metadata', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                filePath: 'meeting.md',
                title: 'Meeting Notes',
                metadata: {},
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'status', 'show', 'meeting.md']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('reviewed'));
        });

        it('should handle errors', async () => {
            mockCallTool.mockRejectedValue(new Error('Not found'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'status', 'show', 'meeting.md']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Not found'));
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        it('should disconnect after show', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                filePath: 'meeting.md',
                title: 'Meeting Notes',
                metadata: { status: 'reviewed' },
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'status', 'show', 'meeting.md']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });
});
