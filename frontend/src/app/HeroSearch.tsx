'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ name: string; displayName: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 1) { setSuggestions([]); return; }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/skills/suggest?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch { setSuggestions([]); }
  }, []);

  const onInputChange = useCallback((val: string) => {
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(val), 200);
  }, [fetchSuggestions]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const submit = () => {
    setShowSuggestions(false);
    if (query.trim()) {
      router.push(`/skills?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/skills');
    }
  };

  return (
    <div ref={wrapperRef} className="hero-search-wrapper">
      <div className="hero-search">
        <input
          type="text"
          placeholder="搜索技能、工具、Agent..."
          value={query}
          onChange={(e) => { onInputChange(e.target.value); setShowSuggestions(true); }}
          onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          className="hero-search-input"
        />
        <button onClick={submit} className="hero-search-btn">
          搜索
        </button>
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="hero-search-dropdown">
          {suggestions.map((s) => (
            <button
              key={s.name}
              className="hero-search-item"
              onClick={() => { setShowSuggestions(false); router.push(`/skills/${s.name}`); }}
            >
              <span style={{ fontWeight: 500 }}>{s.displayName}</span>
              <span style={{ opacity: 0.5, marginLeft: '0.5rem', fontSize: '0.8rem' }}>{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
