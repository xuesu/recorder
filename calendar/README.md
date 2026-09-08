# Project Calendar — Data Model Understanding

## backend/data
In server end, our basic data CRUD logics are:

1. router.js:setRoutes distributes requests to storage class, including Storage/StorageNote/StorageNoteExt/StorageNotice...
    - get: getRelated requests, other readonly requests
        - events_stats:getStatistic
            - simply add up all scores and #tasks
    - post: insert, specfic update, other write-able requests
        - `notices_hide`:hideNoticeByID
            - set "date_hide" to that notice
        - expenses:refreshExpenses
            - await updateFailedPlan
                - set all PLAN events that have passed current time(based on the server local timezone if the event uses floating time)
                    - Important: must consider recurring plan, standalone plan(standalone occurence) and **virtual plan(virtual occurence)**.
            - fill score into SPENT events with "白噪" in its name without any scores
            - create daily SPENT events by reading account.csv
    - put: update
    - delete: delete
2. MySimpleStorage class and its descendants - storageXXX.js:
    - async function: storage's async function can solve the requests, take in parsed arguments from requests, return desired output and debug/error msgs and handle errors.
        - the common logic:
            - A: dispatch CRUD logics(e.g., `async update`) of Storage class
            - B: call "xxx_sql" sql wrappers of Storage class
                - do possible safety filters and checks
                - use dhtml2db to parse the html format data entries into database format
                - call sql wrappers `_xxx_sql`
                - if need to return updated entries, call db2dhtml logic to recover the data entries back to HTML payload format.
        - how to choose between two logics:
            - if a function is relatively similar to inner CRUD logics and only requires some pre/post procedures, select the CRUD method
            - if a function requires complex format transformation rather than simple dhtml2db, db2dhtml, then directly use sql wrappers to avoid multiple conversions.
        - Important: if there are multiple `_xxx_sql` used, be sure to use `await Promise.all([sql1(), sql2()])` or other await to make sure the order of sqls.
        - Important: be sure to handle the errors of sql, the most common solution is just report it directly to the client webpage or "console.log() then report an common error to the client webpage";
    - sql wrapper - `_xxx_sql`: return a Promise that call sqlite3's CRUD
        - Important: although sqlite3 seems to be synchronous, it is actually asynchronous. This function only puts the query into the inner job queue instead of waiting for and finishing the query.
        - Important: one sql wrapper can only contain one db functions(db.run(), db.exec(), db.get(), db.all(), db.each()), or it should be aligned with `db.serialize()`

## Myevents

```sql
CREATE TABLE IF NOT EXISTS "myevents" (
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
  - Long-term recurring plan — always backed by an event series (`rec_pattern`/`rec_type` non-empty), even if it's only meant to occur once, ever.
  - One-off / standalone plan — may be either an event series, or a plain occurrence row with no series parent. Can later convert to `FACT`/`SPENT`/`FAILED_PLAN` via an "edit this occurrence" action.
  - Virtual occurrence — never a real row. Computed on the fly purely for calendar display, to avoid pre-materializing every future instance of a series. Becomes a real row only if a user edits that specific instance (attribute change triggers materialization; otherwise it stays virtual).

### Event series vs. event occurrence

- A **series** is a row where `event_pid IS NULL` and `rec_pattern`/`rec_type` are non-empty.
- An **occurrence** is a row where `event_pid` points to its parent series' `id`. Occurrences are only materialized in the DB when they've been edited away from what the series would auto-generate (see "virtual" above).
- `rec_pattern` / `rec_type` example: `week_1___6#15` → weekly recurrence, every 1 week, on day 6, repeated 15 times total. Time-of-day is **not** encoded in `rec_type` — it comes from the series' `start_date`.

#### Event Series Repeat Type
- Daily/Weekly/Monthly/Yearly
    - Daily:
        - Every `<number>` day
        - Every workday
    - Weekly
        - Repeat after `<number>` next days
        - `<multi checkbox>` Monday/Tuesday/Wednesday/Thursday/Friday/Saturday/Sunday
    - Monthly
        - Repeat `<number>` day every `<number>` month
        - On `<number>` `<DayofWeek>` every `<number>` month
    - Yearly
        - Every `<number>` day `<Month>` month
        - On `<number>` `<DayofWeek>` of `<Month>`
- End Date
    - No end date
    - After `<number>` occurences
    - End By `<date>`


#### Virtual occurrence generation
Virtual occurrences exist only to render in the HTML calendar and to save DB storage; they carry no `id` of their own until materialized.

- `calendar\backend\data\scheduler_mini_recurring.js`: How to create virtual occurences based on recurring plan:
    - `scheduler.repeat_date`: basically add `ev.rec_pattern` from `from` to `to`, and push the new events into stack until `visibleCount >= maxCount`.
    - `scheduler._fix_daylight_saving_date`: targeting the days accross summer/winter timezone switches.
        - basically check if `start_date.getTimezoneOffset()` equals to `end_date.getTimezoneOffset()`
    - Important: getTimezoneOffset() is not just reading a single fixed offset from local timezone, it can handle the DST time offset.

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

