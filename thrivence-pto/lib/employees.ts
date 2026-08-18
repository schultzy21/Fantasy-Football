// The Thrivence team roster shown throughout the dashboard (the employee
// dropdown when adding PTO, the leadership summary, etc).
//
// To add someone: add a new line following the same pattern.
// To remove someone: delete their line. This does NOT delete any PTO they
// already entered -- their past/upcoming days stay on the calendar, they
// just won't appear as an option for new entries.
//
// `annualDays` is each person's PTO allotment for the year, used to compute
// "days left" on the leadership summary. Adjust it any time someone's
// allotment changes.
export interface Employee {
  name: string;
  annualDays: number;
}

const DEFAULT_ANNUAL_DAYS = 15;

export const EMPLOYEES: Employee[] = [
  { name: "Paul Kleine-Kracht", annualDays: DEFAULT_ANNUAL_DAYS },
  { name: "Bob Higgins", annualDays: DEFAULT_ANNUAL_DAYS },
  { name: "Ralph Schulz", annualDays: DEFAULT_ANNUAL_DAYS },
  { name: "Alecia Wynn", annualDays: DEFAULT_ANNUAL_DAYS },
  { name: "Brett Berneburg", annualDays: DEFAULT_ANNUAL_DAYS },
  { name: "Carla Worthey", annualDays: DEFAULT_ANNUAL_DAYS },
  { name: "Don Murray", annualDays: DEFAULT_ANNUAL_DAYS },
  { name: "Gary McClure", annualDays: DEFAULT_ANNUAL_DAYS },
  { name: "Jason Shelton", annualDays: DEFAULT_ANNUAL_DAYS },
  { name: "Adam Richards", annualDays: DEFAULT_ANNUAL_DAYS },
  { name: "Katherine Ungar", annualDays: DEFAULT_ANNUAL_DAYS },
  { name: "Lenny Durrough", annualDays: DEFAULT_ANNUAL_DAYS },
  { name: "Caroline Crawford", annualDays: DEFAULT_ANNUAL_DAYS },
  { name: "Josh Cline", annualDays: DEFAULT_ANNUAL_DAYS },
  { name: "Robin Underwood", annualDays: DEFAULT_ANNUAL_DAYS },
  { name: "Matthew Hisscock", annualDays: DEFAULT_ANNUAL_DAYS },
  { name: "Michael Shields", annualDays: DEFAULT_ANNUAL_DAYS },
  { name: "Garrett Schultz", annualDays: DEFAULT_ANNUAL_DAYS },
  { name: "Chandler Schultz", annualDays: DEFAULT_ANNUAL_DAYS },

  // -- add new team members above this line, following the same format --
];

export const EMPLOYEE_NAMES = EMPLOYEES.map((e) => e.name);
