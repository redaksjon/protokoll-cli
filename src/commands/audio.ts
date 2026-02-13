/* eslint-disable no-console */

import { Command } from 'commander';
import { createConfiguredMCPClient, getConfig } from '../client-factory.js';

/**
 * Register audio processing commands
 */
export const registerAudioCommands = (program: Command): void => {
    program
        .command('process <audioFile>')
        .description('Process an audio file through transcription pipeline')
        .option('-p, --project <projectId>', 'Specific project ID for routing')
        .option('-o, --output <directory>', 'Override output directory')
        .option('-m, --model <model>', 'LLM model for enhancement')
        .option('--transcription-model <model>', 'Transcription model (default: whisper-1)')
        .addHelpText('after', `
Examples:
  protokoll process recording.m4a
  protokoll process audio.m4a --project weekly-review
  protokoll process /path/to/audio.wav --output ~/transcripts
`)
        .action(async (audioFile: string, options: any) => {
            const client = await createConfiguredMCPClient();
            try {
                console.log('Processing audio file...\n');
                
                // Audio processing can take several minutes - use 10 minute timeout
                // (default MCP timeout is 60 seconds which may be too short)
                const result: any = await client.callTool('protokoll_process_audio', {
                    audioFile,
                    projectId: options.project,
                    outputDirectory: options.output,
                    model: options.model,
                    transcriptionModel: options['transcription-model'],
                }, { timeout: 10 * 60 * 1000 });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        
                        console.log('\n✓ Audio processed successfully\n');
                        
                        if (data.outputPath) {
                            console.log(`Output: ${data.outputPath}`);
                        }
                        
                        if (data.title) {
                            console.log(`Title: ${data.title}`);
                        }
                        
                        if (data.project) {
                            console.log(`Project: ${data.project}`);
                        }
                        
                        if (data.duration) {
                            console.log(`Duration: ${data.duration}`);
                        }
                        
                        if (data.message) {
                            console.log(`\n${data.message}`);
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

    program
        .command('batch [inputDirectory]')
        .description('Process multiple audio files in a directory')
        .option('-o, --output <directory>', 'Override output directory')
        .option('-e, --extensions <list>', 'Audio extensions (comma-separated, default: m4a,mp3,wav,webm)')
        .addHelpText('after', `
Examples:
  protokoll batch ~/recordings
  protokoll batch /media/audio --output ~/transcripts
  protokoll batch                          # Uses inputDirectory from config
`)
        .action(async (inputDirectoryArg: string | undefined, options: any) => {
            const config = await getConfig();
            const inputDirectory = inputDirectoryArg || config.inputDirectory;
            
            if (!inputDirectory) {
                console.error('Error: inputDirectory is required. Provide it as an argument or in your config file.');
                process.exit(1);
            }
            
            const client = await createConfiguredMCPClient();
            try {
                console.log('Batch processing audio files...\n');
                console.log(`Input directory: ${inputDirectory}`);
                if (options.output || config.outputDirectory) {
                    console.log(`Output directory: ${options.output || config.outputDirectory}`);
                }
                console.log('');
                
                const extensions = options.extensions 
                    ? options.extensions.split(',').map((ext: string) => ext.trim())
                    : undefined;
                
                // Batch processing can take a long time - use 30 minute timeout
                // (default MCP timeout is 60 seconds which is too short for batch)
                const result: any = await client.callTool('protokoll_batch_process', {
                    inputDirectory,
                    outputDirectory: options.output || config.outputDirectory,
                    extensions,
                }, { timeout: 30 * 60 * 1000 });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        
                        console.log(`\n✓ Batch processing complete\n`);
                        console.log(`Processed: ${data.processedCount || 0} files`);
                        console.log(`Failed: ${data.failedCount || 0} files`);
                        
                        if (data.results && Array.isArray(data.results)) {
                            console.log('\nResults:');
                            for (const result of data.results) {
                                const status = result.success ? '✓' : '✗';
                                console.log(`  ${status} ${result.filename || result.file}`);
                                if (result.outputPath) {
                                    console.log(`    → ${result.outputPath}`);
                                }
                            }
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
