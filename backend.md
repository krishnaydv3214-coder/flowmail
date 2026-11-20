# Backend Requirements

## Authentication

User login via Clerk.

## Corsair Gmail

Features:

* Fetch emails
* Send email
* Draft email
* Search email
* Thread management

## Corsair Calendar

Features:

* Read events
* Create events
* Update events
* Send invitations

## Webhooks

Email Events:

* New email
* Email update

Calendar Events:

* New invite
* Event updated
* Event cancelled

## AI Services

### Priority Classification

Input:

* Subject
* Body

Output:

* Critical
* Important
* Normal
* Low

### Action Extraction

Detect:

* Meeting requests
* Deadlines
* Follow-ups

### MCP Agent

Accepts natural language.

Examples:

"Email John"

"Schedule call tomorrow"

"Reply to latest thread"

## Search Service

### Traditional Search

Corsair Search API

### Semantic Search

pgvector embeddings

Returns:

* Relevant emails
* Relevant meetings
* Similar conversations

## API Endpoints

/api/inbox

/api/thread/[id]

/api/send

/api/calendar

/api/events

/api/search

/api/chat

/api/webhooks/gmail

/api/webhooks/calendar
