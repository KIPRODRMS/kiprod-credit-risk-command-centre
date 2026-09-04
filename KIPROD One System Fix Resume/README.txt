KIPROD ONE SYSTEM FIX — RESUME PACKAGE
======================================

Use this ONLY after the first "KIPROD One System Fix" installer stopped at:

  Board Report screen open/overdue explanation: expected exactly 1 match...

WHY THE BUILD THEN FAILED
-------------------------
The first installer created a timestamped backup INSIDE the Next.js project root.
TypeScript scanned that backup copy as application source, so the build error from:

  ../kiprod-system-fix-backup-.../app/action-tracker/page.tsx

was NOT an error in the live application file.

WHAT THIS RESUME DOES
---------------------
1. Moves all kiprod-system-fix-backup-* folders OUTSIDE the project root into:

   ..\KIPROD Command Centre Backups\

2. Verifies that the first installer completed the expected earlier changes.

3. Finishes the Board Report screen Open-vs-Overdue explanation.

4. Finishes Board Oversight consistency fixes.

5. Adds the remaining AGENTS.md locked interpretation rules.

6. Installs scripts/verify-risk-policy.mjs.

7. Adds:
     npm run verify:risk

8. The PowerShell runner now stops immediately if ANY stage fails.
   It will never print a false "complete" message after an earlier failure.

HOW TO RUN
----------
Extract this folder INSIDE the Command Centre project root.

From:

C:\Users\user\Documents\APPS\KIPROD\Credit-risk-command-centre

run:

powershell -ExecutionPolicy Bypass -File ".\KIPROD One System Fix Resume\RESUME AND TEST.ps1"

DO NOT rerun the original installer.

DO NOT push until the final output says:

FIX + VERIFICATION + BUILD ALL PASSED
