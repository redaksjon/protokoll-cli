/* eslint-disable no-console */

import { Command } from 'commander';
import { createConfiguredMCPClient } from '../client-factory.js';

/**
 * Register feedback commands for natural language transcript corrections
 */
export const registerFeedbackCommands = (program: Command): void => {
    program
        .command('feedback <transcriptPath> <feedback>')
        .description('Provide natural language feedback to correct a transcript')
        .option('-m, --model <model>', 'LLM model for processing feedback')
        .addHelpText('after', `
The feedback command processes natural language corrections using AI.
It can fix spelling, add terms to context, change project assignment, etc.

Examples:
  protokoll feedback meeting.md "YB should be Wibey"
  protokoll feedback notes.md "San Jay Grouper is actually Sanjay Gupta"
  protokoll feedback notes.md "This should be assigned to the quarterly-review project"
  protokoll feedback notes.md "Add 'kubernetes' as a technical term"
`)
        .action(async (transcriptPath: string, feedback: string, options: { model?: string }) => {
            const client = await createConfiguredMCPClient();
            try {
                console.log('Processing feedback...');
                
                const result: any = await client.callTool('protokoll_provide_feedback', {
                    transcriptPath,
                    feedback,
                    model: options.model,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        
                        if (data.changesApplied > 0) {
                            console.log(`\n✓ Applied ${data.changesApplied} change(s):`);
                            for (const change of data.changes) {
                                console.log(`  • ${change.type}: ${change.description}`);
                            }
                            if (data.moved) {
                                console.log(`\n  File moved to: ${data.outputPath}`);
                            }
                        } else {
                            console.log('\nℹ No changes were applied.');
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
