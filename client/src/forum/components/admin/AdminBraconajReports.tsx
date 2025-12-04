/**
 * Admin Braconaj Reports Panel Component
 * Panel pentru gestionare rapoarte braconaj (aprobare/respingere, status tracking)
 * Mobile-first design optimizat
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/query-client';
import { AlertTriangle, CheckCircle, X, Clock, MapPin, Calendar, User, FileText, Eye, EyeOff } from 'lucide-react';
import type { BraconajStatus } from '../../../services/forum/types';

interface BraconajReport {
  id: string;
  reporter_id: string;
  reported_user_id?: string | null;
  incident_date: string;
  location: string;
  location_gps?: { x: number; y: number } | null;
  description: string;
  evidence_urls: string[];
  witness_contact?: string | null;
  status: BraconajStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  forwarded_to?: string | null;
  notes?: string | null;
  is_public: boolean;
  created_at: string;
  reporter_username?: string;
  reported_username?: string;
  reviewer_username?: string;
}

const STATUS_OPTIONS: { value: BraconajStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'În Așteptare', color: '#f59e0b' },
  { value: 'in_review', label: 'În Revizuire', color: '#3b82f6' },
  { value: 'forwarded_authorities', label: 'Trimis Autorități', color: '#8b5cf6' },
  { value: 'resolved', label: 'Rezolvat', color: '#10b981' },
  { value: 'false_report', label: 'Raport Fals', color: '#ef4444' },
];

export default function AdminBraconajReports() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { forumUser } = useAuth();
  
  const [statusFilter, setStatusFilter] = useState<BraconajStatus | 'all'>('all');
  const [selectedReport, setSelectedReport] = useState<BraconajReport | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<BraconajStatus>('pending');
  const [forwardedTo, setForwardedTo] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch rapoarte braconaj
  const { data: reports = [], isLoading: loadingReports } = useQuery<BraconajReport[]>({
    queryKey: ['admin-braconaj-reports', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('forum_braconaj_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Obține username-urile pentru reporter, reported_user, reviewer
      const userIds = [
        ...new Set([
          ...(data || []).map(r => r.reporter_id),
          ...(data || []).map(r => r.reported_user_id).filter(Boolean) as string[],
          ...(data || []).map(r => r.reviewed_by).filter(Boolean) as string[],
        ])
      ];

      let usersMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('forum_users')
          .select('user_id, username')
          .in('user_id', userIds);

        if (usersData) {
          usersMap = new Map(usersData.map(u => [u.user_id, u.username]));
        }
      }

      return (data || []).map(report => ({
        ...report,
        reporter_username: usersMap.get(report.reporter_id) || 'Unknown',
        reported_username: report.reported_user_id ? usersMap.get(report.reported_user_id) : undefined,
        reviewer_username: report.reviewed_by ? usersMap.get(report.reviewed_by) : undefined,
      }));
    },
    staleTime: 30 * 1000,
  });

  // Mutation pentru actualizare status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ reportId, status, forwardedTo, notes }: { 
      reportId: string; 
      status: BraconajStatus; 
      forwardedTo?: string; 
      notes?: string;
    }) => {
      const updateData: any = {
        status,
        reviewed_by: forumUser?.id,
        reviewed_at: new Date().toISOString(),
      };

      if (status === 'forwarded_authorities' && forwardedTo) {
        updateData.forwarded_to = forwardedTo;
      }

      if (notes) {
        updateData.notes = notes;
      }

      if (status === 'resolved' || status === 'forwarded_authorities') {
        updateData.is_public = true; // Public după verificare
      }

      const { error } = await supabase
        .from('forum_braconaj_reports')
        .update(updateData)
        .eq('id', reportId);

      if (error) throw error;
      return { status, forwardedTo, notes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-braconaj-reports'] });
      setShowStatusModal(false);
      setSelectedReport(null);
      setForwardedTo('');
      setNotes('');
      showToast('Status raport actualizat cu succes!', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Eroare la actualizarea status-ului', 'error');
    },
  });

  const handleStatusChange = (report: BraconajReport, newStatus: BraconajStatus) => {
    setSelectedReport(report);
    setNewStatus(newStatus);
    setForwardedTo(report.forwarded_to || '');
    setNotes(report.notes || '');
    setShowStatusModal(true);
  };

  const handleStatusSubmit = () => {
    if (!selectedReport) return;

    updateStatusMutation.mutate({
      reportId: selectedReport.id,
      status: newStatus,
      forwardedTo: newStatus === 'forwarded_authorities' ? forwardedTo : undefined,
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

  const getStatusColor = (status: BraconajStatus) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || theme.textSecondary;
  };

  const filteredReports = statusFilter === 'all' 
    ? reports 
    : reports.filter(r => r.status === statusFilter);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h2 style={{ 
        fontSize: 'clamp(1.5rem, 3vw, 2rem)', 
        fontWeight: '700', 
        color: theme.text, 
        marginBottom: '1.5rem' 
      }}>
        Rapoarte Braconaj
      </h2>

      {/* Filtre status */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setStatusFilter('all')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: statusFilter === 'all' ? theme.primary : theme.background,
            color: statusFilter === 'all' ? 'white' : theme.text,
            border: `1px solid ${statusFilter === 'all' ? theme.primary : theme.border}`,
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Toate ({reports.length})
        </button>
        {STATUS_OPTIONS.map((status) => {
          const count = reports.filter(r => r.status === status.value).length;
          return (
            <button
              key={status.value}
              onClick={() => setStatusFilter(status.value)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: statusFilter === status.value ? status.color : theme.background,
                color: statusFilter === status.value ? 'white' : theme.text,
                border: `1px solid ${statusFilter === status.value ? status.color : theme.border}`,
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {status.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Listă rapoarte */}
      {loadingReports ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: theme.textSecondary }}>
          Se încarcă rapoartele...
        </div>
      ) : filteredReports.length === 0 ? (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: theme.textSecondary,
          backgroundColor: theme.surface,
          borderRadius: '0.5rem',
          border: `1px solid ${theme.border}`
        }}>
          <AlertTriangle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <div>Nu există rapoarte {statusFilter !== 'all' ? `cu status "${STATUS_OPTIONS.find(s => s.value === statusFilter)?.label}"` : ''}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredReports.map((report) => (
            <div
              key={report.id}
              style={{
                padding: '1rem',
                border: `1px solid ${theme.border}`,
                borderRadius: '0.5rem',
                backgroundColor: theme.surface,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => {
                setSelectedReport(report);
                setShowDetailsModal(true);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.surfaceHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.surface;
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: getStatusColor(report.status) + '20',
                      color: getStatusColor(report.status),
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {STATUS_OPTIONS.find(s => s.value === report.status)?.label}
                    </span>
                    {report.is_public && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: theme.primary + '20',
                        color: theme.primary,
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <Eye size={12} />
                        Public
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: theme.text, marginBottom: '0.25rem', fontWeight: '600' }}>
                    {report.location}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>
                    Raportat de: <strong>{report.reporter_username}</strong>
                    {report.reported_username && (
                      <> • Raportat împotriva: <strong>{report.reported_username}</strong></>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: theme.textSecondary }}>
                    Incident: {formatDate(report.incident_date)} • Raportat: {formatDate(report.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {report.status === 'pending' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(report, 'in_review');
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Începe Revizuire
                      </button>
                    </>
                  )}
                  {report.status === 'in_review' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(report, 'forwarded_authorities');
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#8b5cf6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Trimite Autorități
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(report, 'resolved');
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Rezolvat
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(report, 'false_report');
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Raport Fals
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal detalii raport */}
      {showDetailsModal && selectedReport && (
        <div style={{
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
          <div style={{
            backgroundColor: theme.surface,
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '800px',
            width: '100%',
            border: `1px solid ${theme.border}`,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: theme.text }}>
                Detalii Raport Braconaj
              </h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedReport(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.textSecondary,
                  padding: '0.25rem'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Status */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                  Status
                </label>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: theme.background,
                  borderRadius: '0.5rem',
                  display: 'inline-block'
                }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: getStatusColor(selectedReport.status) + '20',
                    color: getStatusColor(selectedReport.status),
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    {STATUS_OPTIONS.find(s => s.value === selectedReport.status)?.label}
                  </span>
                </div>
              </div>

              {/* Locație */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                  <MapPin size={18} />
                  Locație
                </label>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: theme.background,
                  borderRadius: '0.5rem',
                  color: theme.text
                }}>
                  {selectedReport.location}
                  {selectedReport.location_gps && (
                    <div style={{ fontSize: '0.875rem', color: theme.textSecondary, marginTop: '0.25rem' }}>
                      GPS: {selectedReport.location_gps.x}, {selectedReport.location_gps.y}
                    </div>
                  )}
                </div>
              </div>

              {/* Data incident */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                  <Calendar size={18} />
                  Data Incident
                </label>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: theme.background,
                  borderRadius: '0.5rem',
                  color: theme.text
                }}>
                  {formatDate(selectedReport.incident_date)}
                </div>
              </div>

              {/* Descriere */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                  <FileText size={18} />
                  Descriere
                </label>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: theme.background,
                  borderRadius: '0.5rem',
                  color: theme.text,
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6'
                }}>
                  {selectedReport.description}
                </div>
              </div>

              {/* Dovezi */}
              {selectedReport.evidence_urls && selectedReport.evidence_urls.length > 0 && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                    Dovezi ({selectedReport.evidence_urls.length})
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {selectedReport.evidence_urls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '0.5rem 0.75rem',
                          backgroundColor: theme.primary + '20',
                          color: theme.primary,
                          borderRadius: '0.5rem',
                          textDecoration: 'none',
                          fontSize: '0.875rem',
                          display: 'inline-block'
                        }}
                      >
                        Dovadă {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact martor */}
              {selectedReport.witness_contact && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                    Contact Martor
                  </label>
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: theme.background,
                    borderRadius: '0.5rem',
                    color: theme.text
                  }}>
                    {selectedReport.witness_contact}
                  </div>
                </div>
              )}

              {/* Informații reviewer */}
              {selectedReport.reviewed_by && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                    Revizuit de
                  </label>
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: theme.background,
                    borderRadius: '0.5rem',
                    color: theme.text
                  }}>
                    {selectedReport.reviewer_username} la {selectedReport.reviewed_at ? formatDate(selectedReport.reviewed_at) : 'N/A'}
                  </div>
                </div>
              )}

              {/* Forwarded to */}
              {selectedReport.forwarded_to && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                    Trimis către
                  </label>
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: theme.background,
                    borderRadius: '0.5rem',
                    color: theme.text
                  }}>
                    {selectedReport.forwarded_to}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedReport.notes && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                    Note Interne
                  </label>
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: theme.background,
                    borderRadius: '0.5rem',
                    color: theme.text,
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6'
                  }}>
                    {selectedReport.notes}
                  </div>
                </div>
              )}

              {/* Acțiuni */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {selectedReport.status === 'pending' && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleStatusChange(selectedReport, 'in_review');
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Începe Revizuire
                  </button>
                )}
                {selectedReport.status === 'in_review' && (
                  <>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleStatusChange(selectedReport, 'forwarded_authorities');
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Trimite Autorități
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleStatusChange(selectedReport, 'resolved');
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Marchează Rezolvat
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleStatusChange(selectedReport, 'false_report');
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Raport Fals
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal schimbare status */}
      {showStatusModal && selectedReport && (
        <div style={{
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
        }}
        >
          <div style={{
            backgroundColor: theme.surface,
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            border: `1px solid ${theme.border}`
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: theme.text }}>
                Actualizează Status
              </h3>
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedReport(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.textSecondary,
                  padding: '0.25rem'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                Status Nou
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as BraconajStatus)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.5rem',
                  backgroundColor: theme.background,
                  color: theme.text,
                  outline: 'none'
                }}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {newStatus === 'forwarded_authorities' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                  Autoritate (ANPA, AJVPS, Jandarmerie, etc.)
                </label>
                <input
                  type="text"
                  value={forwardedTo}
                  onChange={(e) => setForwardedTo(e.target.value)}
                  placeholder="Ex: ANPA - Autoritatea Națională pentru Protecția Animalelor"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '0.5rem',
                    backgroundColor: theme.background,
                    color: theme.text,
                    outline: 'none'
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
                Note Interne (opțional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note pentru echipa de moderare..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.5rem',
                  backgroundColor: theme.background,
                  color: theme.text,
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedReport(null);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Anulează
              </button>
              <button
                onClick={handleStatusSubmit}
                disabled={updateStatusMutation.isPending || (newStatus === 'forwarded_authorities' && !forwardedTo.trim())}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: (newStatus === 'forwarded_authorities' && !forwardedTo.trim()) ? theme.border : getStatusColor(newStatus),
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: (newStatus === 'forwarded_authorities' && !forwardedTo.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (newStatus === 'forwarded_authorities' && !forwardedTo.trim()) ? 0.5 : 1
                }}
              >
                {updateStatusMutation.isPending ? 'Se procesează...' : 'Actualizează'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

