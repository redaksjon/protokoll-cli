/* eslint-disable no-console */

/**
 * Progress Notification Handler for MCP
 * 
 * Handles progress notifications from MCP server and renders them to terminal.
 * Gracefully falls back to simple logging in non-TTY environments.
 */

interface ProgressUpdate {
    progressToken?: string;
    progress?: number;
    total?: number;
    message?: string;
}

/**
 * Simple progress bar renderer for terminal
 */
export class ProgressBar {
    private message: string;
    private current: number = 0;
    private total: number = 100;
    private width: number = 30;
    private isTTY: boolean;
    private startTime: number;

    constructor(message: string = 'Processing', total: number = 100) {
        this.message = message;
        this.total = total;
        this.isTTY = process.stdout.isTTY ?? false;
        this.startTime = Date.now();
    }

    /**
     * Update progress
     */
    update(current: number, message?: string) {
        this.current = Math.min(current, this.total);
        if (message) this.message = message;
        
        if (this.isTTY) {
            this.renderBar();
        } else {
            // Non-TTY: just log milestone updates
            if (current % 25 === 0 || current === this.total) {
                const pct = Math.round((current / this.total) * 100);
                console.log(`${this.message}: ${pct}%`);
            }
        }
    }

    /**
     * Mark as complete
     */
    complete(finalMessage?: string) {
        this.current = this.total;
        if (finalMessage) this.message = finalMessage;
        
        if (this.isTTY) {
            this.renderBar();
            console.log(); // New line after bar
        } else {
            console.log(`${this.message}: 100%`);
        }
    }

    /**
     * Render progress bar to terminal
     */
    private renderBar() {
        const percentage = this.total > 0 ? this.current / this.total : 0;
        const filled = Math.round(this.width * percentage);
        const empty = this.width - filled;
        const percent = Math.round(percentage * 100);
        
        const bar = '█'.repeat(filled) + '░'.repeat(empty);
        const elapsed = Math.round((Date.now() - this.startTime) / 1000);
        
        // Use carriage return to overwrite the same line
        process.stdout.write(
            `\r${this.message} [${bar}] ${percent}% (${elapsed}s)`
        );
    }

    /**
     * Error state
     */
    error(message: string) {
        if (this.isTTY) {
            console.log(); // Clear the progress bar line
        }
        console.error(`✗ ${message}`);
    }
}

/**
 * Handle a progress update from MCP notification
 */
export function handleProgressNotification(update: ProgressUpdate): void {
    // This would be called when receiving notifications/progress from MCP server
    // Implementation depends on how the MCP Client class surfaces notifications
    
    if (!update.progressToken) {
        return; // No token, can't track this progress
    }
    
    // In a real implementation, we'd maintain a map of progressToken -> ProgressBar
    // and update accordingly. For now, this is a placeholder for the architecture.
    
    if (update.progress !== undefined && update.total !== undefined) {
        const percent = Math.round((update.progress / update.total) * 100);
        const msg = update.message || 'Processing';
        
        if (process.stdout.isTTY) {
            process.stdout.write(
                `\r${msg} [${percent}%]`
            );
        } else {
            // Non-TTY: only log on significant milestones
            if (percent % 10 === 0) {
                console.log(`${msg}: ${percent}%`);
            }
        }
    }
}

/**
 * Clear the progress line (for clean terminal after progress completes)
 */
export function clearProgress(): void {
    if (process.stdout.isTTY) {
        process.stdout.write('\r' + ' '.repeat(80) + '\r'); // Overwrite with spaces
    }
}

/**
 * Format duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return `${Math.round(seconds)}s`;
    }
    if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}m ${secs}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
}
