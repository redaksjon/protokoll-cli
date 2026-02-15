#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface MCPClientOptions {
    serverCommand?: string;
    serverArgs?: string[];
    workspaceRoot?: string;
    configDirectory?: string;
}

export class ProtokolMCPClient {
    private client: Client | null = null;
    private transport: StdioClientTransport | null = null;
    private connected = false;

    constructor(private options: MCPClientOptions = {}) {
        // Default to spawning protokoll-mcp
        this.options.serverCommand = options.serverCommand || 'protokoll-mcp';
        this.options.serverArgs = options.serverArgs || [];
    }

    async connect(): Promise<void> {
        if (this.connected) {
            return;
        }

        try {
            // Build environment variables for the server
            const env: Record<string, string> = {};
            
            // Copy existing env vars
            for (const [key, value] of Object.entries(process.env)) {
                if (value !== undefined) {
                    env[key] = value;
                }
            }
            
            // Pass workspace root if provided
            if (this.options.workspaceRoot) {
                env.WORKSPACE_ROOT = this.options.workspaceRoot;
            }
            
            // Pass config directory if provided
            if (this.options.configDirectory) {
                env.PROTOKOLL_CONFIG_DIR = this.options.configDirectory;
            }
            
            // Create transport - it will spawn the server process
            this.transport = new StdioClientTransport({
                command: this.options.serverCommand!,
                args: this.options.serverArgs,
                env,
                stderr: 'inherit',
            });

            // Create client
            this.client = new Client({
                name: 'protokoll-cli',
                version: '0.1.0',
            });

            // Connect
            await this.client.connect(this.transport);
            this.connected = true;

        } catch (error) {
            await this.cleanup();
            throw new Error(`Failed to connect to MCP server: ${error}`);
        }
    }

    async callTool(
        name: string, 
        args: Record<string, unknown> = {}, 
        options?: { progressToken?: string; timeout?: number }
    ) {
        if (!this.client || !this.connected) {
            throw new Error('Client not connected. Call connect() first.');
        }

        const params: any = { name, arguments: args };
        if (options?.progressToken) {
            params._meta = { progressToken: options.progressToken };
        }

        // Pass timeout to the request options (default is 60000ms in MCP SDK)
        const requestOptions = options?.timeout ? { timeout: options.timeout } : undefined;
        
        return await this.client.callTool(params, undefined, requestOptions);
    }

    async listTools() {
        if (!this.client || !this.connected) {
            throw new Error('Client not connected. Call connect() first.');
        }

        return await this.client.listTools();
    }

    async readResource(uri: string): Promise<any> {
        if (!this.client || !this.connected) {
            throw new Error('Client not connected. Call connect() first.');
        }

        return await this.client.readResource({ uri });
    }

    async listResources(): Promise<any> {
        if (!this.client || !this.connected) {
            throw new Error('Client not connected. Call connect() first.');
        }

        return await this.client.listResources();
    }

    async getPrompt(name: string, args?: Record<string, string>): Promise<any> {
        if (!this.client || !this.connected) {
            throw new Error('Client not connected. Call connect() first.');
        }

        return await this.client.getPrompt({ name, arguments: args });
    }

    async listPrompts(): Promise<any> {
        if (!this.client || !this.connected) {
            throw new Error('Client not connected. Call connect() first.');
        }

        return await this.client.listPrompts();
    }

    async disconnect(): Promise<void> {
        await this.cleanup();
    }

    private async cleanup(): Promise<void> {
        this.connected = false;

        if (this.client) {
            try {
                await this.client.close();
            } catch {
                // Ignore cleanup errors
            }
            this.client = null;
        }

        if (this.transport) {
            try {
                await this.transport.close();
            } catch {
                // Ignore cleanup errors
            }
            this.transport = null;
        }
    }
}

export async function createMCPClient(options?: MCPClientOptions): Promise<ProtokolMCPClient> {
    const client = new ProtokolMCPClient(options);
    await client.connect();
    return client;
}
