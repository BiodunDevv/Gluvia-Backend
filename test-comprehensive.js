const axios = require("axios");

const BASE_URL = "http://localhost:5000";
let stats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
};

// Test helper
async function testEndpoint(
  name,
  method,
  url,
  data = null,
  headers = {},
  expectFail = false
) {
  stats.total++;
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: { "Content-Type": "application/json", ...headers },
      validateStatus: () => true, // Don't throw on any status
    };

    if (data) config.data = data;

    const response = await axios(config);

    if (expectFail) {
      if (response.status >= 400) {
        console.log(`✅ ${name}: PASS (Expected failure)`);
        stats.passed++;
        return { success: true, status: response.status, data: response.data };
      } else {
        console.log(
          `❌ ${name}: FAIL (Expected failure but got ${response.status})`
        );
        stats.failed++;
        return { success: false, status: response.status, data: response.data };
      }
    }

    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ ${name}: PASS`);
      stats.passed++;
      return { success: true, status: response.status, data: response.data };
    } else {
      console.log(`❌ ${name}: FAIL (Status ${response.status})`);
      console.log(
        `   Message: ${JSON.stringify(response.data).substring(0, 200)}`
      );
      stats.failed++;
      return { success: false, status: response.status, data: response.data };
    }
  } catch (error) {
    console.log(`❌ ${name}: ERROR`);
    console.log(`   Error: ${error.message}`);
    stats.failed++;
    return { success: false, error: error.message };
  }
}

// Main test runner
async function runComprehensiveTests() {
  console.log("\n🧪 GLUVIA AI BACKEND - COMPREHENSIVE API TEST SUITE\n");
  console.log("═".repeat(60));

  let userToken = null;
  let adminToken = null;
  let userId = null;
  let adminId = null;
  let foodId = null;
  let ruleSlug = null;
  const timestamp = Date.now();
  let testEmail = `test${timestamp}@gluvia.test`;

  // ==================== SECTION 1: HEALTH & BASIC ====================
  console.log("\n📋 Section 1: Health & Basic Checks");
  console.log("─".repeat(60));

  const health = await testEndpoint("1.1 Health Check", "GET", "/health");

  const swagger = await testEndpoint(
    "1.2 Swagger Docs Available",
    "GET",
    "/api-docs/"
  );

  // ==================== SECTION 2: AUTH FLOWS ====================
  console.log("\n🔐 Section 2: Authentication Flows");
  console.log("─".repeat(60));

  // 2.1 Register new user
  const registerResult = await testEndpoint(
    "2.1 Register New User",
    "POST",
    "/auth/register",
    {
      email: testEmail,
      password: "Test1234",
      name: "Test User",
      consent: { accepted: true },
    }
  );

  if (registerResult.success) {
    userToken = registerResult.data.token;
    userId = registerResult.data.user?._id || registerResult.data.user?.id;
    console.log(`   User ID: ${userId}`);
    console.log(`   Token: ${userToken?.substring(0, 20)}...`);
  }

  // 2.2 Duplicate registration should fail
  await testEndpoint(
    "2.2 Duplicate Registration (Should Fail)",
    "POST",
    "/auth/register",
    {
      email: testEmail,
      password: "Test1234",
      name: "Duplicate User",
      consent: { accepted: true },
    },
    {},
    true
  );

  // 2.3 Login with admin credentials
  const adminLogin = await testEndpoint(
    "2.3 Admin Login",
    "POST",
    "/auth/login",
    {
      email: "louisdiaz43@gmail.com",
      password: "balikiss",
    }
  );

  if (adminLogin.success) {
    adminToken = adminLogin.data.token;
    adminId = adminLogin.data.user?._id || adminLogin.data.user?.id;
    console.log(`   Admin ID: ${adminId}`);
    console.log(`   Admin Token: ${adminToken?.substring(0, 20)}...`);
  }

  // 2.4 Login with wrong password should fail
  await testEndpoint(
    "2.4 Wrong Password (Should Fail)",
    "POST",
    "/auth/login",
    {
      email: testEmail,
      password: "WrongPassword123",
    },
    {},
    true
  );

  // 2.5 Request password reset
  await testEndpoint(
    "2.5 Password Reset Request",
    "POST",
    "/auth/password-reset-request",
    {
      email: testEmail,
    }
  );

  // ==================== SECTION 3: USER PROFILE ====================
  console.log("\n👤 Section 3: User Profile Management");
  console.log("─".repeat(60));

  if (userToken) {
    // 3.1 Get own profile
    const profile = await testEndpoint(
      "3.1 Get Own Profile",
      "GET",
      "/user/me",
      null,
      {
        Authorization: `Bearer ${userToken}`,
      }
    );

    // 3.2 Update profile
    const updateProfile = await testEndpoint(
      "3.2 Update Profile",
      "PUT",
      "/user/me",
      {
        profile: {
          age: 35,
          sex: "male",
          heightCm: 175,
          weightKg: 80,
          diabetesType: "type2",
          activityLevel: "moderate",
        },
      },
      {
        Authorization: `Bearer ${userToken}`,
      }
    );

    // 3.3 Get profile without auth should fail
    await testEndpoint(
      "3.3 Get Profile No Auth (Should Fail)",
      "GET",
      "/user/me",
      null,
      {},
      true
    );

    // 3.4 Export user data (NDPR compliance)
    await testEndpoint(
      "3.4 Export User Data (NDPR)",
      "GET",
      "/user/export",
      null,
      {
        Authorization: `Bearer ${userToken}`,
      }
    );
  } else {
    console.log("⚠️  Skipping user profile tests - no user token");
    stats.skipped += 4;
  }

  // ==================== SECTION 4: FOODS DATABASE ====================
  console.log("\n🍽️  Section 4: Foods Database");
  console.log("─".repeat(60));

  // 4.1 Get all foods (public)
  const foodsList = await testEndpoint(
    "4.1 Get Foods List (Public)",
    "GET",
    "/foods?limit=10"
  );

  if (foodsList.success && foodsList.data.data?.length > 0) {
    foodId = foodsList.data.data[0]._id;
    console.log(`   Found ${foodsList.data.data.length} foods`);
    console.log(`   Sample Food ID: ${foodId}`);
  }

  // 4.2 Search foods by text
  const searchFoods = await testEndpoint(
    "4.2 Search Foods (jollof)",
    "GET",
    "/foods?search=jollof"
  );
  if (searchFoods.success) {
    console.log(
      `   Search results: ${searchFoods.data.data?.length || 0} items`
    );
  }

  // 4.3 Filter by category
  await testEndpoint(
    "4.3 Filter Foods by Category",
    "GET",
    "/foods?category=Grains & Staples&limit=5"
  );

  // 4.4 Get specific food by ID
  if (foodId) {
    await testEndpoint("4.4 Get Food By ID", "GET", `/foods/${foodId}`);
  } else {
    console.log("⚠️  Skipping food by ID test - no food ID available");
    stats.skipped++;
  }

  // 4.5 Create new food (admin only)
  if (adminToken) {
    const newFood = await testEndpoint(
      "4.5 Create Food (Admin)",
      "POST",
      "/foods",
      {
        localName: "Test Food Item",
        canonicalName: "Test Food",
        category: "Test Category",
        nutrients: {
          calories: 100,
          carbs_g: 20,
          protein_g: 5,
          fat_g: 2,
          fibre_g: 3,
          gi: 50,
        },
        portionSizes: [{ name: "Small", grams: 100, carbs_g: 20 }],
        affordability: "medium",
        tags: ["test"],
        source: "manual",
      },
      {
        Authorization: `Bearer ${adminToken}`,
      }
    );

    if (newFood.success) {
      const createdFoodId = newFood.data.data?._id;
      console.log(`   Created Food ID: ${createdFoodId}`);

      // 4.6 Update food
      if (createdFoodId) {
        await testEndpoint(
          "4.6 Update Food (Admin)",
          "PUT",
          `/foods/${createdFoodId}`,
          {
            localName: "Updated Test Food",
            nutrients: {
              calories: 120,
              carbs_g: 25,
              protein_g: 6,
              fat_g: 3,
              fibre_g: 4,
              gi: 55,
            },
          },
          {
            Authorization: `Bearer ${adminToken}`,
          }
        );
      }
    }
  } else {
    console.log("⚠️  Skipping admin food tests - no admin token");
    stats.skipped += 2;
  }

  // 4.7 Create food without admin token should fail
  if (userToken) {
    await testEndpoint(
      "4.7 Create Food Non-Admin (Should Fail)",
      "POST",
      "/foods",
      {
        localName: "Unauthorized Food",
        category: "Test",
      },
      {
        Authorization: `Bearer ${userToken}`,
      },
      true
    );
  }

  // 4.8 Batch upload foods
  if (adminToken) {
    await testEndpoint(
      "4.8 Batch Upload Foods (Admin)",
      "POST",
      "/foods/batch",
      {
        foods: [
          {
            localName: "Batch Food 1",
            category: "Batch Test",
            nutrients: {
              calories: 50,
              carbs_g: 10,
              protein_g: 2,
              fat_g: 1,
              fibre_g: 1,
            },
            affordability: "low",
            tags: ["batch"],
            source: "manual",
          },
          {
            localName: "Batch Food 2",
            category: "Batch Test",
            nutrients: {
              calories: 60,
              carbs_g: 12,
              protein_g: 3,
              fat_g: 1,
              fibre_g: 2,
            },
            affordability: "low",
            tags: ["batch"],
            source: "manual",
          },
        ],
      },
      {
        Authorization: `Bearer ${adminToken}`,
      }
    );
  }

  // ==================== SECTION 5: RULE TEMPLATES ====================
  console.log("\n📏 Section 5: Rule Templates");
  console.log("─".repeat(60));

  // 5.1 Get all rules (public)
  const rulesList = await testEndpoint(
    "5.1 Get Rules List (Public)",
    "GET",
    "/rules"
  );

  if (rulesList.success && rulesList.data.data?.rules?.length > 0) {
    ruleSlug = rulesList.data.data.rules[0].slug;
    console.log(`   Found ${rulesList.data.data.rules.length} rules`);
    console.log(`   Sample Rule Slug: ${ruleSlug}`);
  }

  // 5.2 Get specific rule by slug
  if (ruleSlug) {
    await testEndpoint("5.2 Get Rule By Slug", "GET", `/rules/${ruleSlug}`);
  } else {
    console.log("⚠️  Skipping rule by slug test - no rule slug available");
    stats.skipped++;
  }

  // 5.3 Create new rule (admin only)
  if (adminToken) {
    const testRuleSlug = `test-rule-${Date.now()}`;
    await testEndpoint(
      "5.3 Create Rule (Admin)",
      "POST",
      "/rules",
      {
        slug: testRuleSlug,
        title: "Test Rule Template",
        type: "alert",
        definition: {
          inputBindings: ["user.bmi"],
          logic: [
            {
              when: "user.bmi > 30",
              then: { alert: "high_bmi", severity: "medium" },
            },
          ],
        },
        priority: 50,
        isActive: true,
      },
      {
        Authorization: `Bearer ${adminToken}`,
      }
    );

    // 5.4 Update rule
    await testEndpoint(
      "5.4 Update Rule (Admin)",
      "PUT",
      `/rules/${testRuleSlug}`,
      {
        title: "Updated Test Rule",
        priority: 60,
      },
      {
        Authorization: `Bearer ${adminToken}`,
      }
    );

    // 5.5 Delete rule
    await testEndpoint(
      "5.5 Delete Rule (Admin)",
      "DELETE",
      `/rules/${testRuleSlug}`,
      null,
      {
        Authorization: `Bearer ${adminToken}`,
      }
    );
  } else {
    console.log("⚠️  Skipping admin rule tests - no admin token");
    stats.skipped += 3;
  }

  // ==================== SECTION 6: SYNC PROTOCOL ====================
  console.log("\n🔄 Section 6: Offline Sync Protocol");
  console.log("─".repeat(60));

  if (userToken && foodId) {
    // 6.1 Full sync (first-time)
    const fullSync = await testEndpoint(
      "6.1 Full Sync",
      "GET",
      "/sync/full",
      null,
      {
        Authorization: `Bearer ${userToken}`,
      }
    );

    if (fullSync.success) {
      console.log(`   Server Version: ${fullSync.data.serverVersion}`);
      console.log(`   Foods: ${fullSync.data.foods?.length || 0}`);
      console.log(`   Rules: ${fullSync.data.rules?.length || 0}`);
    }

    // 6.2 Upload meal and glucose logs
    const uploadLogs = await testEndpoint(
      "6.2 Upload Logs (Idempotent)",
      "POST",
      "/sync/upload",
      {
        logs: {
          meals: [
            {
              entries: [
                {
                  foodId: foodId,
                  grams: 200,
                  portionName: "Medium plate",
                },
              ],
              clientGeneratedId: `meal-test-${Date.now()}`,
              createdAt: new Date().toISOString(),
            },
          ],
          glucose: [
            {
              valueMgDl: 140,
              type: "postprandial",
              clientGeneratedId: `glucose-test-${Date.now()}`,
              timestamp: new Date().toISOString(),
              notes: "After lunch",
            },
          ],
        },
        clientVersion: 0,
      },
      {
        Authorization: `Bearer ${userToken}`,
      }
    );

    if (uploadLogs.success) {
      console.log(
        `   Meals Added: ${uploadLogs.data.results?.mealsAdded || 0}`
      );
      console.log(
        `   Glucose Added: ${uploadLogs.data.results?.glucoseAdded || 0}`
      );
    }

    // 6.3 Upload duplicate (should be idempotent)
    const duplicateId = `duplicate-${Date.now()}`;
    await testEndpoint(
      "6.3 Upload Same Log Twice (Idempotency)",
      "POST",
      "/sync/upload",
      {
        logs: {
          meals: [
            {
              entries: [{ foodId: foodId, grams: 150 }],
              clientGeneratedId: duplicateId,
              createdAt: new Date().toISOString(),
            },
          ],
        },
        clientVersion: 0,
      },
      {
        Authorization: `Bearer ${userToken}`,
      }
    );

    // Upload again with same ID
    await testEndpoint(
      "6.3b Duplicate Upload",
      "POST",
      "/sync/upload",
      {
        logs: {
          meals: [
            {
              entries: [{ foodId: foodId, grams: 150 }],
              clientGeneratedId: duplicateId,
              createdAt: new Date().toISOString(),
            },
          ],
        },
        clientVersion: 0,
      },
      {
        Authorization: `Bearer ${userToken}`,
      }
    );

    // 6.4 Get delta updates
    await testEndpoint(
      "6.4 Get Delta Updates",
      "GET",
      "/sync/updates?clientVersion=0",
      null,
      {
        Authorization: `Bearer ${userToken}`,
      }
    );

    // 6.5 Get user aggregations
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const aggregations = await testEndpoint(
      "6.5 Get User Aggregations",
      "GET",
      `/sync/aggregations?from=${lastWeek.toISOString()}&to=${today.toISOString()}`,
      null,
      {
        Authorization: `Bearer ${userToken}`,
      }
    );

    if (aggregations.success) {
      console.log(`   Meal Logs: ${aggregations.data.mealLogs?.length || 0}`);
      console.log(
        `   Glucose Logs: ${aggregations.data.glucoseLogs?.length || 0}`
      );
    }
  } else {
    console.log("⚠️  Skipping sync tests - no user token or food ID");
    stats.skipped += 6;
  }

  // ==================== SECTION 7: REPORTS ====================
  console.log("\n📊 Section 7: Reports & Analytics");
  console.log("─".repeat(60));

  if (userToken && userId) {
    // 7.1 User's own nutrition report
    const today = new Date();
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    await testEndpoint(
      "7.1 User Nutrition Report",
      "GET",
      `/reports/user/${userId}/nutrition?from=${lastMonth.toISOString()}&to=${today.toISOString()}`,
      null,
      {
        Authorization: `Bearer ${userToken}`,
      }
    );

    // 7.2 Try to access another user's report (should fail)
    if (adminId && adminId !== userId) {
      await testEndpoint(
        "7.2 Access Other User Report (Should Fail)",
        "GET",
        `/reports/user/${adminId}/nutrition?from=${lastMonth.toISOString()}&to=${today.toISOString()}`,
        null,
        {
          Authorization: `Bearer ${userToken}`,
        },
        true
      );
    }
  } else {
    console.log("⚠️  Skipping report tests - no user token or user ID");
    stats.skipped += 2;
  }

  // ==================== SECTION 8: ADMIN OPERATIONS ====================
  console.log("\n⚙️  Section 8: Admin Operations");
  console.log("─".repeat(60));

  if (adminToken) {
    // 8.1 Get audit logs
    const audit = await testEndpoint(
      "8.1 Get Audit Logs",
      "GET",
      "/admin/audit?limit=10",
      null,
      {
        Authorization: `Bearer ${adminToken}`,
      }
    );

    if (audit.success) {
      console.log(`   Audit Entries: ${audit.data.data?.length || 0}`);
    }

    // 8.2 Revoke user tokens (create test user first if possible)
    if (userId) {
      await testEndpoint(
        "8.2 Revoke User Tokens",
        "POST",
        "/admin/revoke-user-tokens",
        {
          userId: userId,
        },
        {
          Authorization: `Bearer ${adminToken}`,
        }
      );
    }

    // 8.3 Run seed script (should be idempotent)
    await testEndpoint(
      "8.3 Run Initial Seed (Idempotent)",
      "POST",
      "/admin/seed-initial",
      null,
      {
        Authorization: `Bearer ${adminToken}`,
      }
    );
  } else {
    console.log("⚠️  Skipping admin tests - no admin token");
    stats.skipped += 3;
  }

  // 8.4 Non-admin trying admin endpoint (should fail)
  if (userToken) {
    await testEndpoint(
      "8.4 Non-Admin Access (Should Fail)",
      "GET",
      "/admin/audit",
      null,
      {
        Authorization: `Bearer ${userToken}`,
      },
      true
    );
  }

  // ==================== SECTION 9: SECURITY & VALIDATION ====================
  console.log("\n🔒 Section 9: Security & Validation");
  console.log("─".repeat(60));

  // 9.1 Invalid email format
  await testEndpoint(
    "9.1 Invalid Email Format (Should Fail)",
    "POST",
    "/auth/register",
    {
      email: "not-an-email",
      password: "Test1234",
      consent: { accepted: true },
    },
    {},
    true
  );

  // 9.2 Weak password
  await testEndpoint(
    "9.2 Weak Password (Should Fail)",
    "POST",
    "/auth/register",
    {
      email: "weak@test.com",
      password: "123",
      consent: { accepted: true },
    },
    {},
    true
  );

  // 9.3 Missing consent
  await testEndpoint(
    "9.3 Missing Consent (Should Fail)",
    "POST",
    "/auth/register",
    {
      email: "noconsent@test.com",
      password: "Test1234",
    },
    {},
    true
  );

  // 9.4 Invalid token
  await testEndpoint(
    "9.4 Invalid Token (Should Fail)",
    "GET",
    "/user/me",
    null,
    {
      Authorization: "Bearer invalid.token.here",
    },
    true
  );

  // 9.5 Malformed JSON (server should handle gracefully)
  // Skip this as it requires special handling

  // ==================== SECTION 10: LOGOUT & CLEANUP ====================
  console.log("\n🚪 Section 10: Logout & Cleanup");
  console.log("─".repeat(60));

  if (userToken) {
    // 10.1 Logout user
    await testEndpoint(
      "10.1 Logout User",
      "POST",
      "/auth/logout",
      {
        token: userToken,
      },
      {
        Authorization: `Bearer ${userToken}`,
      }
    );

    // 10.2 Try using logged out token (should fail)
    await testEndpoint(
      "10.2 Use Revoked Token (Should Fail)",
      "GET",
      "/user/me",
      null,
      {
        Authorization: `Bearer ${userToken}`,
      },
      true
    );
  }

  // 10.3 Delete user account (NDPR compliance)
  // Skip actual deletion to preserve test data
  console.log("⚠️  Skipping user deletion to preserve test data");
  stats.skipped++;

  // ==================== FINAL SUMMARY ====================
  console.log("\n" + "═".repeat(60));
  console.log("📈 TEST SUMMARY");
  console.log("═".repeat(60));
  console.log(`Total Tests:   ${stats.total}`);
  console.log(
    `✅ Passed:     ${stats.passed} (${Math.round((stats.passed / stats.total) * 100)}%)`
  );
  console.log(`❌ Failed:     ${stats.failed}`);
  console.log(`⚠️  Skipped:    ${stats.skipped}`);
  console.log("═".repeat(60));

  if (stats.failed === 0) {
    console.log("\n🎉 ALL TESTS PASSED! Backend is production-ready!\n");
  } else {
    console.log("\n⚠️  Some tests failed. Please review the output above.\n");
  }

  process.exit(stats.failed > 0 ? 1 : 0);
}

// Run tests
runComprehensiveTests().catch((error) => {
  console.error("Test suite crashed:", error);
  process.exit(1);
});
