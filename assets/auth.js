document.addEventListener('DOMContentLoaded', async () => {
  const root = document.querySelector('.rts-auth[data-supabase-url]');
  if (!root || !window.supabase) return;

  const login = root.querySelector('.rts-auth__login');
  const account = root.querySelector('.rts-auth__account');
  const menu = root.querySelector('.rts-auth__menu');
  const signout = root.querySelector('.rts-auth__signout');
  const avatar = root.querySelector('.rts-auth__avatar');
  const name = root.querySelector('.rts-auth__name');
  const client = window.supabase.createClient(root.dataset.supabaseUrl, root.dataset.supabaseKey, {
    auth: { detectSessionInUrl: true, persistSession: true }
  });
  window.rtsSupabase = client;

  const publishAuth = session => {
    window.rtsAuthSession = session;
    window.dispatchEvent(new CustomEvent('rts-auth-state', { detail: session }));
  };

  const setSignedOut = () => {
    login.hidden = false;
    account.hidden = true;
    menu.hidden = true;
    publishAuth(null);
  };

  const setSignedIn = async session => {
    const user = session?.user;
    if (!user) return setSignedOut();
    const { data: profile } = await client.from('profiles')
      .select('display_name, avatar_url').eq('id', user.id).maybeSingle();
    name.textContent = profile?.display_name || user.user_metadata?.global_name || 'Account';
    avatar.src = profile?.avatar_url || user.user_metadata?.avatar_url || '';
    avatar.alt = `${name.textContent} avatar`;
    login.hidden = true;
    account.hidden = false;
    publishAuth(session);
  };

  login.addEventListener('click', async () => {
    const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const { error } = await client.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo } });
    if (error) console.error('RTS Discord sign-in failed:', error);
  });

  account.addEventListener('click', () => {
    const open = !menu.hidden;
    menu.hidden = open;
    account.setAttribute('aria-expanded', String(!open));
  });

  signout.addEventListener('click', async () => {
    await client.auth.signOut();
    setSignedOut();
  });

  document.addEventListener('click', event => {
    if (!root.contains(event.target)) {
      menu.hidden = true;
      account.setAttribute('aria-expanded', 'false');
    }
  });

  client.auth.onAuthStateChange((_event, session) => setSignedIn(session));
  const { data } = await client.auth.getSession();
  await setSignedIn(data.session);
});
