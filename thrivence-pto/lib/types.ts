export interface PtoEntry {
  id: number;
  employee_name: string;
  start_date: string; // YYYY-MM-DD, inclusive
  end_date: string; // YYYY-MM-DD, inclusive
  note: string | null;
  created_at: string;
}

export interface NewPtoEntry {
  employee_name: string;
  start_date: string;
  end_date: string;
  note?: string;
}

export interface EmployeeSummary {
  name: string;
  annualDays: number;
  daysTakenYtd: number;
  daysLeft: number;
}
