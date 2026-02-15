/**
 * Configuration Management using CardiganTime
 * 
 * Loads configuration from:
 * 1. protokoll-config.yaml files (hierarchical, up the directory tree)
 * 2. Environment variables (PROTOKOLL_* prefix)
 * 3. Command-line arguments
 */

import * as Cardigantime from '@utilarium/cardigantime';

// Default configuration file name (in CWD, not in a subdirectory)
const DEFAULT_CONFIG_FILE = 'protokoll-config.yaml';

/**
 * Configuration interface
 */
export interface ProtokolConfig {
    // MCP Server settings
    mcpServerCommand?: string;
    mcpServerArgs?: string[];
    
    // Directory settings
    inputDirectory?: string;
    outputDirectory?: string;
    processedDirectory?: string;
    contextDirectories?: string[];
    
    // Model settings
    model?: string;
    transcriptionModel?: string;
    classifyModel?: string;
    composeModel?: string;
    
    // API settings
    openaiApiKey?: string;
    
    // Behavior settings
    debug?: boolean;
    verbose?: boolean;
}

/**
 * CardiganTime instance configured for Protokoll
 * Looks for protokoll-config.yaml in CWD and parent directories
 */
const cardigantime = Cardigantime.create({
    defaults: {
        configDirectory: '.',
    },
    configShape: {},
});

/**
 * Load configuration from files and environment
 * @param overrides - Configuration overrides
 * @param configPath - Optional path to a specific configuration file
 */
export async function loadConfig(overrides?: Partial<ProtokolConfig>, configPath?: string): Promise<ProtokolConfig> {
    let baseConfig: any;
    
    if (configPath) {
        // Load from specific file path
        const { default: yaml } = await import('yaml');
        const { readFile } = await import('node:fs/promises');
        const { resolve } = await import('node:path');
        
        try {
            const fullPath = resolve(configPath);
            const content = await readFile(fullPath, 'utf-8');
            baseConfig = yaml.parse(content);
        } catch (error) {
            throw new Error(`Failed to load config from ${configPath}: ${error}`);
        }
    } else {
        // Use CardiganTime to search up the directory tree
        baseConfig = await cardigantime.read(overrides || {});
    }
    
    // Merge with our defaults
    const config: ProtokolConfig = {
        mcpServerCommand: 'protokoll-mcp',
        mcpServerArgs: [],
        ...baseConfig,
        ...overrides,
    };
    
    return config;
}

/**
 * Get the default config file name
 */
export function getConfigFileName(): string {
    return DEFAULT_CONFIG_FILE;
}
