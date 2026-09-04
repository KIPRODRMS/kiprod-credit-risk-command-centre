KIPROD COMMAND CENTRE — ONE SYSTEM FIX
=====================================

PURPOSE
-------
This package fixes the connected risk-logic inconsistencies found in the
full Command Centre audit. It is deliberately one system patch rather than
another isolated page repair.

WHAT IT FIXES
-------------
1. Creates lib/riskPolicy.ts as the single source of truth for:
   - Green = 0 DPD
   - Amber = 1–30 DPD
   - Red = 31–90 DPD
   - NPL = 91+ DPD
   - PAR30 = >30 DPD
   - PAR90 = >90 DPD
   - Watchlist = Amber + Red + NPL
   - overdue-action logic
   - high-exposure logic
   - escalation logic
   - new-action due-date logic

2. Fixes misleading PAR wording:
   - PAR30 is shown as 31+ DPD / more than 30 days past due.
   - PAR90 is shown as 91+ DPD / more than 90 days past due.

3. Fixes Board Report terminology:
   - raw arrears are "Total Arrears"
   - arrears/outstanding is "Arrears to Outstanding Ratio"
   - PAR remains reserved for the approved DPD exposure thresholds.
   - applies to both screen and downloaded Board PDF.

4. Fixes Watchlist membership:
   - Green accounts cannot enter the Watchlist merely because they are
     restructured or high exposure.
   - restructured/high-exposure remain overlays within the Watchlist.

5. Fixes Watchlist status labels so they match Execution Tracker statuses.

6. Removes the destructive "Regenerate from Portfolio" behavior.
   It becomes "Sync New Risk Accounts" and cannot overwrite existing actions.

7. Makes "Overdue" a derived condition rather than a manually selectable status.

8. Makes fallback-created actions use the same due-date and escalation policy
   as Portfolio Upload.

9. Makes Board Report and Board Oversight refresh clarification status from
   Supabase instead of relying indefinitely on a potentially stale local cache.

10. Clarifies Board Oversight:
    - Board-visible risks are unique matters.
    - trigger counters overlap and must not be added together.
    - "Last Report Generated" is corrected to "Reporting Period".

11. Adds stronger portfolio upload validation for negative numbers and
    non-integer days-in-arrears.

12. Extends AGENTS.md so future coding agents are explicitly prohibited from
    reintroducing these inconsistencies.

13. Adds:
      npm run verify:risk
    The build should not be pushed unless this verification passes.

IMPORTANT — NOT CHANGED
-----------------------
- No Supabase schema changes.
- No environment-variable changes.
- No authentication rebuild.
- No institution master-data redesign.
- No change to the frozen KIPROD PAR thresholds.
- No hard-coding of 60, 17, 10 or any other live metric.

CURRENT VALIDATION PORTFOLIO EXPECTATION
----------------------------------------
For the approved 200-account test portfolio:
- Green: 140
- Amber: 30
- Red: 20
- NPL: 10
- Watchlist: 60
- PAR30 accounts: 30
- PAR30 exposure: about 14.6% / KES 16,967,115
- PAR90 accounts: 10
- PAR90 exposure: about 4.9% / KES 5,683,205

Open Actions and Overdue Actions are NOT the same:
- Open = unresolved action.
- Overdue = due date has passed and action is not closed.
So the number overdue changes with time and action updates; it is never hard-coded.

Board-visible risks are a DEDUPLICATED governance subset. The same account can
be NPL + high exposure + overdue + clarification at the same time, so those
trigger counts must not be summed.

HOW TO APPLY
------------
1. Extract "KIPROD One System Fix" INSIDE your Command Centre project folder.

2. In PowerShell, from the project root, run:

   node ".\KIPROD One System Fix\apply-kiprod-system-fix.mjs"

3. Then run:

   npm run verify:risk
   npm run build

4. If BOTH are green, inspect the live pages locally before push:

   npm run dev

5. Only then push the changed files.

BACKUP
------
The installer automatically creates a timestamped backup folder in your
project root before modifying each existing file.

If the installer sees source code different from the audited version, it
stops rather than guessing.
