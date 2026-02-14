/**
 * Tests for Configuration Management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to create mock functions that can be referenced in vi.mock
const { mockRead } = vi.hoisted(() => ({
    mockRead: vi.fn().mockResolvedValue({}),
}));

// Mock cardigantime at module level
vi.mock('@utilarium/cardigantime', () => ({
    create: vi.fn(() => ({
        read: mockRead,
    })),
}));

// Mock dynamic imports used by loadConfig when configPath is provided
const { mockYamlParse, mockReadFile } = vi.hoisted(() => ({
    mockYamlParse: vi.fn(),
    mockReadFile: vi.fn(),
}));

vi.mock('yaml', () => ({
    default: { parse: mockYamlParse },
}));

vi.mock('node:fs/promises', () => ({
    readFile: mockReadFile,
}));

vi.mock('node:path', () => ({
    resolve: vi.fn((p: string) => `/resolved${p}`),
}));

import { loadConfig, getConfigFileName } from '../src/config.js';

describe('Config', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRead.mockResolvedValue({});
    });

    describe('getConfigFileName', () => {
        it('should return default config file name', () => {
            expect(getConfigFileName()).toBe('protokoll-config.yaml');
        });
    });

    describe('loadConfig', () => {
        it('should return config with defaults when no overrides or configPath', async () => {
            const config = await loadConfig();
            expect(config.mcpServerCommand).toBe('protokoll-mcp');
            expect(config.mcpServerArgs).toEqual([]);
            expect(mockRead).toHaveBeenCalledWith({});
        });

        it('should merge overrides into config', async () => {
            const config = await loadConfig({ debug: true, model: 'gpt-4' });
            expect(config.debug).toBe(true);
            expect(config.model).toBe('gpt-4');
            expect(config.mcpServerCommand).toBe('protokoll-mcp');
        });

        it('should use cardigantime.read with overrides when no configPath', async () => {
            const overrides = { verbose: true };
            await loadConfig(overrides);
            expect(mockRead).toHaveBeenCalledWith(overrides);
        });

        it('should load from specific config file path', async () => {
            mockReadFile.mockResolvedValue('model: custom-model');
            mockYamlParse.mockReturnValue({ model: 'custom-model' });

            const config = await loadConfig(undefined, '/path/to/config.yaml');
            expect(mockReadFile).toHaveBeenCalledWith('/resolved/path/to/config.yaml', 'utf-8');
            expect(mockYamlParse).toHaveBeenCalledWith('model: custom-model');
            expect(config.model).toBe('custom-model');
            expect(config.mcpServerCommand).toBe('protokoll-mcp');
        });

        it('should merge configPath content with overrides', async () => {
            mockReadFile.mockResolvedValue('model: base-model');
            mockYamlParse.mockReturnValue({ model: 'base-model' });

            const config = await loadConfig({ debug: true }, '/path/to/config.yaml');
            expect(config.debug).toBe(true);
            expect(config.mcpServerCommand).toBe('protokoll-mcp');
        });

        it('should throw when config file cannot be read', async () => {
            mockReadFile.mockRejectedValue(new Error('ENOENT: file not found'));

            await expect(loadConfig(undefined, '/nonexistent/config.yaml'))
                .rejects.toThrow('Failed to load config from /nonexistent/config.yaml');
        });

        it('should use cardigantime base config for defaults from directory tree', async () => {
            mockRead.mockResolvedValue({
                mcpServerCommand: 'custom-server',
                inputDirectory: '/data/input',
            });

            const config = await loadConfig();
            // baseConfig spreads after defaults, so cardigantime values take precedence
            expect(config.mcpServerCommand).toBe('custom-server');
            expect(config.inputDirectory).toBe('/data/input');
        });
    });
});
