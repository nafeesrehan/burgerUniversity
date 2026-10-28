/**
 * BURGER UNIVERSITY - ADMIN AUTHENTICATION & SECURITY GUARD
 * Enforces strict Supabase Auth + profiles.role = 'admin' check.
 * Uses public anon key only.
 */

const SUPABASE_PROJECT_URL = 'https://wiriaujhlrjcpjfmtean.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpcmlhdWpobHJqY3BqZm10ZWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NDg5MzYsImV4cCI6MjEwODUyNDkzNn0.0C9YLCPtQ-qb0c_B15Wzlgior73vN5lVk1ROkjvg-Sk';

// Initialize Supabase Client
if (typeof window !== 'undefined' && (!window.supabase || !window.supabase.createClient)) {
  console.error('[AdminAuth] Supabase JS library not loaded. Make sure @supabase/supabase-js CDN is included.');
}

const supabaseClient = (typeof window !== 'undefined' && window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

const AdminAuth = {
  client: supabaseClient,

  /**
   * Retrieves active Supabase session
   */
  async getSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.warn('[AdminAuth] Error retrieving session:', error);
      return null;
    }
    return session;
  },

  /**
   * Retrieves the current user's profile and checks their role
   */
  async getCurrentAdminProfile() {
    const session = await this.getSession();
    if (!session || !session.user) return null;

    try {
      const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('id, role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('[AdminAuth] Failed to fetch profile:', error);
        return { user: session.user, role: 'unknown', error: error.message };
      }

      return {
        user: session.user,
        role: profile ? profile.role : 'customer'
      };
    } catch (err) {
      console.error('[AdminAuth] Profile lookup exception:', err);
      return null;
    }
  },

  /**
   * Guard function: enforces logged-in user + profiles.role = 'admin'
   * If non-admin or logged out, redirects immediately to login page.
   */
  async requireAdminGuard(loginPage = 'login.html') {
    const session = await this.getSession();
    if (!session || !session.user) {
      console.warn('[AdminAuth] No active session found. Redirecting to login.');
      window.location.replace(`${loginPage}?error=session_required`);
      return null;
    }

    const adminProfile = await this.getCurrentAdminProfile();
    if (!adminProfile || adminProfile.role !== 'admin') {
      console.warn('[AdminAuth] User role is not admin:', adminProfile?.role);
      // Explicitly sign out non-admin from admin portal to prevent dangling state
      await supabaseClient.auth.signOut();
      window.location.replace(`${loginPage}?error=unauthorized_role`);
      return null;
    }

    // Set up auto-redirect when session expires or sign out occurs
    this.bindSessionListener(loginPage);
    return adminProfile;
  },

  /**
   * Authenticate admin via Email & Password
   */
  async login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      throw new Error('Please enter both email and password.');
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });

    if (error) {
      throw error;
    }

    const user = data.user;
    if (!user) {
      throw new Error('Login failed. Please check credentials.');
    }

    // Verify profile role
    const { data: profile, error: profileErr } = await supabaseClient
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr) {
      console.error('[AdminAuth] Profile check error:', profileErr);
    }

    if (!profile || profile.role !== 'admin') {
      // Sign out unauthorized user immediately
      await supabaseClient.auth.signOut();
      throw new Error('Access Denied: This account does not have admin permissions (profiles.role != "admin").');
    }

    return { user, profile };
  },

  /**
   * Log out and redirect
   */
  async logout(redirectTarget = 'login.html') {
    try {
      await supabaseClient.auth.signOut();
    } catch (e) {
      console.warn('[AdminAuth] Logout warning:', e);
    } finally {
      window.location.replace(redirectTarget);
    }
  },

  /**
   * Listen to auth state transitions and handle token expiration
   */
  bindSessionListener(loginPage = 'login.html') {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        console.warn('[AdminAuth] Session ended or expired. Redirecting to login.');
        window.location.replace(`${loginPage}?error=session_expired`);
      }
    });
  }
};

if (typeof window !== 'undefined') {
  window.AdminAuth = AdminAuth;
}
