/**
 * Tests for Transcript Commands
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

import { registerTranscriptCommands } from '../../src/commands/transcript.js';

function createProgram(): Command {
    const program = new Command();
    program.exitOverride();
    registerTranscriptCommands(program);
    return program;
}

function mcpTextResponse(data: any) {
    return {
        content: [{ type: 'text', text: JSON.stringify(data) }],
    };
}

describe('Transcript Commands', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDisconnect.mockResolvedValue(undefined);
    });

    describe('transcript read', () => {
        it('should call protokoll_read_transcript with correct args', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                title: 'Meeting Notes',
                filePath: 'meeting.md',
                contentLength: 500,
                content: '# Meeting Notes\nSome content here',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'transcript', 'read', 'meeting.md']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_read_transcript', {
                transcriptPath: 'meeting.md',
            });
        });

        it('should display transcript info and content', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                title: 'Meeting Notes',
                filePath: 'meeting.md',
                contentLength: 500,
                content: '# Meeting Notes\nContent here',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'transcript', 'read', 'meeting.md']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Meeting Notes'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('meeting.md'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('500'));
        });

        it('should handle errors', async () => {
            mockCallTool.mockRejectedValue(new Error('File not found'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'transcript', 'read', 'missing.md']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('File not found'));
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        it('should always disconnect', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                title: 'Test', filePath: 'test.md', contentLength: 0, content: '',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'transcript', 'read', 'test.md']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });

    describe('transcript list', () => {
        it('should call protokoll_list_transcripts with default options', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                directory: '/transcripts',
                pagination: { total: 2, hasMore: false },
                transcripts: [
                    { title: 'Meeting 1', path: 'meeting1.md', date: '2026-02-01' },
                    { title: 'Meeting 2', path: 'meeting2.md', date: '2026-02-02', time: '10:00' },
                ],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'transcript', 'list']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_list_transcripts', {
                limit: 50,
                search: undefined,
                sortBy: 'date',
            });
        });

        it('should pass custom options', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                directory: '/transcripts',
                pagination: { total: 5, hasMore: false },
                transcripts: [],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'transcript', 'list', '--limit', '10', '--search', 'meeting', '--sort', 'title']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_list_transcripts', {
                limit: 10,
                search: 'meeting',
                sortBy: 'title',
            });
        });

        it('should display transcript list with dates', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                directory: '/transcripts',
                pagination: { total: 2, hasMore: false },
                transcripts: [
                    { title: 'Meeting 1', path: 'meeting1.md', date: '2026-02-01' },
                    { title: 'Meeting 2', path: 'meeting2.md', date: '2026-02-02', time: '10:00' },
                ],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'transcript', 'list']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2 total'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Meeting 1'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Meeting 2'));
        });

        it('should show hasMore indicator', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                directory: '/transcripts',
                pagination: { total: 100, hasMore: true },
                transcripts: [
                    { title: 'Meeting 1', path: 'meeting1.md', date: '2026-02-01' },
                ],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'transcript', 'list']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('more'));
        });

        it('should handle unknown date', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                directory: '/transcripts',
                pagination: { total: 1, hasMore: false },
                transcripts: [
                    { title: 'Undated', path: 'undated.md' },
                ],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'transcript', 'list']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('unknown date'));
        });

        it('should handle errors', async () => {
            mockCallTool.mockRejectedValue(new Error('List failed'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'transcript', 'list']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('List failed'));
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        it('should always disconnect', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                directory: '/t', pagination: { total: 0, hasMore: false }, transcripts: [],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'transcript', 'list']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });
});
