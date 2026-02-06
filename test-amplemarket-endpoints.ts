import { createAmplemarketClient } from "./server/amplemarketClient";

async function testEndpoints() {
  const apiKey = process.env.AMPLEMARKET_API_KEY;
  if (!apiKey) {
    console.error("AMPLEMARKET_API_KEY not set");
    process.exit(1);
  }

  const client = createAmplemarketClient(apiKey);

  console.log("\n=== Testing Amplemarket API Endpoints ===\n");

  // Test /prospects endpoint (might be the listing endpoint we need)
  try {
    console.log("1. Testing GET /prospects with pagination...");
    const prospects = await (client as any).client.get("/prospects", {
      params: { limit: 10, offset: 0 }
    });
    console.log("✅ /prospects works!");
    console.log("Response keys:", Object.keys(prospects.data));
    console.log("Sample:", JSON.stringify(prospects.data).substring(0, 300));
  } catch (error: any) {
    console.log("❌ /prospects failed:", error.response?.status, error.response?.data);
  }

  // Test /leads endpoint
  try {
    console.log("\n2. Testing GET /leads with pagination...");
    const leads = await (client as any).client.get("/leads", {
      params: { limit: 10, offset: 0 }
    });
    console.log("✅ /leads works!");
    console.log("Response keys:", Object.keys(leads.data));
    console.log("Sample:", JSON.stringify(leads.data).substring(0, 300));
  } catch (error: any) {
    console.log("❌ /leads failed:", error.response?.status, error.response?.data);
  }

  // Test /contacts with ids parameter
  try {
    console.log("\n3. Testing GET /contacts with ids parameter...");
    const contacts = await (client as any).client.get("/contacts", {
      params: { ids: "test-id-1,test-id-2" }
    });
    console.log("✅ /contacts with ids works!");
    console.log("Response keys:", Object.keys(contacts.data));
  } catch (error: any) {
    console.log("❌ /contacts with ids failed:", error.response?.status, error.response?.data);
  }

  // Test /search/contacts endpoint
  try {
    console.log("\n4. Testing POST /search/contacts...");
    const search = await (client as any).client.post("/search/contacts", {
      limit: 10,
      offset: 0
    });
    console.log("✅ /search/contacts works!");
    console.log("Response keys:", Object.keys(search.data));
    console.log("Sample:", JSON.stringify(search.data).substring(0, 300));
  } catch (error: any) {
    console.log("❌ /search/contacts failed:", error.response?.status, error.response?.data);
  }
}

testEndpoints().catch(console.error);
