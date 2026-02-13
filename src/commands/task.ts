/* eslint-disable no-console */

import { Command } from 'commander';
import { createConfiguredMCPClient } from '../client-factory.js';

/**
 * Register task commands for managing transcript tasks
 */
export const registerTaskCommands = (program: Command): void => {
    const task = program
        .command('task')
        .description('Manage transcript tasks');

    task
        .command('add <transcriptPath> <description>')
        .description('Add a new task to a transcript')
        .addHelpText('after', `
Examples:
  protokoll task add meeting.md "Follow up with client"
  protokoll task add notes/planning.md "Review budget proposal"
`)
        .action(async (transcriptPath: string, description: string) => {
            const client = await createConfiguredMCPClient();
            try {
                const result: any = await client.callTool('protokoll_create_task', {
                    transcriptPath,
                    description,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        console.log(`✓ Task created: ${data.task.id}`);
                        console.log(`  Description: ${data.task.description}`);
                    }
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                process.exit(1);
            } finally {
                await client.disconnect();
            }
        });

    task
        .command('complete <transcriptPath> <taskId>')
        .description('Mark a task as done')
        .addHelpText('after', `
Examples:
  protokoll task complete meeting.md task-1234567890-abc123
`)
        .action(async (transcriptPath: string, taskId: string) => {
            const client = await createConfiguredMCPClient();
            try {
                const result: any = await client.callTool('protokoll_complete_task', {
                    transcriptPath,
                    taskId,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        console.log(`✓ Task completed: ${data.taskId}`);
                        console.log(`  ${data.description}`);
                    }
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                process.exit(1);
            } finally {
                await client.disconnect();
            }
        });

    task
        .command('delete <transcriptPath> <taskId>')
        .description('Remove a task from a transcript')
        .addHelpText('after', `
Examples:
  protokoll task delete meeting.md task-1234567890-abc123
`)
        .action(async (transcriptPath: string, taskId: string) => {
            const client = await createConfiguredMCPClient();
            try {
                const result: any = await client.callTool('protokoll_delete_task', {
                    transcriptPath,
                    taskId,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        console.log(`✓ Task deleted: ${data.taskId}`);
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
