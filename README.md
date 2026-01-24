# Calendar to Notes

An Obsidian plugin that creates meeting notes from Google Calendar events.

## Features

- **Folder context menu integration**: Right-click any folder and select "Create meeting notes from Google Calendar…"
- **Time range selection**: Fetch events for the current day or a custom date range
- **Calendar selection**: Choose which Google Calendar to fetch events from
- **Event selection**: Pick which events to create notes for
- **Template support**: Use your own markdown template with variable substitution
- **Deduplication**: Automatically detects if a note for an event already exists
- **Conflict handling**: Skip, overwrite, or create with suffix when conflicts occur

## Google OAuth Setup

To use this plugin, you need to create OAuth credentials in Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **Google Calendar API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Desktop application" as the application type
5. Copy the **Client ID** and **Client Secret**
6. In Obsidian, go to Settings → Calendar to Notes and enter your credentials
7. Click "Connect to Google" and follow the authorization flow

## Plugin Configuration

### Template Note Path

Create a template note in your vault (e.g., `Templates/Meeting.md`) and set its path in the plugin settings.

### Supported Template Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{title}}` | Event title | Team Standup |
| `{{date}}` | Date in YYYY-MM-DD format | 2024-03-15 |
| `{{startTime}}` | Start time in HH:mm format | 09:00 |
| `{{endTime}}` | End time in HH:mm format | 09:30 |
| `{{attendees}}` | Attendees as Obsidian wiki links | [[Alice]], [[Bob]] |
| `{{calendarEventId}}` | Unique event ID (for deduplication) | abc123xyz |
| `{{calendarEventStart}}` | Event start in ISO format | 2024-03-15T09:00:00Z |

Missing values resolve to an empty string.

**Note**: If your template includes `{{calendarEventId}}` or `{{calendarEventStart}}` in the frontmatter, the plugin will use your template's frontmatter as-is. Otherwise, it will automatically prepend frontmatter with these values for deduplication.

### Example Template

```markdown
# {{title}}

**Date**: {{date}}
**Time**: {{startTime}} - {{endTime}}

## Attendees
{{attendees}}

## Notes

## Action Items
- [ ] 
```

### Conflict Policy

Choose how to handle conflicts when a note already exists:

- **Skip**: Do not create the note (default)
- **Overwrite**: Replace the existing note
- **Suffix**: Create with a numeric suffix (e.g., `Meeting (1).md`)

## Deduplication Logic

Each generated note includes frontmatter with stable identifiers:

```yaml
---
calendarEventId: abc123xyz
calendarEventStart: 2024-03-15T09:00:00Z
---
```

Before creating a note, the plugin scans the target folder for existing notes with matching `calendarEventId` and `calendarEventStart`. This ensures:

- Recurring events are properly distinguished (same event ID but different start times)
- Re-running the plugin won't create duplicate notes
- Notes can be renamed without breaking deduplication

## Attendee Formatting

Attendees are rendered as Obsidian wiki links:

- Uses the attendee's display name when available
- Falls back to the email local-part (before @) if no display name
- Excludes the event organizer from the list
- Format: `[[Alice]], [[Bob]], [[Carol]]`

## Known Limitations

- **OAuth flow**: Currently requires manually copying the authorization code. A future update may add a local redirect server.
- **Read-only**: The plugin only reads calendar data; it cannot create or modify events.
- **Desktop only**: OAuth flow requires a browser, which may not work on mobile.

## Development

### Install dependencies

```bash
npm install
```

### Build for development

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Run tests

```bash
npm test
```

## Manual Installation

1. Build the plugin (`npm run build`)
2. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/calendar-to-notes/` folder
3. Reload Obsidian
4. Enable the plugin in Settings → Community plugins

## License

0-BSD
