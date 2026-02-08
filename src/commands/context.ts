/* eslint-disable no-console */

import { Command } from 'commander';
import { createMCPClient } from '../mcp-client.js';

/**
 * Register context commands for managing entities (projects, people, terms, companies)
 */
export const registerContextCommands = (program: Command): void => {
    // Main context command for overview
    const context = program
        .command('context')
        .description('Show context system overview');

    context
        .command('status')
        .description('Show context system status')
        .action(async () => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_context_status', {});

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        console.log('\n[Context System Status]\n');
                        
                        if (data.directories && data.directories.length > 0) {
                            console.log('Discovered context directories:');
                            for (const dir of data.directories) {
                                const marker = dir.level === 0 ? '→' : ' ';
                                console.log(`  ${marker} ${dir.path} (level ${dir.level})`);
                            }
                        } else {
                            console.log('No .protokoll directories found.');
                            console.log('Run "protokoll --init-config" to create one.');
                            return;
                        }
                        
                        console.log('\nLoaded entities:');
                        console.log(`  Projects:  ${data.counts?.projects || 0}`);
                        console.log(`  People:    ${data.counts?.people || 0}`);
                        console.log(`  Terms:     ${data.counts?.terms || 0}`);
                        console.log(`  Companies: ${data.counts?.companies || 0}`);
                        console.log(`  Ignored:   ${data.counts?.ignored || 0}`);
                        console.log('');
                    }
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                process.exit(1);
            } finally {
                await client.disconnect();
            }
        });

    context
        .command('search <query>')
        .description('Search across all entity types')
        .action(async (query: string) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_search_context', { query });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        
                        if (!data.results || data.results.length === 0) {
                            console.log(`No results found for "${query}".`);
                            return;
                        }
                        
                        console.log(`\nResults for "${query}" (${data.results.length}):\n`);
                        for (const entity of data.results) {
                            console.log(`  [${entity.type}] ${entity.id} - ${entity.name}`);
                        }
                        console.log('');
                    }
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                process.exit(1);
            } finally {
                await client.disconnect();
            }
        });

    // Project commands
    const project = program
        .command('project')
        .description('Manage projects');

    project
        .command('list')
        .description('List all projects')
        .option('-v, --verbose', 'Show full details')
        .action(async (options: { verbose?: boolean }) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_list_projects', {});

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        
                        if (!data.projects || data.projects.length === 0) {
                            console.log('No projects found.');
                            return;
                        }
                        
                        console.log(`\nProjects (${data.projects.length}):\n`);
                        for (const p of data.projects) {
                            if (options.verbose) {
                                console.log(`  ${p.id}`);
                                console.log(`    Name: ${p.name}`);
                                if (p.description) console.log(`    Description: ${p.description}`);
                                if (p.routing?.destination) console.log(`    Destination: ${p.routing.destination}`);
                                console.log(`    Active: ${p.active !== false}`);
                                console.log('');
                            } else {
                                const status = p.active === false ? ' [inactive]' : '';
                                const dest = p.routing?.destination ? ` → ${p.routing.destination}` : '';
                                console.log(`  ${p.id} - ${p.name}${dest}${status}`);
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

    project
        .command('show <id>')
        .description('Show details of a project')
        .action(async (id: string) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_get_entity', {
                    entityType: 'project',
                    entityId: id,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        console.log('\n' + JSON.stringify(data.entity, null, 2));
                    }
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                process.exit(1);
            } finally {
                await client.disconnect();
            }
        });

    project
        .command('add')
        .description('Add a new project')
        .requiredOption('--name <name>', 'Project name')
        .option('--id <id>', 'Project ID (auto-calculated from name if not provided)')
        .option('--description <text>', 'Project description')
        .option('--destination <path>', 'Output destination path')
        .option('--structure <type>', 'Directory structure: none, year, month, day')
        .action(async (options: any) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_add_project', {
                    name: options.name,
                    id: options.id,
                    description: options.description,
                    destination: options.destination,
                    structure: options.structure,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        console.log(`✓ Project created: ${data.project?.id || data.id}`);
                    }
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                process.exit(1);
            } finally {
                await client.disconnect();
            }
        });

    project
        .command('delete <id>')
        .description('Delete a project')
        .action(async (id: string) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_delete_entity', {
                    entityType: 'project',
                    entityId: id,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        if (data.success) {
                            console.log(`✓ Project "${id}" deleted.`);
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

    // Person commands
    const person = program
        .command('person')
        .description('Manage people');

    person
        .command('list')
        .description('List all people')
        .option('-v, --verbose', 'Show full details')
        .action(async (options: { verbose?: boolean }) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_list_people', {});

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        
                        if (!data.people || data.people.length === 0) {
                            console.log('No people found.');
                            return;
                        }
                        
                        console.log(`\nPeople (${data.people.length}):\n`);
                        for (const p of data.people) {
                            if (options.verbose) {
                                console.log(`  ${p.id}`);
                                console.log(`    Name: ${p.name}`);
                                if (p.role) console.log(`    Role: ${p.role}`);
                                if (p.company) console.log(`    Company: ${p.company}`);
                                console.log('');
                            } else {
                                const details = [];
                                if (p.role) details.push(p.role);
                                if (p.company) details.push(`@${p.company}`);
                                const suffix = details.length > 0 ? ` (${details.join(' · ')})` : '';
                                console.log(`  ${p.id} - ${p.name}${suffix}`);
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

    person
        .command('show <id>')
        .description('Show details of a person')
        .action(async (id: string) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_get_entity', {
                    entityType: 'person',
                    entityId: id,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        console.log('\n' + JSON.stringify(data.entity, null, 2));
                    }
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                process.exit(1);
            } finally {
                await client.disconnect();
            }
        });

    person
        .command('add')
        .description('Add a new person')
        .requiredOption('--name <name>', 'Person name')
        .option('--id <id>', 'Person ID (auto-calculated from name if not provided)')
        .option('--role <role>', 'Role/title')
        .option('--company <company>', 'Company name')
        .action(async (options: any) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_add_person', {
                    name: options.name,
                    id: options.id,
                    role: options.role,
                    company: options.company,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        console.log(`✓ Person created: ${data.person?.id || data.id}`);
                    }
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                process.exit(1);
            } finally {
                await client.disconnect();
            }
        });

    person
        .command('delete <id>')
        .description('Delete a person')
        .action(async (id: string) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_delete_entity', {
                    entityType: 'person',
                    entityId: id,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        if (data.success) {
                            console.log(`✓ Person "${id}" deleted.`);
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

    // Term commands
    const term = program
        .command('term')
        .description('Manage terms');

    term
        .command('list')
        .description('List all terms')
        .option('-v, --verbose', 'Show full details')
        .action(async (options: { verbose?: boolean }) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_list_terms', {});

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        
                        if (!data.terms || data.terms.length === 0) {
                            console.log('No terms found.');
                            return;
                        }
                        
                        console.log(`\nTerms (${data.terms.length}):\n`);
                        for (const t of data.terms) {
                            if (options.verbose) {
                                console.log(`  ${t.id}`);
                                console.log(`    Name: ${t.name}`);
                                if (t.expansion) console.log(`    Expansion: ${t.expansion}`);
                                if (t.domain) console.log(`    Domain: ${t.domain}`);
                                console.log('');
                            } else {
                                const expansion = t.expansion ? ` (${t.expansion})` : '';
                                console.log(`  ${t.id} - ${t.name}${expansion}`);
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

    term
        .command('show <id>')
        .description('Show details of a term')
        .action(async (id: string) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_get_entity', {
                    entityType: 'term',
                    entityId: id,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        console.log('\n' + JSON.stringify(data.entity, null, 2));
                    }
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                process.exit(1);
            } finally {
                await client.disconnect();
            }
        });

    term
        .command('add')
        .description('Add a new term')
        .requiredOption('--name <name>', 'Term name')
        .option('--id <id>', 'Term ID (auto-calculated from name if not provided)')
        .option('--expansion <text>', 'Full expansion if acronym')
        .option('--domain <domain>', 'Domain category')
        .option('--description <text>', 'Term description')
        .action(async (options: any) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_add_term', {
                    name: options.name,
                    id: options.id,
                    expansion: options.expansion,
                    domain: options.domain,
                    description: options.description,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        console.log(`✓ Term created: ${data.term?.id || data.id}`);
                    }
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                process.exit(1);
            } finally {
                await client.disconnect();
            }
        });

    term
        .command('merge <sourceId> <targetId>')
        .description('Merge two terms (combines metadata, deletes source)')
        .action(async (sourceId: string, targetId: string) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_merge_terms', {
                    sourceId,
                    targetId,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        if (data.success) {
                            console.log(`✓ Merged "${sourceId}" into "${targetId}"`);
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

    term
        .command('delete <id>')
        .description('Delete a term')
        .action(async (id: string) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_delete_entity', {
                    entityType: 'term',
                    entityId: id,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        if (data.success) {
                            console.log(`✓ Term "${id}" deleted.`);
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

    // Company commands
    const company = program
        .command('company')
        .description('Manage companies');

    company
        .command('list')
        .description('List all companies')
        .option('-v, --verbose', 'Show full details')
        .action(async (options: { verbose?: boolean }) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_list_companies', {});

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        
                        if (!data.companies || data.companies.length === 0) {
                            console.log('No companies found.');
                            return;
                        }
                        
                        console.log(`\nCompanies (${data.companies.length}):\n`);
                        for (const c of data.companies) {
                            if (options.verbose) {
                                console.log(`  ${c.id}`);
                                console.log(`    Name: ${c.name}`);
                                if (c.industry) console.log(`    Industry: ${c.industry}`);
                                console.log('');
                            } else {
                                const industry = c.industry ? ` [${c.industry}]` : '';
                                console.log(`  ${c.id} - ${c.name}${industry}`);
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

    company
        .command('show <id>')
        .description('Show details of a company')
        .action(async (id: string) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_get_entity', {
                    entityType: 'company',
                    entityId: id,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        console.log('\n' + JSON.stringify(data.entity, null, 2));
                    }
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                process.exit(1);
            } finally {
                await client.disconnect();
            }
        });

    company
        .command('add')
        .description('Add a new company')
        .requiredOption('--name <name>', 'Company name')
        .option('--id <id>', 'Company ID (auto-calculated from name if not provided)')
        .option('--industry <industry>', 'Industry sector')
        .action(async (options: any) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_add_company', {
                    name: options.name,
                    id: options.id,
                    industry: options.industry,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        console.log(`✓ Company created: ${data.company?.id || data.id}`);
                    }
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                process.exit(1);
            } finally {
                await client.disconnect();
            }
        });

    company
        .command('delete <id>')
        .description('Delete a company')
        .action(async (id: string) => {
            const client = await createMCPClient();
            try {
                const result: any = await client.callTool('protokoll_delete_entity', {
                    entityType: 'company',
                    entityId: id,
                });

                if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text') {
                        const data = JSON.parse(content.text);
                        if (data.success) {
                            console.log(`✓ Company "${id}" deleted.`);
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
