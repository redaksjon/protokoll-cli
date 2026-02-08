/* eslint-disable no-console */

import { Command } from 'commander';
import { createMCPClient } from '../mcp-client.js';

/**
 * Register status commands for transcript lifecycle management
 */
export const registerStatusCommands = (program: Command): void => {
    const status = program
        .command('status')
        .description('Manage transcript lifecycle status');

    status
        .command('set <transcriptPath> <newStatus>')
        .description('Set the lifecycle status of a transcript')
        .addHelpText('after', `
Valid statuses: initial, enhanced, reviewed, in_progress, closed, archived

Examples:
  protokoll status set meeting-notes.md reviewed
  protokoll status set 2026/02/03-meeting.md closed
  protokoll status set ~/notes/planning.md in_progress
`)
        .action(async (transcriptPath: string, newStatus: string) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_set_status', {
                    transcriptPath,
                    status: newStatus,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        if (data.changed) {
                            console.log(`✓ Status changed: ${data.previousStatus} → ${data.newStatus}`);
                        } else {
                            console.log(`ℹ Status is already '${data.newStatus}'`);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                process.exit(1);
            } finally {
                await client.disconnect();
            }
        });

    status
        .command('show <transcriptPath>')
        .description('Show the current status of a transcript')
        .action(async (transcriptPath: string) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_read_transcript', {
                    transcriptPath,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        const status = data.metadata?.status || 'reviewed';
                        console.log(`File: ${data.filePath}`);
                        console.log(`Title: ${data.title}`);
                        console.log(`Status: ${status}`);
                    }
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                process.exit(1);
            } finally {
                await client.disconnect();
            }
        });
};
