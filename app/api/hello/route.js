// app/routes.js

/**
 * Centralized Routes for COMMALERT System
 * Import this file anywhere to avoid hardcoding paths
 */

export const routes = {
  // Main
  home: "/",

  // Citizen Side
  citizen: {
    root: "/citizen",
    dashboard: "/citizen/dashboard",
    report: "/citizen/report",
    feedback: "/citizen/feedback",
    status: "/citizen/status",
  },

  // Admin Side
  admin: {
    root: "/admin",
    dashboard: "/admin/dashboard",
    reports: "/admin/reports",
    users: "/admin/users",
    analytics: "/admin/analytics",
    settings: "/admin/settings",
  },

  // Auth (optional if you add login)
  auth: {
    login: "/login",
    register: "/register",
    logout: "/logout",
  },

  // API Routes (if using Next.js API)
  api: {
    reports: "/api/reports",
    feedback: "/api/feedback",
    users: "/api/users",
  },
};

/**
 * Helper functions (optional but useful)
 */

export const getCitizenRoute = (page = "") => {
  return `/citizen/${page}`;
};

export const getAdminRoute = (page = "") => {
  return `/admin/${page}`;
};