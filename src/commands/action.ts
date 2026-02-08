/* eslint-disable no-console */

import { Command } from 'commander';
import { createMCPClient } from '../mcp-client.js';

/**
 * Register action commands for transcript manipulation
 */
export const registerActionCommands = (program: Command): void => {
    const action = program
        .command('action')
        .description('Perform actions on transcripts');

    action
        .command('combine <files...>')
        .description('Combine multiple transcripts into one')
        .option('-t, --title <title>', 'Title for combined transcript')
        .option('-p, --project <projectId>', 'Project ID to assign')
        .addHelpText('after', `
Examples:
  protokoll action combine meeting-1.md meeting-2.md
  protokoll action combine notes/*.md --title "Weekly Summary"
  protokoll action combine 2026/02/*.md --project weekly-review
`)
        .action(async (files: string[], options: { title?: string; project?: string }) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_combine_transcripts', {
                    transcriptPaths: files,
                    title: options.title,
                    projectId: options.project,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        console.log(`✓ Combined ${data.sourceFiles?.length || files.length} transcripts`);
                        console.log(`  Output: ${data.outputPath}`);
                        if (data.deletedFiles?.length > 0) {
                            console.log(`  Deleted: ${data.deletedFiles.length} source files`);
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

    action
        .command('edit <transcriptPath>')
        .description('Edit transcript metadata')
        .option('-t, --title <title>', 'New title (renames file)')
        .option('-p, --project <projectId>', 'New project ID')
        .option('--add-tag <tag>', 'Add a tag (can be repeated)', collect, [])
        .option('--remove-tag <tag>', 'Remove a tag (can be repeated)', collect, [])
        .option('-s, --status <status>', 'New status (initial, enhanced, reviewed, in_progress, closed, archived)')
        .addHelpText('after', `
Examples:
  protokoll action edit meeting.md --title "Q1 Planning Meeting"
  protokoll action edit notes.md --project quarterly-review
  protokoll action edit notes.md --add-tag important --add-tag review
  protokoll action edit notes.md --status reviewed
`)
        .action(async (transcriptPath: string, options: any) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_edit_transcript', {
                    transcriptPath,
                    title: options.title,
                    projectId: options.project,
                    tagsToAdd: options.addTag?.length > 0 ? options.addTag : undefined,
                    tagsToRemove: options.removeTag?.length > 0 ? options.removeTag : undefined,
                    status: options.status,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        console.log(`✓ ${data.message}`);
                        if (data.renamed) {
                            console.log(`  New path: ${data.outputPath}`);
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

    action
        .command('change-date <transcriptPath> <newDate>')
        .description('Change the date of a transcript (moves file)')
        .addHelpText('after', `
Examples:
  protokoll action change-date meeting.md 2026-02-01
  protokoll action change-date notes.md 2026-01-15T10:30:00Z
`)
        .action(async (transcriptPath: string, newDate: string) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_change_transcript_date', {
                    transcriptPath,
                    newDate,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        if (data.moved) {
                            console.log(`✓ Transcript moved`);
                            console.log(`  From: ${data.originalPath}`);
                            console.log(`  To: ${data.outputPath}`);
                        } else {
                            console.log(`ℹ ${data.message}`);
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

    action
        .command('create-note')
        .description('Create a new note/transcript')
        .requiredOption('-t, --title <title>', 'Note title')
        .option('-c, --content <content>', 'Note content')
        .option('-p, --project <projectId>', 'Project ID to assign')
        .option('--tag <tag>', 'Add a tag (can be repeated)', collect, [])
        .option('-d, --date <date>', 'Date for the note (ISO format, defaults to now)')
        .addHelpText('after', `
Examples:
  protokoll action create-note --title "Meeting Notes"
  protokoll action create-note --title "Planning" --project quarterly-review
  protokoll action create-note --title "Ideas" --tag brainstorm --tag important
`)
        .action(async (options: any) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_create_note', {
                    title: options.title,
                    content: options.content,
                    projectId: options.project,
                    tags: options.tag?.length > 0 ? options.tag : undefined,
                    date: options.date,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        console.log(`✓ ${data.message}`);
                        console.log(`  Path: ${data.filePath}`);
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

// Helper function for collecting repeated options
function collect(value: string, previous: string[]): string[] {
    return previous.concat([value]);
}
