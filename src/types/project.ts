// The allowed statuses a project can have
export type ProjectStatus = 'Active' | 'Pending' | 'In Progress' | 'On Hold' | 'Completed' | 'Archived';

// The allowed category labels for the table display
export type ProjectCategory = 'Development' | 'Marketing' | 'Research' | 'Consulting' | 'Design' | 'Finance';

// A single billing code line attached to a project
export type BillingCode = {
  id: number;
  label: string;        // e.g. "Internal"
  clientProject: string; // e.g. "CP-2024-001"
  sdsCca: string;
  rc: string;           // e.g. "RC-12"
  amount: string;       // dollar amount as text so "$0.00" formatting is preserved
};

// A single resource (employee + hourly rate) assigned to a project
export type Resource = {
  id: number;
  employee: string;  // the employee's display name
  rate: string;      // hourly rate as text, e.g. "95.00"
};

// The shape of a complete project record stored in the database
export type Project = {
  id: number;
  name: string;
  npxNumber: string;       // e.g. "NPX-1029"
  client: string;
  category: ProjectCategory;
  projectType?: string;    // "FP" (Fixed Price) or "T&M" (Time & Materials)
  status: ProjectStatus;
  startDate?: string;      // ISO date e.g. "2026-06-20"
  endDate?: string;
  createdAt: string;       // ISO date set by server on creation
  billingCodes?: BillingCode[];
  resources?: Resource[];
  photo?: string;
};
