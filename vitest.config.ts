import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    test: {
        globals: false,
        environment: 'node',
        setupFiles: ['tests/setup.ts'],
        include: ['tests/**/*.test.ts'],
        exclude: ['node_modules/**/*', 'dist/**/*'],
        testTimeout: 30000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.ts'],
            exclude: [
                'dist/**/*', 
                'node_modules/**/*', 
                'tests/**/*', 
                'src/**/*.md', 
                'src/**/.DS_Store',
            ],
            thresholds: {
                lines: 40,
                statements: 40,
                branches: 30,
                functions: 40,
            },
        },
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});
