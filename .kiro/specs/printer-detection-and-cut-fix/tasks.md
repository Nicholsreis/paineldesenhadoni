# Implementation Plan

## Bug 1: Detecção de Papel Não Funciona

- [x] 1. Write bug condition exploration test - Bug 1
  - **Property 1: Bug Condition** - Printer Detection Fails for USB Printers
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: printer states 'out-of-paper', 'offline', 'error' with user clicking service button
  - Test that when `checkPrinterWMI()` returns 'out-of-paper', 'offline', or 'error', the ServiceButton blocks printing and calls appropriate error handlers (from Bug Condition in design)
  - The test assertions should match the Expected Behavior Properties from design (Requirements 2.1, 2.2, 2.3, 2.5)
  - Mock `window.electronAPI.getPaperStatus()` to return 'ok' (simulating serial polling not working)
  - Mock `window.electronAPI.checkPrinterWMI()` to return problematic states
  - Verify that `printTicket()` is called even when printer is not ready (BUG)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Write preservation property tests - Bug 1 (BEFORE implementing fix)
  - **Property 2: Preservation** - Normal Printing Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (printer status 'ok', web mode, serial printers)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test 1: When `checkPrinterWMI()` returns 'ok', verify `printTicket()` is called normally
  - Test 2: When running in web mode (not Electron), verify printing works without printer checks
  - Test 3: When using serial printer with polling working, verify status events are sent
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

## Bug 2: Papel em Branco Após Impressão

- [ ] 3. Write bug condition exploration test - Bug 2
  - **Property 1: Bug Condition** - Blank Paper Ejected Before Cut
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: successful print on USB printer with cut command timing
  - Test that after successful print, `sendCutCommand()` is called with adequate timing and executes correctly (from Bug Condition in design)
  - The test assertions should match the Expected Behavior Properties from design (Requirements 2.6, 2.7, 2.8, 2.9)
  - Mock `printerPort.isOpen` as false (USB printer)
  - Mock successful print operation
  - Verify timing of `sendCutCommand()` call (currently 800ms)
  - Verify that cut command is sent via `copy /b` fallback
  - Verify that blank paper is ejected before cut (BUG)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.6, 1.7, 1.8, 1.9_

- [ ] 4. Write preservation property tests - Bug 2 (BEFORE implementing fix)
  - **Property 2: Preservation** - Print Success/Failure Handling Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (failed prints, serial printers, IPC responses)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test 1: When print fails, verify `paperStatus` is updated to 'out' and event is sent
  - Test 2: When using serial printer, verify cut command via serial port works correctly
  - Test 3: Verify IPC response format `{ success, errorType }` remains consistent
  - Test 4: Verify dynamic height calculation via `offsetHeight` works correctly
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.5, 3.6, 3.7, 3.8_

## Implementation

- [x] 5. Fix Bug 1: Detecção de Papel

  - [x] 5.1 Expose checkPrinterWMI via contextBridge in preload.js
    - Add `checkPrinterWMI: () => ipcRenderer.invoke('check-printer-wmi')` to `electronAPI` object in `contextBridge.exposeInMainWorld()`
    - Verify that the IPC handler `check-printer-wmi` exists in `main.js` (already implemented)
    - _Bug_Condition: isBugCondition1(input) where input.printerState IN ['out-of-paper', 'offline', 'error'] AND checkPrinterWMI_not_exposed_to_renderer()_
    - _Expected_Behavior: API SHALL be exposed and accessible from renderer process_
    - _Preservation: Other electronAPI methods remain unchanged_
    - _Requirements: 1.4, 2.4_

  - [x] 5.2 Add WMI check to ServiceButton in TotemModule.jsx
    - In `ServiceButton` component's `onClick` handler, before calling `generateTicket()`:
    - Check if `window.electronAPI?.checkPrinterWMI` exists (Electron mode)
    - If exists, call `await window.electronAPI.checkPrinterWMI()`
    - If status is 'out-of-paper', call `onPaperOut('out')` and return without printing
    - If status is 'offline' or 'error', call `onPrintError()` with appropriate status and return without printing
    - If status is 'ok', proceed with normal `generateTicket()` flow
    - _Bug_Condition: isBugCondition1(input) where ServiceButton_only_checks_getPaperStatus()_
    - _Expected_Behavior: ServiceButton SHALL call checkPrinterWMI() before printing and block if status is not 'ok'_
    - _Preservation: Normal printing flow when status is 'ok' remains unchanged_
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.5, 3.1, 3.2_

  - [x] 5.3 Add WMI check to inline ServiceButton in index.html
    - In `ServiceButton.handleClick()` function, replace current `getPaperStatus()` check with `checkPrinterWMI()` check
    - If `window.electronAPI?.checkPrinterWMI` exists, call it
    - Map status to callbacks: 'out-of-paper' → `onPaperOut('out')`, 'offline'/'error' → `onPrintError()`
    - If status is 'ok', proceed with normal printing flow
    - _Bug_Condition: isBugCondition1(input) where inline ServiceButton uses inadequate verification_
    - _Expected_Behavior: Inline ServiceButton SHALL use WMI check for printer status_
    - _Preservation: Web mode (non-Electron) continues to work without printer checks_
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.5, 3.3_

  - [x] 5.4 Verify bug condition exploration test now passes - Bug 1
    - **Property 1: Expected Behavior** - Printer Detection Works via WMI
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify that when `checkPrinterWMI()` returns problematic states, printing is blocked
    - Verify that appropriate error handlers are called
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 5.5 Verify preservation tests still pass - Bug 1
    - **Property 2: Preservation** - Normal Printing Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm that normal printing when status is 'ok' still works
    - Confirm that web mode still works without printer checks
    - Confirm that serial printer polling still works

