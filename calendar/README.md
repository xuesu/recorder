# Project Calendar — Data Model Understanding

## Myevents

```sql
CREATE TABLE "myevents" (
    "id"          INTEGER PRIMARY KEY AUTOINCREMENT,
    "name"        TEXT NOT NULL,
    "details"     TEXT NOT NULL DEFAULT "",
    "is_finished" TEXT NOT NULL DEFAULT "false",
    "score"       INTEGER NOT NULL DEFAULT 0,
    "start_date"  TEXT,
    "end_date"    TEXT,
    "etype"       TEXT NOT NULL DEFAULT "PLAN",
    "event_length"INTEGER,
    "event_pid"   INTEGER,
    "rec_pattern" TEXT,
    "rec_type"    TEXT
)
```

### etype

Four values: `PLAN`, `FACT`, `SPENT`, `FAILED_PLAN`.

- `FACT`, `SPENT`, `FAILED_PLAN` — all represent things that **already happened**. They differ only in color/display and in how they score points. They are not temporally distinct from each other.
- `PLAN` — the only "pending/future" type. Has three conceptual sub-kinds (not stored anywhere as an explicit field — purely conceptual/behavioral):
  - **a) Long-term recurring plan** — always backed by an event series (`rec_pattern`/`rec_type` non-empty), even if it's only meant to occur once, ever.
  - **b) One-off / standalone plan** — may be either an event series, or a plain occurrence row with no series parent. Can later convert to `FACT`/`SPENT`/`FAILED_PLAN` via an "edit this occurrence" action.
  - **c) Virtual occurrence** — never a real row. Computed on the fly purely for calendar display, to avoid pre-materializing every future instance of a series. Becomes a real row only if a user edits that specific instance (attribute change triggers materialization; otherwise it stays virtual).

### Event series vs. event occurrence

- A **series** is a row where `event_pid IS NULL` and `rec_pattern`/`rec_type` are non-empty.
- An **occurrence** is a row where `event_pid` points to its parent series' `id`. Occurrences are only materialized in the DB when they've been edited away from what the series would auto-generate (see "virtual" above).
- `rec_pattern` / `rec_type` example: `week_1___6#15` → weekly recurrence, every 1 week, on day 6, repeated 15 times total. Time-of-day is **not** encoded in `rec_type` — it comes from the series' `start_date`.

#### Virtual occurrence generation
Virtual occurrences exist only to render in the HTML calendar and to save DB storage; they carry no `id` of their own until materialized.



### `event_pid` — foreign key semantics

`event_pid` is a self-referencing foreign key on `myevents.id`:

- **`NULL`** — the row has no parent. This covers **both**:
  - a **series** row (the root of a recurrence, `rec_pattern`/`rec_type` non-empty), and
  - a **standalone occurrence with no series** (a plain one-off row, `rec_pattern`/`rec_type` empty).
- **Non-NULL** — the row is a **materialized occurrence belonging to a series**. `event_pid` = the `id` of that parent series row. 


### `start_date` / `end_date` semantics

- **On a series:** `start_date` = the exact datetime (date + hour + minute) of the *first* occurrence — full precision, not date-only. `end_date` = when the recurrence stops firing; may be a real date or a far-future sentinel (e.g. `9999-01-01 00:00`) meaning open-ended/no defined end.
- **On a standalone (non-series) occurrence:** `start_date` / `end_date` presumably behave as normal literal start/end for that single event (not yet fully confirmed for edge cases).

- it has 2 formats: 
    - floating time: "YYYY-MM-DD HH:mm"
    - zoned time: "YYYY-MM-DDTHH:mm:ss±HH:mm", ISO 8601

### `event_length` — overloaded field (key fragility point)

`event_length` means **two different things** depending on row type, distinguished only by whether `event_pid` is null:

- **On a series row** (`event_pid IS NULL`): `event_length` = duration in **seconds** of a single occurrence (how long the event lasts). Unrelated to recurrence spacing — that's `rec_pattern`/`rec_type`'s job.
- **On a child occurrence row** (`event_pid IS NOT NULL`): `event_length` is repurposed to store the **canonical/identity timestamp** that this real row corresponds to in the series' recurrence sequence — i.e., it acts as a matching key ("this real row replaces virtual slot #n"). This value is *intended* to line up with what the series would generate for that slot, but **may drift from the row's own `start_date`** — and this drift is suspected to be timezone-related. This is the likely locus of the reported timezone bug.

### RFC 5545
RFC 5545 is the IETF standard that defines the iCalendar data format — the format behind `.ics` files used by Google Calendar, Outlook, Apple Calendar, etc. It standardizes how calendar data (events, to-dos, journal entries, free/busy info) is represented as text so different calendar systems can exchange data with each other.

- Floating time — a wall-clock reading with no attached timezone at all. "7:00 AM" that means "whatever 7:00 AM looks like on my clock right now, wherever I physically am." This is exactly your "wake up in the morning, sleep at night regardless of US-East or EU" requirement. It is not "UTC minus an offset I forgot to store" — it's a value that was never anchored to a real-world instant in the first place, by design.
- Zoned time — a wall-clock reading plus an explicit IANA timezone (e.g. America/New_York). This represents a real moment: "call with someone at 3pm their time" or anything tied to an external commitment. This is the only case where you actually need timezone math, DST handling, etc.
- Absolute instant (true UTC) — a fixed point in universal time, timezone-agnostic by nature. Useful for things like "exactly when did this FACT get logged" if you ever want elapsed-time analytics across your own travel.

## mynotes

## mynotices

## memquiz

## dhtmlx settigns
- `multi_day`: true
    - Enables rendering of multi-day events in Day/Week views. Events spanning multiple days get a dedicated area at the top, rather than being squeezed into a single column or only showing on the first day.
- `auto_end_date`: true
    - When you change the start date/time in the lightbox, the end date/time is automatically recalculated based on event_duration (set elsewhere). Saves you from manually adjusting end times.
- `details_on_create`: true
    - Opening the full lightbox (event form) immediately when creating a new event (via drag or dblclick). When false, only an inline text editor appears.
- `details_on_dblclick`: true
    - Opening the full lightbox when double-clicking an existing event. When false, double-click enters inline edit mode instead.
- `occurrence_timestamp_in_utc`: true
    - Recurring event occurrences are identified using UTC timestamps (Date.UTC) rather than local time. Makes recurring events behave consistently regardless of the user's timezone offset.
- `include_end_by`: true
    - Makes the "End by" date in the recurring event form inclusive — the event includes that final day. When false, the end date is exclusive (last occurrence is the day before).
- `repeat_precise`: true
   - Prevents including past days in weekly/monthly recurrence patterns. Example: creating "weekly on Monday" starting on a Wednesday — with true, it finds the next Monday; with false, it snaps to the start of the current week and may include past dates.
- `scheduler.locale.labels.section_isfinished` = "OK"
    - Customizes the label of a lightbox section (the one with map_to: "is_finished" and type: "checkbox" in your lightbox config) to display "OK" instead of whatever the default label would be.

## update

```
npm outdated
npm update
npm audit fix --force
npx npm-check-updates -u
npm install
cd backend
npm outdated
npm update
npm audit fix --force
npx npm-check-updates -u
npm install
cd calendar/codebase/sources/less
npm outdated
npm update
npm audit fix --force
npx npm-check-updates -u
npm install
```
