#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Add PIN-based login for Kepala TU & Kepala Puskesmas roles (PIN changeable), make Petugas/Pelaksana
  unable to edit pegawai, and add a schedule matrix (per-date) + synchronization/conflict view between activities.

backend:
  - task: "PIN auth: verify-pin and change-pin endpoints"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Added POST /api/auth/verify-pin {role,pin} (returns ok, 401 on wrong PIN) and POST /api/auth/change-pin {role,pin_lama,pin_baru}. PINs stored in Mongo app_settings collection (lazy-seeded defaults: Kepala TU=1234, Kepala Puskesmas=4321). change-pin validates old pin (401) and requires >=4 digit numeric new pin (400)."
        -working: true
        -agent: "testing"
        -comment: "Tested all PIN auth endpoints successfully. All 12 test cases passed: (1) Verify correct PINs for both Kepala TU (1234) and Kepala Puskesmas (4321) - returns 200 with ok:true. (2) Wrong PIN correctly returns 401 with 'PIN salah'. (3) Non-PIN roles (Petugas/Staf) return ok:true without PIN check. (4) Change-pin rejects wrong old PIN with 401. (5) Change-pin rejects invalid new PIN (non-numeric or <4 digits) with 400. (6) Change-pin successfully updates PIN and new PIN works while old PIN is rejected. (7) PIN successfully restored to default 1234 after testing. All endpoints working correctly."
  - task: "Schedule matrix endpoint /api/jadwal/matrix"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "GET /api/jadwal/matrix?year=&month= returns dates[], rows[] (pegawai x tanggal with cells), kegiatan[], and conflicts[] (pegawai double-booked same date). Excludes rejected schedules."
        -working: true
        -agent: "testing"
        -comment: "Tested matrix endpoint successfully. All 9 test cases passed: (1) GET /api/jadwal/matrix?year=2026&month=9 returns 200 with correct structure containing all required keys: year, month, dates, rows, kegiatan, conflicts, total_pegawai_terjadwal, total_kegiatan. (2) Dates array has correct length (30 days for September). (3) Date objects have correct structure with iso, day, weekday, is_weekend fields. (4) Rows array contains pegawai with cells structure. (5) Kegiatan and conflicts are arrays. (6) Totals are integers. (7) Invalid month values (0, 13) correctly return 400. Endpoint working correctly."

frontend:
  - task: "PIN login on role switch + Ganti PIN + read-only Pegawai + Matriks page"
    implemented: true
    working: "NA"
    file: "frontend/src/components/Layout.jsx, frontend/src/pages/Pegawai.jsx, frontend/src/pages/Matriks.jsx, frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Frontend implemented; will be tested only after user approval."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: "Please test the two new backend features only: (1) PIN auth verify-pin/change-pin with default PINs Kepala TU=1234 and Kepala Puskesmas=4321 — verify correct pin returns ok, wrong pin returns 401, change-pin rejects wrong old pin (401) and non-numeric/<4digit new pin (400), and after change the new pin verifies. IMPORTANT: after testing change-pin, restore PINs back to defaults. (2) GET /api/jadwal/matrix?year=2026&month=9 returns dates/rows/kegiatan/conflicts structure. Use REACT_APP_BACKEND_URL for base."
    -agent: "testing"
    -message: "Backend testing completed successfully. All 21 test cases passed (12 PIN auth tests + 9 matrix tests). Both features are working correctly: (1) PIN authentication endpoints handle all scenarios properly - correct/wrong PINs, PIN changes, validation, and non-PIN roles. PINs restored to defaults after testing. (2) Matrix endpoint returns correct structure with all required fields and proper validation. No issues found. Both backend tasks marked as working:true and needs_retesting:false."