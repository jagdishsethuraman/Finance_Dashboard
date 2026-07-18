# Task 2 Report: Assets API and Real-Time Yahoo Finance Sync

## What was implemented
- Added assets management REST API endpoints to `/Users/ragavij/Documents/Developer/finance-dashboard/backend/server.js`:
  - `GET /api/assets` - Retrieves list of all assets from the database.
  - `POST /api/assets` - Creates or updates assets. Defaults `current_price` to `avg_buy_price` on creation.
  - `DELETE /api/assets/:id` - Removes an asset.
- Upgraded `yahoo-finance2` package to `^4.0.0` in `backend/package.json` to leverage improved crumb/authentication error retries and modern User-Agent handling.
- Added `POST /api/portfolio/sync` endpoint matching the spec:
  - Connects to SQLite database to find assets with tickers.
  - Fetches real-time price updates:
    - If asset type is `mutual_fund` and ticker is numeric, queries `https://api.mfapi.in/mf/${ticker}` for latest NAV.
    - Otherwise, queries Yahoo Finance using instantiated `YahooFinanceClass` with suppressed survey notices.
  - Safely handles sync errors individually per ticker via `try/catch` block.
  - Updates database records with `current_price` and `last_updated`.

## What was tested and test results
- Created automated integration test script `backend/validate_task2.js` that:
  - Spawns backend server.
  - Tests asset creation (POST).
  - Tests asset listing (GET).
  - Tests real-time sync with Yahoo Finance.
  - Tests asset updating (POST with id).
  - Tests asset deletion (DELETE).
- Output from running `node validate_task2.js`:
  ```
  Starting validation server...
  Backend server running on http://localhost:5001
  Testing POST /api/assets...
  POST /api/assets success!
  Testing GET /api/assets...
  GET /api/assets success!
  Testing POST /api/portfolio/sync...
  POST /api/portfolio/sync success! New price: 380.84
  Testing UPDATE via POST...
  UPDATE via POST success!
  Testing DELETE /api/assets/:id...
  DELETE /api/assets/:id success!
  ALL TESTS PASSED SUCCESSFULLY!
  Stopping validation server...
  ```
- Tested mutual fund synchronization manually with real mutual fund ticker `119598` and verified it successfully pulls the latest NAV from mfapi.in.

## Files changed
- `backend/package.json`
- `backend/server.js`
- `backend/validate_task2.js`
- `package-lock.json`

## Self-review findings
- Used `yahoo-finance2` class instantiation constructor pattern required by v3/v4 of the library to avoid import errors.
- Handled network errors per asset so that a failure in one ticker does not halt the entire synchronization process.
- Native `fetch` is used since Node v26 is present.

## Issues/Concerns
- Free public API `mfapi.in` is subject to transient connection timeouts (experienced one during validation, resolved on retry). The error handling handles this gracefully by log and bypass.

## Task 2 Fixes and Refinements (2026-07-18)

### Validation Fixes (`POST /api/assets`)
- Added body validation checks for the required fields `name` and `type` (checking presence, type, and trimming).
- If any required field is missing or invalid, the API now returns `400 Bad Request` with an informative error message instead of letting SQLite trigger a constraint error and crashing with `500 Internal Server Error`.
- Updated `backend/validate_task2.js` to include negative validation tests checking that invalid body inputs correctly return `400`.

### Synchronization Fixes (`POST /api/portfolio/sync`)
- Refactored the synchronization logic to verify that the price from the API (Yahoo Finance or MF API) was successfully fetched and resolved before updating the asset status.
- Now, `last_updated` is only updated and the asset is only added to the `updated` array if the price fetch was successful.

### Verification and Testing
- Executed `node backend/validate_task2.js` (from `backend/` directory) and verified all tests pass, including the new validation test cases.
- Committed the fixes with the commit message `fix(backend): validate assets input and fix portfolio sync behavior`.

## Task 2 Second Round of Fixes (2026-07-18)

### Database constraint crash on POST
- Added body validation checks to `POST /api/assets` for `units` and `avg_buy_price` to verify they are present and are valid numbers.
- If they are missing, null, or not numbers (i.e. `isNaN` or not `typeof number`), the server now returns `400 Bad Request` instead of triggering a SQLite database error.
- Added negative validation tests in `backend/validate_task2.js` for missing or invalid `units` and `avg_buy_price` fields.

### Sync price reset on update
- Fixed `POST /api/assets` when performing updates (with a provided `id`) to fetch the existing asset first from SQLite.
- If `current_price` is not provided in the request body, the server keeps the existing `current_price` from the database instead of defaulting/resetting it to `avg_buy_price`.
- Added test cases in `backend/validate_task2.js` to verify that updates without `current_price` retain the existing `current_price`.

### Verification and Testing
- Ran validation tests with `node validate_task2.js` from the `backend/` directory. All tests passed successfully.

