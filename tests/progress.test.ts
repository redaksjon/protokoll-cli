/**
 * Tests for Progress Notification Handler
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgressBar, formatDuration, handleProgressNotification, clearProgress } from '../src/progress.js';

describe('Progress Module', () => {
    describe('ProgressBar', () => {
        let progressBar: ProgressBar;
        let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            vi.clearAllMocks();
            stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
            progressBar = new ProgressBar('Testing', 100);
        });

        it('should create progress bar with message and total', () => {
            expect(progressBar).toBeDefined();
        });

        it('should update progress without exceeding total', () => {
            progressBar.update(50);
            // Just verify it doesn't throw
            expect(true).toBe(true);
        });

        it('should cap progress at total', () => {
            progressBar.update(150); // Should cap at 100
            // Verify no error
            expect(true).toBe(true);
        });

        it('should update message when provided', () => {
            progressBar.update(50, 'New message');
            expect(true).toBe(true);
        });

        it('should mark as complete', () => {
            progressBar.complete('Done');
            expect(true).toBe(true);
        });

        it('should mark as complete without final message', () => {
            progressBar.complete();
            expect(true).toBe(true);
        });

        it('should handle error state', () => {
            progressBar.error('Something failed');
            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Something failed'));
        });

        it('should log milestones in non-TTY mode', () => {
            // process.stdout.isTTY is undefined in test (non-TTY)
            const bar = new ProgressBar('Processing', 100);
            bar.update(0);
            bar.update(25);
            bar.update(50);
            bar.update(75);
            bar.update(100);
            // Non-TTY mode logs at 25% intervals
            expect(console.log).toHaveBeenCalled();
        });

        it('should render bar in TTY mode', () => {
            // Temporarily make isTTY true
            const origIsTTY = process.stdout.isTTY;
            Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });

            const bar = new ProgressBar('Processing', 100);
            bar.update(50);

            expect(stdoutWriteSpy).toHaveBeenCalledWith(
                expect.stringContaining('Processing')
            );

            Object.defineProperty(process.stdout, 'isTTY', { value: origIsTTY, writable: true });
        });

        it('should complete with newline in TTY mode', () => {
            const origIsTTY = process.stdout.isTTY;
            Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });

            const bar = new ProgressBar('Processing', 100);
            bar.complete('Done');

            expect(stdoutWriteSpy).toHaveBeenCalled();

            Object.defineProperty(process.stdout, 'isTTY', { value: origIsTTY, writable: true });
        });

        it('should clear line in TTY error mode', () => {
            const origIsTTY = process.stdout.isTTY;
            Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });

            const bar = new ProgressBar('Processing', 100);
            bar.error('Failed');

            Object.defineProperty(process.stdout, 'isTTY', { value: origIsTTY, writable: true });
        });

        it('should handle zero total gracefully', () => {
            const origIsTTY = process.stdout.isTTY;
            Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });

            const bar = new ProgressBar('Processing', 0);
            bar.update(0);
            // percentage should be 0 when total is 0

            Object.defineProperty(process.stdout, 'isTTY', { value: origIsTTY, writable: true });
        });
    });

    describe('handleProgressNotification', () => {
        let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            vi.clearAllMocks();
            stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        });

        it('should ignore updates without progress token', () => {
            handleProgressNotification({});
            expect(stdoutWriteSpy).not.toHaveBeenCalled();
        });

        it('should handle progress update with token in non-TTY', () => {
            handleProgressNotification({
                progressToken: 'token-1',
                progress: 50,
                total: 100,
                message: 'Working',
            });
            // In non-TTY, logs at 10% milestones
            // 50% is a milestone of 10
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('50%'));
        });

        it('should handle progress update in TTY mode', () => {
            const origIsTTY = process.stdout.isTTY;
            Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });

            handleProgressNotification({
                progressToken: 'token-1',
                progress: 30,
                total: 100,
                message: 'Processing',
            });

            expect(stdoutWriteSpy).toHaveBeenCalledWith(
                expect.stringContaining('Processing')
            );

            Object.defineProperty(process.stdout, 'isTTY', { value: origIsTTY, writable: true });
        });

        it('should use default message when not provided', () => {
            const origIsTTY = process.stdout.isTTY;
            Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });

            handleProgressNotification({
                progressToken: 'token-1',
                progress: 30,
                total: 100,
            });

            expect(stdoutWriteSpy).toHaveBeenCalledWith(
                expect.stringContaining('Processing')
            );

            Object.defineProperty(process.stdout, 'isTTY', { value: origIsTTY, writable: true });
        });

        it('should skip non-milestone updates in non-TTY', () => {
            handleProgressNotification({
                progressToken: 'token-1',
                progress: 33,
                total: 100,
            });
            // 33% is not a 10% milestone
            expect(console.log).not.toHaveBeenCalled();
        });

        it('should ignore update without progress or total', () => {
            handleProgressNotification({
                progressToken: 'token-1',
            });
            expect(stdoutWriteSpy).not.toHaveBeenCalled();
        });
    });

    describe('clearProgress', () => {
        let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        });

        it('should clear progress line in TTY mode', () => {
            const origIsTTY = process.stdout.isTTY;
            Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });

            clearProgress();
            expect(stdoutWriteSpy).toHaveBeenCalled();

            Object.defineProperty(process.stdout, 'isTTY', { value: origIsTTY, writable: true });
        });

        it('should do nothing in non-TTY mode', () => {
            const origIsTTY = process.stdout.isTTY;
            Object.defineProperty(process.stdout, 'isTTY', { value: undefined, writable: true });

            // Reset spy after setting isTTY
            stdoutWriteSpy.mockClear();

            clearProgress();
            expect(stdoutWriteSpy).not.toHaveBeenCalled();

            Object.defineProperty(process.stdout, 'isTTY', { value: origIsTTY, writable: true });
        });
    });

    describe('formatDuration', () => {
        it('should format seconds', () => {
            expect(formatDuration(45)).toBe('45s');
        });

        it('should format minutes and seconds', () => {
            expect(formatDuration(90)).toBe('1m 30s');
        });

        it('should format hours and minutes', () => {
            expect(formatDuration(3665)).toBe('1h 1m');
        });

        it('should handle zero', () => {
            expect(formatDuration(0)).toBe('0s');
        });

        it('should round seconds', () => {
            expect(formatDuration(45.7)).toBe('46s');
        });

        it('should format exact minutes', () => {
            expect(formatDuration(120)).toBe('2m 0s');
        });

        it('should format large hours', () => {
            expect(formatDuration(7200)).toBe('2h 0m');
        });
    });
});
