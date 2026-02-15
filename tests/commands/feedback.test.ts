/**
 * Tests for Feedback Command
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

import { registerFeedbackCommands } from '../../src/commands/feedback.js';

function createProgram(): Command {
    const program = new Command();
    program.exitOverride();
    registerFeedbackCommands(program);
    return program;
}

function mcpTextResponse(data: any) {
    return {
        content: [{ type: 'text', text: JSON.stringify(data) }],
    };
}

describe('Feedback Command', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDisconnect.mockResolvedValue(undefined);
    });

    describe('feedback', () => {
        it('should call protokoll_provide_feedback with correct args', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                changesApplied: 1,
                changes: [{ type: 'spelling', description: 'Fixed YB to Wibey' }],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'feedback', 'meeting.md', 'YB should be Wibey']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_provide_feedback', {
                transcriptPath: 'meeting.md',
                feedback: 'YB should be Wibey',
                model: undefined,
            });
        });

        it('should pass model option', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                changesApplied: 1,
                changes: [{ type: 'spelling', description: 'Fixed name' }],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'feedback', 'meeting.md', 'fix name', '-m', 'gpt-4']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_provide_feedback', {
                transcriptPath: 'meeting.md',
                feedback: 'fix name',
                model: 'gpt-4',
            });
        });

        it('should display processing message first', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                changesApplied: 0,
                changes: [],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'feedback', 'meeting.md', 'test feedback']);

            expect(console.log).toHaveBeenCalledWith('Processing feedback...');
        });

        it('should display changes applied', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                changesApplied: 2,
                changes: [
                    { type: 'spelling', description: 'Fixed YB to Wibey' },
                    { type: 'context', description: 'Added term Wibey' },
                ],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'feedback', 'meeting.md', 'YB should be Wibey']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2 change(s)'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('spelling'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('context'));
        });

        it('should display moved file path', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                changesApplied: 1,
                changes: [{ type: 'rename', description: 'Renamed file' }],
                moved: true,
                outputPath: '/new/path/meeting.md',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'feedback', 'meeting.md', 'rename it']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/new/path/meeting.md'));
        });

        it('should display no changes message', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                changesApplied: 0,
                changes: [],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'feedback', 'meeting.md', 'nothing to fix']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No changes'));
        });

        it('should handle errors', async () => {
            mockCallTool.mockRejectedValue(new Error('Feedback processing failed'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'feedback', 'meeting.md', 'fix stuff']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Feedback processing failed'));
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        it('should handle non-Error objects in catch', async () => {
            mockCallTool.mockRejectedValue('string error');

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'feedback', 'meeting.md', 'fix stuff']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unknown error'));
        });

        it('should always disconnect', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ changesApplied: 0, changes: [] }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'feedback', 'meeting.md', 'test']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });
});
