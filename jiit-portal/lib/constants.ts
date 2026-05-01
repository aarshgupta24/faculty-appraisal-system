// Backend API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
export const API_ENDPOINTS = {
  BASE: `${API_BASE_URL}/api`,
  GET_ITEM_BY_SECTION: `${API_BASE_URL}/api/get-item-by-section/`,
  INJEST_ITEM_1_TO_10: `${API_BASE_URL}/api/injest-item-1-to-10/`,
  INJEST_ITEM_11: `${API_BASE_URL}/api/injest-item-11/`,
  INJEST_ITEM_12_1: `${API_BASE_URL}/api/injest-item-12-1/`,
  INJEST_ITEM_12_2: `${API_BASE_URL}/api/injest-item-12-2/`,
  INJEST_ITEM_12_3_TO_12_4: `${API_BASE_URL}/api/injest-item-12-3-to-12-4/`,
  INJEST_ITEM_13: `${API_BASE_URL}/api/injest-item-13/`,
  INJEST_ITEM_14: `${API_BASE_URL}/api/injest-item-14/`,
  INJEST_ITEM_15: `${API_BASE_URL}/api/injest-item-15/`,
  INJEST_ITEM_16: `${API_BASE_URL}/api/injest-item-16/`,
  INJEST_ITEM_17: `${API_BASE_URL}/api/injest-item-17/`,
  INJEST_ITEM_18: `${API_BASE_URL}/api/injest-item-18/`,
  INJEST_ITEM_19: `${API_BASE_URL}/api/injest-item-19/`,
  GET_ALL_FACULTY_DATA: `${API_BASE_URL}/api/get-all-faculty-data/`,
  SYNC_APPRAISAL_PROGRESS: `${API_BASE_URL}/api/sync-appraisal-progress/`,
  GET_APPRAISAL_PROGRESS: `${API_BASE_URL}/api/get-appraisal-progress/`,
  UPDATE_APPRAISAL_STATUS: `${API_BASE_URL}/api/update-appraisal-status/`,
  GET_APPRAISAL_STATUS: `${API_BASE_URL}/api/get-appraisal-status/`,
  SUBMIT_APPRAISAL: `${API_BASE_URL}/api/submit-appraisal/`,
} as const;

export const APPRAISAL_SECTIONS = [
  { id: 'general-details', title: '1. General Details', route: '/appraisal/general-details' },
  { id: '11-conference-events', title: '2. Conference and All', route: '/appraisal/11-conference-events' },
  { id: '12-1-lectures-tutorials', title: '3. Lectures/Tutorials/Practicals', route: '/appraisal/12-1-lectures-tutorials' },
  { id: '12-2-reading-material', title: '4. Reading Material', route: '/appraisal/12-2-reading-material' },
  { id: '12-3-4-project-guidance-and-exam-duties', title: '5. Project Guidance', route: '/appraisal/12-3-4-project-guidance-and-exam-duties' },
  // { id: '12-4-exam-duties', title: '6. Examination Duties', route: '/appraisal/exam-duties' },
  { id: '13-student-activities', title: '7. Student Activities', route: '/appraisal/13-student-activities' },
  { id: '14-research-papers', title: '8. Research Papers', route: '/appraisal/14-research-papers' },
  { id: '15-books-chapters', title: '9. Books & Chapters', route: '/appraisal/15-books-chapters' },
  { id: '16-research-projects', title: '10. Research Projects', route: '/appraisal/16-research-projects' },
  { id: '17-research-guidance', title: '11. Research Guidance', route: '/appraisal/17-research-guidance' },
  { id: '18-memberships', title: '12. Memberships', route: '/appraisal/18-memberships' },
  { id: '19-other-info', title: '13. Other Information', route: '/appraisal/19-other-info' },
] as const;

export const PUBLICATION_TYPES = [
  { value: 'IJ', label: 'International Journal' },
  { value: 'NJ', label: 'National Journal' },
  { value: 'IC', label: 'International Conference' },
  { value: 'PN', label: 'Patent' },
  { value: 'OA', label: 'Open Access' },
  { value: 'OJ', label: 'Other Journal' },
] as const;

// Helper type to extract section IDs
export type AppraisalSectionId = typeof APPRAISAL_SECTIONS[number]['id'];

// Helper to get all section IDs as an array
export const SECTION_IDS = APPRAISAL_SECTIONS.map(section => section.id);

// Helper to get section by ID
export const getSectionById = (id: string) => {
  return APPRAISAL_SECTIONS.find(section => section.id === id);
};

