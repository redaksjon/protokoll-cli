/**
 * Tests for Task Commands
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

import { registerTaskCommands } from '../../src/commands/task.js';

function createProgram(): Command {
    const program = new Command();
    program.exitOverride();
    registerTaskCommands(program);
    return program;
}

function mcpTextResponse(data: any) {
    return {
        content: [{ type: 'text', text: JSON.stringify(data) }],
    };
}

describe('Task Commands', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDisconnect.mockResolvedValue(undefined);
    });

    describe('task add', () => {
        it('should call protokoll_create_task with correct args', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                task: { id: 'task-123', description: 'Follow up' },
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'task', 'add', 'meeting.md', 'Follow up']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_create_task', {
                transcriptPath: 'meeting.md',
                description: 'Follow up',
            });
        });

        it('should display created task info', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                task: { id: 'task-123', description: 'Follow up with client' },
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'task', 'add', 'meeting.md', 'Follow up with client']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('task-123'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Follow up with client'));
        });

        it('should handle errors', async () => {
            mockCallTool.mockRejectedValue(new Error('Task creation failed'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'task', 'add', 'meeting.md', 'Follow up']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Task creation failed'));
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        it('should always disconnect', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ task: { id: 'task-1', description: 'test' } }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'task', 'add', 'meeting.md', 'test']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });

    describe('task complete', () => {
        it('should call protokoll_complete_task with correct args', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                taskId: 'task-123',
                description: 'Follow up',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'task', 'complete', 'meeting.md', 'task-123']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_complete_task', {
                transcriptPath: 'meeting.md',
                taskId: 'task-123',
            });
        });

        it('should display completion message', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                taskId: 'task-123',
                description: 'Follow up with client',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'task', 'complete', 'meeting.md', 'task-123']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('task-123'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Follow up with client'));
        });

        it('should handle errors', async () => {
            mockCallTool.mockRejectedValue(new Error('Task not found'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'task', 'complete', 'meeting.md', 'task-xyz']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Task not found'));
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        it('should always disconnect', async () => {
            mockCallTool.mockRejectedValue(new Error('fail'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'task', 'complete', 'meeting.md', 'task-123']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });

    describe('task delete', () => {
        it('should call protokoll_delete_task with correct args', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                taskId: 'task-123',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'task', 'delete', 'meeting.md', 'task-123']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_delete_task', {
                transcriptPath: 'meeting.md',
                taskId: 'task-123',
            });
        });

        it('should display deletion message', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                taskId: 'task-123',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'task', 'delete', 'meeting.md', 'task-123']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('task-123'));
        });

        it('should handle errors', async () => {
            mockCallTool.mockRejectedValue(new Error('Delete failed'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'task', 'delete', 'meeting.md', 'task-123']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Delete failed'));
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        it('should always disconnect', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ taskId: 'task-123' }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'task', 'delete', 'meeting.md', 'task-123']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });
});
