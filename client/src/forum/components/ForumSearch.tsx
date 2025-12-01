import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ForumSearchProps {
    onSearch?: (query: string) => void;
}

export default function ForumSearch({ onSearch }: ForumSearchProps) {
    const { theme } = useTheme();
    const [query, setQuery] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            if (onSearch) {
                onSearch(query);
            } else {
                console.log('Search query:', query);
                // Implement navigation to search results page here
                // window.location.href = `/forum/search?q=${encodeURIComponent(query)}`;
                alert(`Căutare pentru: ${query} (Funcționalitate în lucru)`);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <input
                type="text"
                placeholder="Caută în forum..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                    width: '100%',
                    padding: '0.5rem 1rem 0.5rem 2.5rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${theme.border}`,
                    backgroundColor: theme.surface,
                    color: theme.text,
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                }}
            />
            <Search
                style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1rem',
                    height: '1rem',
                    color: theme.textSecondary
                }}
            />
        </form>
    );
}
