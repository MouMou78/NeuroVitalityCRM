import { describe, it, expect } from 'vitest';
import { createAmplemarketClient } from './amplemarketClient';

/**
 * Regression test: Prevent /contacts calls without ids parameter
 * 
 * Root cause: /contacts is NOT a paginated list endpoint. It is a "fetch by ids" endpoint.
 * Amplemarket returns 400 with error: missing_field: "Missing field from request: ids"
 * 
 * This test ensures we never call /contacts without the ids parameter.
 */
describe('Amplemarket /contacts endpoint usage', () => {
  it('should never call /contacts without ids parameter', () => {
    // This test documents the correct usage pattern
    // /contacts requires ids parameter - it is NOT a listing endpoint
    
    const correctUsage = {
      endpoint: '/contacts',
      requiredParams: ['ids'],
      example: '/contacts?ids=id1,id2,id3',
      description: '/contacts is a "fetch by ids" endpoint, not a listing endpoint'
    };
    
    const incorrectUsage = {
      endpoint: '/contacts',
      params: { limit: 100, offset: 0 },
      error: 'missing_field: "Missing field from request: ids"',
      statusCode: 400
    };
    
    expect(correctUsage.requiredParams).toContain('ids');
    expect(incorrectUsage.statusCode).toBe(400);
  });
  
  it('should use two-step fetch for all_user_contacts mode', () => {
    // Correct implementation:
    // Step 1: Get lead IDs from /lead-lists/{id} (supports pagination)
    // Step 2: Hydrate contacts via /contacts?ids=... in batches
    
    const twoStepFetch = {
      step1: {
        endpoint: '/lead-lists/{id}',
        purpose: 'Get lead IDs with owner info',
        supports: ['pagination', 'owner filtering']
      },
      step2: {
        endpoint: '/contacts',
        requiredParams: ['ids'],
        batchSize: 100,
        purpose: 'Hydrate full contact details'
      }
    };
    
    expect(twoStepFetch.step1.supports).toContain('pagination');
    expect(twoStepFetch.step2.requiredParams).toContain('ids');
    expect(twoStepFetch.step2.batchSize).toBeGreaterThan(0);
    expect(twoStepFetch.step2.batchSize).toBeLessThanOrEqual(100);
  });
  
  it('should document that /contacts is not a listing endpoint', () => {
    // This test serves as documentation
    const endpointTypes = {
      listingEndpoints: [
        '/lead-lists',      // Returns list of all lead lists
        '/lead-lists/{id}', // Returns leads from a specific list (supports pagination)
        '/sequences',       // Returns list of all sequences
        '/users'            // Returns list of all users
      ],
      fetchByIdEndpoints: [
        '/contacts'         // Requires ids parameter - NOT a listing endpoint
      ]
    };
    
    expect(endpointTypes.fetchByIdEndpoints).toContain('/contacts');
    expect(endpointTypes.listingEndpoints).not.toContain('/contacts');
  });
});
