// Demo authentication for frontend-only deployment
// This simulates the authentication without requiring server-side API routes

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: string;
  divisionId: string | null;
  divisionName: string | null;
  divisionCode: string | null;
}

// Demo users database (simulated)
const DEMO_USERS: Record<string, DemoUser> = {
  'intellegix@allsurfaceroofing.com': {
    id: 'admin-005',
    email: 'Intellegix@allsurfaceroofing.com',
    name: 'Austin Kidwell - Director of Systems Integrations',
    role: 'DIRECTOR_OF_SYSTEMS_INTEGRATIONS',
    divisionId: null,
    divisionName: null,
    divisionCode: null,
  },
  'owner1@allsurfaceroofing.com': {
    id: 'owner-001',
    email: 'owner1@allsurfaceroofing.com',
    name: 'Division Owner 1',
    role: 'DIVISION_LEADER',
    divisionId: 'div-001',
    divisionName: 'CAPEX Division',
    divisionCode: 'O1',
  },
  'owner2@allsurfaceroofing.com': {
    id: 'owner-002',
    email: 'owner2@allsurfaceroofing.com',
    name: 'Division Owner 2',
    role: 'DIVISION_LEADER',
    divisionId: 'div-002',
    divisionName: 'Repairs Division',
    divisionCode: 'O2',
  },
  'owner3@allsurfaceroofing.com': {
    id: 'owner-003',
    email: 'owner3@allsurfaceroofing.com',
    name: 'Division Owner 3',
    role: 'DIVISION_LEADER',
    divisionId: 'div-003',
    divisionName: 'Roofing Division',
    divisionCode: 'O3',
  },
  'owner4@allsurfaceroofing.com': {
    id: 'owner-004',
    email: 'owner4@allsurfaceroofing.com',
    name: 'Division Owner 4',
    role: 'DIVISION_LEADER',
    divisionId: 'div-004',
    divisionName: 'General Contract',
    divisionCode: 'O4',
  },
  'owner5@allsurfaceroofing.com': {
    id: 'owner-005',
    email: 'owner5@allsurfaceroofing.com',
    name: 'Division Owner 5',
    role: 'DIVISION_LEADER',
    divisionId: 'div-005',
    divisionName: 'Sub Management',
    divisionCode: 'O5',
  },
  'owner6@allsurfaceroofing.com': {
    id: 'owner-006',
    email: 'owner6@allsurfaceroofing.com',
    name: 'Division Owner 6',
    role: 'DIVISION_LEADER',
    divisionId: 'div-006',
    divisionName: 'Specialty',
    divisionCode: 'O6',
  },
  'opsmgr@allsurfaceroofing.com': {
    id: 'ops-001',
    email: 'opsmgr@allsurfaceroofing.com',
    name: 'Operations Manager',
    role: 'OPERATIONS_MANAGER',
    divisionId: null,
    divisionName: null,
    divisionCode: null,
  },
  'accounting@allsurfaceroofing.com': {
    id: 'acc-001',
    email: 'accounting@allsurfaceroofing.com',
    name: 'Accounting Department',
    role: 'ACCOUNTING',
    divisionId: null,
    divisionName: null,
    divisionCode: null,
  },
};

// Demo passwords (all demo accounts use 'demo123', Intellegix uses 'Devops$@2026')
const DEMO_PASSWORDS: Record<string, string> = {
  'intellegix@allsurfaceroofing.com': 'Devops$@2026',
  'owner1@allsurfaceroofing.com': 'demo123',
  'owner2@allsurfaceroofing.com': 'demo123',
  'owner3@allsurfaceroofing.com': 'demo123',
  'owner4@allsurfaceroofing.com': 'demo123',
  'owner5@allsurfaceroofing.com': 'demo123',
  'owner6@allsurfaceroofing.com': 'demo123',
  'opsmgr@allsurfaceroofing.com': 'demo123',
  'accounting@allsurfaceroofing.com': 'demo123',
};

export async function authenticateDemo(identifier: string, password: string): Promise<DemoUser | null> {
  // Handle username-only login (append domain)
  let emailToSearch = identifier.toLowerCase();
  if (!identifier.includes('@')) {
    emailToSearch = `${identifier.toLowerCase()}@allsurfaceroofing.com`;
  }

  console.log('🔐 Demo auth attempt:', emailToSearch);

  // Check if user exists
  const user = DEMO_USERS[emailToSearch];
  if (!user) {
    console.log('❌ User not found:', emailToSearch);
    return null;
  }

  // Check password
  const expectedPassword = DEMO_PASSWORDS[emailToSearch];
  if (password !== expectedPassword) {
    console.log('❌ Invalid password for:', emailToSearch);
    return null;
  }

  console.log('✅ Demo authentication successful:', user.name);
  return user;
}

// Session management using localStorage
export function setDemoSession(user: DemoUser): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('demo_session', JSON.stringify({
      user,
      expires: Date.now() + (8 * 60 * 60 * 1000), // 8 hours
    }));
  }
}

export function getDemoSession(): DemoUser | null {
  if (typeof window === 'undefined') return null;

  try {
    const session = localStorage.getItem('demo_session');
    if (!session) return null;

    const parsed = JSON.parse(session);
    if (Date.now() > parsed.expires) {
      localStorage.removeItem('demo_session');
      return null;
    }

    return parsed.user;
  } catch {
    return null;
  }
}

export function clearDemoSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('demo_session');
  }
}