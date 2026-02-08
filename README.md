# Protokoll CLI

Command-line interface for [Protokoll](https://github.com/redaksjon/protokoll) - A thin MCP client for transcription and context management.

## Overview

`protokoll-cli` is a lightweight command-line client that communicates with the Protokoll MCP server. It provides a familiar CLI experience while leveraging the full power of Protokoll's intelligent transcription pipeline through the Model Context Protocol.

## Architecture

```
protokoll-cli (this package)     protokoll (core)
┌─────────────────────┐         ┌──────────────────────┐
│   CLI Commands      │         │   MCP Server         │
│   ├─ status         │  stdio  │   ├─ Tools           │
│   ├─ task           │ ◄─────► │   ├─ Resources       │
│   ├─ transcript     │         │   ├─ Prompts         │
│   ├─ context        │         │   └─ Pipeline        │
│   ├─ project/etc    │         │                      │
│   ├─ action         │         │   Core Library       │
│   ├─ feedback       │         │   ├─ Context         │
│   └─ process/batch  │         │   ├─ Routing         │
└─────────────────────┘         │   └─ Transcription   │
                                 └──────────────────────┘
```

## Installation

```bash
npm install -g @redaksjon/protokoll-cli
```

**Prerequisites**: Requires `@redaksjon/protokoll` to be installed (provides the MCP server).

```bash
npm install -g @redaksjon/protokoll
```

## Quick Start

```bash
# Show version information
protokoll version

# Process an audio file
protokoll process recording.m4a

# List transcripts
protokoll transcript list

# Read a transcript
protokoll transcript read meeting-notes.md

# Manage status
protokoll status set meeting.md reviewed

# Add a task
protokoll task add meeting.md "Follow up with client"
```

## Commands

### Audio Processing

Process audio files through Protokoll's intelligent transcription pipeline:

```bash
# Process single audio file
protokoll process <audioFile> [options]
  -p, --project <projectId>      Specific project ID for routing
  -o, --output <directory>       Override output directory
  -m, --model <model>            LLM model for enhancement
  --transcription-model <model>  Transcription model (default: whisper-1)

# Batch process multiple files
protokoll batch <inputDirectory> [options]
  -o, --output <directory>       Override output directory
  -e, --extensions <list>        Audio extensions (comma-separated)
```

### Transcript Management

Read and manage transcripts:

```bash
# Read a transcript
protokoll transcript read <transcriptPath>

# List transcripts
protokoll transcript list [options]
  -l, --limit <number>  Maximum results (default: 50)
  -s, --search <text>   Search within transcripts
  --sort <field>        Sort by: date, filename, title (default: date)
```

### Status Management

Manage transcript lifecycle status:

```bash
# Set status
protokoll status set <transcriptPath> <newStatus>

# Show current status
protokoll status show <transcriptPath>
```

Valid statuses: `initial`, `enhanced`, `reviewed`, `in_progress`, `closed`, `archived`

### Task Management

Manage transcript tasks:

```bash
# Add a task
protokoll task add <transcriptPath> <description>

# Complete a task
protokoll task complete <transcriptPath> <taskId>

# Delete a task
protokoll task delete <transcriptPath> <taskId>
```

### Context Management

Manage context entities (projects, people, terms, companies):

```bash
# Show context system status
protokoll context status

# Search across all entities
protokoll context search <query>

# Entity commands (project, person, term, company)
protokoll <entity> list [--verbose]
protokoll <entity> show <id>
protokoll <entity> add [options]
protokoll <entity> delete <id>

# Term-specific
protokoll term merge <sourceId> <targetId>
```

### Transcript Actions

Perform actions on transcripts:

```bash
# Combine multiple transcripts
protokoll action combine <files...> [options]
  -t, --title <title>    Title for combined transcript
  -p, --project <id>     Project ID to assign

# Edit transcript metadata
protokoll action edit <transcriptPath> [options]
  -t, --title <title>    New title (renames file)
  -p, --project <id>     New project ID
  --add-tag <tag>        Add a tag (repeatable)
  --remove-tag <tag>     Remove a tag (repeatable)
  -s, --status <status>  New status

# Change transcript date
protokoll action change-date <transcriptPath> <newDate>

# Create a new note
protokoll action create-note [options]
  -t, --title <title>    Note title (required)
  -c, --content <text>   Note content
  -p, --project <id>     Project ID
  --tag <tag>            Add tag (repeatable)
  -d, --date <date>      Date (ISO format)
```

### Feedback

Provide natural language feedback to correct transcripts:

```bash
protokoll feedback <transcriptPath> <feedback> [options]
  -m, --model <model>  LLM model for processing

# Examples:
protokoll feedback meeting.md "YB should be Wibey"
protokoll feedback notes.md "This should be assigned to quarterly-review project"
```

## Configuration

Protokoll-cli uses the Protokoll core's configuration system. Configuration is stored in `.protokoll/config.yaml` in your workspace.

The CLI automatically discovers configuration by searching up the directory tree from your current working directory.

## Development

```bash
# Clone the repository
git clone https://github.com/redaksjon/protokoll-cli.git
cd protokoll-cli

# Install dependencies
npm install

# Link local protokoll for development
cd ../protokoll && npm link
cd ../protokoll-cli && npm link @redaksjon/protokoll

# Build
npm run build

# Run tests
npm test

# Run locally
node dist/main.js --help
```

## How It Works

### MCP Communication

Protokoll-cli spawns the Protokoll MCP server (`protokoll-mcp`) as a child process and communicates via stdio transport:

1. CLI command is invoked
2. `createMCPClient()` spawns `protokoll-mcp` server
3. Client sends MCP tool call (JSON-RPC over stdio)
4. Server processes request and returns result
5. CLI formats and displays output
6. Connection is closed

### Progress Notifications

Long-running operations (audio processing, batch operations) can send progress notifications from the server. The CLI renders these as progress bars in TTY environments or milestone logs in non-TTY environments.

## Relationship to Protokoll Core

`protokoll-cli` is a **thin client** - it contains no business logic. All transcription, context management, routing, and entity operations are handled by the Protokoll core via MCP tool calls.

This architecture provides several benefits:
- **Consistency**: Same backend for CLI, VS Code extension, macOS app, and Cursor
- **Maintainability**: Business logic in one place
- **Extensibility**: Easy to add new clients without duplicating logic
- **Testing**: Core logic tested independently of CLI presentation

## License

Apache-2.0

## Author

Tim O'Brien <tobrien@discursive.com>
