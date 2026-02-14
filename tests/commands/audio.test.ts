/**
 * Tests for Audio Commands
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

// Mock client factory
const mockCallTool = vi.fn();
const mockDisconnect = vi.fn();
const mockGetConfig = vi.fn().mockResolvedValue({});
vi.mock('../../src/client-factory.js', () => ({
    createConfiguredMCPClient: vi.fn().mockResolvedValue({
        callTool: (...args: any[]) => mockCallTool(...args),
        disconnect: (...args: any[]) => mockDisconnect(...args),
    }),
    getConfig: (...args: any[]) => mockGetConfig(...args),
}));

import { registerAudioCommands } from '../../src/commands/audio.js';

function createProgram(): Command {
    const program = new Command();
    program.exitOverride();
    registerAudioCommands(program);
    return program;
}

function mcpTextResponse(data: any) {
    return {
        content: [{ type: 'text', text: JSON.stringify(data) }],
    };
}

describe('Audio Commands', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDisconnect.mockResolvedValue(undefined);
        mockGetConfig.mockResolvedValue({});
    });

    describe('process', () => {
        it('should call protokoll_process_audio with correct args', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                outputPath: '/output/transcript.md',
                title: 'Recording',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'process', 'recording.m4a']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_process_audio', {
                audioFile: 'recording.m4a',
                projectId: undefined,
                outputDirectory: undefined,
                model: undefined,
                transcriptionModel: undefined,
            }, { timeout: 600000 });
        });

        it('should pass all options', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                outputPath: '/output/transcript.md',
            }));

            const program = createProgram();
            await program.parseAsync([
                'node', 'test', 'process', 'recording.m4a',
                '-p', 'my-project',
                '-o', '/custom/output',
                '-m', 'gpt-4',
            ]);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_process_audio', {
                audioFile: 'recording.m4a',
                projectId: 'my-project',
                outputDirectory: '/custom/output',
                model: 'gpt-4',
                transcriptionModel: undefined,
            }, { timeout: 600000 });
        });

        it('should display output path and title', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                outputPath: '/output/transcript.md',
                title: 'Team Meeting',
                project: 'weekly-review',
                duration: '45:30',
                message: 'Audio processed',
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'process', 'recording.m4a']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Audio processed successfully'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/output/transcript.md'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Team Meeting'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('weekly-review'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('45:30'));
        });

        it('should handle response without optional fields', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({}));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'process', 'recording.m4a']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Audio processed successfully'));
        });

        it('should handle errors', async () => {
            mockCallTool.mockRejectedValue(new Error('Audio processing failed'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'process', 'recording.m4a']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Audio processing failed'));
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        it('should always disconnect', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({}));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'process', 'recording.m4a']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });

    describe('batch', () => {
        it('should call protokoll_batch_process with directory argument', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                processedCount: 3,
                failedCount: 0,
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'batch', '/recordings']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_batch_process', {
                inputDirectory: '/recordings',
                outputDirectory: undefined,
                extensions: undefined,
            }, { timeout: 1800000 });
        });

        it('should use inputDirectory from config when no argument', async () => {
            mockGetConfig.mockResolvedValue({ inputDirectory: '/default/input' });
            mockCallTool.mockResolvedValue(mcpTextResponse({
                processedCount: 1,
                failedCount: 0,
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'batch']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_batch_process', {
                inputDirectory: '/default/input',
                outputDirectory: undefined,
                extensions: undefined,
            }, { timeout: 1800000 });
        });

        it('should error when no inputDirectory provided or in config', async () => {
            mockGetConfig.mockResolvedValue({});

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'batch']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('inputDirectory is required'));
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        it('should pass output directory and extensions', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                processedCount: 2,
                failedCount: 0,
            }));

            const program = createProgram();
            await program.parseAsync([
                'node', 'test', 'batch', '/recordings',
                '-o', '/output',
                '-e', 'm4a,mp3,wav',
            ]);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_batch_process', {
                inputDirectory: '/recordings',
                outputDirectory: '/output',
                extensions: ['m4a', 'mp3', 'wav'],
            }, { timeout: 1800000 });
        });

        it('should use config outputDirectory as fallback', async () => {
            mockGetConfig.mockResolvedValue({ outputDirectory: '/config/output' });
            mockCallTool.mockResolvedValue(mcpTextResponse({
                processedCount: 1,
                failedCount: 0,
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'batch', '/recordings']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_batch_process', expect.objectContaining({
                outputDirectory: '/config/output',
            }), expect.any(Object));
        });

        it('should display batch results', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                processedCount: 3,
                failedCount: 1,
                results: [
                    { success: true, filename: 'audio1.m4a', outputPath: '/out/audio1.md' },
                    { success: true, filename: 'audio2.m4a', outputPath: '/out/audio2.md' },
                    { success: true, file: 'audio3.m4a', outputPath: '/out/audio3.md' },
                    { success: false, filename: 'bad.m4a' },
                ],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'batch', '/recordings']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Batch processing complete'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Processed: 3'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Failed: 1'));
        });

        it('should handle errors', async () => {
            mockCallTool.mockRejectedValue(new Error('Batch failed'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'batch', '/recordings']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Batch failed'));
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        it('should always disconnect', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ processedCount: 0, failedCount: 0 }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'batch', '/recordings']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });
});
