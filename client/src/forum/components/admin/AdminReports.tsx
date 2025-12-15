/**
 * Admin Reports Panel Component
 * Panel pentru gestionare rapoarte generale (spam/abuz pentru postări, topicuri, utilizatori)
 * Mobile-first design optimizat
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, X, Clock, User, FileText, MessageSquare, Hash } from 'lucide-react';
import type { ReportStatus } from '../../../services/forum/types';
import { getReports, updateReportStatus } from '../../../services/forum/moderation';

interface ForumReport {
  id: string;
  reporter_id: string;
  reported_user_id?: string | null;
  post_id?: string | null;
  topic_id?: string | null;
  reason: string;
  description?: string | null;
  status: ReportStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  reporter_username?: string;
  reported_username?: string;
  reviewer_username?: string;
  post_title?: string;
  topic_title?: string;
}

const STATUS_OPTIONS: { value: ReportStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'În Așteptare', color: '#f59e0b' },
  { value: 'reviewed', label: 'Revizuit', color: '#3b82f6' },
  { value: 'resolved', label: 'Rezolvat', color: '#10b981' },
  { value: 'dismissed', label: 'Respins', color: '#ef4444' },
];

export default function AdminReports() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { forumUser } = useAuth();
  
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [selectedReport, setSelectedReport] = useState<ForumReport | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<ReportStatus>('pending');
  const [notes, setNotes] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Fetch rapoarte
  const { data: reportsData, isLoading: loadingReports } = useQuery({
    queryKey: ['admin-reports', statusFilter, page],
    queryFn: async () => {
      const result = await getReports(
        statusFilter === 'all' ? undefined : statusFilter,
        page,
        pageSize
      );

      if (result.error) {
        throw new Error(result.error.message);
      }

      if (!result.data) {
        return { data: [], total: 0, page: 1, page_size: pageSize, has_more: false };
      }

      // Optimizare: colectăm toate ID-urile și facem query-uri batch
      const postIds = result.data.data.map(r => r.post_id).filter(Boolean) as string[];
      const topicIds = [
        ...result.data.data.map(r => r.topic_id).filter(Boolean) as string[],
        ...result.data.data.map(r => {
          // Dacă are post_id, trebuie să obținem topic_id din post
          return null; // Vom face query separat pentru post-uri cu topic_id
        }).filter(Boolean) as string[]
      ];

      // Batch query pentru topic-uri
      let topicsMap = new Map<string, string>();
      if (topicIds.length > 0) {
        const { data: topicsData } = await supabase
          .from('forum_topics')
          .select('id, title')
          .in('id', topicIds);
        
        if (topicsData) {
          topicsMap = new Map(topicsData.map(t => [t.id, t.title]));
        }
      }

      // Batch query pentru post-uri (doar pentru cele care nu au topic_id direct)
      let postsMap = new Map<string, { content: string; topic_id?: string }>();
      if (postIds.length > 0) {
        const { data: postsData } = await supabase
          .from('forum_posts')
          .select('id, content, topic_id')
          .in('id', postIds);
        
        if (postsData) {
          postsMap = new Map(postsData.map(p => [p.id, { content: p.content, topic_id: p.topic_id }]));
          
          // Adăugăm topic-urile din post-uri la map
          const topicIdsFromPosts = postsData.map(p => p.topic_id).filter(Boolean) as string[];
          if (topicIdsFromPosts.length > 0) {
            const { data: topicsFromPosts } = await supabase
              .from('forum_topics')
              .select('id, title')
              .in('id', topicIdsFromPosts);
            
            if (topicsFromPosts) {
              topicsFromPosts.forEach(t => {
                if (!topicsMap.has(t.id)) {
                  topicsMap.set(t.id, t.title);
                }
              });
            }
          }
        }
      }

      // Mapăm datele
      const reportsWithDetails = result.data.data.map((report) => {
        let postTitle: string | undefined;
        let topicTitle: string | undefined;

        if (report.post_id) {
          const postData = postsMap.get(report.post_id);
          if (postData) {
            postTitle = postData.content.substring(0, 100) + (postData.content.length > 100 ? '...' : '');
            if (postData.topic_id) {
              topicTitle = topicsMap.get(postData.topic_id);
            }
          }
        } else if (report.topic_id) {
          topicTitle = topicsMap.get(report.topic_id);
        }

        return {
          ...report,
          post_title: postTitle,
          topic_title: topicTitle,
        };
      });

      return {
        ...result.data,
        data: reportsWithDetails,
      };
    },
    staleTime: 60 * 1000, // 1 minut cache
    gcTime: 5 * 60 * 1000, // 5 minute garbage collection
  });

  const reports = reportsData?.data || [];
  const total = reportsData?.total || 0;
  const hasMore = reportsData?.has_more || false;

  // Mutation pentru actualizare status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ reportId, status, notes }: { 
      reportId: string; 
      status: ReportStatus; 
      notes?: string;
    }) => {
      const result = await updateReportStatus(reportId, status, notes);
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      setShowStatusModal(false);
      setSelectedReport(null);
      setNotes('');
      showToast('Status raport actualizat cu succes!', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Eroare la actualizarea status-ului', 'error');
    },
  });

  const handleStatusChange = (report: ForumReport, newStatus: ReportStatus) => {
    setSelectedReport(report);
    setNewStatus(newStatus);
    setNotes('');
    setShowStatusModal(true);
  };

  const handleStatusSubmit = () => {
    if (!selectedReport) return;

    updateStatusMutation.mutate({
      reportId: selectedReport.id,
      status: newStatus,
      notes: notes.trim() || undefined,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: ReportStatus) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || theme.textSecondary;
  };

  const getReportTarget = (report: ForumReport) => {
    if (report.post_id && report.topic_id) {
      return { type: 'post', id: report.post_id, topicId: report.topic_id };
    } else if (report.topic_id) {
      return { type: 'topic', id: report.topic_id };
    } else if (report.reported_user_id) {
      return { type: 'user', id: report.reported_user_id };
    }
    return null;
  };

  if (loadingReports) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: theme.textSecondary }}>
        Se încarcă raportările...
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h2 style={{ 
        fontSize: 'clamp(1.5rem, 3vw, 2rem)', 
        fontWeight: '700', 
        color: theme.text, 
        marginBottom: '1.5rem' 
      }}>
        🚩 Raportări Forum
      </h2>

      {/* Filtre Status */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: theme.surface,
        borderRadius: '0.5rem',
        border: `1px solid ${theme.border}`
      }}>
        <button
          onClick={() => setStatusFilter('all')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: statusFilter === 'all' ? theme.primary : 'transparent',
            color: statusFilter === 'all' ? '#ffffff' : theme.text,
            border: `1px solid ${statusFilter === 'all' ? theme.primary : theme.border}`,
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: statusFilter === 'all' ? '600' : '500',
            transition: 'all 0.2s'
          }}
        >
          Toate ({total})
        </button>
        {STATUS_OPTIONS.map((status) => {
          const count = reports.filter(r => r.status === status.value).length;
          return (
            <button
              key={status.value}
              onClick={() => setStatusFilter(status.value)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: statusFilter === status.value ? status.color : 'transparent',
                color: statusFilter === status.value ? '#ffffff' : theme.text,
                border: `1px solid ${statusFilter === status.value ? status.color : theme.border}`,
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: statusFilter === status.value ? '600' : '500',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span>{status.label}</span>
              {statusFilter === 'all' && count > 0 && (
                <span style={{
                  backgroundColor: statusFilter === status.value ? 'rgba(255,255,255,0.3)' : status.color,
                  color: statusFilter === status.value ? '#ffffff' : '#ffffff',
                  padding: '0.125rem 0.375rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Lista Raportări */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {reports.length === 0 ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            backgroundColor: theme.surface,
            borderRadius: '0.5rem',
            border: `1px solid ${theme.border}`,
            color: theme.textSecondary
          }}>
            <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Nu există raportări {statusFilter !== 'all' ? `cu status "${STATUS_OPTIONS.find(s => s.value === statusFilter)?.label}"` : ''}.</p>
          </div>
        ) : (
          reports.map((report) => {
            const target = getReportTarget(report);
            return (
              <div
                key={report.id}
                style={{
                  backgroundColor: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = theme.primary;
                  e.currentTarget.style.boxShadow = `0 2px 8px ${theme.primary}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = theme.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => {
                  setSelectedReport(report);
                  setShowDetailsModal(true);
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: getStatusColor(report.status),
                        color: '#ffffff',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {STATUS_OPTIONS.find(s => s.value === report.status)?.label}
                      </span>
                      <span style={{ color: theme.textSecondary, fontSize: '0.875rem' }}>
                        {formatDate(report.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Informații Raport */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <User size={16} style={{ color: theme.textSecondary }} />
                      <span style={{ color: theme.textSecondary, fontSize: '0.875rem' }}>
                        Raportat de: <strong style={{ color: theme.text }}>{report.reporter_username || 'Unknown'}</strong>
                      </span>
                    </div>

                    {report.reported_username && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <AlertTriangle size={16} style={{ color: theme.textSecondary }} />
                        <span style={{ color: theme.textSecondary, fontSize: '0.875rem' }}>
                          Utilizator raportat: <strong style={{ color: theme.text }}>{report.reported_username}</strong>
                        </span>
                      </div>
                    )}

                    {target && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {target.type === 'post' ? (
                          <MessageSquare size={16} style={{ color: theme.textSecondary }} />
                        ) : target.type === 'topic' ? (
                          <Hash size={16} style={{ color: theme.textSecondary }} />
                        ) : (
                          <User size={16} style={{ color: theme.textSecondary }} />
                        )}
                        <span style={{ color: theme.textSecondary, fontSize: '0.875rem' }}>
                          {target.type === 'post' ? 'Postare' : target.type === 'topic' ? 'Topic' : 'Utilizator'}
                          {report.topic_title && `: ${report.topic_title}`}
                          {report.post_title && ` - ${report.post_title}`}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <FileText size={16} style={{ color: theme.textSecondary }} />
                      <span style={{ color: theme.textSecondary, fontSize: '0.875rem' }}>
                        Motiv: <strong style={{ color: theme.text }}>{report.reason}</strong>
                      </span>
                    </div>

                    {report.description && (
                      <div style={{
                        padding: '0.75rem',
                        backgroundColor: theme.background,
                        borderRadius: '0.375rem',
                        border: `1px solid ${theme.border}`,
                        fontSize: '0.875rem',
                        color: theme.text,
                        maxHeight: '100px',
                        overflow: 'auto'
                      }}>
                        {report.description}
                      </div>
                    )}
                  </div>

                  {/* Acțiuni Rapide */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {target && (
                      <Link
                        to={
                          target.type === 'post' && target.topicId
                            ? `/forum/topic/${target.topicId}#post-${target.id}`
                            : target.type === 'topic'
                            ? `/forum/topic/${target.id}`
                            : target.type === 'user'
                            ? `/forum/user/${report.reported_username}`
                            : '#'
                        }
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: '0.375rem 0.75rem',
                          backgroundColor: theme.primary,
                          color: '#ffffff',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          textDecoration: 'none',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                      >
                        Vezi {target.type === 'post' ? 'Postare' : target.type === 'topic' ? 'Topic' : 'Profil'}
                      </Link>
                    )}
                    
                    {report.status === 'pending' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(report, 'resolved');
                          }}
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#059669';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#10b981';
                          }}
                        >
                          <CheckCircle size={16} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                          Rezolvat
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(report, 'dismissed');
                          }}
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#dc2626';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ef4444';
                          }}
                        >
                          <X size={16} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                          Respinge
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Paginare */}
      {total > pageSize && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem',
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: theme.surface,
          borderRadius: '0.5rem',
          border: `1px solid ${theme.border}`
        }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: page === 1 ? theme.border : theme.primary,
              color: page === 1 ? theme.textSecondary : '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              opacity: page === 1 ? 0.5 : 1
            }}
          >
            Anterior
          </button>
          <span style={{ color: theme.text, fontSize: '0.875rem' }}>
            Pagina {page} din {Math.ceil(total / pageSize)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: !hasMore ? theme.border : theme.primary,
              color: !hasMore ? theme.textSecondary : '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: !hasMore ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              opacity: !hasMore ? 0.5 : 1
            }}
          >
            Următor
          </button>
        </div>
      )}

      {/* Modal Detalii Raport */}
      {showDetailsModal && selectedReport && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => {
            setShowDetailsModal(false);
            setSelectedReport(null);
          }}
        >
          <div
            style={{
              backgroundColor: theme.background,
              borderRadius: '0.5rem',
              padding: '1.5rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: `1px solid ${theme.border}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: theme.text }}>
                Detalii Raport
              </h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedReport(null);
                }}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: theme.textSecondary,
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.surface;
                  e.currentTarget.style.color = theme.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = theme.textSecondary;
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <strong style={{ color: theme.textSecondary, fontSize: '0.875rem' }}>Status:</strong>
                <div style={{ marginTop: '0.25rem' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: getStatusColor(selectedReport.status),
                    color: '#ffffff',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    {STATUS_OPTIONS.find(s => s.value === selectedReport.status)?.label}
                  </span>
                </div>
              </div>

              <div>
                <strong style={{ color: theme.textSecondary, fontSize: '0.875rem' }}>Raportat de:</strong>
                <div style={{ marginTop: '0.25rem', color: theme.text }}>
                  {selectedReport.reporter_username || 'Unknown'}
                </div>
              </div>

              {selectedReport.reported_username && (
                <div>
                  <strong style={{ color: theme.textSecondary, fontSize: '0.875rem' }}>Utilizator raportat:</strong>
                  <div style={{ marginTop: '0.25rem', color: theme.text }}>
                    {selectedReport.reported_username}
                  </div>
                </div>
              )}

              <div>
                <strong style={{ color: theme.textSecondary, fontSize: '0.875rem' }}>Motiv:</strong>
                <div style={{ marginTop: '0.25rem', color: theme.text }}>
                  {selectedReport.reason}
                </div>
              </div>

              {selectedReport.description && (
                <div>
                  <strong style={{ color: theme.textSecondary, fontSize: '0.875rem' }}>Descriere:</strong>
                  <div style={{
                    marginTop: '0.25rem',
                    padding: '0.75rem',
                    backgroundColor: theme.surface,
                    borderRadius: '0.375rem',
                    border: `1px solid ${theme.border}`,
                    color: theme.text,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedReport.description}
                  </div>
                </div>
              )}

              <div>
                <strong style={{ color: theme.textSecondary, fontSize: '0.875rem' }}>Data creării:</strong>
                <div style={{ marginTop: '0.25rem', color: theme.text }}>
                  {formatDate(selectedReport.created_at)}
                </div>
              </div>

              {selectedReport.reviewed_by && (
                <div>
                  <strong style={{ color: theme.textSecondary, fontSize: '0.875rem' }}>Revizuit de:</strong>
                  <div style={{ marginTop: '0.25rem', color: theme.text }}>
                    {selectedReport.reviewer_username || 'Unknown'} la {selectedReport.reviewed_at ? formatDate(selectedReport.reviewed_at) : 'N/A'}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {selectedReport.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleStatusChange(selectedReport, 'resolved');
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                    >
                      <CheckCircle size={16} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                      Marchează ca Rezolvat
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleStatusChange(selectedReport, 'dismissed');
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                    >
                      <X size={16} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                      Respinge
                    </button>
                  </>
                )}
                {selectedReport.status !== 'pending' && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleStatusChange(selectedReport, selectedReport.status);
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: theme.primary,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                  >
                    Schimbă Status
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Schimbare Status */}
      {showStatusModal && selectedReport && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: '1rem'
          }}
          onClick={() => {
            setShowStatusModal(false);
            setSelectedReport(null);
            setNotes('');
          }}
        >
          <div
            style={{
              backgroundColor: theme.background,
              borderRadius: '0.5rem',
              padding: '1.5rem',
              maxWidth: '500px',
              width: '100%',
              border: `1px solid ${theme.border}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: theme.text }}>
                Schimbă Status Raport
              </h3>
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedReport(null);
                  setNotes('');
                }}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: theme.textSecondary,
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.surface;
                  e.currentTarget.style.color = theme.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = theme.textSecondary;
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: theme.text, fontSize: '0.875rem', fontWeight: '500' }}>
                  Status Nou:
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ReportStatus)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: theme.surface,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0.375rem',
                    color: theme.text,
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: theme.text, fontSize: '0.875rem', fontWeight: '500' }}>
                  Note (opțional):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adaugă note despre acțiunea luată..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: theme.surface,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0.375rem',
                    color: theme.text,
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedReport(null);
                    setNotes('');
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: theme.surface,
                    color: theme.text,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.surfaceHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.surface;
                  }}
                >
                  Anulează
                </button>
                <button
                  onClick={handleStatusSubmit}
                  disabled={updateStatusMutation.isPending}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: theme.primary,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: updateStatusMutation.isPending ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    opacity: updateStatusMutation.isPending ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!updateStatusMutation.isPending) {
                      e.currentTarget.style.opacity = '0.9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!updateStatusMutation.isPending) {
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                >
                  {updateStatusMutation.isPending ? 'Se salvează...' : 'Salvează'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

