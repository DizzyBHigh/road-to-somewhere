document.addEventListener('DOMContentLoaded', async () => {
  const root = document.querySelector('[data-supabase-url]');
  const login = document.getElementById('discordLogin');
  const logout = document.getElementById('discordLogout');
  const status = document.getElementById('authStatus');
  const key = root?.dataset.supabaseKey;

  if (!root || !login || !logout || !status) return;
  if (!key || key === 'REPLACE_WITH_SUPABASE_PUBLISHABLE_KEY') {
    status.textContent = 'Supabase publishable key is not configured yet.';
    login.disabled = true;
    return;
  }

  const { createClient } = window.supabase;
  const supabase = createClient(root.dataset.supabaseUrl, key, {
    auth: { detectSessionInUrl: true, persistSession: true }
  });
  const cleanUrl = () => `${window.location.origin}${window.location.pathname}`;

  const update = async (session) => {
    if (!session?.user) {
      status.textContent = 'Not signed in.';
      login.hidden = false;
      logout.hidden = true;
      return;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      status.textContent = `Signed in, but profile lookup failed: ${error.message}`;
      return;
    }

    status.textContent = profile
      ? `Signed in as ${profile.display_name || session.user.email || session.user.id}. Profile created.`
      : 'Signed in, but no profile row was found.';
    login.hidden = true;
    logout.hidden = false;
    window.history.replaceState({}, document.title, cleanUrl());
  };

  login.addEventListener('click', async () => {
    status.textContent = 'Redirecting to Discord…';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: cleanUrl() }
    });
    if (error) status.textContent = `Sign-in failed: ${error.message}`;
  });

  logout.addEventListener('click', async () => {
    await supabase.auth.signOut();
    await update(null);
  });

  supabase.auth.onAuthStateChange((_event, session) => update(session));
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    status.textContent = `Session check failed: ${error.message}`;
    return;
  }
  await update(data.session);
});