- [x] 6. Fix Bug 2: Papel em Branco Após Impressão

  - [x] 6.1 Increase cut command delay in main.js
    - In `ipcMain.handle('print-ticket', ...)` handler, locate the `setTimeout(() => sendCutCommand(), 800)` call
    - Change delay from 800ms to 1200ms to ensure content is fully printed before cut
    - Add comment explaining the timing requirement for USB printers
    - _Bug_Condition: isBugCondition2(input) where cutCommand_timing_inadequate()_
    - _Expected_Behavior: Cut command SHALL be sent with adequate timing (1200ms) after print_
    - _Preservation: Print success/failure handling remains unchanged_
    - _Requirements: 1.7, 1.9, 2.6, 2.9, 3.5_

  - [x] 6.2 Improve USB port detection and logging in sendCutCommand()
    - In `sendCutCommand()` function, add detailed logging before and after wmic call
    - Log detected USB port name (e.g., "USB001")
    - Log the full `copy /b` command being executed
    - Capture and log stderr from `exec()` to detect failures
    - Add error handling for wmic failures
    - _Bug_Condition: isBugCondition2(input) where cutCommand_not_executed_by_printer()_
    - _Expected_Behavior: Cut command execution SHALL be logged and errors SHALL be captured_
    - _Preservation: Existing copy /b method for USB/LPT ports remains unchanged_
    - _Requirements: 1.8, 2.7, 2.8, 3.7_

  - [x] 6.3 Add retry mechanism for cut command
    - In `sendCutCommand()`, wrap the `copy /b` execution in a retry loop
    - If first attempt fails (stderr contains error), wait 500ms and retry
    - Maximum 2 attempts total
    - Log each retry attempt
    - _Bug_Condition: isBugCondition2(input) where copy_b_command_fails_silently()_
    - _Expected_Behavior: Cut command SHALL retry on failure to improve reliability_
    - _Preservation: Serial port cut command method remains unchanged_
    - _Requirements: 1.8, 2.7, 2.8, 3.6_

  - [x] 6.4 Verify bug condition exploration test now passes - Bug 2
    - **Property 1: Expected Behavior** - Paper Cut Without Blank Ejection
    - **IMPORTANT**: Re-run the SAME test from task 3 - do NOT write a new test
    - The test from task 3 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 3
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify that cut command is sent with 1200ms delay
    - Verify that cut command is executed correctly via `copy /b`
    - _Requirements: 2.6, 2.7, 2.8, 2.9_

  - [x] 6.5 Verify preservation tests still pass - Bug 2
    - **Property 2: Preservation** - Print Success/Failure Handling Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 4 - do NOT write new tests
    - Run preservation property tests from step 4
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm that print failure handling still works
    - Confirm that serial printer cut command still works
    - Confirm that IPC response format is unchanged

- [x] 7. Checkpoint - Ensure all tests pass
  - Run all exploration tests (tasks 1 and 3) - should now PASS
  - Run all preservation tests (tasks 2 and 4) - should still PASS
  - Run existing test suite to ensure no regressions
  - Verify both bugs are fixed in manual testing if possible
  - Ask the user if questions arise
