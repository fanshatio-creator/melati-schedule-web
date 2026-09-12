#!/usr/bin/env python3
"""
Backend API Test Suite for Izin (Leave Request) Feature
Tests all endpoints and edge cases for the Izin feature
"""

import requests
import sys
from datetime import datetime, timedelta

# Base URL from frontend/.env
BASE_URL = "https://melati-schedule-1.preview.emergentagent.com/api"

# Test results tracking
test_results = []
test_izin_id = None  # Store created izin ID for cleanup


def log_test(case_num, description, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"Case {case_num}: {status} - {description}"
    if details:
        result += f"\n    Details: {details}"
    test_results.append((passed, result))
    print(result)


def test_case_1_get_jenis_izin():
    """Case 1: GET /api/izin/jenis returns correct list"""
    print("\n=== Case 1: GET /api/izin/jenis ===")
    try:
        response = requests.get(f"{BASE_URL}/izin/jenis", timeout=10)
        
        if response.status_code != 200:
            log_test(1, "GET /api/izin/jenis", False, f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        expected = ["Sakit", "Izin", "Cuti", "Dinas Luar", "Lainnya"]
        
        if data == expected:
            log_test(1, "GET /api/izin/jenis returns correct list", True, f"List: {data}")
            return True
        else:
            log_test(1, "GET /api/izin/jenis", False, f"Expected {expected}, got {data}")
            return False
    except Exception as e:
        log_test(1, "GET /api/izin/jenis", False, f"Exception: {str(e)}")
        return False


def test_case_2_get_izin_list():
    """Case 2: GET /api/izin returns array with pegawai_nama"""
    print("\n=== Case 2: GET /api/izin ===")
    try:
        response = requests.get(f"{BASE_URL}/izin", timeout=10)
        
        if response.status_code != 200:
            log_test(2, "GET /api/izin", False, f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if not isinstance(data, list):
            log_test(2, "GET /api/izin", False, f"Expected array, got {type(data)}")
            return False
        
        # Check if items have pegawai_nama field (if list is not empty)
        if len(data) > 0:
            if "pegawai_nama" not in data[0]:
                log_test(2, "GET /api/izin", False, "Items missing pegawai_nama field")
                return False
        
        log_test(2, "GET /api/izin returns array with pegawai_nama", True, f"Found {len(data)} izin records")
        return True
    except Exception as e:
        log_test(2, "GET /api/izin", False, f"Exception: {str(e)}")
        return False


def get_real_pegawai_id():
    """Helper: Get a real pegawai ID from the database"""
    try:
        response = requests.get(f"{BASE_URL}/pegawai", timeout=10)
        if response.status_code == 200:
            pegawai_list = response.json()
            if len(pegawai_list) > 0:
                return pegawai_list[0]["id"]
        return None
    except Exception:
        return None


def test_case_3_create_valid_izin():
    """Case 3: POST /api/izin with valid data returns 200 with status=menunggu"""
    global test_izin_id
    print("\n=== Case 3: POST /api/izin (valid) ===")
    
    pegawai_id = get_real_pegawai_id()
    if not pegawai_id:
        log_test(3, "POST /api/izin (valid)", False, "Could not get real pegawai_id")
        return False
    
    try:
        payload = {
            "pegawai_id": pegawai_id,
            "jenis": "Izin",
            "tanggal_mulai": "2026-09-20",
            "tanggal_selesai": "2026-09-20",
            "alasan": "test izin for automated testing"
        }
        
        response = requests.post(f"{BASE_URL}/izin", json=payload, timeout=10)
        
        if response.status_code != 200:
            log_test(3, "POST /api/izin (valid)", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False
        
        data = response.json()
        
        # Check status is menunggu
        if data.get("status") != "menunggu":
            log_test(3, "POST /api/izin (valid)", False, f"Expected status='menunggu', got '{data.get('status')}'")
            return False
        
        # Store ID for later tests
        test_izin_id = data.get("id")
        if not test_izin_id:
            log_test(3, "POST /api/izin (valid)", False, "Response missing 'id' field")
            return False
        
        log_test(3, "POST /api/izin (valid) returns 200 with status=menunggu", True, f"Created izin ID: {test_izin_id}")
        return True
    except Exception as e:
        log_test(3, "POST /api/izin (valid)", False, f"Exception: {str(e)}")
        return False


def test_case_4_invalid_jenis():
    """Case 4: POST /api/izin with invalid jenis returns 400"""
    print("\n=== Case 4: POST /api/izin (invalid jenis) ===")
    
    pegawai_id = get_real_pegawai_id()
    if not pegawai_id:
        log_test(4, "POST /api/izin (invalid jenis)", False, "Could not get real pegawai_id")
        return False
    
    try:
        payload = {
            "pegawai_id": pegawai_id,
            "jenis": "Bolos",  # Invalid jenis
            "tanggal_mulai": "2026-09-20",
            "tanggal_selesai": "2026-09-20",
            "alasan": "test"
        }
        
        response = requests.post(f"{BASE_URL}/izin", json=payload, timeout=10)
        
        if response.status_code == 400:
            log_test(4, "POST /api/izin (invalid jenis) returns 400", True, f"Correctly rejected: {response.text}")
            return True
        else:
            log_test(4, "POST /api/izin (invalid jenis)", False, f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        log_test(4, "POST /api/izin (invalid jenis)", False, f"Exception: {str(e)}")
        return False


def test_case_5_invalid_date_range():
    """Case 5: POST /api/izin with tanggal_selesai < tanggal_mulai returns 400"""
    print("\n=== Case 5: POST /api/izin (invalid date range) ===")
    
    pegawai_id = get_real_pegawai_id()
    if not pegawai_id:
        log_test(5, "POST /api/izin (invalid date range)", False, "Could not get real pegawai_id")
        return False
    
    try:
        payload = {
            "pegawai_id": pegawai_id,
            "jenis": "Izin",
            "tanggal_mulai": "2026-09-25",
            "tanggal_selesai": "2026-09-20",  # Earlier than mulai
            "alasan": "test"
        }
        
        response = requests.post(f"{BASE_URL}/izin", json=payload, timeout=10)
        
        if response.status_code == 400:
            log_test(5, "POST /api/izin (invalid date range) returns 400", True, f"Correctly rejected: {response.text}")
            return True
        else:
            log_test(5, "POST /api/izin (invalid date range)", False, f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        log_test(5, "POST /api/izin (invalid date range)", False, f"Exception: {str(e)}")
        return False


def test_case_6_nonexistent_pegawai():
    """Case 6: POST /api/izin with non-existent pegawai_id returns 404"""
    print("\n=== Case 6: POST /api/izin (non-existent pegawai) ===")
    
    try:
        payload = {
            "pegawai_id": "nonexistent-id-12345",
            "jenis": "Izin",
            "tanggal_mulai": "2026-09-20",
            "tanggal_selesai": "2026-09-20",
            "alasan": "test"
        }
        
        response = requests.post(f"{BASE_URL}/izin", json=payload, timeout=10)
        
        if response.status_code == 404:
            log_test(6, "POST /api/izin (non-existent pegawai) returns 404", True, f"Correctly rejected: {response.text}")
            return True
        else:
            log_test(6, "POST /api/izin (non-existent pegawai)", False, f"Expected 404, got {response.status_code}")
            return False
    except Exception as e:
        log_test(6, "POST /api/izin (non-existent pegawai)", False, f"Exception: {str(e)}")
        return False


def test_case_7_approval_scenarios():
    """Case 7: POST /api/izin/{id}/approval - multiple scenarios"""
    global test_izin_id
    print("\n=== Case 7: POST /api/izin/{id}/approval ===")
    
    if not test_izin_id:
        log_test(7, "Approval tests", False, "No test_izin_id available from Case 3")
        return False
    
    all_passed = True
    
    # 7a: Valid approval with Kepala TU
    print("\n  7a: Valid approval with Kepala TU")
    try:
        payload = {
            "aksi": "setujui",
            "approver": "Kepala TU"
        }
        response = requests.post(f"{BASE_URL}/izin/{test_izin_id}/approval", json=payload, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "disetujui":
                log_test("7a", "Approval with Kepala TU -> status=disetujui", True, f"Status: {data.get('status')}")
            else:
                log_test("7a", "Approval with Kepala TU", False, f"Expected status='disetujui', got '{data.get('status')}'")
                all_passed = False
        else:
            log_test("7a", "Approval with Kepala TU", False, f"Expected 200, got {response.status_code}")
            all_passed = False
    except Exception as e:
        log_test("7a", "Approval with Kepala TU", False, f"Exception: {str(e)}")
        all_passed = False
    
    # 7b: Invalid approver (Petugas / Staf) should return 403
    print("\n  7b: Invalid approver (Petugas / Staf)")
    try:
        payload = {
            "aksi": "setujui",
            "approver": "Petugas / Staf"
        }
        response = requests.post(f"{BASE_URL}/izin/{test_izin_id}/approval", json=payload, timeout=10)
        
        if response.status_code == 403:
            log_test("7b", "Invalid approver returns 403", True, f"Correctly rejected: {response.text}")
        else:
            log_test("7b", "Invalid approver", False, f"Expected 403, got {response.status_code}")
            all_passed = False
    except Exception as e:
        log_test("7b", "Invalid approver", False, f"Exception: {str(e)}")
        all_passed = False
    
    # 7c: Invalid aksi should return 400
    print("\n  7c: Invalid aksi")
    try:
        payload = {
            "aksi": "xxx",
            "approver": "Kepala TU"
        }
        response = requests.post(f"{BASE_URL}/izin/{test_izin_id}/approval", json=payload, timeout=10)
        
        if response.status_code == 400:
            log_test("7c", "Invalid aksi returns 400", True, f"Correctly rejected: {response.text}")
        else:
            log_test("7c", "Invalid aksi", False, f"Expected 400, got {response.status_code}")
            all_passed = False
    except Exception as e:
        log_test("7c", "Invalid aksi", False, f"Exception: {str(e)}")
        all_passed = False
    
    # 7d: Non-existent ID should return 404
    print("\n  7d: Non-existent izin ID")
    try:
        payload = {
            "aksi": "setujui",
            "approver": "Kepala TU"
        }
        response = requests.post(f"{BASE_URL}/izin/nonexistent-id-12345/approval", json=payload, timeout=10)
        
        if response.status_code == 404:
            log_test("7d", "Non-existent ID returns 404", True, f"Correctly rejected: {response.text}")
        else:
            log_test("7d", "Non-existent ID", False, f"Expected 404, got {response.status_code}")
            all_passed = False
    except Exception as e:
        log_test("7d", "Non-existent ID", False, f"Exception: {str(e)}")
        all_passed = False
    
    return all_passed


def test_case_8_dashboard_integration():
    """Case 8: GET /api/dashboard integration with izin"""
    global test_izin_id
    print("\n=== Case 8: GET /api/dashboard integration ===")
    
    if not test_izin_id:
        log_test(8, "Dashboard integration", False, "No test_izin_id available")
        return False
    
    try:
        response = requests.get(f"{BASE_URL}/dashboard?tanggal=2026-09-20", timeout=10)
        
        if response.status_code != 200:
            log_test(8, "GET /api/dashboard", False, f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # Check for required integer keys
        if "izin" not in data or not isinstance(data["izin"], int):
            log_test(8, "Dashboard integration", False, "Missing or invalid 'izin' count")
            return False
        
        if "menunggu_izin" not in data or not isinstance(data["menunggu_izin"], int):
            log_test(8, "Dashboard integration", False, "Missing or invalid 'menunggu_izin' count")
            return False
        
        # Check ruangan structure
        if "ruangan" not in data or not isinstance(data["ruangan"], list):
            log_test(8, "Dashboard integration", False, "Missing or invalid 'ruangan' array")
            return False
        
        # Check that each room has an izin array
        for room in data["ruangan"]:
            if "izin" not in room or not isinstance(room["izin"], list):
                log_test(8, "Dashboard integration", False, f"Room {room.get('name', 'unknown')} missing 'izin' array")
                return False
        
        # Try to find our test pegawai in the izin bucket
        pegawai_found_in_izin = False
        pegawai_id = get_real_pegawai_id()
        
        for room in data["ruangan"]:
            for person in room["izin"]:
                if person.get("id") == pegawai_id:
                    pegawai_found_in_izin = True
                    # Verify they're NOT in di_dalam or di_luar
                    for p in room.get("di_dalam", []):
                        if p.get("id") == pegawai_id:
                            log_test(8, "Dashboard integration", False, "Pegawai found in both izin and di_dalam")
                            return False
                    for p in room.get("di_luar", []):
                        if p.get("id") == pegawai_id:
                            log_test(8, "Dashboard integration", False, "Pegawai found in both izin and di_luar")
                            return False
        
        details = f"izin={data['izin']}, menunggu_izin={data['menunggu_izin']}"
        if pegawai_found_in_izin:
            details += ", test pegawai correctly in izin bucket"
        
        log_test(8, "Dashboard integration with izin", True, details)
        return True
    except Exception as e:
        log_test(8, "Dashboard integration", False, f"Exception: {str(e)}")
        return False


def test_case_9_delete_izin():
    """Case 9: DELETE /api/izin/{id} cleanup"""
    global test_izin_id
    print("\n=== Case 9: DELETE /api/izin/{id} ===")
    
    if not test_izin_id:
        log_test(9, "DELETE izin", False, "No test_izin_id available")
        return False
    
    all_passed = True
    
    # 9a: First delete should succeed
    print("\n  9a: First DELETE (should succeed)")
    try:
        response = requests.delete(f"{BASE_URL}/izin/{test_izin_id}", timeout=10)
        
        if response.status_code == 200:
            log_test("9a", "DELETE /api/izin/{id} returns 200", True, "Successfully deleted")
        else:
            log_test("9a", "DELETE /api/izin/{id}", False, f"Expected 200, got {response.status_code}")
            all_passed = False
    except Exception as e:
        log_test("9a", "DELETE /api/izin/{id}", False, f"Exception: {str(e)}")
        all_passed = False
    
    # 9b: Second delete should return 404
    print("\n  9b: Second DELETE (should return 404)")
    try:
        response = requests.delete(f"{BASE_URL}/izin/{test_izin_id}", timeout=10)
        
        if response.status_code == 404:
            log_test("9b", "DELETE non-existent izin returns 404", True, "Correctly returned 404")
        else:
            log_test("9b", "DELETE non-existent izin", False, f"Expected 404, got {response.status_code}")
            all_passed = False
    except Exception as e:
        log_test("9b", "DELETE non-existent izin", False, f"Exception: {str(e)}")
        all_passed = False
    
    return all_passed


def main():
    """Run all test cases"""
    print("=" * 80)
    print("BACKEND API TEST SUITE - IZIN (LEAVE REQUEST) FEATURE")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test started at: {datetime.now().isoformat()}")
    print("=" * 80)
    
    # Run all test cases in order
    test_case_1_get_jenis_izin()
    test_case_2_get_izin_list()
    test_case_3_create_valid_izin()
    test_case_4_invalid_jenis()
    test_case_5_invalid_date_range()
    test_case_6_nonexistent_pegawai()
    test_case_7_approval_scenarios()
    test_case_8_dashboard_integration()
    test_case_9_delete_izin()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed_count = sum(1 for passed, _ in test_results if passed)
    total_count = len(test_results)
    
    print(f"\nTotal: {passed_count}/{total_count} tests passed\n")
    
    for passed, result in test_results:
        print(result)
    
    print("\n" + "=" * 80)
    
    if passed_count == total_count:
        print("✅ ALL TESTS PASSED")
        return 0
    else:
        print(f"❌ {total_count - passed_count} TEST(S) FAILED")
        return 1


if __name__ == "__main__":
    sys.exit(main())
