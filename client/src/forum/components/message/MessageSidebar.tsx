/**
 * Sidebar cu informații despre utilizatorul care a postat
 */

import { useTheme } from '../../contexts/ThemeContext';
import type { MessagePost } from './types';

interface MessageSidebarProps {
  post: MessagePost;
  isOriginalPost: boolean;
  isMobile: boolean;
  onGearClick: () => void;
}

export default function MessageSidebar({ post, isOriginalPost, isMobile, onGearClick }: MessageSidebarProps) {
  const { theme } = useTheme();

  const getSeniorityRank = (rank: string) => {
    const seniorityRanks = {
      'incepator': '🆕 Pescar Nou',
      'pescar': '🎣 Pescar Activ',
      'expert': '🐟 Pescar Experimentat',
      'maestru': '🏆 Pescar Veteran',
      'moderator': '🟣 Moderator',
      'administrator': '🔴 Administrator',
      'founder': '👑 Founder'
    };
    return seniorityRanks[rank as keyof typeof seniorityRanks] || '🎣 Pescar';
  };

  const getRespectColor = (respect: number) => {
    if (respect >= 50) return theme.secondary;
    if (respect >= 20) return theme.primary;
    if (respect >= 0) return theme.textSecondary;
    return '#dc2626';
  };

  const formatSmartDateTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    
    const isToday = date.getDate() === now.getDate() &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    if (isToday) {
      return `${hours}:${minutes}`;
    } else {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    }
  };

  return (
    <div style={{
      width: isMobile ? '100px' : '200px',
      minWidth: isMobile ? '100px' : '200px',
      maxWidth: isMobile ? '100px' : '200px',
      backgroundColor: isOriginalPost ? theme.primary + '15' : theme.background,
      borderRight: `1px solid ${theme.border}`,
      padding: isMobile ? '0.5rem 0.375rem' : '1.5rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      flexShrink: 0,
      overflow: 'hidden'
    }}>
      {/* Avatar - Mai mic pe mobil */}
      <div
        style={{
          width: isMobile ? '2.5rem' : '4rem',
          height: isMobile ? '2.5rem' : '4rem',
          borderRadius: '50%',
          background: post.authorAvatar 
            ? `url(${post.authorAvatar}) center/cover`
            : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: post.authorAvatar ? 'transparent' : 'white',
          fontSize: isMobile ? '1rem' : '1.5rem',
          fontWeight: '600',
          marginBottom: isMobile ? '0.375rem' : '0.75rem',
          border: `2px solid ${theme.border}`,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          flexShrink: 0
        }}
      >
        {!post.authorAvatar && post.author.charAt(0).toUpperCase()}
      </div>

      {/* Nume utilizator - Truncat pe mobil */}
      <div style={{
        fontWeight: '600',
        color: theme.text,
        fontSize: isMobile ? '0.6875rem' : '0.875rem',
        marginBottom: isMobile ? '0.25rem' : '0.5rem',
        wordBreak: 'break-word',
        lineHeight: '1.2',
        width: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: isMobile ? 2 : 3,
        WebkitBoxOrient: 'vertical'
      }}>
        {post.author}
      </div>

      {/* Rang vechime - Mai compact pe mobil */}
      <div style={{
        fontSize: isMobile ? '0.5625rem' : '0.75rem',
        color: theme.textSecondary,
        marginBottom: isMobile ? '0.375rem' : '0.75rem',
        textAlign: 'center',
        lineHeight: '1.2',
        width: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical'
      }}>
        {getSeniorityRank(post.authorRank)}
      </div>

      {/* Respect - Mai compact pe mobil */}
      <div style={{
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: '0.375rem',
        padding: isMobile ? '0.25rem 0.375rem' : '0.5rem',
        marginBottom: isMobile ? '0.375rem' : '0.75rem',
        width: '100%'
      }}>
        <div style={{ 
          fontSize: isMobile ? '0.5625rem' : '0.75rem', 
          color: theme.textSecondary, 
          marginBottom: '0.125rem',
          lineHeight: '1.2'
        }}>
          {isMobile ? 'Rep.' : 'Respect'}
        </div>
        <div style={{
          fontWeight: '600',
          fontSize: isMobile ? '0.75rem' : '1rem',
          color: getRespectColor(post.respect || 0),
          lineHeight: '1.2'
        }}>
          {post.respect >= 0 ? '+' : ''}{post.respect || 0}
        </div>
      </div>

      {/* Equipment preview - Mai mic pe mobil */}
      <button
        style={{
          fontSize: isMobile ? '0.5625rem' : '0.75rem',
          color: theme.primary,
          backgroundColor: 'transparent',
          border: `1px solid ${theme.primary}`,
          borderRadius: '0.375rem',
          padding: isMobile ? '0.25rem 0.375rem' : '0.375rem 0.75rem',
          cursor: 'pointer',
          width: '100%',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
        onClick={onGearClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = theme.primary;
          e.currentTarget.style.color = 'white';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = theme.primary;
        }}
      >
        {isMobile ? '📋' : '📋 Echipament'}
      </button>

      {/* Post stats - Mai compact pe mobil */}
      <div style={{
        marginTop: isMobile ? '0.5rem' : '1rem',
        fontSize: isMobile ? '0.5625rem' : '0.75rem',
        color: theme.textSecondary,
        borderTop: `1px solid ${theme.border}`,
        paddingTop: isMobile ? '0.5rem' : '0.75rem',
        width: '100%',
        lineHeight: '1.3'
      }}>
        <div style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {formatSmartDateTime(post.createdAt)}
        </div>
        {isOriginalPost && (
          <div style={{
            marginTop: '0.375rem',
            fontSize: isMobile ? '0.5rem' : '0.625rem',
            padding: isMobile ? '0.125rem 0.25rem' : '0.25rem',
            backgroundColor: theme.primary + '20',
            color: theme.primary,
            borderRadius: '0.25rem',
            fontWeight: '600',
            textAlign: 'center',
            lineHeight: '1.2'
          }}>
            {isMobile ? 'TOPIC' : 'TOPIC STARTER'}
          </div>
        )}
      </div>
    </div>
  );
}
