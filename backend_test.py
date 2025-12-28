import requests
import sys
import json
from datetime import datetime

class FXPulseTester:
    def __init__(self, base_url="https://smartsignalfx.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.admin_user_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, use_admin=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        token = self.admin_token if use_admin else self.token
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health check"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@fxpulse.com", "password": "FxPulse2024!"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            self.admin_user_id = response['user']['user_id']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
            return True, response
        return False, {}

    def test_regular_user_register(self):
        """Test regular user registration"""
        test_email = f"test_user_{datetime.now().strftime('%H%M%S')}@test.com"
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={"email": test_email, "password": "TestPass123!", "name": "Test User"}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['user_id']
            print(f"   User token obtained: {self.token[:20]}...")
            return True, response
        return False, {}

    def test_get_me(self):
        """Test get current user"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_get_pairs(self):
        """Test get forex pairs"""
        success, response = self.run_test("Get Forex Pairs", "GET", "pairs", 200)
        if success and 'pairs' in response and 'timeframes' in response:
            print(f"   Found {len(response['pairs'])} pairs and {len(response['timeframes'])} timeframes")
            return True, response
        return False, {}

    def test_get_signals(self):
        """Test get signals"""
        return self.run_test("Get Signals", "GET", "signals", 200)

    def test_generate_signal(self):
        """Test signal generation"""
        success, response = self.run_test(
            "Generate Signal",
            "POST",
            "signals/generate",
            200,
            data={"currency_pair": "EUR/USD", "timeframe": "1H"}
        )
        if success and 'signal_id' in response:
            print(f"   Generated signal: {response['signal_id']}")
            return True, response
        return False, {}

    def test_get_pair_price(self):
        """Test get pair price"""
        return self.run_test("Get EUR/USD Price", "GET", "pairs/EUR-USD/price", 200)

    def test_get_pair_history(self):
        """Test get pair history"""
        return self.run_test("Get EUR/USD History", "GET", "pairs/EUR-USD/history", 200)

    def test_get_pair_analysis(self):
        """Test get pair analysis"""
        return self.run_test("Get EUR/USD Analysis", "GET", "pairs/EUR-USD/analysis", 200)

    def test_get_performance(self):
        """Test get performance stats"""
        return self.run_test("Get Performance", "GET", "performance", 200)

    def test_get_performance_chart(self):
        """Test get performance chart"""
        return self.run_test("Get Performance Chart", "GET", "performance/chart", 200)

    def test_position_size_calculator(self):
        """Test position size calculator"""
        return self.run_test(
            "Position Size Calculator",
            "POST",
            "calculator/position-size",
            200,
            data={
                "account_balance": 10000,
                "risk_percentage": 2,
                "entry_price": 1.0850,
                "stop_loss": 1.0800,
                "currency_pair": "EUR/USD"
            }
        )

    def test_get_alerts(self):
        """Test get alerts"""
        return self.run_test("Get Alerts", "GET", "alerts", 200)

    def test_subscription_plans(self):
        """Test get subscription plans"""
        return self.run_test("Get Subscription Plans", "GET", "subscription/plans", 200)

    def test_admin_get_stats(self):
        """Test admin stats"""
        return self.run_test("Admin Get Stats", "GET", "admin/stats", 200, use_admin=True)

    def test_admin_get_signals(self):
        """Test admin get signals"""
        return self.run_test("Admin Get Signals", "GET", "admin/signals", 200, use_admin=True)

    def test_admin_get_users(self):
        """Test admin get users"""
        return self.run_test("Admin Get Users", "GET", "admin/users", 200, use_admin=True)

    def test_admin_generate_batch(self):
        """Test admin batch signal generation"""
        return self.run_test("Admin Generate Batch", "POST", "admin/signals/generate-batch", 200, use_admin=True)

    def test_market_status(self):
        """Test market status endpoint"""
        return self.run_test("Get Market Status", "GET", "market/status", 200)

    def test_pro_insights(self):
        """Test pro insights endpoint"""
        return self.run_test("Get Pro Insights", "GET", "pro/insights", 200, use_admin=True)

def main():
    print("🚀 Starting FX Pulse API Tests")
    print("=" * 50)
    
    tester = FXPulseTester()
    
    # Basic health check
    if not tester.test_health_check()[0]:
        print("❌ Health check failed, stopping tests")
        return 1

    # Authentication tests
    if not tester.test_admin_login()[0]:
        print("❌ Admin login failed, stopping tests")
        return 1

    if not tester.test_regular_user_register()[0]:
        print("❌ User registration failed, stopping tests")
        return 1

    if not tester.test_get_me()[0]:
        print("❌ Get current user failed")

    # Core functionality tests
    if not tester.test_get_pairs()[0]:
        print("❌ Get pairs failed")

    if not tester.test_get_signals()[0]:
        print("❌ Get signals failed")

    # Signal generation test
    signal_success, signal_data = tester.test_generate_signal()
    if not signal_success:
        print("❌ Signal generation failed")

    # Forex data tests
    if not tester.test_get_pair_price()[0]:
        print("❌ Get pair price failed")

    if not tester.test_get_pair_history()[0]:
        print("❌ Get pair history failed")

    if not tester.test_get_pair_analysis()[0]:
        print("❌ Get pair analysis failed")

    # Performance tests
    if not tester.test_get_performance()[0]:
        print("❌ Get performance failed")

    if not tester.test_get_performance_chart()[0]:
        print("❌ Get performance chart failed")

    # Calculator test
    if not tester.test_position_size_calculator()[0]:
        print("❌ Position size calculator failed")

    # Alerts test
    if not tester.test_get_alerts()[0]:
        print("❌ Get alerts failed")

    # Subscription test
    if not tester.test_subscription_plans()[0]:
        print("❌ Get subscription plans failed")

    # Market status test (new feature)
    if not tester.test_market_status()[0]:
        print("❌ Get market status failed")

    # Admin tests
    if not tester.test_admin_get_stats()[0]:
        print("❌ Admin get stats failed")

    if not tester.test_admin_get_signals()[0]:
        print("❌ Admin get signals failed")

    if not tester.test_admin_get_users()[0]:
        print("❌ Admin get users failed")

    if not tester.test_admin_generate_batch()[0]:
        print("❌ Admin generate batch failed")

    # Pro insights test (new feature)
    if not tester.test_pro_insights()[0]:
        print("❌ Get pro insights failed")

    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Tests completed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"📈 Success rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 Backend tests mostly successful!")
        return 0
    else:
        print("⚠️  Backend has significant issues")
        return 1

if __name__ == "__main__":
    sys.exit(main())