/**
 * Test script to capture exact Amplemarket API response shapes
 * Run with: tsx test-amplemarket-responses.ts
 */

import { createAmplemarketClient } from './server/amplemarketClient';
import * as db from './server/db';

async function testAmplemarketResponses() {
  console.log('=== Testing Amplemarket API Response Shapes ===\n');
  
  // Get Amplemarket integration from database
  const tenantId = '0ddcBrFyT7eSiT1DmAkMA'; // Use known tenant with Amplemarket connected
  const integrations = await db.getIntegrationsByTenant(tenantId);
  const amplemarketIntegration = integrations.find((i: any) => i.provider === 'amplemarket');
  
  if (!amplemarketIntegration || amplemarketIntegration.status !== 'connected') {
    console.error('❌ Amplemarket not connected for tenant:', tenantId);
    process.exit(1);
  }
  
  const apiKey = (amplemarketIntegration.config as any)?.apiKey;
  if (!apiKey) {
    console.error('❌ Amplemarket API key not found');
    process.exit(1);
  }
  
  console.log('✅ Found Amplemarket integration with API key\n');
  
  const client = createAmplemarketClient(apiKey);
  
  // Test 1: Get Lists
  console.log('=== TEST 1: GET /lead-lists ===');
  try {
    const listsData = await client.getLists();
    console.log('Status: 200');
    console.log('Content-Type: application/json');
    console.log('Response Keys:', Object.keys(listsData));
    console.log('Response Type:', typeof listsData);
    console.log('Has lead_lists:', !!listsData.lead_lists);
    console.log('lead_lists Type:', Array.isArray(listsData.lead_lists) ? 'array' : typeof listsData.lead_lists);
    console.log('lead_lists Count:', listsData.lead_lists?.length || 0);
    
    if (listsData.lead_lists && listsData.lead_lists.length > 0) {
      console.log('\nSample List Item:');
      console.log(JSON.stringify(listsData.lead_lists[0], null, 2));
    }
    
    console.log('\nFull Response Shape:');
    console.log(JSON.stringify(listsData, null, 2).substring(0, 500) + '...');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Status:', error.response?.status);
    console.error('Response:', error.response?.data);
  }
  
  console.log('\n=== TEST 2: GET /sequences ===');
  try {
    const sequencesData = await client.getSequences();
    console.log('Status: 200');
    console.log('Content-Type: application/json');
    console.log('Response Keys:', Object.keys(sequencesData));
    console.log('Response Type:', typeof sequencesData);
    console.log('Has sequences:', !!sequencesData.sequences);
    console.log('sequences Type:', Array.isArray(sequencesData.sequences) ? 'array' : typeof sequencesData.sequences);
    console.log('sequences Count:', sequencesData.sequences?.length || 0);
    
    if (sequencesData.sequences && sequencesData.sequences.length > 0) {
      console.log('\nSample Sequence Item:');
      console.log(JSON.stringify(sequencesData.sequences[0], null, 2));
    }
    
    console.log('\nFull Response Shape:');
    console.log(JSON.stringify(sequencesData, null, 2).substring(0, 500) + '...');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Status:', error.response?.status);
    console.error('Response:', error.response?.data);
  }
  
  console.log('\n=== BACKEND CONTRACT ENFORCEMENT ===');
  console.log('Backend MUST return:');
  console.log('  200 with { lists: [...] } for getAmplemarketLists');
  console.log('  200 with { sequences: [...] } for getAmplemarketSequences');
  console.log('  non-200 with { error: { code, message, details } } for errors');
  
  process.exit(0);
}

testAmplemarketResponses().catch(console.error);
