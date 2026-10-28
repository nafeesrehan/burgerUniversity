/**
 * BURGER UNIVERSITY - SUPABASE BACKEND INTEGRATION
 * Handles all real-time form submissions, inquiries, table reservations, and newsletter signups.
 */

const SUPABASE_CONFIG = {
  url: 'https://wiriaujhlrjcpjfmtean.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpcmlhdWpobHJqY3BqZm10ZWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NDg5MzYsImV4cCI6MjEwODUyNDkzNn0.0C9YLCPtQ-qb0c_B15Wzlgior73vN5lVk1ROkjvg-Sk'
};

const BurgerBackend = {
  config: SUPABASE_CONFIG,

  /**
   * Generic REST POST requester to Supabase
   */
  async post(tableOrRpc, payload, isRpc = false) {
    const endpoint = isRpc
      ? `${this.config.url}/rest/v1/rpc/${tableOrRpc}`
      : `${this.config.url}/rest/v1/${tableOrRpc}`;

    const headers = {
      'apikey': this.config.anonKey,
      'Authorization': `Bearer ${this.config.anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': isRpc ? undefined : 'return=minimal'
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson && errJson.message) errMessage = errJson.message;
        } catch (_) {}
        throw new Error(errMessage);
      }

      // If RPC or return representation, parse JSON
      if (isRpc) {
        return await response.json();
      }
      return { success: true };
    } catch (err) {
      console.error(`[BurgerBackend] Error posting to ${tableOrRpc}:`, err);
      throw err;
    }
  },

  /**
   * Generic REST GET requester to Supabase
   */
  async get(table, queryString = '') {
    const url = queryString 
      ? `${this.config.url}/rest/v1/${table}?${queryString}`
      : `${this.config.url}/rest/v1/${table}`;

    const headers = {
      'apikey': this.config.anonKey,
      'Authorization': `Bearer ${this.config.anonKey}`,
      'Accept': 'application/json'
    };

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        let errMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson && errJson.message) errMessage = errJson.message;
        } catch (_) {}
        throw new Error(errMessage);
      }

      return await response.json();
    } catch (err) {
      console.error(`[BurgerBackend] Error fetching from ${table}:`, err);
      throw err;
    }
  },

  /**
   * Fetch all publicly available menu items from Supabase
   * @returns {Promise<Array>}
   */
  async getAvailableMenuItems() {
    try {
      const items = await this.get('menu_items', 'is_available=eq.true&order=sort_order.asc,created_at.desc');
      return items || [];
    } catch (err) {
      console.warn('[BurgerBackend.getAvailableMenuItems] Failed to load menu items:', err);
      return [];
    }
  },

  /**
   * Validate a promo code against active offers in Supabase
   * @param {string} code
   * @returns {Promise<{ valid: boolean, offer?: object, code?: string, title?: string, discountPercent?: number, discountAmount?: number, error?: string }>}
   */
  async validatePromoCode(code) {
    if (!code || !code.trim()) {
      return { valid: false, error: 'Please enter a promo code.' };
    }
    const cleanCode = code.trim().toUpperCase();
    const nowISO = new Date().toISOString();

    try {
      const offers = await this.get(
        'offers',
        `is_active=eq.true&discount_code=ilike.${encodeURIComponent(cleanCode)}&starts_at=lte.${nowISO}&ends_at=gte.${nowISO}&limit=1`
      );

      if (!offers || offers.length === 0) {
        return { valid: false, error: `Promo code "${cleanCode}" is invalid or has expired.` };
      }

      const offer = offers[0];
      const discountPercent = offer.discount_percent ? parseInt(offer.discount_percent, 10) : 0;
      const discountAmount = offer.discount_amount ? parseFloat(offer.discount_amount) : 0;

      return {
        valid: true,
        offer,
        code: offer.discount_code,
        title: offer.title,
        discountPercent: discountPercent,
        discountAmount: discountAmount
      };
    } catch (err) {
      console.error('[BurgerBackend.validatePromoCode] Error validating code:', err);
      return { valid: false, error: err.message || 'Could not validate promo code. Please try again.' };
    }
  },

  /**
   * Fetch all active offers within current date range
   * @returns {Promise<Array>}
   */
  async getActiveOffers() {
    const nowISO = new Date().toISOString();
    try {
      const offers = await this.get(
        'offers',
        `is_active=eq.true&starts_at=lte.${nowISO}&ends_at=gte.${nowISO}&order=created_at.desc`
      );
      return offers || [];
    } catch (err) {
      console.warn('[BurgerBackend.getActiveOffers] Error fetching offers:', err);
      return [];
    }
  },

  /**
   * Submit Contact Inquiry
   */
  async submitContact(data) {
    const payload = {
      name: (data.name || '').trim(),
      phone: (data.phone || '').trim(),
      email: (data.email || '').trim().toLowerCase(),
      topic: data.topic || 'general',
      message: (data.message || '').trim(),
      status: 'new',
      metadata: {
        submitted_at: new Date().toISOString(),
        user_agent: navigator.userAgent,
        page_url: window.location.href
      }
    };

    if (!payload.name || !payload.phone || !payload.email || !payload.message) {
      throw new Error('Please fill in all required fields.');
    }

    return await this.post('contact_inquiries', payload);
  },

  /**
   * Submit Table Booking through the protected Edge Function
   */
  async submitBooking(data, turnstileToken) {
    const booking = {
      name: (data.name || '').trim(),
      phone: (data.phone || '').trim(),
      email: (data.email || '').trim().toLowerCase() || null,
      booking_date: data.booking_date || 'Today',
      booking_time: data.time_slot || '7:00 PM',
      party_size: parseInt(data.guests, 10) || 2,
      seating_preference: data.seating_preference || 'Standard Booth',
      special_requests: (data.special_requests || '').trim() || null
    };

    if (!booking.name || !booking.phone) {
      throw new Error('Please provide your name and phone number for table reservation.');
    }
    if (!turnstileToken) {
      throw new Error('Please complete the verification check.');
    }

    const response = await fetch(`${this.config.url}/functions/v1/submit-booking`, {
      method: 'POST',
      headers: {
        'apikey': this.config.anonKey,
        'Authorization': `Bearer ${this.config.anonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: turnstileToken, booking })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || `Booking failed (HTTP ${response.status})`);
    }
    return result;
  },

  /**
   * Submit Newsletter Subscription
   */
  async submitNewsletter(email, source = 'footer') {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please provide a valid email address.');
    }

    try {
      return await this.post('newsletter_subscribers', {
        email: cleanEmail,
        source: source
      });
    } catch (err) {
      // If already subscribed (unique constraint), treat gracefully as success
      if (err.message && (err.message.includes('unique') || err.message.includes('duplicate') || err.message.includes('23505'))) {
        return { success: true, alreadySubscribed: true };
      }
      throw err;
    }
  },

  /**
   * Fetch Admin Dashboard Data (Secured via Passcode RPC)
   */
  async getAdminDashboard(passcode) {
    return await this.post('get_admin_dashboard', { passcode }, true);
  },

  /**
   * Update Inquiry Status (Secured via RPC)
   */
  async updateInquiryStatus(passcode, inquiryId, newStatus) {
    return await this.post('update_inquiry_status', {
      passcode: passcode,
      inquiry_id: inquiryId,
      new_status: newStatus
    }, true);
  },

  /**
   * Update Booking Status (Secured via RPC)
   */
  async updateBookingStatus(passcode, bookingId, newStatus) {
    return await this.post('update_booking_status', {
      passcode: passcode,
      booking_id: bookingId,
      new_status: newStatus
    }, true);
  },

  /**
   * Display floating notification toast
   */
  showToast(message, type = 'success') {
    let container = document.getElementById('burger-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'burger-toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
        max-width: 90vw;
        width: 380px;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
      pointer-events: auto;
      background: ${type === 'success' ? '#1f2937' : '#991b1b'};
      color: #ffffff;
      padding: 14px 18px;
      border-radius: 12px;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.4;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.35);
      border-left: 5px solid ${type === 'success' ? '#ffc83b' : '#f87171'};
      transform: translateY(20px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    const icon = type === 'success' ? '✓' : '⚠';
    toast.innerHTML = `
      <div style="background: rgba(255,255,255,0.15); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">${icon}</div>
      <div style="flex: 1;">${message}</div>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    // Animate out
    setTimeout(() => {
      toast.style.transform = 'translateY(10px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 350);
    }, 4000);
  },

  /**
   * Auto-bind all forms on the current page
   */
  init() {
    // 1. Contact Form
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
      contactForm.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
        const banner = document.getElementById('form-success-banner');

        const fullName = document.getElementById('full-name')?.value;
        const phone = document.getElementById('phone-number')?.value;
        const email = document.getElementById('email-address')?.value;
        const topic = document.getElementById('subject-select')?.value;
        const message = document.getElementById('message')?.value;

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>Saving to Backend...</span><span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>`;
          }

          await this.submitContact({
            name: fullName,
            phone: phone,
            email: email,
            topic: topic,
            message: message
          });

          contactForm.reset();

          if (banner) {
            banner.classList.remove('hidden');
            banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          this.showToast('Note successfully received! Our Raniganj kitchen team has your enquiry.', 'success');
        } catch (err) {
          console.error('[Contact Form Error]', err);
          this.showToast(err.message || 'Unable to submit enquiry. Please try again.', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
          }
        }
      };
    }

    // 2. Newsletter Forms (all footer forms across all pages)
    const forms = document.querySelectorAll('footer form');
    forms.forEach(form => {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const emailInput = form.querySelector('input[type="email"]');
        const submitBtn = form.querySelector('button[type="submit"]');
        if (!emailInput) return;

        const email = emailInput.value.trim();
        if (!email) return;

        const originalBtnText = submitBtn ? submitBtn.textContent : '';

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '...';
          }

          const pageName = window.location.pathname.split('/').pop() || 'index.html';
          const res = await this.submitNewsletter(email, `footer_${pageName}`);

          emailInput.value = '';
          if (res.alreadySubscribed) {
            this.showToast('You are already subscribed to Fresh Drops!', 'success');
          } else {
            this.showToast('Subscribed! Welcome to Burger University secret drops.', 'success');
          }
        } catch (err) {
          this.showToast(err.message || 'Subscription failed. Please check your email.', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
          }
        }
      };
    });
  }
};

if (typeof window !== 'undefined') {
  window.BurgerBackend = BurgerBackend;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => BurgerBackend.init());
    } else {
      BurgerBackend.init();
    }
  }
}
