#!/usr/bin/env python3
"""
Backend API Test Suite for Izin Monthly Recap Endpoints
Tests the new /api/izin/rekap and /api/izin/rekap/excel endpoints
"""

import requests
import sys
from datetime import datetime

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


def test_case_1_rekap_default_status():
    """Case 1: GET /api/izin/rekap?year=2026&month=9 (default status=disetujui)"""
    print("\n=== Case 1: GET /api/izin/rekap (default status=disetujui) ===")
    
    try:
        response = requests.get(f"{BASE_URL}/izin/rekap?year=2026&month=9", timeout=10)
        
        if response.status_code != 200:
            log_test(1, "GET /api/izin/rekap (default status)", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return False
        
        data = response.json()
        
        # Verify required keys
        required_keys = ["year", "month", "status", "jenis", "rows", "totals"]
        missing_keys = [k for k in required_keys if k not in data]
        if missing_keys:
            log_test(1, "GET /api/izin/rekap", False, f"Missing keys: {missing_keys}")
            return False
        
        # Verify values
        if data["year"] != 2026:
            log_test(1, "GET /api/izin/rekap", False, f"Expected year=2026, got {data['year']}")
            return False
        
        if data["month"] != 9:
            log_test(1, "GET /api/izin/rekap", False, f"Expected month=9, got {data['month']}")
            return False
        
        if data["status"] != "disetujui":
            log_test(1, "GET /api/izin/rekap", False, f"Expected status='disetujui', got '{data['status']}'")
            return False
        
        # Verify jenis list
        expected_jenis = ["Sakit", "Izin", "Cuti", "Dinas Luar", "Lainnya"]
        if data["jenis"] != expected_jenis:
            log_test(1, "GET /api/izin/rekap", False, f"Expected jenis={expected_jenis}, got {data['jenis']}")
            return False
        
        # Verify rows structure
        if not isinstance(data["rows"], list):
            log_test(1, "GET /api/izin/rekap", False, f"Expected rows to be array, got {type(data['rows'])}")
            return False
        
        # Verify each row has required fields
        for i, row in enumerate(data["rows"]):
            required_row_keys = ["pegawai_id", "nama", "nip", "jabatan", "per_jenis", "total"]
            missing_row_keys = [k for k in required_row_keys if k not in row]
            if missing_row_keys:
                log_test(1, "GET /api/izin/rekap", False, 
                        f"Row {i} missing keys: {missing_row_keys}")
                return False
            
            # Verify per_jenis has all jenis types
            if not isinstance(row["per_jenis"], dict):
                log_test(1, "GET /api/izin/rekap", False, 
                        f"Row {i} per_jenis should be object, got {type(row['per_jenis'])}")
                return False
            
            for jenis in expected_jenis:
                if jenis not in row["per_jenis"]:
                    log_test(1, "GET /api/izin/rekap", False, 
                            f"Row {i} per_jenis missing '{jenis}'")
                    return False
        
        # Verify totals structure
        if not isinstance(data["totals"], dict):
            log_test(1, "GET /api/izin/rekap", False, f"Expected totals to be object, got {type(data['totals'])}")
            return False
        
        for jenis in expected_jenis:
            if jenis not in data["totals"]:
                log_test(1, "GET /api/izin/rekap", False, f"totals missing '{jenis}'")
                return False
        
        if "total" not in data["totals"]:
            log_test(1, "GET /api/izin/rekap", False, "totals missing 'total' key")
            return False
        
        # Verify totals.total == sum of all row totals
        calculated_total = sum(row["total"] for row in data["rows"])
        if data["totals"]["total"] != calculated_total:
            log_test(1, "GET /api/izin/rekap", False, 
                    f"totals.total={data['totals']['total']} != sum of row totals={calculated_total}")
            return False
        
        # Verify totals per jenis match sum of rows
        for jenis in expected_jenis:
            calculated_jenis_total = sum(row["per_jenis"][jenis] for row in data["rows"])
            if data["totals"][jenis] != calculated_jenis_total:
                log_test(1, "GET /api/izin/rekap", False, 
                        f"totals['{jenis}']={data['totals'][jenis]} != sum of rows={calculated_jenis_total}")
                return False
        
        log_test(1, "GET /api/izin/rekap (default status=disetujui)", True, 
                f"All keys present, status='disetujui', {len(data['rows'])} rows, totals verified")
        return True
        
    except Exception as e:
        log_test(1, "GET /api/izin/rekap", False, f"Exception: {str(e)}")
        return False


def test_case_2_rekap_status_semua():
    """Case 2: GET /api/izin/rekap?year=2026&month=9&status=semua"""
    print("\n=== Case 2: GET /api/izin/rekap (status=semua) ===")
    
    try:
        # First get disetujui count
        response_disetujui = requests.get(f"{BASE_URL}/izin/rekap?year=2026&month=9&status=disetujui", timeout=10)
        if response_disetujui.status_code != 200:
            log_test(2, "GET /api/izin/rekap (status=semua)", False, 
                    "Could not get disetujui count for comparison")
            return False
        
        data_disetujui = response_disetujui.json()
        disetujui_count = len(data_disetujui["rows"])
        
        # Now get semua
        response = requests.get(f"{BASE_URL}/izin/rekap?year=2026&month=9&status=semua", timeout=10)
        
        if response.status_code != 200:
            log_test(2, "GET /api/izin/rekap (status=semua)", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return False
        
        data = response.json()
        
        # Verify status is not "disetujui"
        if data["status"] == "disetujui":
            log_test(2, "GET /api/izin/rekap (status=semua)", False, 
                    f"Expected status='semua', got '{data['status']}'")
            return False
        
        # Verify rows count >= disetujui-only count
        semua_count = len(data["rows"])
        if semua_count < disetujui_count:
            log_test(2, "GET /api/izin/rekap (status=semua)", False, 
                    f"semua count ({semua_count}) < disetujui count ({disetujui_count})")
            return False
        
        # Verify structure is same as case 1
        required_keys = ["year", "month", "status", "jenis", "rows", "totals"]
        missing_keys = [k for k in required_keys if k not in data]
        if missing_keys:
            log_test(2, "GET /api/izin/rekap (status=semua)", False, f"Missing keys: {missing_keys}")
            return False
        
        log_test(2, "GET /api/izin/rekap (status=semua)", True, 
                f"status='{data['status']}', {semua_count} rows (>= {disetujui_count} disetujui rows)")
        return True
        
    except Exception as e:
        log_test(2, "GET /api/izin/rekap (status=semua)", False, f"Exception: {str(e)}")
        return False


def test_case_3_invalid_month():
    """Case 3: GET /api/izin/rekap?year=2026&month=13 -> 400"""
    print("\n=== Case 3: GET /api/izin/rekap (invalid month) ===")
    
    try:
        response = requests.get(f"{BASE_URL}/izin/rekap?year=2026&month=13", timeout=10)
        
        if response.status_code == 400:
            log_test(3, "GET /api/izin/rekap (invalid month=13) returns 400", True, 
                    f"Correctly rejected: {response.text}")
            return True
        else:
            log_test(3, "GET /api/izin/rekap (invalid month)", False, 
                    f"Expected 400, got {response.status_code}")
            return False
            
    except Exception as e:
        log_test(3, "GET /api/izin/rekap (invalid month)", False, f"Exception: {str(e)}")
        return False


def test_case_4_excel_export():
    """Case 4: GET /api/izin/rekap/excel?year=2026&month=9"""
    print("\n=== Case 4: GET /api/izin/rekap/excel ===")
    
    try:
        response = requests.get(f"{BASE_URL}/izin/rekap/excel?year=2026&month=9", timeout=10)
        
        if response.status_code != 200:
            log_test(4, "GET /api/izin/rekap/excel", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return False
        
        # Verify Content-Type
        content_type = response.headers.get("Content-Type", "")
        expected_content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        if content_type != expected_content_type:
            log_test(4, "GET /api/izin/rekap/excel", False, 
                    f"Expected Content-Type='{expected_content_type}', got '{content_type}'")
            return False
        
        # Verify Content-Disposition
        content_disposition = response.headers.get("Content-Disposition", "")
        expected_filename = "rekap-izin-2026-09.xlsx"
        if expected_filename not in content_disposition:
            log_test(4, "GET /api/izin/rekap/excel", False, 
                    f"Expected filename '{expected_filename}' in Content-Disposition, got '{content_disposition}'")
            return False
        
        # Verify body length > 0
        body_length = len(response.content)
        if body_length == 0:
            log_test(4, "GET /api/izin/rekap/excel", False, "Response body is empty")
            return False
        
        log_test(4, "GET /api/izin/rekap/excel", True, 
                f"Content-Type correct, filename={expected_filename}, body length={body_length} bytes")
        return True
        
    except Exception as e:
        log_test(4, "GET /api/izin/rekap/excel", False, f"Exception: {str(e)}")
        return False


def test_case_5_day_counting_logic():
    """Case 5: Create izin spanning months, verify day counting (clipping to month)"""
    global test_izin_id
    print("\n=== Case 5: Day counting logic (optional sanity check) ===")
    
    pegawai_id = get_real_pegawai_id()
    if not pegawai_id:
        log_test(5, "Day counting logic", False, "Could not get real pegawai_id")
        return False
    
    try:
        # Create an izin spanning 2026-08-30 to 2026-09-02 (4 days total, but only 2 in September)
        payload = {
            "pegawai_id": pegawai_id,
            "jenis": "Cuti",
            "tanggal_mulai": "2026-08-30",
            "tanggal_selesai": "2026-09-02",
            "alasan": "test day counting across months"
        }
        
        response = requests.post(f"{BASE_URL}/izin", json=payload, timeout=10)
        
        if response.status_code != 200:
            log_test(5, "Day counting logic", False, 
                    f"Failed to create test izin: {response.status_code}: {response.text}")
            return False
        
        data = response.json()
        test_izin_id = data.get("id")
        
        if not test_izin_id:
            log_test(5, "Day counting logic", False, "No ID returned from POST /api/izin")
            return False
        
        # Approve the izin
        approval_payload = {
            "aksi": "setujui",
            "approver": "Kepala TU"
        }
        approval_response = requests.post(f"{BASE_URL}/izin/{test_izin_id}/approval", 
                                         json=approval_payload, timeout=10)
        
        if approval_response.status_code != 200:
            log_test(5, "Day counting logic", False, 
                    f"Failed to approve test izin: {approval_response.status_code}")
            # Clean up
            requests.delete(f"{BASE_URL}/izin/{test_izin_id}", timeout=10)
            return False
        
        # Now get rekap for September 2026
        rekap_response = requests.get(f"{BASE_URL}/izin/rekap?year=2026&month=9&status=disetujui", 
                                     timeout=10)
        
        if rekap_response.status_code != 200:
            log_test(5, "Day counting logic", False, 
                    f"Failed to get rekap: {rekap_response.status_code}")
            # Clean up
            requests.delete(f"{BASE_URL}/izin/{test_izin_id}", timeout=10)
            return False
        
        rekap_data = rekap_response.json()
        
        # Find the pegawai in the rows
        pegawai_row = None
        for row in rekap_data["rows"]:
            if row["pegawai_id"] == pegawai_id:
                pegawai_row = row
                break
        
        if not pegawai_row:
            log_test(5, "Day counting logic", False, 
                    f"Pegawai {pegawai_id} not found in rekap rows")
            # Clean up
            requests.delete(f"{BASE_URL}/izin/{test_izin_id}", timeout=10)
            return False
        
        # Verify the Cuti count is exactly 2 (Sep 1 and Sep 2)
        cuti_days = pegawai_row["per_jenis"]["Cuti"]
        if cuti_days != 2:
            log_test(5, "Day counting logic", False, 
                    f"Expected 2 days for Cuti (Sep 1-2), got {cuti_days} days")
            # Clean up
            requests.delete(f"{BASE_URL}/izin/{test_izin_id}", timeout=10)
            return False
        
        # Clean up: delete the test izin
        delete_response = requests.delete(f"{BASE_URL}/izin/{test_izin_id}", timeout=10)
        if delete_response.status_code != 200:
            log_test(5, "Day counting logic", False, 
                    f"Warning: Failed to clean up test izin: {delete_response.status_code}")
        
        log_test(5, "Day counting logic (month clipping)", True, 
                f"Izin 2026-08-30 to 2026-09-02 correctly counted as 2 days in September (Sep 1-2)")
        return True
        
    except Exception as e:
        log_test(5, "Day counting logic", False, f"Exception: {str(e)}")
        # Try to clean up
        if test_izin_id:
            try:
                requests.delete(f"{BASE_URL}/izin/{test_izin_id}", timeout=10)
            except:
                pass
        return False


def main():
    """Run all test cases"""
    print("=" * 80)
    print("BACKEND API TEST SUITE - IZIN MONTHLY RECAP ENDPOINTS")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test started at: {datetime.now().isoformat()}")
    print("=" * 80)
    
    # Run all test cases in order
    test_case_1_rekap_default_status()
    test_case_2_rekap_status_semua()
    test_case_3_invalid_month()
    test_case_4_excel_export()
    test_case_5_day_counting_logic()
    
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
