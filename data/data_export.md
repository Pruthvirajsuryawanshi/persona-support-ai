# Data Export

You can export all data tied to your account at any time.

## Requesting an export
Settings → Privacy → Request export. Select the workspaces and date range. Exports are produced as a ZIP containing JSON files plus any attachments.

## Delivery
Exports under 500 MB are emailed as a signed download link valid for 7 days. Larger exports are made available in Settings → Privacy → Exports for 30 days.

## Format
- accounts.json
- projects.json
- messages.jsonl (one event per line)
- attachments/ (original filenames preserved)

## Frequency
You can request one export per 24-hour period. Enterprise plans can configure scheduled weekly exports to S3 or GCS.
