// API utility file for making authenticated requests to Django backend
import { API_ENDPOINTS, APPRAISAL_SECTIONS } from './constants';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get authentication token from localStorage
 * TODO: Replace with your actual authentication mechanism
 */
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

/**
 * Get user ID from localStorage or session
 * Returns empty string if not available — callers must check.
 */
export const getUserId = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('user_id') || '';
  }
  return '';
};

/**
 * Set user ID in localStorage
 */
export const setUserId = (userId: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user_id', userId);
  }
};

/**
 * Generic fetch wrapper with error handling and authentication
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge existing headers
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, options.headers);
    }
  }

  // Add authentication token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      const error = isJson
        ? await response.json().catch(() => ({ message: 'Request failed' }))
        : { message: await response.text() || `HTTP error! status: ${response.status}` };
      
      throw new ApiError(
        error.message || 'An error occurred',
        response.status,
        error
      );
    }

    return (isJson ? response.json() : response.text()) as Promise<T>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error occurred'
    );
  }
}

/**
 * GET request helper
 */
export async function apiGet<T = unknown>(
  url: string,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  const queryString = params
    ? '?' + new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {} as Record<string, string>)
      ).toString()
    : '';

  return apiFetch<T>(url + queryString, { method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost<T = unknown>(
  url: string,
  data?: unknown
): Promise<T> {
  return apiFetch<T>(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request helper
 */
export async function apiPut<T = unknown>(
  url: string,
  data?: unknown
): Promise<T> {
  return apiFetch<T>(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = unknown>(
  url: string
): Promise<T> {
  return apiFetch<T>(url, { method: 'DELETE' });
}

/**
 * Get data for a specific section from the backend
 */
export async function getItemBySection(
  section: string,
  userId?: string
): Promise<unknown> {
  const user_id = userId || getUserId();
  return apiGet(API_ENDPOINTS.GET_ITEM_BY_SECTION, {
    user_id,
    section,
  });
}

/**
 * Type-safe section mapping from frontend section IDs to backend section keys
 * Dynamically generated from APPRAISAL_SECTIONS
 */
export const SECTION_TO_BACKEND_KEY: Record<string, string> = {
  'general-details': '1-10',
  '11-conference-events': '11',
  '12-1-lectures-tutorials': '12.1',
  '12-2-reading-material': '12.2',
  '12-3-4-project-guidance-and-exam-duties': '12.3-12.4',
  '13-student-activities': '13',
  '14-research-papers': '14',
  '15-books-chapters': '15',
  '16-research-projects': '16',
  '17-research-guidance': '17',
  '18-memberships': '18',
  '19-other-info': '19',
} as const;

/**
 * Validate that a section ID exists in APPRAISAL_SECTIONS
 */
export function isValidSectionId(sectionId: string): boolean {
  return APPRAISAL_SECTIONS.some(section => section.id === sectionId);
}

/**
 * Get the backend section key from frontend section ID
 */
export function getBackendSectionKey(frontendSectionId: string): string {
  const backendKey = SECTION_TO_BACKEND_KEY[frontendSectionId];
  if (!backendKey) {
    console.warn(`Unknown section ID: ${frontendSectionId}, using as-is`);
    return frontendSectionId;
  }
  return backendKey;
}

/**
 * Get all faculty appraisal data for HOD dashboard
 */
export async function getAllFacultyData(): Promise<unknown> {
    const result = await apiGet(API_ENDPOINTS.GET_ALL_FACULTY_DATA);
    return result;
}

/**
 * Sync the full frontend AppraisalData blob to the server.
 * This ensures progress persists across browsers/devices.
 */
export async function syncAppraisalProgress(data: unknown): Promise<void> {
  const userId = getUserId();
  if (!userId) {
    console.warn('syncAppraisalProgress: No user_id, skipping sync');
    return;
  }
  try {
    await apiPost(API_ENDPOINTS.SYNC_APPRAISAL_PROGRESS, {
      user_id: userId,
      data,
    });
  } catch (error) {
    // Fire-and-forget: don't break the UI if sync fails
    console.error('Failed to sync appraisal progress to server:', error);
  }
}

/**
 * Load the saved frontend AppraisalData blob from the server.
 * Returns null if no saved progress exists.
 */
export async function loadAppraisalProgress(userId?: string): Promise<unknown | null> {
  const uid = userId || getUserId();
  if (!uid) {
    console.warn('loadAppraisalProgress: No user_id, skipping load');
    return null;
  }
  try {
    const response = await apiGet<{ message: string; result: unknown | null }>(
      API_ENDPOINTS.GET_APPRAISAL_PROGRESS,
      { user_id: uid }
    );
    return response?.result ?? null;
  } catch (error) {
    console.error('Failed to load appraisal progress from server:', error);
    return null;
  }
}

/**
 * Update the appraisal status by HOD/Admin.
 */
export async function updateAppraisalStatus(
  userId: string,
  status: string,
  verifiedScore: number,
  adminRemarks: string
): Promise<void> {
  try {
    await apiPost(API_ENDPOINTS.UPDATE_APPRAISAL_STATUS, {
      user_id: userId,
      status: status,
      verified_score: verifiedScore,
      admin_remarks: adminRemarks,
    });
  } catch (error) {
    console.error('Failed to update appraisal status:', error);
    throw error;
  }
}

/**
 * Fetch the admin appraisal status for the user.
 */
export async function getAppraisalStatus(userId?: string): Promise<unknown | null> {
  const uid = userId || getUserId();
  if (!uid) {
    return null;
  }
  try {
    const response = await apiGet<{ message: string; result: unknown | null }>(
      API_ENDPOINTS.GET_APPRAISAL_STATUS,
      { user_id: uid }
    );
    return response?.result ?? null;
  } catch (error) {
    console.error('Failed to fetch appraisal status:', error);
    return null;
  }
}

/**
 * Submit the appraisal for HOD/Admin review.
 */
export async function submitAppraisal(userId?: string): Promise<void> {
  const uid = userId || getUserId();
  if (!uid) {
    throw new Error('User ID not found');
  }
  try {
    await apiPost(API_ENDPOINTS.SUBMIT_APPRAISAL, { user_id: uid });
  } catch (error) {
    console.error('Failed to submit appraisal:', error);
    throw error;
  }
}



