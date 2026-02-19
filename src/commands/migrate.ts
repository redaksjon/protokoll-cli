/* eslint-disable no-console */

import { Command } from 'commander';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { backfillDates } from '@redaksjon/protokoll-format';

const UUID_PREFIX_LENGTH = 8;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface MigrationPlan {
  file: string;
  oldId: string;
  newId: string;
  newFilename: string;
  entityType: string;
}

interface RenamePlan {
  oldPath: string;
  newPath: string;
  entityType: string;
  id: string;
  slug: string;
}

/**
 * Migrate entity files from slug-based to UUID-based identification
 */
async function migrateEntities(contextPath: string, dryRun: boolean = true): Promise<MigrationPlan[]> {
    const plans: MigrationPlan[] = [];
  
    for (const dirName of ['people', 'projects', 'companies', 'terms', 'ignored']) {
        const dirPath = path.join(contextPath, dirName);
    
        // Check if directory exists
        try {
            await fs.access(dirPath);
        } catch {
            console.log(`Skipping ${dirName} (directory not found)`);
            continue;
        }
    
        const files = await fs.readdir(dirPath).catch(() => []);
    
        for (const file of files.filter(f => f.endsWith('.yaml'))) {
            const filePath = path.join(dirPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const entity = yaml.load(content) as any;
      
            // Skip if already has UUID (check if id looks like a UUID)
            if (entity.id && UUID_REGEX.test(entity.id)) {
                console.log(`Skipping ${file} (already has UUID)`);
                continue;
            }
      
            const oldId = entity.id;
            const newId = randomUUID();
            const slug = oldId;
            const uuidPrefix = newId.substring(0, UUID_PREFIX_LENGTH);
            const newFilename = `${uuidPrefix}-${slug}.yaml`;
      
            plans.push({
                file: filePath,
                oldId,
                newId,
                newFilename,
                entityType: dirName
            });
      
            if (!dryRun) {
                // Update entity data
                entity.id = newId;
                entity.slug = slug;
        
                // Write to new file
                const newPath = path.join(dirPath, newFilename);
                await fs.writeFile(newPath, yaml.dump(entity, { lineWidth: -1, noRefs: true }));
        
                // Remove old file
                await fs.unlink(filePath);
        
                console.log(`✓ Migrated: ${file} → ${newFilename}`);
            }
        }
    }
  
    return plans;
}

/**
 * Register migration commands
 */
export const registerMigrateCommands = (program: Command): void => {
    const migrate = program
        .command('migrate')
        .description('Migration utilities');

    migrate
        .command('entities')
        .description('Migrate entity files from slug to UUID identification')
        .option('-c, --context <path>', 'Context directory path', process.cwd())
        .option('--dry-run', 'Show what would be changed without making changes (default)', true)
        .option('--execute', 'Actually perform the migration')
        .addHelpText('after', `
Migration Process:
  1. Generates UUIDs for all entity files
  2. Renames files to {uuid-prefix}-{slug}.yaml format
  3. Updates id field to UUID and adds slug field with old id

Examples:
  protokoll migrate entities --context ~/activity/context --dry-run
  protokoll migrate entities --context ~/activity/context --execute
`)
        .action(async (options) => {
            const contextPath = options.context;
            const dryRun = !options.execute;
            
            console.log(`\n${dryRun ? '🔍 DRY RUN MODE' : '⚡ EXECUTING MIGRATION'}`);
            console.log(`Context directory: ${contextPath}\n`);
            
            try {
                const plans = await migrateEntities(contextPath, dryRun);
                
                if (plans.length === 0) {
                    console.log('✓ No entities need migration (all already have UUIDs)');
                    return;
                }
                
                console.log(`\nMigration Plan (${plans.length} entities):\n`);
                
                // Group by entity type
                const byType: Record<string, MigrationPlan[]> = {};
                for (const plan of plans) {
                    if (!byType[plan.entityType]) {
                        byType[plan.entityType] = [];
                    }
                    byType[plan.entityType].push(plan);
                }
                
                for (const [type, typePlans] of Object.entries(byType)) {
                    console.log(`\n${type} (${typePlans.length}):`);
                    for (const plan of typePlans) {
                        const filename = path.basename(plan.file);
                        console.log(`  ${filename}`);
                        console.log(`    Old ID: ${plan.oldId}`);
                        console.log(`    New ID: ${plan.newId}`);
                        console.log(`    New Filename: ${plan.newFilename}`);
                    }
                }
                
                if (dryRun) {
                    console.log('\n⚠️  This was a dry run. No changes were made.');
                    console.log('To execute the migration, run with --execute flag');
                } else {
                    console.log(`\n✓ Migration complete! ${plans.length} entities migrated.`);
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                process.exit(1);
            }
        });

    migrate
        .command('filenames')
        .description('Rename UUID-only entity files to {prefix}-{slug} format')
        .option('-c, --context <path>', 'Context directory path', process.cwd())
        .option('--dry-run', 'Show what would be changed without making changes (default)', true)
        .option('--execute', 'Actually perform the rename')
        .addHelpText('after', `
Rename Process:
  Renames files like d00acdc4-3112-4850-a993-6013f0c1a220.yaml
  to d00acdc4-gerald-corson.yaml (using first ${UUID_PREFIX_LENGTH} chars of UUID + slug).
  Only affects files that have both a UUID id and a slug field.

Examples:
  protokoll migrate filenames --context ~/activity/context --dry-run
  protokoll migrate filenames --context ~/activity/context --execute
`)
        .action(async (options) => {
            const contextPath = options.context;
            const dryRun = !options.execute;

            console.log(`\n${dryRun ? '  DRY RUN MODE' : '  EXECUTING RENAME'}`);
            console.log(`Context directory: ${contextPath}\n`);

            try {
                const plans = await planFilenameRenames(contextPath);

                if (plans.length === 0) {
                    console.log('No files need renaming.');
                    return;
                }

                console.log(`Rename Plan (${plans.length} files):\n`);

                const byType: Record<string, RenamePlan[]> = {};
                for (const plan of plans) {
                    if (!byType[plan.entityType]) byType[plan.entityType] = [];
                    byType[plan.entityType].push(plan);
                }

                for (const [type, typePlans] of Object.entries(byType)) {
                    console.log(`${type} (${typePlans.length}):`);
                    for (const plan of typePlans) {
                        const oldName = path.basename(plan.oldPath);
                        const newName = path.basename(plan.newPath);
                        console.log(`  ${oldName} -> ${newName}`);
                    }
                }

                if (!dryRun) {
                    for (const plan of plans) {
                        await fs.rename(plan.oldPath, plan.newPath);
                    }
                    console.log(`\nRenamed ${plans.length} files.`);
                } else {
                    console.log('\nThis was a dry run. No changes were made.');
                    console.log('To execute, run with --execute flag');
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                process.exit(1);
            }
        });

    migrate
        .command('backfill-dates')
        .description('Populate missing date metadata in .pkl files from their file paths')
        .argument('<notes-dir>', 'Directory containing transcript .pkl files')
        .option('--dry-run', 'Show what would be changed without making changes (default)', true)
        .option('--execute', 'Actually write the dates into the files')
        .addHelpText('after', `
Backfill Process:
  Scans all .pkl files under the given directory. For each file that has no
  date in its metadata, the date is parsed from the file path
  (format: YYYY/M/DD-HHmm-title.pkl) and written into the file.

Examples:
  protokoll migrate backfill-dates ~/activity/notes --dry-run
  protokoll migrate backfill-dates ~/activity/notes --execute
  protokoll migrate backfill-dates ~/activity/notes/2026/1 --execute
`)
        .action(async (notesDir: string, options) => {
            const dryRun = !options.execute;
            const resolvedDir = path.resolve(notesDir);

            console.log(`\n${dryRun ? 'DRY RUN MODE' : 'EXECUTING MIGRATION'}`);
            console.log(`Directory: ${resolvedDir}\n`);

            try {
                const result = await backfillDates(resolvedDir, dryRun);

                console.log(`Total .pkl files scanned: ${result.totalFiles}`);
                console.log(`Already have date:        ${result.alreadyHasDate}`);
                console.log(`Date parsed from path:    ${result.backfilled}${dryRun ? ' (would update)' : ' (updated)'}`);
                if (result.unparseable > 0) {
                    console.log(`Path unparseable:         ${result.unparseable} (skipped)`);
                }
                if (result.errors > 0) {
                    console.log(`\nErrors (${result.errors}):`);
                    for (const { path: p, error } of result.errorFiles) {
                        console.log(`  ${path.basename(p)}: ${error}`);
                    }
                }

                if (dryRun && result.backfilled > 0) {
                    console.log('\nThis was a dry run. No changes were made.');
                    console.log('To execute, run with --execute flag.');
                } else if (!dryRun) {
                    console.log(`\nDone. ${result.backfilled} files updated.`);
                }
            } catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                process.exit(1);
            }
        });
};

async function planFilenameRenames(contextPath: string): Promise<RenamePlan[]> {
    const plans: RenamePlan[] = [];

    for (const dirName of ['people', 'projects', 'companies', 'terms', 'ignored']) {
        const dirPath = path.join(contextPath, dirName);

        try {
            await fs.access(dirPath);
        } catch {
            continue;
        }

        const files = await fs.readdir(dirPath).catch(() => []);

        for (const file of files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))) {
            const filePath = path.join(dirPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const entity = yaml.load(content) as any;

            if (!entity?.id || !entity?.slug) continue;
            if (!UUID_REGEX.test(entity.id)) continue;

            const prefix = entity.id.substring(0, UUID_PREFIX_LENGTH);
            const expectedFilename = `${prefix}-${entity.slug}${path.extname(file)}`;

            if (file === expectedFilename) continue;

            plans.push({
                oldPath: filePath,
                newPath: path.join(dirPath, expectedFilename),
                entityType: dirName,
                id: entity.id,
                slug: entity.slug,
            });
        }
    }

    return plans;
}
