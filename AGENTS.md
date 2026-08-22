<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# KIPROD COMMAND CENTRE — LOCKED RISK POLICY

The following risk logic is an approved product rule and MUST NOT be changed, reinterpreted, normalised, or "corrected" unless KIPROD explicitly approves a policy change.

## Days in Arrears Classification

- Green = 0 days in arrears
- Amber = 1–30 days in arrears
- Red = 31–90 days in arrears
- NPL = 91+ days in arrears

## Portfolio at Risk

- PAR30 = outstanding exposure where days_in_arrears > 30
- PAR90 = outstanding exposure where days_in_arrears > 90

Do NOT change these conditions to >= 30 or >= 90.

## Watchlist

Watchlist = Amber + Red + NPL.

For the approved 200-account validation portfolio the reference position is:

- Green: 140
- Amber: 30
- Red: 20
- NPL: 10
- Watchlist: 60
- PAR30 accounts: 30
- PAR30 exposure: approximately 14.6%
- PAR90 accounts: 10
- PAR90 exposure: approximately 4.9%

These reference figures are regression checks, not hard-coded production values.

## Execution Accountability

A portfolio refresh or re-upload MUST NEVER destroy or reset existing management accountability.

Existing actions must preserve:

- action ID
- assigned owner
- due date
- status
- action required
- escalation level
- Board visibility
- notes
- audit/accountability history

A portfolio refresh may create actions for genuinely new risk accounts, but must not recreate or overwrite existing actions merely because the portfolio was uploaded again.

## Formula Integrity

Executive Cockpit, Portfolio Health, Early Warning, Watchlist, Execution Tracker, Board Report, downloaded Board PDF and Board Oversight must use the same approved risk definitions.

Before changing any risk calculation, first verify its effect across every dependent module.

No risk formula change may be made merely to make a displayed number appear more intuitive.
