/**
 * Admin Roles Panel Component
 * Panel pentru gestionare roluri utilizatori (dropdown, permisiuni JSON)
 * Mobile-first design optimizat
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/query-client';
import { Search, Users, Shield, CheckCircle, X, Save, UserCheck, Building, Trophy, Waves, BadgeCheck, Heart, Star, User } from 'lucide-react';
import type { ForumRole } from '../../../services/forum/types';

// Mapping între numele iconițelor din DB și componentele lucide-react
const iconMap: Record<string, React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>> = {
  'shield': Shield,
  'user-check': UserCheck,
  'building': Building,
  'trophy': Trophy,
  'waves': Waves,
  'badge-check': BadgeCheck,
  'heart': Heart,
  'star': Star,
  'user': User,
};

interface ForumUser {
  user_id: string;
  username: string;
  avatar_url?: string;
  rank: string;
  reputation_points: number;
  role_id?: string | null;
  role_name?: string;
  role_display_name?: string;
  post_count: number;
  topic_count: number;
}

export default function AdminRoles() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<ForumUser | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  // Fetch roluri disponibile
  const { data: availableRoles = [], isLoading: loadingRoles } = useQuery<ForumRole[]>({
    queryKey: ['admin-forum-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_roles')
        .select('*')
        .order('display_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minute - rolurile nu se schimbă des
  });

  // Căutare utilizatori
  const { data: searchResults = [], isLoading: searching } = useQuery<ForumUser[]>({
    queryKey: queryKeys.adminUserSearch(searchQuery),
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];

      const { data, error } = await supabase
        .from('forum_users')
        .select(`
          user_id, 
          username, 
          avatar_url, 
          rank, 
          reputation_points, 
          role_id,
          post_count,
          topic_count,
          role:forum_roles(name, display_name)
        `)
        .ilike('username', `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      
      return (data || []).map((user: any) => ({
        ...user,
        role_name: user.role?.name,
        role_display_name: user.role?.display_name,
      }));
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30 * 1000,
  });

  // Mutation pentru actualizare rol
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string | null }) => {
      const { error } = await supabase
        .from('forum_users')
        .update({ role_id: roleId })
        .eq('user_id', userId);

      if (error) throw error;
      return { roleId };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUserSearch(searchQuery) });
      showToast('Rol actualizat cu succes!', 'success');
      
      // Actualizează selectedUser local
      if (selectedUser) {
        const newRole = availableRoles.find(r => r.id === data.roleId);
        setSelectedUser({
          ...selectedUser,
          role_id: data.roleId,
          role_name: newRole?.name,
          role_display_name: newRole?.display_name,
        });
      }
    },
    onError: (error: Error) => {
      showToast(error.message || 'Eroare la actualizarea rolului', 'error');
    },
  });

  const handleUserSelect = (user: ForumUser) => {
    setSelectedUser(user);
    setSelectedRoleId(user.role_id || '');
    setSearchQuery('');
  };

  const handleRoleChange = () => {
    if (!selectedUser) return;

    updateRoleMutation.mutate({
      userId: selectedUser.user_id,
      roleId: selectedRoleId || null
    });
  };

  const formatPermissions = (permissions: Record<string, boolean>) => {
    return Object.entries(permissions)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => key)
      .join(', ') || 'Niciuna';
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ 
        fontSize: 'clamp(1.5rem, 3vw, 2rem)', 
        fontWeight: '700', 
        color: theme.text, 
        marginBottom: '1.5rem' 
      }}>
        Gestionare Roluri Utilizatori
      </h2>

      {/* Căutare utilizator */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ 
          position: 'relative', 
          marginBottom: '1rem' 
        }}>
          <Search 
            size={20} 
            style={{ 
              position: 'absolute', 
              left: '0.75rem', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: theme.textSecondary,
              pointerEvents: 'none'
            }} 
          />
          <input
            type="text"
            placeholder="Caută utilizator după username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 0.75rem 0.75rem 2.5rem',
              fontSize: '1rem',
              border: `1px solid ${theme.border}`,
              borderRadius: '0.5rem',
              backgroundColor: theme.surface,
              color: theme.text,
              outline: 'none'
            }}
          />
        </div>

        {/* Rezultate căutare */}
        {searchQuery.length >= 2 && (
          <div style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '0.5rem',
            maxHeight: '300px',
            overflowY: 'auto',
            marginTop: '0.5rem'
          }}>
            {searching ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: theme.textSecondary }}>
                Căutare...
              </div>
            ) : searchResults.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: theme.textSecondary }}>
                Nu s-au găsit utilizatori
              </div>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.user_id}
                  onClick={() => handleUserSelect(user)}
                  style={{
                    padding: '1rem',
                    borderBottom: `1px solid ${theme.border}`,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    backgroundColor: selectedUser?.user_id === user.user_id ? theme.primary + '20' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedUser?.user_id !== user.user_id) {
                      e.currentTarget.style.backgroundColor = theme.primary + '10';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedUser?.user_id !== user.user_id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.username}
                        style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: theme.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '1rem'
                      }}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: theme.text }}>
                        {user.username}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: theme.textSecondary }}>
                        {user.rank} • {user.reputation_points} puncte
                        {user.role_display_name && (
                          <span> • Rol: <strong>{user.role_display_name}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Utilizator selectat */}
      {selectedUser && (
        <div style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {selectedUser.avatar_url ? (
                <img 
                  src={selectedUser.avatar_url} 
                  alt={selectedUser.username}
                  style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: theme.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '1.5rem'
                }}>
                  {selectedUser.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: theme.text }}>
                  {selectedUser.username}
                </div>
                <div style={{ fontSize: '0.875rem', color: theme.textSecondary }}>
                  {selectedUser.rank} • {selectedUser.reputation_points} puncte
                  {selectedUser.role_display_name && (
                    <> • Rol curent: <strong>{selectedUser.role_display_name}</strong></>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Selectare rol */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: theme.text }}>
              <Shield size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Rol Forum
            </label>
            {loadingRoles ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: theme.textSecondary }}>
                Se încarcă rolurile...
              </div>
            ) : (
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
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
                <option value="">Fără rol (User default)</option>
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.display_name} {role.is_system_role && '(Sistem)'}
                  </option>
                ))}
              </select>
            )}
            {selectedRoleId && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: theme.background, borderRadius: '0.5rem' }}>
                {(() => {
                  const selectedRole = availableRoles.find(r => r.id === selectedRoleId);
                  if (!selectedRole) return null;
                  
                  const IconComponent = selectedRole.icon ? iconMap[selectedRole.icon] : null;
                  
                  return (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        {IconComponent && (
                          <IconComponent size={20} color={selectedRole.color || theme.text} />
                        )}
                        <div style={{ fontSize: '0.875rem', color: theme.text, fontWeight: '600' }}>
                          {selectedRole.display_name}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: theme.text, marginBottom: '0.5rem' }}>
                        <strong>Descriere:</strong> {selectedRole.description || 'Fără descriere'}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: theme.text, marginBottom: '0.5rem' }}>
                        <strong>Permisiuni:</strong> {formatPermissions(selectedRole.permissions)}
                      </div>
                      {selectedRole.color && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: theme.text }}>
                          <strong>Culoare:</strong>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: selectedRole.color,
                            border: `1px solid ${theme.border}`
                          }} />
                          <span>{selectedRole.color}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Buton salvare */}
          <button
            onClick={handleRoleChange}
            disabled={updateRoleMutation.isPending || selectedRoleId === (selectedUser.role_id || '')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: (selectedRoleId === (selectedUser.role_id || '')) ? theme.border : theme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: (selectedRoleId === (selectedUser.role_id || '')) ? 'not-allowed' : 'pointer',
              opacity: (selectedRoleId === (selectedUser.role_id || '')) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {updateRoleMutation.isPending ? (
              <>Se procesează...</>
            ) : (
              <>
                <Save size={18} />
                Salvează Rol
              </>
            )}
          </button>
        </div>
      )}

      {/* Listă roluri disponibile */}
      <div style={{
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: '0.5rem',
        padding: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: theme.text, marginBottom: '1rem' }}>
          Roluri Disponibile ({availableRoles.length})
        </h3>
        {loadingRoles ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: theme.textSecondary }}>
            Se încarcă rolurile...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {availableRoles.map((role) => (
              <div
                key={role.id}
                style={{
                  padding: '1rem',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.5rem',
                  backgroundColor: theme.background
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {role.icon && (() => {
                    const IconComponent = iconMap[role.icon];
                    if (IconComponent) {
                      return <IconComponent size={20} color={role.color || theme.text} />;
                    }
                    // Fallback pentru iconițe necunoscute sau emoji
                    return <span style={{ fontSize: '1.25rem' }}>{role.icon}</span>;
                  })()}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: theme.text, fontSize: '0.9375rem' }}>
                      {role.display_name}
                    </div>
                    {role.is_system_role && (
                      <span style={{
                        fontSize: '0.75rem',
                        color: theme.textSecondary,
                        fontStyle: 'italic'
                      }}>
                        Rol Sistem
                      </span>
                    )}
                  </div>
                  {role.color && (
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: role.color,
                      border: `1px solid ${theme.border}`
                    }} />
                  )}
                </div>
                {role.description && (
                  <div style={{ fontSize: '0.8125rem', color: theme.textSecondary, marginBottom: '0.5rem' }}>
                    {role.description}
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                  <strong>Permisiuni:</strong> {formatPermissions(role.permissions)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!selectedUser && (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: theme.textSecondary,
          backgroundColor: theme.surface,
          borderRadius: '0.5rem',
          border: `1px solid ${theme.border}`,
          marginTop: '2rem'
        }}>
          <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <div>Caută un utilizator pentru a gestiona rolul său</div>
        </div>
      )}
    </div>
  );
}