### `rec_pattern` and `rec_type`
- `rec_type` = `rec_pattern` + 
    - `#no` if No end date
    - `#<number>` if After `<number>` occurences
    - `#` if End By `<date>`
- if No end date, then end_date = `9999-02-01 00:00`
- `rec_pattern` = day/week/month/year prefix + `_` + every part + on part + multi checkbox DayofWeek part
    - DayofWeek: usually: 1->Monday, 2->Tuesday..., 0->Sunday
    - day/week/month/year prefix: if Daily and with Every workday open, then `week_1___1,2,3,4,5` not started with day
    - every part: `<number>`: 1 if not specified
    - on part: on X(nd) Y(DayofWeek) -> `_Y_X`
        - without on part -> `_`
    - multi checkbox DayofWeek part: 
        - if no DayofWeek selected, then just `_`
        - else:
            - if workday: `_1,2,3,4,5`(set start by Sunday as true)
            - else `_` + selected DayofWeeks joined by `,`


examples:

|name|`start_date`|`end_date`|etype|`event_length`|`event_pid`|`rec_pattern`|`rec_type`|
|----|------------|----------|-----|--------------|-----------|-------------|----------|
|yearly_on_2wedofsep_after44|2026-09-01 12:45|2070-09-10 12:45|PLAN|900||year_1_3_2_|year_1_3_2_#44|
|yearly_every9daysep_noenddate|2026-09-09 12:30|9999-02-01 00:00|PLAN|900||year_1___|year_1___#no|
|monthly_on2wed_every3month_endby10102026|2026-09-09 11:15|2026-10-11 00:00|PLAN|900||month_3_3_2_|month_3_3_2_#|
|monthly_repeat9day_every3month_noenddate|2026-09-09 11:00|9999-02-01 00:00|PLAN|900||month_3___|month_3___#no|
|weekly_repeat6week_wedsun_after44occur|2026-09-09 10:15|2029-03-21 10:15|PLAN|900||week_6___0,3|week_6___0,3#44|
|weekly_repeat_every3weeks_monwedsat_noenddate|2026-09-09 10:00|9999-02-01 00:00|PLAN|900||week_3___1,3,6|week_3___1,3,6#no|
|daily_every3day_noenddate|2026-09-09 09:15|9999-02-01 00:00|PLAN|900||day_3___|day_3___#no|
|daily_everyworkday_endby10102026|2026-09-09 08:30|2026-10-11 00:00|PLAN|900||week_1___1,2,3,4,5|week_1___1,2,3,4,5#|
|daily_everyworkday_after44occ|2026-09-09 09:00|2026-11-10 09:00|PLAN|900||week_1___1,2,3,4,5|week_1___1,2,3,4,5#44|


### RFC 5545
RFC 5545 is the IETF standard that defines the iCalendar data format — the format behind `.ics` files used by Google Calendar, Outlook, Apple Calendar, etc. It standardizes how calendar data (events, to-dos, journal entries, free/busy info) is represented as text so different calendar systems can exchange data with each other.

- Floating time — a wall-clock reading with no attached timezone at all. "7:00 AM" that means "whatever 7:00 AM looks like on my clock right now, wherever I physically am." This is exactly your "wake up in the morning, sleep at night regardless of US-East or EU" requirement. It is not "UTC minus an offset I forgot to store" — it's a value that was never anchored to a real-world instant in the first place, by design.
- Zoned time — a wall-clock reading plus an explicit IANA timezone (e.g. America/New_York). This represents a real moment: "call with someone at 3pm their time" or anything tied to an external commitment. This is the only case where you actually need timezone math, DST handling, etc.
- Absolute instant (true UTC) — a fixed point in universal time, timezone-agnostic by nature. Useful for things like "exactly when did this FACT get logged" if you ever want elapsed-time analytics across your own travel.

#### Leap time
a solar year isn't exactly 365 days. It's about 365.2422 days. Those leftover ~0.2422 days per year accumulate, and if uncorrected, the calendar drifts against the seasons. The Gregorian calendar fixes this with a three-tier leap-year rule, not a simple "every 4 years":

- Every year divisible by 4 is a leap year (adds Feb 29). This over-corrects slightly (it assumes 365.25).
- Except years divisible by 100 are not leap years (removes a day). e.g. 1700, 1800, 1900 were common years.
- Except except years divisible by 400 are leap years again (adds it back). e.g. 2000 was a leap year; 2100 will not be.
- Leap seconds are trying to be abolished.

#### My defs
- Local time: time with the local server timezone offset. 
    - localTime.getTime() - localTime.getTimezoneOffset() * 60 * 1000 == absoluteTime.getTime()
        - where absoluteTime = date.UTC(localTime.getFullYear(), localTime.getMonth(), localTime.getDate(), localTime.getHours(), localTime.getMinutes(), localTime.getSeconds())
- Absolute time: 
    - timestamp == utc time stamp(without any timezone offset)
- Recurring Plan: with `rec_pattern`
- Standalone Occurence: have instance
- Virtual Occurence: computed on-the-fly


## mynotes

### StorageNoteExt
- Directly using mynotes to store data, but having special rules and prefixes like dailycheck, weekplan, monthplan...
- Supported via StorageNoteExt
- Right now we only support FloatingTime

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

## TODOs

