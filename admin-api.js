/**
 * BURGER UNIVERSITY - ADMIN DATA LAYER (Supabase Queries & Realtime)
 * Separated query layer utilizing @supabase/supabase-js with public anon key.
 * Enforces server-side pagination, strict escaping, and real-time syncing.
 */

const AdminApi = {
  get client() {
    return (typeof window !== 'undefined' && window.AdminAuth) ? window.AdminAuth.client : null;
  },

  // -----------------------------------------------------------------
  // 1. DASHBOARD METRICS & RECENT FEEDS
  // -----------------------------------------------------------------

  async fetchDashboardMetrics() {
    const supabase = this.client;
    if (!supabase) throw new Error('Supabase client not initialized.');

    // Today's date string representation for West Bengal/Indian context & ISO
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];
    const todayLabel = 'Today';

    try {
      // 1. Total pending bookings
      const { count: pendingCount, error: pendingErr } = await supabase
        .from('table_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // 2. Bookings today (either booking_date = 'Today' or created_at >= today start)
      const { count: todayBookingsCount, error: todayErr } = await supabase
        .from('table_bookings')
        .select('*', { count: 'exact', head: true })
        .or(`booking_date.ilike.%Today%,created_at.gte.${todayISO}T00:00:00.000Z`);

      // 3. New inquiries
      const { count: newInquiriesCount, error: inqErr } = await supabase
        .from('contact_inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new');

      // 4. Total active subscribers
      const { count: activeSubscribersCount, error: subErr } = await supabase
        .from('newsletter_subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Check for errors
      if (pendingErr || todayErr || inqErr || subErr) {
        console.warn('[AdminApi] Non-critical error fetching counts:', { pendingErr, todayErr, inqErr, subErr });
      }

      return {
        todayBookings: todayBookingsCount ?? 0,
        pendingBookings: pendingCount ?? 0,
        newEnquiries: newInquiriesCount ?? 0,
        activeSubscribers: activeSubscribersCount ?? 0
      };
    } catch (err) {
      console.error('[AdminApi] Failed to fetch dashboard metrics:', err);
      throw err;
    }
  },

  async fetchTodayBookingsList() {
    const supabase = this.client;
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('table_bookings')
      .select('*')
      .or(`booking_date.ilike.%Today%,created_at.gte.${todayISO}T00:00:00.000Z`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  },

  async fetchLatestEnquiries(limit = 5) {
    const supabase = this.client;
    const { data, error } = await supabase
      .from('contact_inquiries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  // -----------------------------------------------------------------
  // 2. BOOKINGS: SERVER-SIDE PAGINATION, FILTERS & UPDATES
  // -----------------------------------------------------------------

  async fetchBookingsPaged({
    page = 1,
    pageSize = 20,
    status = 'all',
    search = '',
    sortBy = 'created_at',
    sortAsc = false
  } = {}) {
    const supabase = this.client;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('table_bookings')
      .select('*', { count: 'exact' });

    // Status filter
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Search filter across name, phone, email
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      query = query.or(`name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%`);
    }

    // Sorting
    query = query.order(sortBy, { ascending: sortAsc });
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize) || 1
    };
  },

  async updateBooking(id, updates) {
    const supabase = this.client;
    const cleanUpdates = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('table_bookings')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // -----------------------------------------------------------------
  // 3. ENQUIRIES: SERVER-SIDE PAGINATION, FILTERS & ARCHIVING
  // -----------------------------------------------------------------

  async fetchEnquiriesPaged({
    page = 1,
    pageSize = 20,
    status = 'all',
    search = ''
  } = {}) {
    const supabase = this.client;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('contact_inquiries')
      .select('*', { count: 'exact' });

    // Status filter
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Search filter across name, phone, email, message
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      query = query.or(`name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%,message.ilike.%${cleanSearch}%`);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize) || 1
    };
  },

  async updateEnquiry(id, updates) {
    const supabase = this.client;
    const cleanUpdates = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('contact_inquiries')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // -----------------------------------------------------------------
  // 4. SUBSCRIBERS: PAGINATION, TOGGLE & DELETE
  // -----------------------------------------------------------------

  async fetchSubscribersPaged({
    page = 1,
    pageSize = 20,
    status = 'all',
    search = ''
  } = {}) {
    const supabase = this.client;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact' });

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'unsubscribed') {
      query = query.eq('is_active', false);
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim();
      query = query.ilike('email', `%${cleanSearch}%`);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize) || 1
    };
  },

  async toggleSubscriberActive(id, isActive) {
    const supabase = this.client;
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSubscriber(id) {
    const supabase = this.client;
    const { error } = await supabase
      .from('newsletter_subscribers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  // Fetch all active subscribers for CSV download
  async fetchAllActiveSubscribers() {
    const supabase = this.client;
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('email, source, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Fetch all filtered bookings for CSV download
  async fetchAllBookingsForExport(status = 'all', search = '') {
    const supabase = this.client;
    let query = supabase
      .from('table_bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      query = query.or(`name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // -----------------------------------------------------------------
  // 5. SUPABASE REALTIME SUBSCRIPTIONS
  // -----------------------------------------------------------------

  initRealtimeChannel({ onNewBooking, onNewInquiry, onNewSubscriber }) {
    const supabase = this.client;
    if (!supabase) return null;

    const channel = supabase
      .channel('burger-admin-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'table_bookings' },
        (payload) => {
          if (typeof onNewBooking === 'function') onNewBooking(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contact_inquiries' },
        (payload) => {
          if (typeof onNewInquiry === 'function') onNewInquiry(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'newsletter_subscribers' },
        (payload) => {
          if (typeof onNewSubscriber === 'function') onNewSubscriber(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('[AdminRealtime] Channel subscription status:', status);
      });

    return channel;
  },

  // -----------------------------------------------------------------
  // 6. CSV EXPORT UTILITIES
  // -----------------------------------------------------------------

  exportToCSV(filename, headers, rows) {
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row
          .map(val => {
            if (val === null || val === undefined) return '""';
            const strVal = String(val).replace(/"/g, '""');
            return `"${strVal}"`;
          })
          .join(',')
      )
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // -----------------------------------------------------------------
  // 7. MENU ITEMS MANAGEMENT
  // -----------------------------------------------------------------

  async fetchMenuItemsAdmin({ category = 'all', search = '', availability = 'all' } = {}) {
    const supabase = this.client;
    if (!supabase) throw new Error('Supabase client not initialized.');

    let query = supabase
      .from('menu_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (availability === 'available') {
      query = query.eq('is_available', true);
    } else if (availability === 'hidden') {
      query = query.eq('is_available', false);
    }
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      query = query.or(`name.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[AdminApi.fetchMenuItemsAdmin] Supabase error:', error);
      throw new Error(error.message || 'Error fetching menu items from database.');
    }
    return data || [];
  },

  async createMenuItem(itemData) {
    const supabase = this.client;
    if (!supabase) throw new Error('Supabase client not initialized.');

    const cleanItem = {
      name: itemData.name.trim(),
      category: itemData.category || 'burgers',
      price: parseFloat(itemData.price) || 0,
      description: (itemData.description || '').trim(),
      image_url: (itemData.image_url || '').trim() || null,
      diet: itemData.diet || 'non-veg',
      badge: (itemData.badge || '').trim() || null,
      rating_text: (itemData.rating_text || '4.8 ★').trim(),
      is_spicy: !!itemData.is_spicy,
      is_available: itemData.is_available !== false,
      sort_order: parseInt(itemData.sort_order, 10) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('menu_items')
      .insert(cleanItem)
      .select()
      .single();

    if (error) {
      console.error('[AdminApi.createMenuItem] Supabase error:', error);
      throw new Error(error.message || 'Error creating menu item in database.');
    }
    return data;
  },

  async updateMenuItem(id, updates) {
    const supabase = this.client;
    if (!supabase) throw new Error('Supabase client not initialized.');

    const cleanUpdates = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('menu_items')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[AdminApi.updateMenuItem] Supabase error:', error);
      throw new Error(error.message || 'Error updating menu item in database.');
    }
    return data;
  },

  async toggleMenuItemAvailability(id, isAvailable) {
    return await this.updateMenuItem(id, { is_available: isAvailable });
  },

  async deleteMenuItem(id) {
    const supabase = this.client;
    if (!supabase) throw new Error('Supabase client not initialized.');

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[AdminApi.deleteMenuItem] Supabase error:', error);
      throw new Error(error.message || 'Error deleting menu item from database.');
    }
    return true;
  },

  // -----------------------------------------------------------------
  // 8. OFFERS & PROMOTIONS MANAGEMENT
  // -----------------------------------------------------------------

  async fetchOffersAdmin({ search = '', status = 'all' } = {}) {
    const supabase = this.client;
    if (!supabase) throw new Error('Supabase client not initialized.');

    let query = supabase
      .from('offers')
      .select('*')
      .order('created_at', { ascending: false });

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim();
      query = query.or(`title.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%,discount_code.ilike.%${cleanSearch}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[AdminApi.fetchOffersAdmin] Supabase error:', error);
      throw new Error(error.message || 'Error fetching offers from database.');
    }
    return data || [];
  },

  /**
   * Checks if a promo code already exists in Supabase (case-insensitive)
   * @param {string} code
   * @param {string|null} [excludeId]
   * @returns {Promise<boolean>}
   */
  async checkOfferCodeExists(code, excludeId = null) {
    const supabase = this.client;
    if (!supabase) throw new Error('Supabase client not initialized.');
    if (!code || !code.trim()) return false;

    let query = supabase
      .from('offers')
      .select('id, discount_code')
      .ilike('discount_code', code.trim());

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[AdminApi.checkOfferCodeExists] Supabase error:', error);
      throw new Error(error.message || 'Error checking promo code uniqueness.');
    }
    return (data && data.length > 0);
  },

  async createOffer(offerData) {
    const supabase = this.client;
    if (!supabase) throw new Error('Supabase client not initialized.');

    const cleanOffer = {
      title: offerData.title.trim(),
      description: (offerData.description || '').trim(),
      badge_text: (offerData.badge_text || 'HOT DEAL').trim(),
      discount_code: (offerData.discount_code || '').trim() || null,
      discount_percent: offerData.discount_percent !== null && offerData.discount_percent !== undefined ? parseInt(offerData.discount_percent, 10) : null,
      discount_amount: offerData.discount_amount !== null && offerData.discount_amount !== undefined ? parseFloat(offerData.discount_amount) : 0,
      starts_at: new Date(offerData.starts_at).toISOString(),
      ends_at: new Date(offerData.ends_at).toISOString(),
      is_active: offerData.is_active !== false,
      cta_text: (offerData.cta_text || 'Order Now').trim(),
      cta_url: (offerData.cta_url || 'menu.html').trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('offers')
      .insert(cleanOffer)
      .select()
      .single();

    if (error) {
      console.error('[AdminApi.createOffer] Supabase error:', error);
      throw new Error(error.message || 'Error creating offer in database.');
    }
    return data;
  },

  async updateOffer(id, updates) {
    const supabase = this.client;
    if (!supabase) throw new Error('Supabase client not initialized.');

    const cleanUpdates = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('offers')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[AdminApi.updateOffer] Supabase error:', error);
      throw new Error(error.message || 'Error updating offer in database.');
    }
    return data;
  },

  async toggleOfferActive(id, isActive) {
    return await this.updateOffer(id, { is_active: isActive });
  },

  async deleteOffer(id) {
    const supabase = this.client;
    if (!supabase) throw new Error('Supabase client not initialized.');

    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[AdminApi.deleteOffer] Supabase error:', error);
      throw new Error(error.message || 'Error deleting offer from database.');
    }
    return true;
  },

  // -----------------------------------------------------------------
  // 9. PUBLIC GETTERS (Available for all visitors)
  // -----------------------------------------------------------------

  async fetchPublicMenuItems() {
    const supabase = this.client;
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async fetchActiveOffers() {
    const supabase = this.client;
    const nowISO = new Date().toISOString();

    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', nowISO)
      .gte('ends_at', nowISO)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

if (typeof window !== 'undefined') {
  window.AdminApi = AdminApi;
  window.AdminAPI = AdminApi;
}

