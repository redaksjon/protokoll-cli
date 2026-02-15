/**
 * Tests for MCP Client Wrapper
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted for mock functions referenced in vi.mock
const {
    mockClientConnect,
    mockClientClose,
    mockClientCallTool,
    mockClientListTools,
    mockClientReadResource,
    mockClientListResources,
    mockClientGetPrompt,
    mockClientListPrompts,
    mockTransportClose,
} = vi.hoisted(() => ({
    mockClientConnect: vi.fn().mockResolvedValue(undefined),
    mockClientClose: vi.fn().mockResolvedValue(undefined),
    mockClientCallTool: vi.fn().mockResolvedValue({ content: [] }),
    mockClientListTools: vi.fn().mockResolvedValue({ tools: [] }),
    mockClientReadResource: vi.fn().mockResolvedValue({ contents: [] }),
    mockClientListResources: vi.fn().mockResolvedValue({ resources: [] }),
    mockClientGetPrompt: vi.fn().mockResolvedValue({ messages: [] }),
    mockClientListPrompts: vi.fn().mockResolvedValue({ prompts: [] }),
    mockTransportClose: vi.fn().mockResolvedValue(undefined),
}));

// Mock the MCP SDK - Client needs to be a constructor (class-like)
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => {
    return {
        Client: class MockClient {
            connect = mockClientConnect;
            close = mockClientClose;
            callTool = mockClientCallTool;
            listTools = mockClientListTools;
            readResource = mockClientReadResource;
            listResources = mockClientListResources;
            getPrompt = mockClientGetPrompt;
            listPrompts = mockClientListPrompts;
            constructor() {}
        },
    };
});

// StdioClientTransport also needs to be a constructor
vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => {
    return {
        StdioClientTransport: class MockTransport {
            close = mockTransportClose;
            constructor(public opts: any) {}
        },
    };
});

import { ProtokolMCPClient, createMCPClient } from '../src/mcp-client.js';

describe('MCP Client', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockClientConnect.mockResolvedValue(undefined);
        mockClientClose.mockResolvedValue(undefined);
        mockTransportClose.mockResolvedValue(undefined);
    });

    describe('ProtokolMCPClient constructor', () => {
        it('should set default server command', () => {
            const client = new ProtokolMCPClient();
            expect(client).toBeDefined();
        });

        it('should accept custom options', () => {
            const client = new ProtokolMCPClient({
                serverCommand: 'custom-server',
                serverArgs: ['--debug'],
                workspaceRoot: '/workspace',
                configDirectory: '/config',
            });
            expect(client).toBeDefined();
        });
    });

    describe('connect', () => {
        it('should create transport and client and connect', async () => {
            const client = new ProtokolMCPClient();
            await client.connect();

            expect(mockClientConnect).toHaveBeenCalled();
        });

        it('should not reconnect if already connected', async () => {
            const client = new ProtokolMCPClient();
            await client.connect();
            await client.connect(); // Second call should be no-op

            expect(mockClientConnect).toHaveBeenCalledTimes(1);
        });

        it('should cleanup and throw on connection error', async () => {
            mockClientConnect.mockRejectedValueOnce(new Error('Connection failed'));

            const client = new ProtokolMCPClient();
            await expect(client.connect()).rejects.toThrow('Failed to connect to MCP server');
        });
    });

    describe('callTool', () => {
        it('should call tool with name and args', async () => {
            const client = new ProtokolMCPClient();
            await client.connect();

            await client.callTool('test_tool', { key: 'value' });

            expect(mockClientCallTool).toHaveBeenCalledWith(
                { name: 'test_tool', arguments: { key: 'value' } },
                undefined,
                undefined
            );
        });

        it('should call tool with empty args by default', async () => {
            const client = new ProtokolMCPClient();
            await client.connect();

            await client.callTool('test_tool');

            expect(mockClientCallTool).toHaveBeenCalledWith(
                { name: 'test_tool', arguments: {} },
                undefined,
                undefined
            );
        });

        it('should include progress token in meta', async () => {
            const client = new ProtokolMCPClient();
            await client.connect();

            await client.callTool('test_tool', {}, { progressToken: 'token-123' });

            expect(mockClientCallTool).toHaveBeenCalledWith(
                expect.objectContaining({
                    _meta: { progressToken: 'token-123' },
                }),
                undefined,
                undefined
            );
        });

        it('should pass timeout option', async () => {
            const client = new ProtokolMCPClient();
            await client.connect();

            await client.callTool('test_tool', {}, { timeout: 5000 });

            expect(mockClientCallTool).toHaveBeenCalledWith(
                expect.any(Object),
                undefined,
                { timeout: 5000 }
            );
        });

        it('should throw if not connected', async () => {
            const client = new ProtokolMCPClient();

            await expect(client.callTool('test_tool')).rejects.toThrow('Client not connected');
        });
    });

    describe('listTools', () => {
        it('should list available tools', async () => {
            const client = new ProtokolMCPClient();
            await client.connect();

            await client.listTools();
            expect(mockClientListTools).toHaveBeenCalled();
        });

        it('should throw if not connected', async () => {
            const client = new ProtokolMCPClient();
            await expect(client.listTools()).rejects.toThrow('Client not connected');
        });
    });

    describe('readResource', () => {
        it('should read resource by URI', async () => {
            const client = new ProtokolMCPClient();
            await client.connect();

            await client.readResource('test://resource');
            expect(mockClientReadResource).toHaveBeenCalledWith({ uri: 'test://resource' });
        });

        it('should throw if not connected', async () => {
            const client = new ProtokolMCPClient();
            await expect(client.readResource('test://resource')).rejects.toThrow('Client not connected');
        });
    });

    describe('listResources', () => {
        it('should list available resources', async () => {
            const client = new ProtokolMCPClient();
            await client.connect();

            await client.listResources();
            expect(mockClientListResources).toHaveBeenCalled();
        });

        it('should throw if not connected', async () => {
            const client = new ProtokolMCPClient();
            await expect(client.listResources()).rejects.toThrow('Client not connected');
        });
    });

    describe('getPrompt', () => {
        it('should get prompt by name', async () => {
            const client = new ProtokolMCPClient();
            await client.connect();

            await client.getPrompt('test-prompt', { key: 'value' });
            expect(mockClientGetPrompt).toHaveBeenCalledWith({
                name: 'test-prompt',
                arguments: { key: 'value' },
            });
        });

        it('should get prompt without args', async () => {
            const client = new ProtokolMCPClient();
            await client.connect();

            await client.getPrompt('test-prompt');
            expect(mockClientGetPrompt).toHaveBeenCalledWith({
                name: 'test-prompt',
                arguments: undefined,
            });
        });

        it('should throw if not connected', async () => {
            const client = new ProtokolMCPClient();
            await expect(client.getPrompt('test')).rejects.toThrow('Client not connected');
        });
    });

    describe('listPrompts', () => {
        it('should list available prompts', async () => {
            const client = new ProtokolMCPClient();
            await client.connect();

            await client.listPrompts();
            expect(mockClientListPrompts).toHaveBeenCalled();
        });

        it('should throw if not connected', async () => {
            const client = new ProtokolMCPClient();
            await expect(client.listPrompts()).rejects.toThrow('Client not connected');
        });
    });

    describe('disconnect', () => {
        it('should close client and transport', async () => {
            const client = new ProtokolMCPClient();
            await client.connect();
            await client.disconnect();

            expect(mockClientClose).toHaveBeenCalled();
            expect(mockTransportClose).toHaveBeenCalled();
        });

        it('should handle disconnect when not connected', async () => {
            const client = new ProtokolMCPClient();
            // Should not throw
            await client.disconnect();
        });

        it('should handle client close errors gracefully', async () => {
            mockClientClose.mockRejectedValueOnce(new Error('close failed'));

            const client = new ProtokolMCPClient();
            await client.connect();
            // Should not throw
            await client.disconnect();
        });

        it('should handle transport close errors gracefully', async () => {
            mockTransportClose.mockRejectedValueOnce(new Error('close failed'));

            const client = new ProtokolMCPClient();
            await client.connect();
            // Should not throw
            await client.disconnect();
        });

        it('should prevent further tool calls after disconnect', async () => {
            const client = new ProtokolMCPClient();
            await client.connect();
            await client.disconnect();

            await expect(client.callTool('test')).rejects.toThrow('Client not connected');
        });
    });

    describe('createMCPClient', () => {
        it('should create and connect a client', async () => {
            const client = await createMCPClient();
            expect(client).toBeInstanceOf(ProtokolMCPClient);
            expect(mockClientConnect).toHaveBeenCalled();
        });

        it('should pass options to client', async () => {
            const client = await createMCPClient({ serverCommand: 'custom' });
            expect(client).toBeInstanceOf(ProtokolMCPClient);
        });
    });
});
