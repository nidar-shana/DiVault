import { useEffect, useMemo, useState, type FormEvent } from 'react';

type MediaItem = {
  id: string;
  title: string;
  url: string;
  source: 'Reading' | 'YouTube' | 'Spotify' | 'Pinterest' | 'Instagram';
};

type ChatbotGender = 'Female' | 'Male' | 'Nonbinary';

type UserProfile = {
  name: string;
  email: string;
  gender: string;
};

type ConnectedServices = {
  google: boolean;
  youtube: boolean;
  spotify: boolean;
};

const defaultChatbot = 'Hello! I can help you organize your favorites. Choose a category or type a question.';

function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({ name: '', email: '', gender: 'Female' });
  const [chatbotGender, setChatbotGender] = useState<ChatbotGender>('Female');
  const [activeTab, setActiveTab] = useState<'library' | 'chat' | 'browse'>('library');
  const [readingList, setReadingList] = useState<MediaItem[]>([]);
  const [youtubeList, setYoutubeList] = useState<MediaItem[]>([]);
  const [spotifyList, setSpotifyList] = useState<MediaItem[]>([]);
  const [pinterestPins, setPinterestPins] = useState<MediaItem[]>([]);
  const [instagramSaves, setInstagramSaves] = useState<MediaItem[]>([]);
  const [chatHistory, setChatHistory] = useState<string[]>([defaultChatbot]);
  const [draft, setDraft] = useState({ title: '', url: '' });
  const [chatQuery, setChatQuery] = useState('');
  const [importSource, setImportSource] = useState<'Pinterest' | 'Instagram'>('Pinterest');
  const [importUrl, setImportUrl] = useState('');
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [youtubeQuery, setYoutubeQuery] = useState('');
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [apiStatus, setApiStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectedServices, setConnectedServices] = useState<ConnectedServices>({ google: false, youtube: false, spotify: false });
  const [googleClientId, setGoogleClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '');
  const [youtubeClientId, setYoutubeClientId] = useState(import.meta.env.VITE_YOUTUBE_CLIENT_ID ?? '');
  const [spotifyClientId, setSpotifyClientId] = useState(import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? '');
  const [googleAccessToken, setGoogleAccessToken] = useState('');
  const [youtubeAccessToken, setYoutubeAccessToken] = useState('');
  const [spotifyAccessToken, setSpotifyAccessToken] = useState('');

  const allItems = useMemo(
    () => [...readingList, ...youtubeList, ...spotifyList, ...pinterestPins, ...instagramSaves],
    [readingList, youtubeList, spotifyList, pinterestPins, instagramSaves],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('divault-vault');
    if (!saved) return;

    try {
      const data = JSON.parse(saved) as {
        profile: UserProfile;
        chatbotGender: ChatbotGender;
        readingList: MediaItem[];
        youtubeList: MediaItem[];
        spotifyList: MediaItem[];
        pinterestPins: MediaItem[];
        instagramSaves: MediaItem[];
        signedIn: boolean;
        connectedServices?: ConnectedServices;
        googleAccessToken?: string;
        youtubeAccessToken?: string;
        spotifyAccessToken?: string;
      };

      setProfile(data.profile);
      setChatbotGender(data.chatbotGender);
      setReadingList(data.readingList);
      setYoutubeList(data.youtubeList);
      setSpotifyList(data.spotifyList);
      setPinterestPins(data.pinterestPins);
      setInstagramSaves(data.instagramSaves);
      setSignedIn(data.signedIn);
      setConnectedServices(data.connectedServices ?? { google: false, youtube: false, spotify: false });
      setGoogleAccessToken(data.googleAccessToken ?? '');
      setYoutubeAccessToken(data.youtubeAccessToken ?? '');
      setSpotifyAccessToken(data.spotifyAccessToken ?? '');
    } catch {
      // ignore invalid stored state
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const service = params.get('service');
    const code = params.get('code');

    const finishOAuth = async () => {
      if (!service || !code) return;

      try {
        if (service === 'google') {
          const response = await fetch(`/oauth/google?code=${encodeURIComponent(code)}&redirectUri=${encodeURIComponent(`${window.location.origin}/?service=google`)}`);
          if (!response.ok) throw new Error('Google exchange failed');
          const payload = await response.json();
          setGoogleAccessToken(payload.token?.access_token ?? '');
          setSignedIn(true);
          setConnectedServices((prev) => ({ ...prev, google: true }));
          setProfile((prev) => ({ ...prev, name: payload.profile?.name || prev.name, email: payload.profile?.email || prev.email }));
          setApiStatus('Google sign-in completed. You can now connect YouTube and Spotify.');
        }

        if (service === 'youtube') {
          const response = await fetch('/oauth/youtube', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              redirectUri: `${window.location.origin}/?service=youtube`,
            }),
          });
          if (!response.ok) throw new Error('YouTube exchange failed');
          const payload = await response.json();
          setYoutubeAccessToken(payload.token?.access_token ?? '');
          setConnectedServices((prev) => ({ ...prev, youtube: true }));
          setApiStatus('YouTube permission granted. You can import playlists and export your vault.');
        }

        if (service === 'spotify') {
          const response = await fetch('/oauth/spotify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              redirectUri: `${window.location.origin}/?service=spotify`,
            }),
          });
          if (!response.ok) throw new Error('Spotify exchange failed');
          const payload = await response.json();
          setSpotifyAccessToken(payload.token?.access_token ?? '');
          setConnectedServices((prev) => ({ ...prev, spotify: true }));
          setApiStatus('Spotify permission granted. Your vault can now export linked media data.');
        }
      } catch (error) {
        setApiStatus(error instanceof Error ? error.message : 'OAuth exchange failed');
      } finally {
        window.history.replaceState({}, '', window.location.pathname);
      }
    };

    void finishOAuth();
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    window.localStorage.setItem(
      'divault-vault',
      JSON.stringify({
        profile,
        chatbotGender,
        readingList,
        youtubeList,
        spotifyList,
        pinterestPins,
        instagramSaves,
        signedIn,
        connectedServices,
        googleAccessToken,
        youtubeAccessToken,
        spotifyAccessToken,
      }),
    );
  }, [signedIn, profile, chatbotGender, readingList, youtubeList, spotifyList, pinterestPins, instagramSaves, connectedServices, googleAccessToken, youtubeAccessToken, spotifyAccessToken]);

  const handleSignUp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const profileData = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      gender: String(formData.get('gender') ?? 'Female'),
    } as UserProfile;

    setProfile(profileData);
    setChatbotGender(formData.get('chatbotGender') as ChatbotGender);
    setSignedIn(true);
  };

  const handleGoogleSignIn = () => {
    const clientId = googleClientId.trim();
    const redirectUri = `${window.location.origin}/?service=google`;
    const state = `google:${Date.now()}`;

    if (!clientId) {
      setApiStatus('Add your Google client ID in the form above to use the real OAuth redirect.');
      return;
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('openid email profile')}&state=${encodeURIComponent(state)}`;
    window.location.assign(authUrl);
  };

  const handleProviderConnect = (provider: 'youtube' | 'spotify') => {
    const clientId = provider === 'youtube' ? youtubeClientId.trim() : spotifyClientId.trim();
    const redirectUri = `${window.location.origin}/?service=${provider}`;
    const state = `${provider}:${Date.now()}`;

    if (!clientId) {
      setApiStatus(`Add your ${provider} client ID in the form above to use the real OAuth redirect.`);
      return;
    }

    if (provider === 'youtube') {
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.readonly')}&state=${encodeURIComponent(state)}`;
      window.location.assign(authUrl);
      return;
    }

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('playlist-read-private playlist-read-collaborative')}&state=${encodeURIComponent(state)}`;
    window.location.assign(authUrl);
  };

  const saveItem = (source: MediaItem['source']) => {
    if (!draft.title || !draft.url) return;
    const item: MediaItem = {
      id: `${source}-${Date.now()}`,
      title: draft.title,
      url: draft.url,
      source,
    };

    const mapping = {
      Reading: () => setReadingList((prev) => [...prev, item]),
      YouTube: () => setYoutubeList((prev) => [...prev, item]),
      Spotify: () => setSpotifyList((prev) => [...prev, item]),
      Pinterest: () => setPinterestPins((prev) => [...prev, item]),
      Instagram: () => setInstagramSaves((prev) => [...prev, item]),
    };

    mapping[source]();
    setDraft({ title: '', url: '' });
  };

  const importFavorites = () => {
    const imported = Array.from({ length: 3 }, (_, index) => ({
      id: `${importSource}-${Date.now()}-${index}`,
      title: `${importSource} favorite ${index + 1}`,
      url: `https://${importSource.toLowerCase()}.com/item/${index + 1}`,
      source: importSource,
    }));

    if (importSource === 'Pinterest') setPinterestPins((prev) => [...prev, ...imported]);
    else setInstagramSaves((prev) => [...prev, ...imported]);
    setActiveTab('browse');
    setPreviewItem(imported[0]);
  };

  const getSpotifyEmbedUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('spotify.com')) {
        return `https://open.spotify.com/embed${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return '';
    }
    return '';
  };

  const getInstagramEmbedUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('instagram.com')) {
        const path = parsed.pathname.replace(/\/$/, '');
        return `https://www.instagram.com${path}/embed`;
      }
    } catch {
      return '';
    }
    return '';
  };

  const getPinterestEmbedUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('pinterest.com')) {
        return `https://www.pinterest.com${parsed.pathname}embed/`;
      }
    } catch {
      return '';
    }
    return '';
  };

  const importFromUrl = () => {
    if (!importUrl.trim()) return;
    const item: MediaItem = {
      id: `${importSource}-${Date.now()}`,
      title: `${importSource} import ${importUrl.trim().slice(-10)}`,
      url: importUrl.trim(),
      source: importSource,
    };

    if (importSource === 'Pinterest') setPinterestPins((prev) => [...prev, item]);
    else setInstagramSaves((prev) => [...prev, item]);

    setImportUrl('');
    setActiveTab('browse');
    setPreviewItem(item);
  };

  const importFromYouTube = async () => {
    if (!connectedServices.youtube) {
      setApiStatus('Connect YouTube first so the app can request permission for playlist access.');
      return;
    }

    const trimmedQuery = youtubeQuery.trim();
    if (!trimmedQuery) {
      setApiStatus('Enter a YouTube search phrase before importing.');
      return;
    }

    if (!youtubeAccessToken) {
      setApiStatus('Complete the YouTube OAuth flow first so DiVault can use your access token.');
      return;
    }

    setIsSyncing(true);
    setApiStatus('Searching YouTube playlists...');

    try {
      const response = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: youtubeAccessToken, query: trimmedQuery }),
      });

      if (!response.ok) throw new Error('YouTube rejected the request.');
      const payload = await response.json();

      const item: MediaItem = {
        id: `YouTube-${payload.playlistId}`,
        title: payload.title,
        url: payload.url,
        source: 'YouTube',
      };

      setYoutubeList((prev) => [item, ...prev]);
      setPreviewItem(item);
      setActiveTab('browse');
      setYoutubeQuery('');
      setApiStatus(`Imported "${item.title}" from YouTube.`);
    } catch (error) {
      setApiStatus(error instanceof Error ? error.message : 'Unable to import from YouTube.');
    } finally {
      setIsSyncing(false);
    }
  };

  const importFromSpotify = async () => {
    if (!connectedServices.spotify) {
      setApiStatus('Connect Spotify first so the app can request permission for playlist access.');
      return;
    }

    const trimmedQuery = spotifyQuery.trim();
    if (!trimmedQuery) {
      setApiStatus('Enter a Spotify search phrase before importing.');
      return;
    }

    if (!spotifyAccessToken) {
      setApiStatus('Complete the Spotify OAuth flow first so DiVault can use your access token.');
      return;
    }

    setIsSyncing(true);
    setApiStatus('Searching Spotify playlists...');

    try {
      const response = await fetch('/api/spotify/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: spotifyAccessToken, query: trimmedQuery }),
      });

      if (!response.ok) throw new Error('Spotify rejected the request.');
      const payload = await response.json();

      const item: MediaItem = {
        id: `Spotify-${payload.playlistId}`,
        title: payload.title,
        url: payload.url,
        source: 'Spotify',
      };

      setSpotifyList((prev) => [item, ...prev]);
      setPreviewItem(item);
      setActiveTab('browse');
      setSpotifyQuery('');
      setApiStatus(`Imported "${item.title}" from Spotify.`);
    } catch (error) {
      setApiStatus(error instanceof Error ? error.message : 'Unable to import from Spotify.');
    } finally {
      setIsSyncing(false);
    }
  };

  const exportVault = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      connectedServices,
      readingList,
      youtubeList,
      spotifyList,
      pinterestPins,
      instagramSaves,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `divault-export-${Date.now()}.json`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    setApiStatus('Your vault has been exported as a JSON file.');
  };

  const chatbotName = useMemo(() => {
    if (chatbotGender === 'Male') return 'Kai';
    if (chatbotGender === 'Nonbinary') return 'Sky';
    return 'Ava';
  }, [chatbotGender]);

  const chatbotResponse = (message: string) => {
    const lower = message.toLowerCase();
    if (lower.includes('youtube')) return 'You can connect YouTube and import playlists after permission is granted.';
    if (lower.includes('spotify')) return 'Spotify playlists can be connected through the same permission flow.';
    if (lower.includes('pinterest') || lower.includes('pin')) return 'I can import your Pinterest pins and show them in the Browse tab.';
    if (lower.includes('instagram') || lower.includes('save')) return 'Instagram saves are stored here too.';
    if (lower.includes('read') || lower.includes('article')) return 'I can keep your reading list organized.';
    return 'Tell me what you want to save, open, or import, and I will guide you through the vault.';
  };

  const addChat = () => {
    if (!chatQuery) return;
    setChatHistory((prev) => [...prev, `You: ${chatQuery}`, `${chatbotName}: ${chatbotResponse(chatQuery)}`]);
    setChatQuery('');
  };

  const getYouTubeEmbedUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('youtu.be')) {
        return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
      }
      if (parsed.searchParams.has('v')) {
        return `https://www.youtube.com/embed/${parsed.searchParams.get('v')}`;
      }
    } catch {
      // fallback
    }
    return url;
  };

  const previewContent = () => {
    if (!previewItem) {
      return <div className="browser-frame">Select a saved item to preview it here.</div>;
    }

    if (previewItem.source === 'YouTube') {
      return (
        <iframe
          className="preview-iframe"
          title={previewItem.title}
          src={getYouTubeEmbedUrl(previewItem.url)}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    if (previewItem.source === 'Spotify') {
      const embedUrl = getSpotifyEmbedUrl(previewItem.url);
      return embedUrl ? (
        <iframe
          className="preview-iframe"
          title={previewItem.title}
          src={embedUrl}
          allow="encrypted-media; clipboard-write"
          allowFullScreen
        />
      ) : (
        <div className="preview-frame">
          <p>{previewItem.title}</p>
          <a className="preview-link" href={previewItem.url} target="_blank" rel="noreferrer">
            Open Spotify playlist in a new tab
          </a>
        </div>
      );
    }

    if (previewItem.source === 'Pinterest') {
      const embedUrl = getPinterestEmbedUrl(previewItem.url);
      return embedUrl ? (
        <iframe className="preview-iframe" title={previewItem.title} src={embedUrl} />
      ) : (
        <div className="preview-frame">
          <p>{previewItem.title}</p>
          <a className="preview-link" href={previewItem.url} target="_blank" rel="noreferrer">
            View Pinterest pin
          </a>
        </div>
      );
    }

    if (previewItem.source === 'Instagram') {
      const embedUrl = getInstagramEmbedUrl(previewItem.url);
      return embedUrl ? (
        <iframe className="preview-iframe" title={previewItem.title} src={embedUrl} />
      ) : (
        <div className="preview-frame">
          <p>{previewItem.title}</p>
          <a className="preview-link" href={previewItem.url} target="_blank" rel="noreferrer">
            View Instagram post
          </a>
        </div>
      );
    }

    return (
      <div className="preview-frame">
        <p>{previewItem.title}</p>
        <a className="preview-link" href={previewItem.url} target="_blank" rel="noreferrer">
          Open article
        </a>
      </div>
    );
  };

  const signOut = () => {
    setSignedIn(false);
    setConnectedServices({ google: false, youtube: false, spotify: false });
    setGoogleAccessToken('');
    setYoutubeAccessToken('');
    setSpotifyAccessToken('');
    window.localStorage.removeItem('divault-vault');
  };

  if (!signedIn) {
    return (
      <div className="page shell">
        <div className="card auth-card">
          <h1>DiVault</h1>
          <p>Sign in with Google and grant YouTube and Spotify access so your vault can sync and export media data.</p>
          <form onSubmit={handleSignUp} className="auth-form">
            <label>
              Name
              <input name="name" required placeholder="Your name" />
            </label>
            <label>
              Email
              <input name="email" type="email" required placeholder="you@example.com" />
            </label>
            <label>
              Preferred chatbot voice
              <select name="chatbotGender" defaultValue="Female">
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Nonbinary">Nonbinary</option>
              </select>
            </label>
            <button type="submit">Continue with email</button>
          </form>
          <div className="auth-divider">or</div>
          <button className="oauth-button" onClick={handleGoogleSignIn}>Continue with Google</button>
          <div className="auth-hint">
            <strong>OAuth setup:</strong> add Google, YouTube, and Spotify client IDs below to use real provider redirects.
          </div>
          <div className="auth-config-grid">
            <label>
              Google client ID
              <input value={googleClientId} onChange={(e) => setGoogleClientId(e.target.value)} placeholder="Google OAuth client ID" />
            </label>
            <label>
              YouTube client ID
              <input value={youtubeClientId} onChange={(e) => setYoutubeClientId(e.target.value)} placeholder="YouTube OAuth client ID" />
            </label>
            <label>
              Spotify client ID
              <input value={spotifyClientId} onChange={(e) => setSpotifyClientId(e.target.value)} placeholder="Spotify client ID" />
            </label>
          </div>
          {apiStatus ? <p className="api-status">{apiStatus}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1>DiVault</h1>
          <p>Welcome back, {profile.name}. Your vault is ready for connected media providers.</p>
        </div>
        <div className="profile">
          <span>{profile.name}</span>
          <small>{profile.email}</small>
          <button className="signout-button" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <nav className="tabs">
        <button onClick={() => setActiveTab('library')} className={activeTab === 'library' ? 'active' : ''}>
          Library
        </button>
        <button onClick={() => setActiveTab('browse')} className={activeTab === 'browse' ? 'active' : ''}>
          Browse
        </button>
        <button onClick={() => setActiveTab('chat')} className={activeTab === 'chat' ? 'active' : ''}>
          Chat
        </button>
      </nav>

      <main className="content">
        <section className="card api-panel">
          <div className="browse-header">
            <div>
              <h2>Connect media providers</h2>
              <p>Google sign-in starts the session, then YouTube and Spotify prompt for permission before the app can import and export your media data.</p>
            </div>
            <button onClick={exportVault}>Export vault</button>
          </div>

          <div className="service-list">
            <div className={`service-pill ${connectedServices.google ? 'active' : ''}`}>
              <span>Google</span>
              <strong>{connectedServices.google ? 'Connected' : 'Not connected'}</strong>
            </div>
            <div className={`service-pill ${connectedServices.youtube ? 'active' : ''}`}>
              <span>YouTube</span>
              <strong>{connectedServices.youtube ? 'Permission granted' : 'Awaiting permission'}</strong>
            </div>
            <div className={`service-pill ${connectedServices.spotify ? 'active' : ''}`}>
              <span>Spotify</span>
              <strong>{connectedServices.spotify ? 'Permission granted' : 'Awaiting permission'}</strong>
            </div>
          </div>

          <div className="api-grid">
            <div className="api-card">
              <h3>Google</h3>
              <p>Use Google to sign in and establish your DiVault session.</p>
              <button onClick={handleGoogleSignIn}>Sign in with Google</button>
            </div>
            <div className="api-card">
              <h3>YouTube</h3>
              <p>Request access for playlists and channel data from YouTube.</p>
              <label>
                Search
                <input value={youtubeQuery} onChange={(e) => setYoutubeQuery(e.target.value)} placeholder="edm mix, study playlist" />
              </label>
              <button onClick={() => handleProviderConnect('youtube')}>Connect YouTube</button>
              <button onClick={importFromYouTube} disabled={isSyncing}>
                {isSyncing ? 'Importing...' : 'Import from YouTube'}
              </button>
            </div>
            <div className="api-card">
              <h3>Spotify</h3>
              <p>Request permission for playlist browsing and export from Spotify.</p>
              <label>
                Search
                <input value={spotifyQuery} onChange={(e) => setSpotifyQuery(e.target.value)} placeholder="lofi, indie pop" />
              </label>
              <button onClick={() => handleProviderConnect('spotify')}>Connect Spotify</button>
              <button onClick={importFromSpotify} disabled={isSyncing}>
                {isSyncing ? 'Importing...' : 'Import from Spotify'}
              </button>
            </div>
          </div>
          {apiStatus ? <p className="api-status">{apiStatus}</p> : null}
        </section>

        {activeTab === 'library' && (
          <section className="grid">
            {[
              { title: 'Reading List', list: readingList, source: 'Reading' as const },
              { title: 'YouTube Playlist', list: youtubeList, source: 'YouTube' as const },
              { title: 'Spotify Playlist', list: spotifyList, source: 'Spotify' as const },
              { title: 'Pinterest Pins', list: pinterestPins, source: 'Pinterest' as const },
              { title: 'Instagram Saves', list: instagramSaves, source: 'Instagram' as const },
            ].map(({ title, list, source }) => (
              <div key={source} className="card">
                <h2>{title} ({list.length})</h2>
                <ul>
                  {list.map((item) => (
                    <li key={item.id} className="item-card">
                      <div>
                        <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
                      </div>
                      <button onClick={() => {
                        setPreviewItem(item);
                        setActiveTab('browse');
                      }}>
                        Preview
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="item-form">
                  <input
                    value={draft.title}
                    placeholder="Title"
                    onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                  />
                  <input
                    value={draft.url}
                    placeholder="URL"
                    onChange={(e) => setDraft((prev) => ({ ...prev, url: e.target.value }))}
                  />
                  <button onClick={() => saveItem(source)}>Add {source}</button>
                </div>
              </div>
            ))}
          </section>
        )}

        {activeTab === 'browse' && (
          <section className="browse-panel card">
            <div className="browse-header">
              <div>
                <h2>In-app browsing</h2>
                <p>Preview your saved playlists, pins, and reads without leaving DiVault.</p>
              </div>
              <button onClick={() => setPreviewItem(allItems[0] ?? null)} disabled={allItems.length === 0}>
                Preview latest item
              </button>
            </div>

            <div className="preview-panel">
              <div className="preview-meta">
                <h3>{previewItem ? previewItem.title : 'No preview selected'}</h3>
                <p>{previewItem ? `Source: ${previewItem.source}` : 'Select an item in the Library to preview it here.'}</p>
              </div>
              {previewContent()}
            </div>

            <div className="browse-actions card">
              <h3>Saved items</h3>
              <ul>
                {allItems.length === 0 && <li className="browse-empty">Add something to your library to preview it here.</li>}
                {allItems.map((item) => (
                  <li key={item.id}>
                    <span>{item.title}</span>
                    <div>
                      <button onClick={() => {
                        setPreviewItem(item);
                      }}>
                        Preview
                      </button>
                      <a href={item.url} target="_blank" rel="noreferrer">Open</a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {activeTab === 'chat' && (
          <section className="chat-panel card">
            <div className="chat-head">
              <div>
                <h2>Chat with {chatbotName}</h2>
                <p>Use your virtual assistant to add items, import favorites, and get quick guidance.</p>
              </div>
              <div className="chat-voice">
                <span>{chatbotGender}</span>
              </div>
            </div>
            <div className="chat-history">
              {chatHistory.map((entry, index) => (
                <div key={index} className={entry.startsWith('You:') ? 'chat-user' : 'chat-bot'}>{entry}</div>
              ))}
            </div>
            <div className="chat-form">
              <input
                value={chatQuery}
                placeholder="Ask for help or say what you want to save"
                onChange={(e) => setChatQuery(e.target.value)}
              />
              <button onClick={addChat}>Send</button>
            </div>
            <div className="import-panel">
              <h3>Import saved favorites</h3>
              <select value={importSource} onChange={(e) => setImportSource(e.target.value as 'Pinterest' | 'Instagram')}>
                <option value="Pinterest">Pinterest</option>
                <option value="Instagram">Instagram</option>
              </select>
              <input
                value={importUrl}
                placeholder={`Paste ${importSource} URL to import`}
                onChange={(e) => setImportUrl(e.target.value)}
              />
              <button onClick={importFromUrl}>Import URL</button>
              <button onClick={importFavorites}>Auto import favorites</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
