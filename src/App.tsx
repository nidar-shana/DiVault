import { useEffect, useMemo, useState } from 'react';

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

  const totals = useMemo(
    () => ({
      reading: readingList.length,
      youtube: youtubeList.length,
      spotify: spotifyList.length,
      pinterest: pinterestPins.length,
      instagram: instagramSaves.length,
    }),
    [readingList, youtubeList, spotifyList, pinterestPins, instagramSaves],
  );

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
      };

      setProfile(data.profile);
      setChatbotGender(data.chatbotGender);
      setReadingList(data.readingList);
      setYoutubeList(data.youtubeList);
      setSpotifyList(data.spotifyList);
      setPinterestPins(data.pinterestPins);
      setInstagramSaves(data.instagramSaves);
      setSignedIn(data.signedIn);
    } catch {
      // ignore invalid stored state
    }
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    window.localStorage.setItem(
      'divault-vault',
      JSON.stringify({ profile, chatbotGender, readingList, youtubeList, spotifyList, pinterestPins, instagramSaves, signedIn }),
    );
  }, [signedIn, profile, chatbotGender, readingList, youtubeList, spotifyList, pinterestPins, instagramSaves]);

  const handleSignUp = (event: React.FormEvent<HTMLFormElement>) => {
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

  const chatbotName = useMemo(() => {
    if (chatbotGender === 'Male') return 'Kai';
    if (chatbotGender === 'Nonbinary') return 'Sky';
    return 'Ava';
  }, [chatbotGender]);

  const chatbotResponse = (message: string) => {
    const lower = message.toLowerCase();
    if (lower.includes('youtube')) return 'You can add a YouTube playlist link and I will keep it in your vault. Want me to help you add one?';
    if (lower.includes('spotify')) return 'Your Spotify playlists can be stored here. Share the playlist link and I will save it for you.';
    if (lower.includes('pinterest') || lower.includes('pin')) return 'I can import your Pinterest pins and show them in the Browse tab. Select Pinterest from the importer and press import.';
    if (lower.includes('instagram') || lower.includes('save')) return 'Instagram saves are stored here too. Send me a post link and I will help you add it.';
    if (lower.includes('read') || lower.includes('article')) return 'I can keep your reading list organized. Add the article title and URL in the Reading section.';
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
    window.localStorage.removeItem('divault-vault');
  };

  if (!signedIn) {
    return (
      <div className="page shell">
        <div className="card auth-card">
          <h1>DiVault</h1>
          <p>Save reading lists, playlists, and favorite pins in one place.</p>
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
            <button type="submit">Get started</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1>DiVault</h1>
          <p>Welcome back, {profile.name}. Your personal media vault is ready.</p>
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
