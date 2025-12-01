import { useState, useEffect, useRef } from 'react';
import { Eye, Users } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface ActiveViewersProps {
  topicId?: string;
  categoryId?: string;
  subcategoryId?: string;
}

interface Viewer {
  id: string;
  user_id?: string;
  session_id?: string;
  username?: string;
  display_name?: string;
  photo_url?: string;
  rank?: string; // Rang de vechime (ou_de_peste, puiet, etc.)
  role_name?: string; // Rol (admin, moderator, etc.)
  role_display_name?: string;
  avatar_url?: string;
  is_anonymous: boolean;
  joined_at: string;
  last_seen_at: string;
}

export default function ActiveViewers({ topicId, categoryId, subcategoryId }: ActiveViewersProps) {
  const { theme } = useTheme();
  const { forumUser, user } = useAuth();
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const viewerEntryIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Convertește slug-uri în UUID-uri pentru query-uri
  const [resolvedTopicId, setResolvedTopicId] = useState<string | null>(topicId || null);
  const [resolvedCategoryId, setResolvedCategoryId] = useState<string | null>(categoryId || null);
  const [resolvedSubcategoryId, setResolvedSubcategoryId] = useState<string | null>(null);

  // Rezolvă slug-urile în UUID-uri
  useEffect(() => {
    const resolveIds = async () => {
      // Topic ID - verifică dacă e UUID sau slug
      if (topicId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topicId)) {
        const { data } = await supabase
          .from('forum_topics')
          .select('id')
          .eq('slug', topicId)
          .single();
        setResolvedTopicId(data?.id || null);
      } else {
        setResolvedTopicId(topicId || null);
      }
      
      // Category ID - verifică dacă e UUID sau slug
      if (categoryId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId)) {
        const { data } = await supabase
          .from('forum_categories')
          .select('id')
          .eq('slug', categoryId)
          .single();
        setResolvedCategoryId(data?.id || null);
      } else {
        setResolvedCategoryId(categoryId || null);
      }
      
      // Subcategory ID - verifică dacă e UUID sau slug
      if (subcategoryId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subcategoryId)) {
        const { data } = await supabase
          .from('forum_subcategories')
          .select('id')
          .eq('slug', subcategoryId)
          .single();
        setResolvedSubcategoryId(data?.id || null);
      } else {
        setResolvedSubcategoryId(subcategoryId || null);
      }
    };
    
    resolveIds();
  }, [topicId, categoryId, subcategoryId]);

  // Determină tipul de target (topic, category, subcategory) - folosește ID-urile rezolvate
  const targetId = resolvedTopicId || resolvedCategoryId || resolvedSubcategoryId || '';
  const targetType = resolvedTopicId ? 'topic' : (resolvedSubcategoryId ? 'subcategory' : 'category');
  
  // Generează sau obține session ID pentru utilizatori anonimi
  useEffect(() => {
    if (!forumUser && !sessionIdRef.current) {
      const sessionKey = `forum-viewer-session-${targetType}-${targetId}`;
      let sessionId = sessionStorage.getItem(sessionKey);
      
      if (!sessionId) {
        sessionId = `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem(sessionKey, sessionId);
      }
      
      sessionIdRef.current = sessionId;
    }
  }, [forumUser, targetId, targetType]);

  // Adaugă sau actualizează viewer entry în baza de date
  useEffect(() => {
    let mounted = true;

    const addOrUpdateViewer = async () => {
      try {
        // Așteaptă până când avem toate datele necesare
        if (!resolvedTopicId && !resolvedSubcategoryId && !resolvedCategoryId) {
          return; // Nu avem target-ul încă
        }

        // Construiește query-ul pentru găsirea entry-ului existent
        let existingQuery = supabase
          .from('forum_active_viewers')
          .select('id');
        
        if (resolvedTopicId) {
          existingQuery = existingQuery.eq('topic_id', resolvedTopicId);
        } else if (resolvedSubcategoryId) {
          existingQuery = existingQuery.eq('subcategory_id', resolvedSubcategoryId);
        } else if (resolvedCategoryId) {
          existingQuery = existingQuery.eq('category_id', resolvedCategoryId);
        }

        if (forumUser && forumUser.id) {
          // Utilizator autentificat
          
          const { data: existing, error: existingError } = await existingQuery
            .eq('user_id', forumUser.id)
            .maybeSingle();
          
          if (existingError && existingError.code !== 'PGRST116') {
            console.error('Error checking existing authenticated viewer:', existingError);
          }

          if (existing) {
            viewerEntryIdRef.current = existing.id;
            // Actualizează last_seen_at
            const { error: updateError } = await supabase
              .from('forum_active_viewers')
              .update({ last_seen_at: new Date().toISOString() })
              .eq('id', existing.id);
            
            if (updateError) {
              console.error('Error updating viewer last_seen_at:', updateError);
            }
          } else {
            // Creează nou entry
            const insertData: any = {
              user_id: forumUser.id,
              is_anonymous: false
            };
            
            if (resolvedTopicId) insertData.topic_id = resolvedTopicId;
            if (resolvedSubcategoryId) insertData.subcategory_id = resolvedSubcategoryId;
            if (resolvedCategoryId) insertData.category_id = resolvedCategoryId;

            const { data: newEntry, error: insertError } = await supabase
              .from('forum_active_viewers')
              .insert(insertData)
              .select('id')
              .maybeSingle();

            if (insertError) {
              console.error('Error inserting authenticated viewer:', insertError);
            } else if (newEntry) {
              viewerEntryIdRef.current = newEntry.id;
            }
          }
        } else if (sessionIdRef.current) {
          // Utilizator anonim
          const { data: existing, error: existingError } = await existingQuery
            .eq('session_id', sessionIdRef.current)
            .eq('is_anonymous', true)
            .maybeSingle();
          
          if (existingError && existingError.code !== 'PGRST116') {
            console.error('Error checking existing anonymous viewer:', existingError);
          }

          if (existing) {
            viewerEntryIdRef.current = existing.id;
            // Actualizează last_seen_at
            await supabase
              .from('forum_active_viewers')
              .update({ last_seen_at: new Date().toISOString() })
              .eq('id', existing.id);
          } else {
            // Creează nou entry
            const insertData: any = {
              session_id: sessionIdRef.current,
              is_anonymous: true
            };
            
            if (resolvedTopicId) insertData.topic_id = resolvedTopicId;
            if (resolvedSubcategoryId) insertData.subcategory_id = resolvedSubcategoryId;
            if (resolvedCategoryId) insertData.category_id = resolvedCategoryId;

            const { data: newEntry, error: insertError } = await supabase
              .from('forum_active_viewers')
              .insert(insertData)
              .select('id')
              .maybeSingle();

            if (insertError) {
              console.error('Error inserting viewer:', insertError);
            } else if (newEntry) {
              viewerEntryIdRef.current = newEntry.id;
            }
          }
        }
      } catch (error) {
        console.error('Error adding/updating viewer:', error);
      }
    };

    // Încarcă viewer-ii existenți (cu cleanup automat)
    const loadViewers = async () => {
      try {
        // Cleanup automat înainte de query (șterge intrările expirate > 2 minute)
        await supabase.rpc('cleanup_expired_viewers');
        
        // Încarcă viewer-ii activi (doar ultimele 2 minute pentru real-time instant)
        let viewersQuery = supabase
          .from('forum_active_viewers')
          .select(`
            id,
            user_id,
            session_id,
            is_anonymous,
            joined_at,
            last_seen_at
          `);
        
        if (resolvedTopicId) {
          viewersQuery = viewersQuery.eq('topic_id', resolvedTopicId);
        } else if (resolvedSubcategoryId) {
          viewersQuery = viewersQuery.eq('subcategory_id', resolvedSubcategoryId);
        } else if (resolvedCategoryId) {
          viewersQuery = viewersQuery.eq('category_id', resolvedCategoryId);
        }
        
        const { data, error } = await viewersQuery
          .gte('last_seen_at', new Date(Date.now() - 2 * 60 * 1000).toISOString()) // Doar cei activi (ultimele 2 minute)
          .order('last_seen_at', { ascending: false });

        if (error) {
          console.error('Error loading viewers:', error);
          return;
        }

        if (mounted && data) {
          // Obține informațiile despre utilizatori din forum_users
          const userIds = [...new Set(data.filter((v: any) => v.user_id).map((v: any) => v.user_id))];
          let usersMap = new Map();
          
          if (userIds.length > 0) {
            // Obține date din forum_users (pentru rank, role, etc.)
            const { data: usersData, error: usersError } = await supabase
              .from('forum_users')
              .select(`
                user_id, 
                username, 
                rank, 
                avatar_url,
                role_id,
                role:forum_roles!role_id(name, display_name)
              `)
              .in('user_id', userIds);
            
            if (usersError) {
              console.error('Error fetching user data for viewers:', usersError);
            } else if (usersData) {
              usersMap = new Map(usersData.map((u: any) => [u.user_id, u]));
            }
            
            // Obține display_name și photo_url din profiles (pentru afișare și avatar)
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, display_name, username, photo_url')
              .in('id', userIds);
            
            if (profilesError) {
              console.error('Error fetching profiles for viewers:', profilesError);
            } else if (profilesData) {
              // Adaugă display_name și photo_url la usersMap
              profilesData.forEach((profile: any) => {
                const userInfo = usersMap.get(profile.id);
                if (userInfo) {
                  userInfo.display_name = profile.display_name || profile.username;
                  userInfo.photo_url = profile.photo_url; // Folosește photo_url din profiles
                } else {
                  usersMap.set(profile.id, { 
                    display_name: profile.display_name || profile.username,
                    photo_url: profile.photo_url
                  });
                }
              });
            }
          }
          
          const viewersWithUserInfo = data.map((v: any) => {
            const userInfo = usersMap.get(v.user_id);
            const role = userInfo?.role as any;
            return {
              id: v.id,
              user_id: v.user_id,
              session_id: v.session_id,
              username: userInfo?.username, // Pentru linkuri/identificare
              display_name: userInfo?.display_name || userInfo?.username || 'Unknown', // Pentru afișare
              rank: userInfo?.rank, // Rang de vechime (ou_de_peste, puiet, etc.)
              role_name: role?.name, // Rol (admin, moderator, etc.)
              role_display_name: role?.display_name,
              avatar_url: userInfo?.photo_url || userInfo?.avatar_url, // Preferă photo_url din profiles
              is_anonymous: v.is_anonymous,
              joined_at: v.joined_at,
              last_seen_at: v.last_seen_at
            };
          });

          setViewers(viewersWithUserInfo);
        }
      } catch (error) {
        console.error('Error loading viewers:', error);
      }
    };

    // Inițializare
    addOrUpdateViewer().then(() => {
      loadViewers(); // După ce adăugăm viewer-ul, încărcăm lista
      
      // Actualizare imediată a last_seen_at după ce entry-ul e creat (pentru instant feedback)
      if (viewerEntryIdRef.current) {
        supabase
          .from('forum_active_viewers')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', viewerEntryIdRef.current);
      }
    });

    // Actualizare periodică a last_seen_at (mai frecvent pentru real-time)
    updateIntervalRef.current = setInterval(async () => {
      if (viewerEntryIdRef.current) {
        await supabase
          .from('forum_active_viewers')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', viewerEntryIdRef.current);
      }
      loadViewers(); // Reîncarcă lista (cu cleanup automat)
    }, 10000); // La fiecare 10 secunde pentru real-time instant

    // Supabase Realtime subscription
    let filter = '';
    if (resolvedTopicId) {
      filter = `topic_id=eq.${resolvedTopicId}`;
    } else if (resolvedSubcategoryId) {
      filter = `subcategory_id=eq.${resolvedSubcategoryId}`;
    } else if (resolvedCategoryId) {
      filter = `category_id=eq.${resolvedCategoryId}`;
    }
    
    const channel = supabase
      .channel(`active-viewers-${targetType}-${targetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forum_active_viewers',
          filter: filter
        },
        (payload) => {
          // Reîncarcă viewer-ii când se schimbă ceva
          loadViewers();
        }
      )
      .subscribe();

    // Cleanup la unmount
    return () => {
      mounted = false;
      
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }

      // Șterge entry-ul din baza de date
      if (viewerEntryIdRef.current) {
        (async () => {
          try {
            await supabase
              .from('forum_active_viewers')
              .delete()
              .eq('id', viewerEntryIdRef.current!);
            // Viewer entry removed
          } catch (error) {
            console.error('Error removing viewer entry:', error);
          }
        })();
      }

      // Unsubscribe de la Realtime
      supabase.removeChannel(channel);
    };
  }, [topicId, categoryId, subcategoryId, forumUser, targetId, targetType]);

  // Ranguri de vechime (bazate pe post_count)
  const getSeniorityRank = (rank: string) => {
    const seniorityRanks: { [key: string]: string } = {
      'ou_de_peste': '🥚 Ou de Pește',
      'puiet': '🐟 Puiet',
      'pui_de_crap': '🐠 Pui de Crap',
      'crap_junior': '🐡 Crap Junior',
      'crap_senior': '🎣 Crap Senior',
      'maestru_pescar': '🏆 Maestru Pescar',
      'legenda_apelor': '👑 Legenda Apelor'
    };
    return seniorityRanks[rank] || '🎣 Pescar';
  };

  // Obține display-ul complet al rangului (vechime + rol + founder)
  const getDisplayRank = (viewer: Viewer) => {
    // Founder DOAR pentru email-ul specific - verifică dacă viewer-ul este utilizatorul curent cu email-ul specific
    const userEmail = user?.email;
    const isFounder = userEmail === 'cosmin.trica@outlook.com' && viewer.user_id === user?.id;
    
    if (isFounder) {
      return '👑 Founder';
    }
    
    // Roluri speciale (admin, moderator, etc.)
    if (viewer.role_name) {
      const roleDisplay: { [key: string]: string } = {
        'admin': '🔴 Administrator',
        'administrator': '🔴 Administrator',
        'moderator': '🟣 Moderator',
        'firma': '🏢 Firmă',
        'organizator_concurs': '🏆 Organizator Concurs',
        'admin_balta': '🏞️ Admin Baltă',
        'oficial': '🏛️ Oficial',
        'ong': '❤️ ONG',
        'premium': '⭐ Premium'
      };
      
      if (roleDisplay[viewer.role_name]) {
        return roleDisplay[viewer.role_name];
      }
      
      // Fallback la display_name din baza de date
      if (viewer.role_display_name) {
        return viewer.role_display_name;
      }
    }
    
    // Rang de vechime (ou_de_peste, puiet, etc.)
    if (viewer.rank) {
      return getSeniorityRank(viewer.rank);
    }
    
    return '🎣 Pescar';
  };

  const authenticatedViewers = viewers.filter(v => !v.is_anonymous && v.username);
  const anonymousCount = viewers.filter(v => v.is_anonymous).length;
  const totalViewers = authenticatedViewers.length + anonymousCount;

  return (
    <div
      style={{
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: '0.5rem',
        padding: '1rem 1.5rem',
        marginTop: '2rem',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1rem',
        fontSize: '0.875rem',
        fontWeight: '600',
        color: theme.text
      }}>
        <Eye style={{ width: '1rem', height: '1rem', color: theme.primary }} />
        <span>
          {resolvedTopicId ? 'Vizualizează acest topic:' : resolvedSubcategoryId ? 'Vizualizează această subcategorie:' : 'Vizualizează această categorie:'}
        </span>
        <span style={{
          backgroundColor: theme.background,
          padding: '0.25rem 0.5rem',
          borderRadius: '0.25rem',
          fontSize: '0.75rem',
          color: theme.primary,
          fontWeight: '600'
        }}>
          {totalViewers} {totalViewers === 1 ? 'utilizator' : 'utilizatori'}
        </span>
      </div>

      {/* Lista vizualizatori */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
        {/* Membri conectați */}
        {authenticatedViewers.map((viewer) => (
          <div
            key={viewer.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.375rem 0.75rem',
              backgroundColor: theme.background,
              border: `1px solid ${theme.border}`,
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              transition: 'all 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.surfaceHover;
              e.currentTarget.style.borderColor = theme.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.background;
              e.currentTarget.style.borderColor = theme.border;
            }}
          >
            {/* Avatar mic */}
            <div
              style={{
                width: '1.5rem',
                height: '1.5rem',
                borderRadius: '50%',
                background: viewer.avatar_url 
                  ? `url(${viewer.avatar_url}) center/cover`
                  : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.625rem',
                fontWeight: '600'
              }}
            >
              {!viewer.avatar_url && (viewer.display_name || viewer.username)?.charAt(0).toUpperCase()}
            </div>

            <div>
              <div style={{ fontWeight: '500', color: theme.text }}>
                {viewer.display_name || viewer.username || 'Anonim'}
              </div>
              <div style={{ fontSize: '0.625rem', color: theme.textSecondary }}>
                {getDisplayRank(viewer)}
              </div>
            </div>
          </div>
        ))}

        {/* Vizitatori anonimi */}
        {anonymousCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.375rem 0.75rem',
              backgroundColor: theme.background,
              border: `1px dashed ${theme.border}`,
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              color: theme.textSecondary
            }}
          >
            <Users style={{ width: '1rem', height: '1rem' }} />
            <span>
              {anonymousCount} {anonymousCount === 1 ? 'vizitator anonim' : 'vizitatori anonimi'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
