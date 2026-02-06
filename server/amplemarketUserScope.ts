import axios from "axios";

const AMPLEMARKET_API_BASE = "https://api.amplemarket.com";

/**
 * Get user-scoped list IDs and sequence IDs for a given Amplemarket user email
 * Returns only lists/sequences owned by or linked to the specified user
 */
export async function getAmplemarketUserScope(
  apiKey: string,
  userEmail: string
): Promise<{
  listIds: string[];
  sequenceIds: string[];
  lists: Array<{ id: string; name: string; owner: string; shared: boolean }>;
  sequences: Array<{ id: string; name: string; createdBy: string }>;
}> {
  console.log("[Amplemarket User Scope] Fetching scope for user:", userEmail);

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  // Fetch all lists
  let userLists: any[] = [];
  try {
    const listsResponse = await axios.get(`${AMPLEMARKET_API_BASE}/lead-lists`, { headers });
    
    // Normalize API response - handle different response structures
    let allLists: any[];
    if (Array.isArray(listsResponse.data)) {
      allLists = listsResponse.data;
    } else if (listsResponse.data?.lead_lists && Array.isArray(listsResponse.data.lead_lists)) {
      // CORRECT: Amplemarket returns lead_lists (with underscore)
      allLists = listsResponse.data.lead_lists;
    } else if (listsResponse.data?.leadLists && Array.isArray(listsResponse.data.leadLists)) {
      allLists = listsResponse.data.leadLists;
    } else if (listsResponse.data?.data && Array.isArray(listsResponse.data.data)) {
      allLists = listsResponse.data.data;
    } else if (listsResponse.data?.lists && Array.isArray(listsResponse.data.lists)) {
      allLists = listsResponse.data.lists;
    } else {
      console.error("[Amplemarket User Scope] Unexpected lists response format:", {
        responseKeys: Object.keys(listsResponse.data || {}),
        isArray: Array.isArray(listsResponse.data),
        sample: JSON.stringify(listsResponse.data).substring(0, 200)
      });
      throw new Error("Failed to load lists due to unexpected response format.");
    }
    
    // Filter lists: owned by user OR shared
    userLists = allLists.filter((list: any) => 
      list.owner === userEmail || list.shared === true
    );
    
    console.log("[Amplemarket User Scope] Lists found:", {
      total: allLists.length,
      userOwned: allLists.filter((l: any) => l.owner === userEmail).length,
      shared: allLists.filter((l: any) => l.shared === true).length,
      filtered: userLists.length
    });
  } catch (error: any) {
    console.error("[Amplemarket User Scope] Error fetching lists:", {
      status: error.response?.status,
      message: error.message
    });
    throw new Error(`Failed to fetch Amplemarket lists: ${error.message}`);
  }

  // Fetch all sequences
  let userSequences: any[] = [];
  try {
    const sequencesResponse = await axios.get(`${AMPLEMARKET_API_BASE}/sequences`, { headers });
    
    // Normalize API response - handle different response structures
    let allSequences: any[];
    if (Array.isArray(sequencesResponse.data)) {
      allSequences = sequencesResponse.data;
    } else if (sequencesResponse.data?.sequences && Array.isArray(sequencesResponse.data.sequences)) {
      allSequences = sequencesResponse.data.sequences;
    } else if (sequencesResponse.data?.data && Array.isArray(sequencesResponse.data.data)) {
      allSequences = sequencesResponse.data.data;
    } else {
      console.error("[Amplemarket User Scope] Unexpected sequences response format:", {
        responseKeys: Object.keys(sequencesResponse.data || {}),
        isArray: Array.isArray(sequencesResponse.data),
        sample: JSON.stringify(sequencesResponse.data).substring(0, 200)
      });
      throw new Error("Failed to load sequences due to unexpected response format.");
    }
    
    // Filter sequences: created by user
    userSequences = allSequences.filter((seq: any) => 
      seq.created_by_user_email === userEmail
    );
    
    console.log("[Amplemarket User Scope] Sequences found:", {
      total: allSequences.length,
      userCreated: userSequences.length
    });
  } catch (error: any) {
    console.error("[Amplemarket User Scope] Error fetching sequences:", {
      status: error.response?.status,
      message: error.message
    });
    throw new Error(`Failed to fetch Amplemarket sequences: ${error.message}`);
  }

  const result = {
    listIds: userLists.map(l => l.id),
    sequenceIds: userSequences.map(s => s.id),
    lists: userLists.map(l => ({
      id: l.id,
      name: l.name,
      owner: l.owner,
      shared: l.shared || false
    })),
    sequences: userSequences.map(s => ({
      id: s.id,
      name: s.name,
      createdBy: s.created_by_user_email
    }))
  };

  console.log("[Amplemarket User Scope] Scope result:", {
    listIds: result.listIds.length,
    sequenceIds: result.sequenceIds.length
  });

  return result;
}

