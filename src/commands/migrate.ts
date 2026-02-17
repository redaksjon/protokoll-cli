/* eslint-disable no-console */

import { Command } from 'commander';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface MigrationPlan {
  file: string;
  oldId: string;
  newId: string;
  newFilename: string;
  entityType: string;
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
            if (entity.id && entity.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                console.log(`Skipping ${file} (already has UUID)`);
                continue;
            }
      
            const oldId = entity.id;
            const newId = randomUUID();
            const slug = oldId; // Preserve old id as slug
            const uuidPrefix = newId.substring(0, 10);
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
};
