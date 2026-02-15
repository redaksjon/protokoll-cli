# Protokoll CLI Configuration

The Protokoll CLI uses [CardiganTime](https://github.com/utilarium/cardigantime) for hierarchical configuration management.

## Configuration File

The CLI looks for `protokoll-config.yaml` files in the current working directory and parent directories (walking up the directory tree).

### Default Location

```
protokoll-config.yaml
```

### Configuration Hierarchy

CardiganTime searches for configuration files in this order:

1. `protokoll-config.yaml` in current directory
2. `protokoll-config.yaml` in parent directories (walking up)
3. Environment variables (with `PROTOKOLL_` prefix)
4. Command-line arguments (if provided)

Configuration is merged, with more specific locations taking precedence.

## Configuration Options

### MCP Server Settings

```yaml
# Command to spawn the MCP server
mcpServerCommand: protokoll-mcp

# Arguments to pass to the MCP server
mcpServerArgs: []
```

### Directory Settings

```yaml
# Input directory for audio files
inputDirectory: ~/recordings

# Output directory for transcripts
outputDirectory: ~/notes

# Directory for processed audio files
processedDirectory: ~/processed
```

### Model Settings

```yaml
# LLM model for enhancement
model: gpt-4

# Transcription model
transcriptionModel: whisper-1
```

### API Settings

```yaml
# OpenAI API key (can also use OPENAI_API_KEY env var)
openaiApiKey: sk-...
```

### Debug Settings

```yaml
# Enable debug mode
debug: false

# Enable verbose output
verbose: false
```

## Environment Variables

All configuration options can be set via environment variables using the `PROTOKOLL_` prefix:

```bash
export PROTOKOLL_MODEL=gpt-4
export PROTOKOLL_TRANSCRIPTION_MODEL=whisper-1
export PROTOKOLL_INPUT_DIRECTORY=~/recordings
export PROTOKOLL_OUTPUT_DIRECTORY=~/notes
export PROTOKOLL_DEBUG=true
```

## Example Configuration

Create `protokoll-config.yaml` in your project root:

```yaml
# Protokoll CLI Configuration

# MCP Server settings
mcpServerCommand: protokoll-mcp
mcpServerArgs: []

# Directory settings
inputDirectory: ~/recordings
outputDirectory: ~/notes
processedDirectory: ~/processed

# Model settings
model: gpt-4
transcriptionModel: whisper-1

# Debug settings
debug: false
verbose: false
```

## Usage

Once configured, simply run the CLI from anywhere in your project:

```bash
# Process a single audio file (uses protokoll-config.yaml in CWD or parents)
protokoll process recording.m4a

# Batch process a directory
protokoll batch ~/recordings

# Specify a custom configuration file
protokoll -c /path/to/my-config.yaml batch ~/recordings
protokoll --config ~/configs/protokoll.yaml process recording.m4a

# The CLI will automatically find and use your configuration
```

## Custom Configuration File

You can specify a custom configuration file location using the `-c` or `--config` option:

```bash
protokoll -c /path/to/config.yaml <command>
```

This is useful when:
- You have multiple configuration profiles
- You want to use a configuration file from a different location
- You're running the CLI from a directory without a config file

Example:

```bash
# Use production config
protokoll -c ~/configs/protokoll-prod.yaml batch ~/recordings

# Use development config
protokoll --config ./dev-config.yaml process test.m4a
```

## Configuration Discovery

The CLI will:

1. Load configuration from `protokoll-config.yaml` files (hierarchical, searching up from CWD)
2. Merge with environment variables
3. Pass configuration to the MCP server via environment variables:
   - `WORKSPACE_ROOT`: Current working directory

This ensures the MCP server uses the same configuration as the CLI.
