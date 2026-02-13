/* eslint-disable no-console */

import { Command } from 'commander';
import { createConfiguredMCPClient } from '../client-factory.js';

/**
 * Register transcript commands for reading and listing transcripts
 */
export const registerTranscriptCommands = (program: Command): void => {
    const transcript = program
        .command('transcript')
        .description('Read and manage transcripts');

    transcript
        .command('read <transcriptPath>')
        .description('Read a transcript file')
        .addHelpText('after', `
Examples:
  protokoll transcript read meeting-notes.md
  protokoll transcript read 2026/02/03-meeting.md
`)
        .action(async (transcriptPath: string) => {
            const client = await createConfiguredMCPClient();
            try {
                const result: any = await client.callTool('protokoll_read_transcript', {
                    transcriptPath,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        console.log(`📄 ${data.title}`);
                        console.log(`   File: ${data.filePath}`);
                        console.log(`   Length: ${data.contentLength} characters`);
                        console.log(`\n${data.content}`);
                    }
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                process.exit(1);
            } finally {
                await client.disconnect();
            }
        });

    transcript
        .command('list')
        .option('-l, --limit <number>', 'Maximum number of results (default: 50)', '50')
        .option('-s, --search <text>', 'Search within transcripts')
        .option('--sort <field>', 'Sort by field: date, filename, title (default: date)', 'date')
        .description('List transcripts')
        .addHelpText('after', `
Examples:
  protokoll transcript list
  protokoll transcript list --limit 20
  protokoll transcript list --search meeting
  protokoll transcript list --sort title
`)
        .action(async (options: any) => {
            const client = await createConfiguredMCPClient();
            try {
                const result: any = await client.callTool('protokoll_list_transcripts', {
                    limit: parseInt(options.limit),
                    search: options.search,
                    sortBy: options.sort,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        console.log(`\n📚 Transcripts (${data.pagination.total} total):`);
                        console.log(`   Directory: ${data.directory}\n`);

                        for (const t of data.transcripts) {
                            const dateTime = t.date ? `${t.date}${t.time ? ` ${t.time}` : ''}` : 'unknown date';
                            console.log(`   • ${t.title}`);
                            console.log(`     Path: ${t.path}`);
                            console.log(`     Date: ${dateTime}\n`);
                        }

                        if (data.pagination.hasMore) {
                            console.log(`   ... and ${data.pagination.total - data.transcripts.length} more`);
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
};