/**
 * Get Amplemarket user_id by email address
 * Per Amplemarket support: Some task endpoints require user_id parameter
 * Use List Users endpoint first to retrieve user IDs
 */
export async function getUserIdByEmail(
  apiKey: string,
  userEmail: string
): Promise<string> {
  console.log("[Amplemarket User ID] Fetching user_id for email:", userEmail);

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    const usersResponse = await axios.get(`${AMPLEMARKET_API_BASE}/users`, { headers });
    
    console.log("[Amplemarket User ID] Users response:", {
      status: usersResponse.status,
      responseKeys: Object.keys(usersResponse.data || {}),
      usersCount: usersResponse.data?.users?.length || 0
    });
    
    // Normalize API response - handle different response structures
    let allUsers: any[];
    if (Array.isArray(usersResponse.data)) {
      allUsers = usersResponse.data;
    } else if (usersResponse.data?.users && Array.isArray(usersResponse.data.users)) {
      allUsers = usersResponse.data.users;
    } else if (usersResponse.data?.data && Array.isArray(usersResponse.data.data)) {
      allUsers = usersResponse.data.data;
    } else {
      console.error("[Amplemarket User ID] Unexpected users response format:", {
        responseKeys: Object.keys(usersResponse.data || {}),
        isArray: Array.isArray(usersResponse.data),
        sample: JSON.stringify(usersResponse.data).substring(0, 200)
      });
      throw new Error("Failed to load users due to unexpected response format.");
    }
    
    // Find user by email
    const user = allUsers.find((u: any) => u.email === userEmail);
    
    if (!user) {
      console.error("[Amplemarket User ID] User not found:", {
        searchEmail: userEmail,
        availableEmails: allUsers.map((u: any) => u.email)
      });
      throw new Error(`Amplemarket user not found with email: ${userEmail}`);
    }
    
    if (!user.id) {
      console.error("[Amplemarket User ID] User found but missing ID:", {
        userEmail,
        availableFields: Object.keys(user)
      });
      throw new Error(`Amplemarket user ${userEmail} is missing ID field`);
    }
    
    console.log("[Amplemarket User ID] User ID found:", {
      email: userEmail,
      userId: user.id
    });
    
    return user.id;
  } catch (error: any) {
    console.error("[Amplemarket User ID] Error fetching user ID:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      responseData: error.response?.data
    });
    
    // Enhanced 404 logging per requirements
    if (error.response?.status === 404) {
      const fullPath = error.config?.url || `${AMPLEMARKET_API_BASE}/users`;
      console.error("[Amplemarket User ID] 404 ERROR - Endpoint does not exist:", {
        fullPath,
        method: error.config?.method?.toUpperCase() || "GET",
        message: "The /users endpoint does not exist or is not accessible with current credentials"
      });
      throw new Error(`Amplemarket endpoint does not exist: ${fullPath}. Please verify the API endpoint with Amplemarket support.`);
    }
    
    throw new Error(`Failed to fetch Amplemarket user ID: ${error.message}`);
  }
}
