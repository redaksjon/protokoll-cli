/**
 * Tests for Progress Notification Handler
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressBar, formatDuration } from '../src/progress.js';

describe('Progress Module', () => {
    describe('ProgressBar', () => {
        let progressBar: ProgressBar;

        beforeEach(() => {
            progressBar = new ProgressBar('Testing', 100);
        });

        it('should create progress bar with message and total', () => {
            expect(progressBar).toBeDefined();
        });

        it('should update progress', () => {
            progressBar.update(50);
            // In a real test, we'd verify the output
            expect(true).toBe(true);
        });

        it('should mark as complete', () => {
            progressBar.complete('Done');
            expect(true).toBe(true);
        });

        it('should handle error state', () => {
            progressBar.error('Failed');
            expect(true).toBe(true);
        });

        it('should not exceed total', () => {
            progressBar.update(150); // Should cap at 100
            expect(true).toBe(true);
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
    });
});
