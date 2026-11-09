// Immy auth + cloud sync (Supabase)
(function () {
  const KEYS = ['myTasks', 'mySubjects', 'myNotes', 'myStudyLogs', 'totalStudyTime', 'dailyStudyCapacity', 'theme'];
  const configured = window.SUPABASE_URL && window.SUPABASE_KEY &&
    !window.SUPABASE_URL.startsWith('PASTE') && !window.SUPABASE_KEY.startsWith('PASTE');

  const sb = configured ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY) : null;
  let user = null;
  let profile = null;
  let lastPushed = '';

  function snapshot() {
    const o = {};
    KEYS.forEach((k) => { const v = localStorage.getItem(k); if (v !== null) o[k] = v; });
    return o;
  }

  function clearLocal() {
    KEYS.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem('immyProfile');
  }

  async function push(force) {
    if (!sb || !user) return;
    const snap = JSON.stringify(snapshot());
    if (!force && snap === lastPushed) return;
    const { error } = await sb.from('user_data').upsert({
      user_id: user.id,
      data: JSON.parse(snap),
      updated_at: new Date().toISOString()
    });
    if (error) console.warn('Sync error:', error.message);
    else lastPushed = snap;
  }

  async function pull() {
    const { data, error } = await sb.from('user_data').select('data').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    const cloud = (data && data.data) || {};
    if (Object.keys(cloud).length) {
      KEYS.forEach((k) => localStorage.removeItem(k));
      Object.entries(cloud).forEach(([k, v]) => { if (KEYS.includes(k)) localStorage.setItem(k, v); });
      lastPushed = JSON.stringify(snapshot());
    } else {
      await push(true); // pehli dafa: purana local data cloud mein save
    }
  }

  async function loadProfile() {
    try {
      let { data, error } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (!data) {
        const name = (user.user_metadata && user.user_metadata.full_name) || '';
        await sb.from('profiles').insert({ id: user.id, email: user.email, full_name: name });
        ({ data } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle());
      }
      if (data) localStorage.setItem('immyProfile', JSON.stringify(data));
      return data;
    } catch (e) {
      // Offline ho to pichli saved profile use karo
      try { return JSON.parse(localStorage.getItem('immyProfile')); } catch { return null; }
    }
  }

  async function logout(reason) {
    try { if (!reason) await push(); } catch (e) {}
    if (sb) await sb.auth.signOut();
    clearLocal();
    location.replace('login.html' + (reason ? '?' + reason : ''));
  }

  async function requireLogin(opts) {
    opts = opts || {};
    if (!sb) { location.replace('login.html'); return null; }
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { location.replace('login.html'); return null; }
    user = session.user;
    profile = (await loadProfile()) || { role: 'student', blocked: false, full_name: '' };
    if (profile.blocked) { await logout('blocked'); return null; }
    if (opts.admin && profile.role !== 'admin') { location.replace('app.html'); return null; }
    sb.auth.onAuthStateChange((evt) => { if (evt === 'SIGNED_OUT') location.replace('login.html'); });
    return { user, profile };
  }

  function startAutoSync() {
    setInterval(() => push(), 20000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) push(); });
    window.addEventListener('pagehide', () => push());
  }

  window.Immy = {
    configured,
    sb,
    requireLogin,
    logout,
    pull,
    push,
    startAutoSync,
    get user() { return user; },
    get profile() { return profile; }
  };
})();