/**
 * Tests for Context Commands
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

// Mock client factory
const mockCallTool = vi.fn();
const mockDisconnect = vi.fn();
vi.mock('../../src/client-factory.js', () => ({
    createConfiguredMCPClient: vi.fn().mockResolvedValue({
        callTool: (...args: any[]) => mockCallTool(...args),
        disconnect: (...args: any[]) => mockDisconnect(...args),
    }),
}));

import { registerContextCommands } from '../../src/commands/context.js';

function createProgram(): Command {
    const program = new Command();
    program.exitOverride();
    registerContextCommands(program);
    return program;
}

function mcpTextResponse(data: any) {
    return {
        content: [{ type: 'text', text: JSON.stringify(data) }],
    };
}

describe('Context Commands', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDisconnect.mockResolvedValue(undefined);
    });

    describe('context status', () => {
        it('should call protokoll_context_status', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                directories: [{ path: '/home/.protokoll', level: 0 }],
                counts: { projects: 5, people: 10, terms: 20, companies: 3, ignored: 1 },
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'context', 'status']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_context_status', {});
        });

        it('should display directories and counts', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                directories: [
                    { path: '/home/.protokoll', level: 0 },
                    { path: '/workspace/.protokoll', level: 1 },
                ],
                counts: { projects: 5, people: 10, terms: 20, companies: 3, ignored: 1 },
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'context', 'status']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Context System Status'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/home/.protokoll'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Projects:  5'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('People:    10'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Terms:     20'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Companies: 3'));
        });

        it('should display level 0 directory with arrow marker', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                directories: [{ path: '/home/.protokoll', level: 0 }],
                counts: { projects: 0, people: 0, terms: 0, companies: 0, ignored: 0 },
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'context', 'status']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('→'));
        });

        it('should display message when no directories found', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                directories: [],
                counts: {},
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'context', 'status']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No .protokoll directories'));
        });

        it('should handle missing counts', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                directories: [{ path: '/p', level: 0 }],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'context', 'status']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Projects:  0'));
        });

        it('should handle errors', async () => {
            mockCallTool.mockRejectedValue(new Error('Status failed'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'context', 'status']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Status failed'));
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        it('should always disconnect', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ directories: [], counts: {} }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'context', 'status']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });

    describe('context search', () => {
        it('should call protokoll_search_context with query', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                results: [{ type: 'person', id: 'john', name: 'John Doe' }],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'context', 'search', 'john']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_search_context', { query: 'john' });
        });

        it('should display search results', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                results: [
                    { type: 'person', id: 'john', name: 'John Doe' },
                    { type: 'project', id: 'proj-1', name: 'My Project' },
                ],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'context', 'search', 'john']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[person] john'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[project] proj-1'));
        });

        it('should display no results message', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                results: [],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'context', 'search', 'nonexistent']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No results'));
        });

        it('should handle null results', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({}));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'context', 'search', 'test']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No results'));
        });

        it('should handle errors', async () => {
            mockCallTool.mockRejectedValue(new Error('Search failed'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'context', 'search', 'test']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Search failed'));
        });

        it('should always disconnect', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ results: [] }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'context', 'search', 'test']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });

    describe('project commands', () => {
        it('should list projects', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                projects: [
                    { id: 'proj-1', name: 'Project One', active: true, routing: { destination: '/out' } },
                    { id: 'proj-2', name: 'Project Two', active: false },
                ],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'project', 'list']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_list_projects', {});
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Projects (2)'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('proj-1'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[inactive]'));
        });

        it('should list projects in verbose mode', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                projects: [
                    { id: 'proj-1', name: 'Project One', description: 'A project', active: true, routing: { destination: '/out' } },
                ],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'project', 'list', '-v']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Name: Project One'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Description: A project'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Destination: /out'));
        });

        it('should display no projects message', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ projects: [] }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'project', 'list']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No projects found'));
        });

        it('should handle null projects', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({}));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'project', 'list']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No projects found'));
        });

        it('should show project details', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                entity: { id: 'proj-1', name: 'My Project', description: 'desc' },
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'project', 'show', 'proj-1']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_get_entity', {
                entityType: 'project',
                entityId: 'proj-1',
            });
        });

        it('should add a new project', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                project: { id: 'new-proj' },
            }));

            const program = createProgram();
            await program.parseAsync([
                'node', 'test', 'project', 'add',
                '--name', 'New Project',
                '--id', 'new-proj',
                '--description', 'A new project',
                '--destination', '/output',
                '--structure', 'month',
            ]);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_add_project', {
                name: 'New Project',
                id: 'new-proj',
                description: 'A new project',
                destination: '/output',
                structure: 'month',
            });
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('new-proj'));
        });

        it('should delete a project', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ success: true }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'project', 'delete', 'proj-1']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_delete_entity', {
                entityType: 'project',
                entityId: 'proj-1',
            });
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('deleted'));
        });

        it('should handle project errors', async () => {
            mockCallTool.mockRejectedValue(new Error('Project error'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'project', 'list']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Project error'));
        });

        it('should always disconnect on project commands', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ projects: [] }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'project', 'list']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });

    describe('person commands', () => {
        it('should list people', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                people: [
                    { id: 'john', name: 'John Doe', role: 'Engineer', company: 'Acme' },
                    { id: 'jane', name: 'Jane Smith' },
                ],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'person', 'list']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_list_people', {});
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('People (2)'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Engineer'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('@Acme'));
        });

        it('should list people in verbose mode', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                people: [{ id: 'john', name: 'John Doe', role: 'Engineer', company: 'Acme' }],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'person', 'list', '-v']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Name: John Doe'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Role: Engineer'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Company: Acme'));
        });

        it('should display no people message', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ people: [] }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'person', 'list']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No people found'));
        });

        it('should show person details', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                entity: { id: 'john', name: 'John Doe' },
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'person', 'show', 'john']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_get_entity', {
                entityType: 'person',
                entityId: 'john',
            });
        });

        it('should add a new person', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                person: { id: 'jane-doe' },
            }));

            const program = createProgram();
            await program.parseAsync([
                'node', 'test', 'person', 'add',
                '--name', 'Jane Doe',
                '--id', 'jane-doe',
                '--role', 'Manager',
                '--company', 'Acme Corp',
            ]);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_add_person', {
                name: 'Jane Doe',
                id: 'jane-doe',
                role: 'Manager',
                company: 'Acme Corp',
            });
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('jane-doe'));
        });

        it('should delete a person', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ success: true }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'person', 'delete', 'john']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_delete_entity', {
                entityType: 'person',
                entityId: 'john',
            });
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('deleted'));
        });

        it('should handle person errors', async () => {
            mockCallTool.mockRejectedValue(new Error('Person error'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'person', 'list']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Person error'));
        });

        it('should always disconnect on person commands', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ people: [] }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'person', 'list']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });

    describe('term commands', () => {
        it('should list terms', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                terms: [
                    { id: 'k8s', name: 'Kubernetes', expansion: 'Container Orchestration', domain: 'DevOps' },
                    { id: 'api', name: 'API' },
                ],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'term', 'list']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_list_terms', {});
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Terms (2)'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Container Orchestration'));
        });

        it('should list terms in verbose mode', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                terms: [{ id: 'k8s', name: 'Kubernetes', expansion: 'Container Orchestration', domain: 'DevOps' }],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'term', 'list', '-v']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Name: Kubernetes'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Expansion: Container Orchestration'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Domain: DevOps'));
        });

        it('should display no terms message', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ terms: [] }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'term', 'list']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No terms found'));
        });

        it('should show term details', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                entity: { id: 'k8s', name: 'Kubernetes' },
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'term', 'show', 'k8s']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_get_entity', {
                entityType: 'term',
                entityId: 'k8s',
            });
        });

        it('should add a new term', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                term: { id: 'ci-cd' },
            }));

            const program = createProgram();
            await program.parseAsync([
                'node', 'test', 'term', 'add',
                '--name', 'CI/CD',
                '--id', 'ci-cd',
                '--expansion', 'Continuous Integration / Continuous Delivery',
                '--domain', 'DevOps',
                '--description', 'Automated build and deploy',
            ]);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_add_term', {
                name: 'CI/CD',
                id: 'ci-cd',
                expansion: 'Continuous Integration / Continuous Delivery',
                domain: 'DevOps',
                description: 'Automated build and deploy',
            });
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ci-cd'));
        });

        it('should merge terms', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ success: true }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'term', 'merge', 'k8s', 'kubernetes']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_merge_terms', {
                sourceId: 'k8s',
                targetId: 'kubernetes',
            });
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Merged'));
        });

        it('should delete a term', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ success: true }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'term', 'delete', 'k8s']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_delete_entity', {
                entityType: 'term',
                entityId: 'k8s',
            });
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('deleted'));
        });

        it('should handle term errors', async () => {
            mockCallTool.mockRejectedValue(new Error('Term error'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'term', 'list']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Term error'));
        });

        it('should always disconnect on term commands', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ terms: [] }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'term', 'list']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });

    describe('company commands', () => {
        it('should list companies', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                companies: [
                    { id: 'acme', name: 'Acme Corp', industry: 'Technology' },
                    { id: 'globex', name: 'Globex Inc' },
                ],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'company', 'list']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_list_companies', {});
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Companies (2)'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[Technology]'));
        });

        it('should list companies in verbose mode', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                companies: [{ id: 'acme', name: 'Acme Corp', industry: 'Technology' }],
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'company', 'list', '-v']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Name: Acme Corp'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Industry: Technology'));
        });

        it('should display no companies message', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ companies: [] }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'company', 'list']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No companies found'));
        });

        it('should handle null companies', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({}));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'company', 'list']);

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No companies found'));
        });

        it('should show company details', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                entity: { id: 'acme', name: 'Acme Corp' },
            }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'company', 'show', 'acme']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_get_entity', {
                entityType: 'company',
                entityId: 'acme',
            });
        });

        it('should add a new company', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({
                company: { id: 'newco' },
            }));

            const program = createProgram();
            await program.parseAsync([
                'node', 'test', 'company', 'add',
                '--name', 'New Company',
                '--id', 'newco',
                '--industry', 'Finance',
            ]);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_add_company', {
                name: 'New Company',
                id: 'newco',
                industry: 'Finance',
            });
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('newco'));
        });

        it('should delete a company', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ success: true }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'company', 'delete', 'acme']);

            expect(mockCallTool).toHaveBeenCalledWith('protokoll_delete_entity', {
                entityType: 'company',
                entityId: 'acme',
            });
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('deleted'));
        });

        it('should handle company errors', async () => {
            mockCallTool.mockRejectedValue(new Error('Company error'));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'company', 'list']);

            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Company error'));
        });

        it('should always disconnect on company commands', async () => {
            mockCallTool.mockResolvedValue(mcpTextResponse({ companies: [] }));

            const program = createProgram();
            await program.parseAsync(['node', 'test', 'company', 'list']);

            expect(mockDisconnect).toHaveBeenCalled();
        });
    });
});
