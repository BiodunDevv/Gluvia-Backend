const axios = require("axios");

const BASE_URL = "http://localhost:5000";

// Test helper
async function testEndpoint(name, method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: { "Content-Type": "application/json", ...headers },
    };

    if (data) config.data = data;

    const response = await axios(config);
    console.log(`✅ ${name}: SUCCESS`);
    return response.data;
  } catch (error) {
    console.log(`❌ ${name}: FAILED`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return null;
  }
}

// Main test runner
async function runTests() {
  console.log("\n🧪 Starting API Tests...\n");

  let token = null;

  // Test 1: Health Check
  await testEndpoint("Health Check", "GET", "/health");

  // Test 2: Get Foods (Public)
  const foodsData = await testEndpoint(
    "Get Foods List",
    "GET",
    "/foods?limit=5"
  );
  console.log(`   Found ${foodsData?.data?.length || 0} foods\n`);

  // Test 3: Search Foods
  const searchData = await testEndpoint(
    "Search Foods",
    "GET",
    "/foods?search=jollof"
  );
  console.log(`   Search results: ${searchData?.data?.length || 0} items\n`);

  // Test 4: Get Rules (Public)
  const rulesData = await testEndpoint("Get Rules List", "GET", "/rules");
  console.log(`   Found ${rulesData?.data?.rules?.length || 0} rules\n`);

  // Test 5: Login as Admin
  const loginData = await testEndpoint("Admin Login", "POST", "/auth/login", {
    email: "louisdiaz43@gmail.com",
    password: "balikiss",
  });

  if (loginData?.token) {
    token = loginData.token;
    console.log(`   Token received: ${token.substring(0, 20)}...\n`);
  }

  if (!token) {
    console.log("\n⚠️  Stopping tests - no auth token available\n");
    return;
  }

  // Test 6: Get Profile (Authenticated)
  const profileData = await testEndpoint(
    "Get User Profile",
    "GET",
    "/user/me",
    null,
    {
      Authorization: `Bearer ${token}`,
    }
  );
  console.log(`   User: ${profileData?.data?.email || "N/A"}\n`);

  // Test 7: Get Audit Logs (Admin only)
  const auditData = await testEndpoint(
    "Get Audit Logs",
    "GET",
    "/admin/audit?limit=3",
    null,
    {
      Authorization: `Bearer ${token}`,
    }
  );
  console.log(`   Audit logs: ${auditData?.data?.length || 0} entries\n`);

  // Test 8: Full Sync (Authenticated)
  const syncData = await testEndpoint("Full Sync", "GET", "/sync/full", null, {
    Authorization: `Bearer ${token}`,
  });
  console.log(`   Server version: ${syncData?.serverVersion || "N/A"}`);
  console.log(`   Foods in sync: ${syncData?.foods?.length || 0}`);
  console.log(`   Rules in sync: ${syncData?.rules?.length || 0}\n`);

  // Test 9: Upload Logs (Authenticated)
  const uploadData = await testEndpoint(
    "Upload Logs",
    "POST",
    "/sync/upload",
    {
      logs: {
        meals: [
          {
            entries: [
              {
                foodId: foodsData?.data?.[0]?._id || "000000000000000000000000",
                grams: 150,
                portionName: "1 cup",
              },
            ],
            clientGeneratedId: `meal-${Date.now()}`,
            createdAt: new Date().toISOString(),
          },
        ],
        glucose: [
          {
            valueMgDl: 120,
            type: "fasting",
            clientGeneratedId: `glucose-${Date.now()}`,
            timestamp: new Date().toISOString(),
          },
        ],
      },
      clientVersion: 0,
    },
    {
      Authorization: `Bearer ${token}`,
    }
  );
  console.log(
    `   Meal logs processed: ${uploadData?.results?.mealsAdded || 0}`
  );
  console.log(
    `   Glucose logs processed: ${uploadData?.results?.glucoseAdded || 0}\n`
  );

  // Test 10: Get User Aggregations
  const today = new Date();
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const aggData = await testEndpoint(
    "Get User Aggregations",
    "GET",
    `/sync/aggregations?from=${lastWeek.toISOString()}&to=${today.toISOString()}`,
    null,
    { Authorization: `Bearer ${token}` }
  );
  console.log(`   Meal logs: ${aggData?.mealLogs?.length || 0}`);
  console.log(`   Glucose logs: ${aggData?.glucoseLogs?.length || 0}\n`);

  // Test 11: Logout
  await testEndpoint(
    "Logout",
    "POST",
    "/auth/logout",
    { token },
    {
      Authorization: `Bearer ${token}`,
    }
  );

  console.log("\n✨ Tests completed!\n");
}

// Run tests
runTests().catch(console.error);
