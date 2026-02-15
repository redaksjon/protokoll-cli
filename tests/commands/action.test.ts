/**
 * Tests for Action Commands
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

import { registerActionCommands } from '../../src/commands/action.js';

function createProgram(): Command {
    const program = new Command();
    program.exitOverride();
    registerActionCommands(program);
    return program;
}

function mcpTextResponse(data: any) {
    return {
        content: [{ type: 'text', text: JSON.stringify(data) }],
    };
}

describe('Action Commands', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDisconnect.mockResolvedValue(undefined);
    });

    describe('action combine', () => {
        it('should call protokoll_combine_transcripts with files', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                sourceFiles: ['a.md', 'b.md'],
                outputPath: '/output/combined.md',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'action', 'combine', 'a.md', 'b.md']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_combine_transcripts', {
                transcriptPaths: ['a.md', 'b.md'],
                title: undefined,
                projectId: undefined,
            });
        });

        it('should pass title and project options', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                sourceFiles: ['a.md'],
                outputPath: '/output/combined.md',
            }));

            const program = createProgram();
            await program.parseAsync([
                'node', 'test', 'action', 'combine', 'a.md', 'b.md',
                '-t', 'Combined Notes', '-p', 'project-1',
            ]);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_combine_transcripts', {
                transcriptPaths: ['a.md', 'b.md'],
                title: 'Combined Notes',
                projectId: 'project-1',
            });
        });

        it('should display combine results with deleted files', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                sourceFiles: ['a.md', 'b.md'],
                outputPath: '/output/combined.md',
                deletedFiles: ['a.md', 'b.md'],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'action', 'combine', 'a.md', 'b.md']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Combined 2 transcripts'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/output/combined.md'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Deleted: 2'));
        });

        it('should handle combine without sourceFiles in response', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                outputPath: '/output/combined.md',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'action', 'combine', 'a.md', 'b.md', 'c.md']);

            // Falls back to files.length
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Combined 3 transcripts'));
        });

        it('should handle errors', async () => {
            mockCallTool.mockRejectedValue(new Error('Combine failed'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'action', 'combine', 'a.md', 'b.md']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Combine failed'));
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        it('should always disconnect', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ outputPath: '/out.md' }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'action', 'combine', 'a.md']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });

    describe('action edit', () => {
        it('should call protokoll_edit_transcript with title option', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                message: 'Transcript updated',
            }));

            const program = createProgram();
            await program.parseAsync([
                'node', 'test', 'action', 'edit', 'meeting.md',
                '-t', 'New Title',
            ]);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_edit_transcript', expect.objectContaining({
                transcriptPath: 'meeting.md',
                title: 'New Title',
            }));
        });

        it('should pass all edit options', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                message: 'Transcript updated',
            }));

            const program = createProgram();
            await program.parseAsync([
                'node', 'test', 'action', 'edit', 'meeting.md',
                '-t', 'New Title',
                '-p', 'project-1',
                '--add-tag', 'important',
                '--add-tag', 'review',
                '--remove-tag', 'draft',
                '-s', 'reviewed',
            ]);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_edit_transcript', {
                transcriptPath: 'meeting.md',
                title: 'New Title',
                projectId: 'project-1',
                tagsToAdd: ['important', 'review'],
                tagsToRemove: ['draft'],
                status: 'reviewed',
            });
        });

        it('should omit empty tag arrays', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ message: 'Updated' }));

            const program = createProgram();
            await program.parseAsync([
                'node', 'test', 'action', 'edit', 'meeting.md', '-t', 'New',
            ]);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_edit_transcript', expect.objectContaining({
                tagsToAdd: undefined,
                tagsToRemove: undefined,
            }));
        });

        it('should display update message', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                message: 'Transcript updated successfully',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'action', 'edit', 'meeting.md', '-t', 'New']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Transcript updated successfully'));
        });

        it('should display new path when renamed', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                message: 'Transcript updated',
                renamed: true,
                outputPath: '/new/path.md',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'action', 'edit', 'meeting.md', '-t', 'New Name']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/new/path.md'));
        });

        it('should handle errors', async () => {
            mockCallTool.mockRejectedValue(new Error('Edit failed'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'action', 'edit', 'meeting.md', '-t', 'New']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Edit failed'));
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        it('should always disconnect', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ message: 'ok' }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'action', 'edit', 'meeting.md', '-t', 'x']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });

    describe('action change-date', () => {
        it('should call protokoll_change_transcript_date with correct args', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                moved: true,
                originalPath: 'meeting.md',
                outputPath: '/2026/02/01/meeting.md',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'action', 'change-date', 'meeting.md', '2026-02-01']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_change_transcript_date', {
                transcriptPath: 'meeting.md',
                newDate: '2026-02-01',
            });
        });

        it('should display move result', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                moved: true,
                originalPath: 'old/meeting.md',
                outputPath: '2026/02/meeting.md',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'action', 'change-date', 'meeting.md', '2026-02-01']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Transcript moved'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('old/meeting.md'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2026/02/meeting.md'));
        });

        it('should display not-moved message', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                moved: false,
                message: 'Date is already correct',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'action', 'change-date', 'meeting.md', '2026-02-01']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Date is already correct'));
        });

        it('should handle errors', async () => {
            mockCallTool.mockRejectedValue(new Error('Invalid date'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'action', 'change-date', 'meeting.md', 'bad-date']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid date'));
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        it('should always disconnect', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ moved: false, message: 'ok' }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'action', 'change-date', 'meeting.md', '2026-02-01']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });

    describe('action create-note', () => {
        it('should call protokoll_create_note with title', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                message: 'Note created',
                filePath: '/notes/new-note.md',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'action', 'create-note', '-t', 'Meeting Notes']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_create_note', {
                title: 'Meeting Notes',
                content: undefined,
                projectId: undefined,
                tags: undefined,
                date: undefined,
            });
        });

        it('should pass all options', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                message: 'Note created',
                filePath: '/notes/new-note.md',
            }));

            const program = createProgram();
            await program.parseAsync([
                'node', 'test', 'action', 'create-note',
                '-t', 'Planning Session',
                '-c', 'Some content here',
                '-p', 'project-1',
                '--tag', 'important',
                '--tag', 'review',
                '-d', '2026-02-14',
            ]);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_create_note', {
                title: 'Planning Session',
                content: 'Some content here',
                projectId: 'project-1',
                tags: ['important', 'review'],
                date: '2026-02-14',
            });
        });

        it('should display creation result', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                message: 'Note created successfully',
                filePath: '/notes/new-note.md',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'action', 'create-note', '-t', 'Test']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Note created successfully'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/notes/new-note.md'));
        });

        it('should handle errors', async () => {
            mockCallTool.mockRejectedValue(new Error('Creation failed'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'action', 'create-note', '-t', 'Test']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Creation failed'));
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        it('should always disconnect', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ message: 'ok', filePath: '/f.md' }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'action', 'create-note', '-t', 'Test']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });
});
