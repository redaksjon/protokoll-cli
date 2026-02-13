/**
 * MCP Client Factory
 * 
 * Provides a configured MCP client using CardiganTime configuration
 */

import { createMCPClient, type MCPClientOptions } from './mcp-client.js';
import { loadConfig } from './config.js';

// Cached configuration
let configCache: Awaited<ReturnType<typeof loadConfig>> | null = null;
let configPath: string | undefined = undefined;

/**
 * Set the configuration file path
 */
export function setConfigPath(path: string | undefined) {
    configPath = path;
    configCache = null; // Clear cache when path changes
}

/**
 * Get or load configuration
 */
export async function getConfig() {
    if (!configCache) {
        configCache = await loadConfig(undefined, configPath);
    }
    return configCache;
}

/**
 * Create an MCP client with configuration from CardiganTime
 */
export async function createConfiguredMCPClient(overrides?: Partial<MCPClientOptions>) {
    const config = await getConfig();
    
    return createMCPClient({
        serverCommand: config.mcpServerCommand,
        serverArgs: config.mcpServerArgs,
        workspaceRoot: process.cwd(),
        ...overrides,
    });
}
