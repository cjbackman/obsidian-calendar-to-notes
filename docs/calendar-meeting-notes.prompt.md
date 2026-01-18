Prompt for the agent: Build “Calendar Meeting Notes” Obsidian plugin

You are an engineering agent tasked with building an Obsidian plugin named Calendar Meeting Notes.

Follow TDD throughout. Repo standards and workflow constraints are defined in AGENTS.md—adhere to them (tooling, structure, testing conventions, CI expectations).

⸻

Objective

Implement an Obsidian plugin that allows a user to right-click a folder in Obsidian’s File Explorer and choose:

Create meeting notes from Google Calendar…

The plugin fetches calendar events from Google Calendar for a selected time range (most commonly “Current day”), displays them in a selection UI, and generates one note per selected event in the right-clicked folder using a template stored as a vault note.

⸻

Fixed product decisions (do not reinterpret)
	•	Auth: Google OAuth (not API key)
	•	Calendar selection: User must be able to select which calendar to fetch from
	•	Template source: Path to an existing markdown note in the vault
	•	Target folder: Always the folder that was right-clicked
	•	Filename: YYYY-MM-DD - <title>.md (no time)
	•	Filtering: Cancelled events must be hidden
	•	Free/busy: Ignore
	•	Attendees: Must be rendered as Obsidian wiki links
	•	Frontmatter: Only stable, machine-relevant identifiers

⸻

User experience

Entry point
	•	Add a folder context menu item in File Explorer:
	•	Create meeting notes from Google Calendar…

Flow
	1.	Modal opens with:
	•	Time range selector:
	•	Current day (default)
	•	Custom range (start datetime, end datetime)
	•	Calendar selector (dropdown of accessible calendars)
	•	Button: Fetch events
	2.	After fetching:
	•	Show a list of events (cancelled excluded)
	•	Each row shows:
	•	title
	•	start–end time (local timezone)
	•	Checkbox per event + Select all / none
	•	Button: Generate notes (disabled until ≥1 selected)
	3.	On generate:
	•	Create one markdown note per selected event
	•	Use the configured template note content
	•	Show a summary: created N, skipped M (with reasons)

⸻

Settings (must-have)

Google OAuth
	•	Fields for OAuth configuration:
	•	Client ID
	•	Client Secret (if required by chosen flow)
	•	Buttons:
	•	Connect to Google
	•	Disconnect
	•	Tokens must be stored using standard Obsidian plugin persistence (this.saveData()).
	•	Token refresh must be handled automatically.

Defaults
	•	Default time range preset: Current day
	•	Default calendar: last selected
	•	Template note path picker (must validate file exists)
	•	Conflict policy:
	•	Skip if exists (default)
	•	Overwrite
	•	Create with suffix (1), (2), …

⸻

Template requirements

The template is read from a vault markdown file. Variable substitution must support:
	•	{{title}}
	•	{{date}} (YYYY-MM-DD, local timezone)
	•	{{startTime}} (HH:mm)
	•	{{endTime}} (HH:mm)
	•	{{attendees}}

Missing values must resolve to an empty string.

⸻

Attendees (must-have, explicit)

Attendees must be rendered as Obsidian wiki links.

Rules:
	•	Use attendee display name when available
	•	If no display name exists, fall back to email local-part
	•	Do not include the organizer twice
	•	Output format must be a comma-separated list:

[[Attendee A]], [[Attendee B]], [[Attendee C]]

The {{attendees}} template variable must always resolve to this format.

⸻

Deduplication and idempotency (must-have)

Each generated note must include frontmatter with stable identifiers:

calendarEventId: <id>
calendarEventStart: <iso-datetime>

Before writing:
	•	Scan the target folder for notes with matching (calendarEventId, calendarEventStart)
	•	Apply conflict policy (default: skip)

Rationale: recurring events reuse eventId; start time is required to uniquely identify instances.

⸻

Google Calendar API behavior
	•	Fetch events within selected time range
	•	Handle:
	•	timed events
	•	all-day events
	•	recurring events (instances acceptable; document behavior)
	•	Respect local timezone for:
	•	“Current day” calculation
	•	{{date}} and filename prefix
	•	Exclude cancelled events
	•	List accessible calendars for selection

⸻

Filename rules (must-have)

Filename format:

YYYY-MM-DD - <sanitized title>.md

Sanitization must:
	•	remove illegal filesystem characters
	•	normalize whitespace
	•	avoid empty titles (fallback to “Untitled meeting”)

Filename must not be used for identity or deduplication.

⸻

Architecture guidance (recommended)

Keep core logic pure and testable:
	•	OAuthService
	•	GoogleCalendarClient
	•	TimeRangeService
	•	EventMapper
	•	TemplateRenderer
	•	AttendeeFormatter
	•	FilenameGenerator
	•	FrontmatterService
	•	NoteWriter
	•	UI: folder context menu + modal(s)

⸻

TDD requirements

Write tests first for:
	1.	Current-day time range calculation (local timezone)
	2.	Google event → internal model mapping
	3.	Attendee formatting into Obsidian wiki links
	4.	Template rendering with missing fields
	5.	Filename generation and sanitization
	6.	Deduplication + conflict policy behavior

Mock:
	•	Google API
	•	Obsidian Vault and metadata cache

Integration tests where feasible per AGENTS.md.

⸻

Documentation deliverables

README.md must include:
	•	Google OAuth setup instructions
	•	Plugin configuration steps
	•	Calendar selection behavior
	•	Supported template variables
	•	Deduplication logic explanation
	•	Known limitations

No TODOs for core workflow. All tests must pass.
