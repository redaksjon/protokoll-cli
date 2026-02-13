# Configuration Summary

The Protokoll CLI now supports flexible configuration using CardiganTime.

## Configuration File

**Default file name**: `protokoll-config.yaml`

**Default location**: Current working directory (or any parent directory)

## Three Ways to Configure

### 1. Default Configuration File

Create `protokoll-config.yaml` in your project root:

```yaml
mcpServerCommand: protokoll-mcp
inputDirectory: ~/recordings
outputDirectory: ~/notes
model: gpt-4
```

Run from anywhere in your project:

```bash
protokoll batch ~/recordings
```

### 2. Custom Configuration File

Use the `-c` or `--config` option to specify a different file:

```bash
protokoll -c /path/to/my-config.yaml batch ~/recordings
protokoll --config ~/configs/prod.yaml process audio.m4a
```

### 3. Environment Variables

Set configuration via environment variables with `PROTOKOLL_` prefix:

```bash
export PROTOKOLL_MODEL=gpt-4
export PROTOKOLL_INPUT_DIRECTORY=~/recordings
protokoll batch ~/recordings
```

## Configuration Hierarchy

Configuration is loaded and merged in this order (later overrides earlier):

1. `protokoll-config.yaml` in parent directories (walking up from CWD)
2. `protokoll-config.yaml` in current directory
3. Environment variables (`PROTOKOLL_*`)
4. Custom config file specified with `-c` option
5. Command-line arguments

## Available Options

```yaml
# MCP Server
mcpServerCommand: protokoll-mcp
mcpServerArgs: []

# Directories
inputDirectory: ~/recordings
outputDirectory: ~/notes
processedDirectory: ~/processed

# Models
model: gpt-4
transcriptionModel: whisper-1

# API
openaiApiKey: sk-...

# Debug
debug: false
verbose: false
```

## Examples

### Development vs Production

```bash
# Development
protokoll -c dev-config.yaml batch ~/test-recordings

# Production
protokoll -c prod-config.yaml batch ~/recordings
```

### Per-Project Configuration

```
project-a/
  protokoll-config.yaml  # Project A settings
  recordings/

project-b/
  protokoll-config.yaml  # Project B settings
  recordings/
```

### Global + Local Configuration

```
~/
  protokoll-config.yaml  # Global defaults
  projects/
    my-project/
      protokoll-config.yaml  # Project-specific overrides
```

When running from `~/projects/my-project/`, both configs are merged!

## Implementation Details

- Uses [CardiganTime](https://github.com/utilarium/cardigantime) for hierarchical config
- Config is loaded once and cached per CLI invocation
- Custom config path (`-c`) bypasses CardiganTime and loads directly
- Configuration is passed to MCP server via `WORKSPACE_ROOT` environment variable
