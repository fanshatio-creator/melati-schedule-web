#!/usr/bin/env python3
"""
Backend API Test Suite for PIN Auth and Matrix endpoints
"""
import requests
import sys
from datetime import datetime

# Base URL from frontend/.env
BASE_URL = "https://melati-schedule-1.preview.emergentagent.com/api"

def test_pin_auth():
    """Test PIN authentication endpoints"""
    print("\n" + "="*80)
    print("TESTING PIN AUTHENTICATION ENDPOINTS")
    print("="*80)
    
    results = {
        "passed": [],
        "failed": []
    }
    
    # Test 1: Verify correct PIN for Kepala TU
    print("\n[TEST 1] POST /auth/verify-pin - Kepala TU with correct PIN (1234)")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/verify-pin",
            json={"role": "Kepala TU", "pin": "1234"},
            timeout=10
        )
        if response.status_code == 200 and response.json().get("ok") == True:
            print("✅ PASS: Kepala TU PIN 1234 verified successfully")
            results["passed"].append("Verify Kepala TU correct PIN")
        else:
            print(f"❌ FAIL: Expected 200 with ok:true, got {response.status_code}: {response.text}")
            results["failed"].append(f"Verify Kepala TU correct PIN - {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        results["failed"].append(f"Verify Kepala TU correct PIN - Exception: {e}")
    
    # Test 2: Verify correct PIN for Kepala Puskesmas
    print("\n[TEST 2] POST /auth/verify-pin - Kepala Puskesmas with correct PIN (4321)")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/verify-pin",
            json={"role": "Kepala Puskesmas", "pin": "4321"},
            timeout=10
        )
        if response.status_code == 200 and response.json().get("ok") == True:
            print("✅ PASS: Kepala Puskesmas PIN 4321 verified successfully")
            results["passed"].append("Verify Kepala Puskesmas correct PIN")
        else:
            print(f"❌ FAIL: Expected 200 with ok:true, got {response.status_code}: {response.text}")
            results["failed"].append(f"Verify Kepala Puskesmas correct PIN - {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        results["failed"].append(f"Verify Kepala Puskesmas correct PIN - Exception: {e}")
    
    # Test 3: Verify wrong PIN for Kepala TU
    print("\n[TEST 3] POST /auth/verify-pin - Kepala TU with wrong PIN (0000)")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/verify-pin",
            json={"role": "Kepala TU", "pin": "0000"},
            timeout=10
        )
        if response.status_code == 401:
            detail = response.json().get("detail", "")
            if "PIN salah" in detail:
                print("✅ PASS: Wrong PIN correctly rejected with 401 'PIN salah'")
                results["passed"].append("Verify wrong PIN returns 401")
            else:
                print(f"❌ FAIL: Got 401 but detail is '{detail}', expected 'PIN salah'")
                results["failed"].append(f"Verify wrong PIN - wrong detail message")
        else:
            print(f"❌ FAIL: Expected 401, got {response.status_code}: {response.text}")
            results["failed"].append(f"Verify wrong PIN - {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        results["failed"].append(f"Verify wrong PIN - Exception: {e}")
    
    # Test 4: Verify non-PIN role (should return ok:true without checking PIN)
    print("\n[TEST 4] POST /auth/verify-pin - Non-PIN role (Petugas / Staf)")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/verify-pin",
            json={"role": "Petugas / Staf", "pin": "anything"},
            timeout=10
        )
        if response.status_code == 200 and response.json().get("ok") == True:
            print("✅ PASS: Non-PIN role returns ok:true without PIN check")
            results["passed"].append("Verify non-PIN role")
        else:
            print(f"❌ FAIL: Expected 200 with ok:true, got {response.status_code}: {response.text}")
            results["failed"].append(f"Verify non-PIN role - {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        results["failed"].append(f"Verify non-PIN role - Exception: {e}")
    
    # Test 5: Change PIN with wrong old PIN
    print("\n[TEST 5] POST /auth/change-pin - Wrong old PIN")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/change-pin",
            json={"role": "Kepala TU", "pin_lama": "9999", "pin_baru": "5678"},
            timeout=10
        )
        if response.status_code == 401:
            print("✅ PASS: Wrong old PIN correctly rejected with 401")
            results["passed"].append("Change PIN with wrong old PIN returns 401")
        else:
            print(f"❌ FAIL: Expected 401, got {response.status_code}: {response.text}")
            results["failed"].append(f"Change PIN wrong old - {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        results["failed"].append(f"Change PIN wrong old - Exception: {e}")
    
    # Test 6: Change PIN with invalid new PIN (non-numeric)
    print("\n[TEST 6] POST /auth/change-pin - Invalid new PIN (non-numeric)")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/change-pin",
            json={"role": "Kepala TU", "pin_lama": "1234", "pin_baru": "ab"},
            timeout=10
        )
        if response.status_code == 400:
            print("✅ PASS: Invalid new PIN correctly rejected with 400")
            results["passed"].append("Change PIN with invalid new PIN returns 400")
        else:
            print(f"❌ FAIL: Expected 400, got {response.status_code}: {response.text}")
            results["failed"].append(f"Change PIN invalid new - {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        results["failed"].append(f"Change PIN invalid new - Exception: {e}")
    
    # Test 7: Change PIN with invalid new PIN (less than 4 digits)
    print("\n[TEST 7] POST /auth/change-pin - Invalid new PIN (less than 4 digits)")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/change-pin",
            json={"role": "Kepala TU", "pin_lama": "1234", "pin_baru": "123"},
            timeout=10
        )
        if response.status_code == 400:
            print("✅ PASS: Short new PIN correctly rejected with 400")
            results["passed"].append("Change PIN with short new PIN returns 400")
        else:
            print(f"❌ FAIL: Expected 400, got {response.status_code}: {response.text}")
            results["failed"].append(f"Change PIN short new - {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        results["failed"].append(f"Change PIN short new - Exception: {e}")
    
    # Test 8: Change PIN successfully
    print("\n[TEST 8] POST /auth/change-pin - Valid change from 1234 to 5678")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/change-pin",
            json={"role": "Kepala TU", "pin_lama": "1234", "pin_baru": "5678"},
            timeout=10
        )
        if response.status_code == 200 and response.json().get("ok") == True:
            print("✅ PASS: PIN changed successfully")
            results["passed"].append("Change PIN successfully")
        else:
            print(f"❌ FAIL: Expected 200 with ok:true, got {response.status_code}: {response.text}")
            results["failed"].append(f"Change PIN success - {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        results["failed"].append(f"Change PIN success - Exception: {e}")
    
    # Test 9: Verify new PIN works
    print("\n[TEST 9] POST /auth/verify-pin - Verify new PIN (5678) works")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/verify-pin",
            json={"role": "Kepala TU", "pin": "5678"},
            timeout=10
        )
        if response.status_code == 200 and response.json().get("ok") == True:
            print("✅ PASS: New PIN 5678 verified successfully")
            results["passed"].append("Verify new PIN works")
        else:
            print(f"❌ FAIL: Expected 200 with ok:true, got {response.status_code}: {response.text}")
            results["failed"].append(f"Verify new PIN - {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        results["failed"].append(f"Verify new PIN - Exception: {e}")
    
    # Test 10: Verify old PIN no longer works
    print("\n[TEST 10] POST /auth/verify-pin - Verify old PIN (1234) no longer works")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/verify-pin",
            json={"role": "Kepala TU", "pin": "1234"},
            timeout=10
        )
        if response.status_code == 401:
            print("✅ PASS: Old PIN 1234 correctly rejected with 401")
            results["passed"].append("Verify old PIN no longer works")
        else:
            print(f"❌ FAIL: Expected 401, got {response.status_code}: {response.text}")
            results["failed"].append(f"Verify old PIN rejected - {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        results["failed"].append(f"Verify old PIN rejected - Exception: {e}")
    
    # Test 11: CLEANUP - Restore PIN back to 1234
    print("\n[TEST 11] POST /auth/change-pin - CLEANUP: Restore PIN back to 1234")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/change-pin",
            json={"role": "Kepala TU", "pin_lama": "5678", "pin_baru": "1234"},
            timeout=10
        )
        if response.status_code == 200 and response.json().get("ok") == True:
            print("✅ PASS: PIN restored to 1234 successfully")
            results["passed"].append("Restore PIN to default")
        else:
            print(f"❌ FAIL: Expected 200 with ok:true, got {response.status_code}: {response.text}")
            results["failed"].append(f"Restore PIN - {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        results["failed"].append(f"Restore PIN - Exception: {e}")
    
    # Test 12: Verify restored PIN works
    print("\n[TEST 12] POST /auth/verify-pin - Verify restored PIN (1234) works")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/verify-pin",
            json={"role": "Kepala TU", "pin": "1234"},
            timeout=10
        )
        if response.status_code == 200 and response.json().get("ok") == True:
            print("✅ PASS: Restored PIN 1234 verified successfully")
            results["passed"].append("Verify restored PIN works")
        else:
            print(f"❌ FAIL: Expected 200 with ok:true, got {response.status_code}: {response.text}")
            results["failed"].append(f"Verify restored PIN - {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        results["failed"].append(f"Verify restored PIN - Exception: {e}")
    
    return results


def test_matrix_endpoint():
    """Test schedule matrix endpoint"""
    print("\n" + "="*80)
    print("TESTING SCHEDULE MATRIX ENDPOINT")
    print("="*80)
    
    results = {
        "passed": [],
        "failed": []
    }
    
    # Test 1: Valid matrix request for September 2026
    print("\n[TEST 1] GET /jadwal/matrix?year=2026&month=9")
    try:
        response = requests.get(
            f"{BASE_URL}/jadwal/matrix",
            params={"year": 2026, "month": 9},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            
            # Validate structure
            required_keys = ["year", "month", "dates", "rows", "kegiatan", "conflicts", 
                           "total_pegawai_terjadwal", "total_kegiatan"]
            missing_keys = [k for k in required_keys if k not in data]
            
            if missing_keys:
                print(f"❌ FAIL: Missing keys in response: {missing_keys}")
                results["failed"].append(f"Matrix structure - missing keys: {missing_keys}")
            else:
                print("✅ PASS: All required keys present in response")
                
                # Validate year and month
                if data["year"] == 2026 and data["month"] == 9:
                    print("✅ PASS: Year and month correct")
                else:
                    print(f"❌ FAIL: Year/month mismatch - got {data['year']}/{data['month']}")
                    results["failed"].append(f"Matrix year/month - got {data['year']}/{data['month']}")
                
                # Validate dates array length (September has 30 days)
                if len(data["dates"]) == 30:
                    print("✅ PASS: Dates array has correct length (30 days for September)")
                    results["passed"].append("Matrix dates array length")
                else:
                    print(f"❌ FAIL: Dates array length is {len(data['dates'])}, expected 30")
                    results["failed"].append(f"Matrix dates length - got {len(data['dates'])}")
                
                # Validate dates structure
                if data["dates"]:
                    first_date = data["dates"][0]
                    date_keys = ["iso", "day", "weekday", "is_weekend"]
                    missing_date_keys = [k for k in date_keys if k not in first_date]
                    if missing_date_keys:
                        print(f"❌ FAIL: Date object missing keys: {missing_date_keys}")
                        results["failed"].append(f"Matrix date structure - missing {missing_date_keys}")
                    else:
                        print("✅ PASS: Date objects have correct structure")
                        results["passed"].append("Matrix date structure")
                
                # Validate rows structure
                if isinstance(data["rows"], list):
                    print(f"✅ PASS: Rows is an array with {len(data['rows'])} items")
                    if data["rows"]:
                        first_row = data["rows"][0]
                        row_keys = ["id", "nama", "cells"]
                        missing_row_keys = [k for k in row_keys if k not in first_row]
                        if missing_row_keys:
                            print(f"❌ FAIL: Row object missing keys: {missing_row_keys}")
                            results["failed"].append(f"Matrix row structure - missing {missing_row_keys}")
                        else:
                            print("✅ PASS: Row objects have correct structure")
                            results["passed"].append("Matrix row structure")
                else:
                    print(f"❌ FAIL: Rows is not an array")
                    results["failed"].append("Matrix rows not array")
                
                # Validate kegiatan structure
                if isinstance(data["kegiatan"], list):
                    print(f"✅ PASS: Kegiatan is an array with {len(data['kegiatan'])} items")
                    results["passed"].append("Matrix kegiatan array")
                else:
                    print(f"❌ FAIL: Kegiatan is not an array")
                    results["failed"].append("Matrix kegiatan not array")
                
                # Validate conflicts structure
                if isinstance(data["conflicts"], list):
                    print(f"✅ PASS: Conflicts is an array with {len(data['conflicts'])} items")
                    results["passed"].append("Matrix conflicts array")
                else:
                    print(f"❌ FAIL: Conflicts is not an array")
                    results["failed"].append("Matrix conflicts not array")
                
                # Validate totals
                if isinstance(data["total_pegawai_terjadwal"], int) and isinstance(data["total_kegiatan"], int):
                    print(f"✅ PASS: Totals are integers (pegawai: {data['total_pegawai_terjadwal']}, kegiatan: {data['total_kegiatan']})")
                    results["passed"].append("Matrix totals")
                else:
                    print(f"❌ FAIL: Totals are not integers")
                    results["failed"].append("Matrix totals not integers")
                
                if not results["failed"]:
                    results["passed"].append("Matrix valid response structure")
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}: {response.text}")
            results["failed"].append(f"Matrix valid request - {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        results["failed"].append(f"Matrix valid request - Exception: {e}")
    
    # Test 2: Invalid month (13)
    print("\n[TEST 2] GET /jadwal/matrix?year=2026&month=13 (invalid month)")
    try:
        response = requests.get(
            f"{BASE_URL}/jadwal/matrix",
            params={"year": 2026, "month": 13},
            timeout=10
        )
        if response.status_code == 400:
            print("✅ PASS: Invalid month correctly rejected with 400")
            results["passed"].append("Matrix invalid month returns 400")
        else:
            print(f"❌ FAIL: Expected 400, got {response.status_code}: {response.text}")
            results["failed"].append(f"Matrix invalid month - {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        results["failed"].append(f"Matrix invalid month - Exception: {e}")
    
    # Test 3: Invalid month (0)
    print("\n[TEST 3] GET /jadwal/matrix?year=2026&month=0 (invalid month)")
    try:
        response = requests.get(
            f"{BASE_URL}/jadwal/matrix",
            params={"year": 2026, "month": 0},
            timeout=10
        )
        if response.status_code == 400:
            print("✅ PASS: Invalid month correctly rejected with 400")
            results["passed"].append("Matrix invalid month 0 returns 400")
        else:
            print(f"❌ FAIL: Expected 400, got {response.status_code}: {response.text}")
            results["failed"].append(f"Matrix invalid month 0 - {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL: Exception - {e}")
        results["failed"].append(f"Matrix invalid month 0 - Exception: {e}")
    
    return results


def main():
    """Run all tests and print summary"""
    print("\n" + "="*80)
    print("BACKEND API TEST SUITE")
    print(f"Base URL: {BASE_URL}")
    print(f"Test Time: {datetime.now().isoformat()}")
    print("="*80)
    
    # Run PIN auth tests
    pin_results = test_pin_auth()
    
    # Run matrix tests
    matrix_results = test_matrix_endpoint()
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    total_passed = len(pin_results["passed"]) + len(matrix_results["passed"])
    total_failed = len(pin_results["failed"]) + len(matrix_results["failed"])
    total_tests = total_passed + total_failed
    
    print(f"\nPIN Authentication Tests:")
    print(f"  ✅ Passed: {len(pin_results['passed'])}")
    print(f"  ❌ Failed: {len(pin_results['failed'])}")
    
    print(f"\nMatrix Endpoint Tests:")
    print(f"  ✅ Passed: {len(matrix_results['passed'])}")
    print(f"  ❌ Failed: {len(matrix_results['failed'])}")
    
    print(f"\nOverall:")
    print(f"  Total Tests: {total_tests}")
    print(f"  ✅ Passed: {total_passed}")
    print(f"  ❌ Failed: {total_failed}")
    print(f"  Success Rate: {(total_passed/total_tests*100):.1f}%")
    
    if total_failed > 0:
        print("\n" + "="*80)
        print("FAILED TESTS DETAILS:")
        print("="*80)
        if pin_results["failed"]:
            print("\nPIN Authentication Failures:")
            for failure in pin_results["failed"]:
                print(f"  • {failure}")
        if matrix_results["failed"]:
            print("\nMatrix Endpoint Failures:")
            for failure in matrix_results["failed"]:
                print(f"  • {failure}")
    
    print("\n" + "="*80)
    
    # Exit with appropriate code
    sys.exit(0 if total_failed == 0 else 1)


if __name__ == "__main__":
    main()
