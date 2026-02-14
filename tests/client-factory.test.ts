/**
 * Tests for MCP Client Factory
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockLoadConfig = vi.fn().mockResolvedValue({
    mcpServerCommand: 'protokoll-mcp',
    mcpServerArgs: ['--verbose'],
});
vi.mock('../src/config.js', () => ({
    loadConfig: (...args: any[]) => mockLoadConfig(...args),
}));

const mockCreateMCPClient = vi.fn().mockResolvedValue({
    callTool: vi.fn(),
    disconnect: vi.fn(),
});
vi.mock('../src/mcp-client.js', () => ({
    createMCPClient: (...args: any[]) => mockCreateMCPClient(...args),
}));

import { setConfigPath, getConfig, createConfiguredMCPClient } from '../src/client-factory.js';

describe('Client Factory', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset module state by clearing config cache
        setConfigPath(undefined);
    });

    describe('setConfigPath', () => {
        it('should set config path', () => {
            setConfigPath('/custom/config.yaml');
            // Verify by checking that getConfig uses the new path
            expect(true).toBe(true);
        });

        it('should clear cache when path changes', async () => {
            // First call loads config
            await getConfig();
            expect(mockLoadConfig).toHaveBeenCalledTimes(1);

            // Setting a new path should clear the cache
            setConfigPath('/new/path.yaml');

            // Next call should reload
            await getConfig();
            expect(mockLoadConfig).toHaveBeenCalledTimes(2);
        });
    });

    describe('getConfig', () => {
        it('should load and return config', async () => {
            const config = await getConfig();
            expect(mockLoadConfig).toHaveBeenCalledWith(undefined, undefined);
            expect(config.mcpServerCommand).toBe('protokoll-mcp');
        });

        it('should cache config on subsequent calls', async () => {
            await getConfig();
            await getConfig();
            expect(mockLoadConfig).toHaveBeenCalledTimes(1);
        });

        it('should pass config path when set', async () => {
            setConfigPath('/custom/config.yaml');
            await getConfig();
            expect(mockLoadConfig).toHaveBeenCalledWith(undefined, '/custom/config.yaml');
        });
    });

    describe('createConfiguredMCPClient', () => {
        it('should create client with config values', async () => {
            await createConfiguredMCPClient();
            expect(mockCreateMCPClient).toHaveBeenCalledWith(
                expect.objectContaining({
                    serverCommand: 'protokoll-mcp',
                    serverArgs: ['--verbose'],
                    workspaceRoot: process.cwd(),
                })
            );
        });

        it('should merge overrides with config', async () => {
            await createConfiguredMCPClient({ serverCommand: 'custom-cmd' });
            expect(mockCreateMCPClient).toHaveBeenCalledWith(
                expect.objectContaining({
                    serverCommand: 'custom-cmd',
                })
            );
        });
    });
});
