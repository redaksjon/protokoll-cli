#!/usr/bin/env node
/* eslint-disable no-console */

import { Command } from 'commander';
import { createConfiguredMCPClient, setConfigPath } from './client-factory.js';
import { registerStatusCommands } from './commands/status.js';
import { registerTaskCommands } from './commands/task.js';
import { registerTranscriptCommands } from './commands/transcript.js';
import { registerContextCommands } from './commands/context.js';
import { registerActionCommands } from './commands/action.js';
import { registerFeedbackCommands } from './commands/feedback.js';
import { registerAudioCommands } from './commands/audio.js';

const program = new Command();

// Version and metadata placeholders (replaced during build)
const VERSION = '__VERSION__';
const GIT_INFO = '__GIT_BRANCH__ __GIT_COMMIT__ __GIT_TAGS__';

program
    .name('protokoll')
    .description('Protokoll CLI - MCP client for transcription and context management')
    .version(VERSION)
    .option('-c, --config <path>', 'Path to configuration file (default: protokoll-config.yaml)')
    .hook('preAction', (thisCommand) => {
        // Set config path before any action runs
        const opts = thisCommand.opts();
        if (opts.config) {
            setConfigPath(opts.config);
        }
    });

// Version command - calls the MCP server's protokoll_get_version tool
program
    .command('version')
    .description('Show version information from MCP server')
    .action(async () => {
        const client = await createConfiguredMCPClient();
        try {
            const result: any = await client.callTool('protokoll_get_version');
            
            console.log('Protokoll CLI:', VERSION);
            console.log('Git:', GIT_INFO);
            console.log('\nMCP Server:');
            
            if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                const content = result.content[0];
                if (content.type === 'text') {
                    console.log(content.text);
                }
            } else {
                console.log('No version information returned from server');
            }
        } catch (error) {
            console.error('Error calling MCP server:', error);
            process.exit(1);
        } finally {
            await client.disconnect();
        }
    });

// Register command groups
registerStatusCommands(program);
registerTaskCommands(program);
registerTranscriptCommands(program);
registerContextCommands(program);
registerActionCommands(program);
registerFeedbackCommands(program);
registerAudioCommands(program);

// Parse arguments
program.parse();
