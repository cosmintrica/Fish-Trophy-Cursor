import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  MapPin,
  CheckCircle,
  XCircle,
  Eye,
  Users,
  Activity,
  Database,
  ExternalLink,
  TrendingUp,
  X,
  Download,
  Save,
  Store,
  Mail,
  Menu
} from 'lucide-react';
import { supabase, getR2ImageUrlProxy } from '@/lib/supabase';
import { toast } from 'sonner';
import RecordDetailsModal from '@/components/RecordDetailsModal';
import { MapEditor } from '@/components/admin/MapEditor';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTheme } from '@/contexts/ThemeContext';
import { Trash2 } from 'lucide-react';

const Admin: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const [trafficData, setTrafficData] = useState({
    pageViews: 0,
    uniqueVisitors: 0,
    sessions: 0,
    bounceRate: 0,
    avgSessionTime: 0,
    dailyStats: [] as any[],
    monthlyStats: [] as any[],
    yearlyStats: [] as any[],
    timelineData: [] as any[],
    deviceStats: {} as Record<string, number>,
    browserStats: {} as Record<string, number>,
    osStats: {} as Record<string, number>,
    countryStats: {} as Record<string, number>,
    cityStats: {} as Record<string, number>,
    referrerStats: {} as Record<string, number>,
    pageViewsStats: {} as Record<string, number>,
    selectedPeriod: '24h',
    customStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    customEndDate: new Date().toISOString().split('T')[0] // today
  });


  const [pendingRecords, setPendingRecords] = useState<any[]>([]);
  const [rejectedRecords, setRejectedRecords] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupData, setBackupData] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('analytics');
  const [shopInquiries, setShopInquiries] = useState<any[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [inquiryToDelete, setInquiryToDelete] = useState<any>(null);

  // Metric filters
  const [showPageViews, setShowPageViews] = useState(true);
  const [showUniqueVisitors, setShowUniqueVisitors] = useState(true);
  const [showSessions, setShowSessions] = useState(true);

  // Load traffic graph data based on selected period
  const loadTrafficGraphData = async () => {
    try {
      let data: any[] = [];

      switch (trafficData.selectedPeriod) {
        case '1h': {
          const { data: hourData, error: hourError } = await supabase.rpc('get_traffic_last_hour');
          if (hourError) {
            // console.error('Error loading hour data:', hourError);
          }
          data = hourData || [];
          break;
        }
        case '24h': {
          const { data: dayData, error: dayError } = await supabase.rpc('get_traffic_last_24h');
          if (dayError) {
            // console.error('Error loading day data:', dayError);
          }
          data = dayData || [];
          break;
        }
        case '7d': {
          const { data: weekData, error: weekError } = await supabase.rpc('get_traffic_last_week');
          if (weekError) {
            // console.error('Error loading week data:', weekError);
          }
          data = weekData || [];
          break;
        }
        case '30d': {
          const { data: monthData, error: monthError } = await supabase.rpc('get_traffic_last_month');
          if (monthError) {
            // console.error('Error loading month data:', monthError);
          }
          data = monthData || [];
          break;
        }
        case '1y': {
          const { data: yearData, error: yearError } = await supabase.rpc('get_traffic_last_year');
          if (yearError) {
            // console.error('Error loading year data:', yearError);
          }
          data = yearData || [];
          break;
        }
        case 'custom':
          if (trafficData.customStartDate && trafficData.customEndDate) {
            const startDate = new Date(trafficData.customStartDate);
            const endDate = new Date(trafficData.customEndDate);
            const { data: customData, error: customError } = await supabase.rpc('get_traffic_custom_period', {
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString()
            });
            if (customError) {
              // console.error('Error loading custom data:', customError);
            }
            data = customData || [];
          }
          break;
        default:
          data = [];
      }

      // Ensure data has the expected structure
      const processedData = data.map(item => ({
        time_period: item.time_period || item.timestamp || '',
        page_views: item.page_views || 0,
        unique_visitors: item.unique_visitors || 0,
        sessions: item.sessions || 0
      }));

      setTrafficData(prev => ({
        ...prev,
        timelineData: processedData
      }));
    } catch (error) {
      // console.error('Error loading traffic graph data:', error);
      // Don't reset data on error - keep existing data
    }
  };

  // Function to normalize text (remove diacritics)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/ă/g, 'a')
      .replace(/â/g, 'a')
      .replace(/î/g, 'i')
      .replace(/ș/g, 's')
      .replace(/ț/g, 't');
  };

  // Function to translate city names from English to Romanian
  const translateCityName = (cityName: string) => {
    const cityTranslations: Record<string, string> = {
      'bucharest': 'București',
      'bucharesti': 'București',
      'bucuresti': 'București',
      'cluj': 'Cluj-Napoca',
      'cluj-napoca': 'Cluj-Napoca',
      'timisoara': 'Timișoara',
      'timis': 'Timișoara',
      'iasi': 'Iași',
      'constanta': 'Constanța',
      'craiova': 'Craiova',
      'galati': 'Galați',
      'ploiesti': 'Ploiești',
      'brasov': 'Brașov',
      'braila': 'Brăila',
      'pitesti': 'Pitești',
      'arad': 'Arad',
      'sibiu': 'Sibiu',
      'bacau': 'Bacău',
      'targu-mures': 'Târgu Mureș',
      'targu mures': 'Târgu Mureș',
      'baia-mare': 'Baia Mare',
      'baia mare': 'Baia Mare',
      'buzau': 'Buzău',
      'satu-mare': 'Satu Mare',
      'satu mare': 'Satu Mare',
      'botosani': 'Botoșani',
      'piatra-neamt': 'Piatra Neamț',
      'piatra neamt': 'Piatra Neamț',
      'ramnicu-valcea': 'Râmnicu Vâlcea',
      'ramnicu valcea': 'Râmnicu Vâlcea',
      'suceava': 'Suceava',
      'drobeta-turnu-severin': 'Drobeta-Turnu Severin',
      'drobeta turnu severin': 'Drobeta-Turnu Severin',
      'tulcea': 'Tulcea',
      'targoviste': 'Târgoviște',
      'focsani': 'Focșani',
      'bistrita': 'Bistrița',
      'resita': 'Reșița',
      'calarasi': 'Călărași',
      'giurgiu': 'Giurgiu',
      'deva': 'Deva',
      'slobozia': 'Slobozia',
      'alba-iulia': 'Alba Iulia',
      'alba iulia': 'Alba Iulia',
      'hunedoara': 'Hunedoara',
      'zalau': 'Zalău',
      'sfantu-gheorghe': 'Sfântu Gheorghe',
      'sfantu gheorghe': 'Sfântu Gheorghe',
      'targu-jiu': 'Târgu Jiu',
      'targu jiu': 'Târgu Jiu',
      'vaslui': 'Vaslui',
      'ramnicu-sarat': 'Râmnicu Sărat',
      'ramnicu sarat': 'Râmnicu Sărat',
      'barlad': 'Bârlad',
      'turnu-magurele': 'Turnu Măgurele',
      'turnu magurele': 'Turnu Măgurele',
      'caracal': 'Caracal',
      'fagaras': 'Făgăraș',
      'sighetu-marmatiei': 'Sighetu Marmației',
      'sighetu marmatiei': 'Sighetu Marmației',
      'mangalia': 'Mangalia',
      'campina': 'Câmpina',
      'petrosani': 'Petroșani',
      'lugoj': 'Lugoj',
      'medgidia': 'Medgidia',
      'tecuci': 'Tecuci',
      'slatina': 'Slatina',
      'onesti': 'Onești',
      'oradea': 'Oradea',
      'sighisoara': 'Sighișoara',
      'curtea-de-arges': 'Curtea de Argeș',
      'curtea de arges': 'Curtea de Argeș',
      'dorohoi': 'Dorohoi',
      'campulung': 'Câmpulung',
      'caransebes': 'Caransebeș',
      'targu-secuiesc': 'Târgu Secuiesc',
      'targu secuiesc': 'Târgu Secuiesc'
    };

    const normalizedCity = normalizeText(cityName);
    return cityTranslations[normalizedCity] || cityName;
  };

  // Function to generate random color for cities
  const generateRandomColor = (cityName: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500',
      'bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-amber-500',
      'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-sky-500'
    ];

    // Use city name as seed for consistent colors
    let hash = 0;
    for (let i = 0; i < cityName.length; i++) {
      const char = cityName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return colors[Math.abs(hash) % colors.length];
  };

  // Load detailed analytics data using optimized RPC function
  const loadDetailedAnalytics = async () => {
    try {
      // Map selectedPeriod to get_complete_analytics time period format
      const mapPeriodToRPC = (period: string): string => {
        switch (period) {
          case '1h':
          case '24h':
            return 'today';
          case '7d':
            return 'last_7_days';
          case '30d':
            return 'last_30_days';
          case '1y':
            return 'last_month'; // Approximate for year
          default:
            return 'today';
        }
      };

      const rpcPeriod = mapPeriodToRPC(trafficData.selectedPeriod);

      // Call optimized RPC function - single call instead of 8+ queries
      const { data: completeAnalytics, error: analyticsError } = await supabase
        .rpc('get_complete_analytics', { p_time_period: rpcPeriod });

      if (analyticsError) {
        console.error('Error loading complete analytics:', analyticsError);
        return;
      }

      if (!completeAnalytics) {
        return;
      }

      // Transform RPC response to match existing state structure
      const stats = completeAnalytics.stats || {};
      const devices = Array.isArray(completeAnalytics.devices) ? completeAnalytics.devices : [];
      const browsers = Array.isArray(completeAnalytics.browsers) ? completeAnalytics.browsers : [];
      const os = Array.isArray(completeAnalytics.os) ? completeAnalytics.os : [];
      const countries = Array.isArray(completeAnalytics.countries) ? completeAnalytics.countries : [];
      const cities = Array.isArray(completeAnalytics.cities) ? completeAnalytics.cities : [];
      const referrers = Array.isArray(completeAnalytics.referrers) ? completeAnalytics.referrers : [];
      const topPages = Array.isArray(completeAnalytics.top_pages) ? completeAnalytics.top_pages : [];

      // Convert arrays to objects for compatibility with existing code
      const deviceStatsObj: Record<string, number> = {};
      devices.forEach((item: any) => {
        if (item && item.type && typeof item.count === 'number') {
          deviceStatsObj[item.type] = item.count;
        }
      });

      const browserStatsObj: Record<string, number> = {};
      browsers.forEach((item: any) => {
        if (item && item.name && typeof item.count === 'number') {
          browserStatsObj[item.name] = item.count;
        }
      });

      const osStatsObj: Record<string, number> = {};
      os.forEach((item: any) => {
        if (item && item.name && typeof item.count === 'number') {
          osStatsObj[item.name] = item.count;
        }
      });

      const countryStatsObj: Record<string, number> = {};
      countries.forEach((item: any) => {
        if (item && item.name && typeof item.count === 'number') {
          countryStatsObj[item.name] = item.count;
        }
      });

      const cityStatsObj: Record<string, number> = {};
      cities.forEach((item: any) => {
        if (item && item.name && typeof item.count === 'number') {
          cityStatsObj[item.name] = item.count;
        }
      });

      const referrerStatsObj: Record<string, number> = {};
      referrers.forEach((item: any) => {
        if (item && item.source && typeof item.count === 'number') {
          referrerStatsObj[item.source] = item.count;
        }
      });

      const pageViewsStatsObj: Record<string, number> = {};
      topPages.forEach((item: any) => {
        if (item && item.path && typeof item.count === 'number') {
          pageViewsStatsObj[item.path] = item.count;
        }
      });

      // Update traffic data with calculated statistics
      setTrafficData(prev => ({
        ...prev,
        pageViews: stats.page_views || 0,
        uniqueVisitors: stats.unique_visitors || 0,
        sessions: stats.unique_sessions || 0,
        bounceRate: stats.bounce_rate || 0,
        avgSessionTime: stats.avg_session_duration || 0,
        deviceStats: deviceStatsObj,
        browserStats: browserStatsObj,
        osStats: osStatsObj,
        countryStats: countryStatsObj,
        cityStats: cityStatsObj,
        referrerStats: referrerStatsObj,
        pageViewsStats: pageViewsStatsObj
      }));

    } catch (error) {
      console.error('Error loading detailed analytics:', error);
    }
  };

  const loadRealData = async () => {
    setIsLoading(true);
    try {
      // Load pending records with correct column names
      const { data: pendingData, error: pendingError } = await supabase
        .from('records')
        .select(`
          *,
          fish_species!inner(name, scientific_name),
          profiles!records_user_id_fkey(display_name, email),
          fishing_locations!inner(name, type, county)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) {
        // console.error('Error loading pending records:', pendingError);
      } else {
        setPendingRecords(pendingData || []);
      }

      // Load rejected records
      const { data: rejectedData, error: rejectedError } = await supabase
        .from('records')
        .select(`
          *,
          fish_species!inner(name, scientific_name),
          profiles!records_user_id_fkey(display_name, email),
          fishing_locations!inner(name, type, county)
        `)
        .eq('status', 'rejected')
        .order('created_at', { ascending: false });

      if (rejectedError) {
        // console.error('Error loading rejected records:', rejectedError);
      } else {
        setRejectedRecords(rejectedData || []);
      }

      // Load all users with last_sign_in_at from auth.users
      // Folosim funcția SQL pentru a accesa auth.users (doar admin)
      const { data: usersWithSignIn, error: usersSignInError } = await supabase
        .rpc('get_users_with_last_sign_in');

      if (usersSignInError) {
        // Fallback la query normal dacă funcția nu există sau e eroare
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select(`
            *,
            records!records_user_id_fkey(count)
          `)
          .order('created_at', { ascending: false });

        if (usersError) {
          // console.error('Error loading users:', usersError);
        } else {
          setUsers(usersData || []);
        }
      } else {
        // Load records count pentru fiecare user
        if (usersWithSignIn && usersWithSignIn.length > 0) {
          const userIds = usersWithSignIn.map(u => u.id);
          const { data: recordsData } = await supabase
            .from('records')
            .select('user_id')
            .in('user_id', userIds);

          // Count records per user
          const recordsCount: Record<string, number> = {};
          recordsData?.forEach(r => {
            recordsCount[r.user_id] = (recordsCount[r.user_id] || 0) + 1;
          });

          // Load username and avatar from profiles for each user
          // Split into batches to avoid 400 Bad Request if too many IDs
          // userIds is already declared above (line 460)
          const batchSize = 100;
          const profilesMap = new Map();
          
          for (let i = 0; i < userIds.length; i += batchSize) {
            const batch = userIds.slice(i, i + batchSize);
            if (batch.length > 0) {
              const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, username, display_name, email, phone, created_at, photo_url, county_id, city_id, role, updated_at')
                .in('id', batch);
              
              if (profilesError) {
                console.error('Error loading profiles batch:', profilesError);
              } else if (profilesData) {
                profilesData.forEach(profile => {
                  profilesMap.set(profile.id, profile);
                });
              }
            }
          }
          
          const profilesData = Array.from(profilesMap.values());

          // profilesMap is already created above

          // Combine data with profile info
          const usersWithData = usersWithSignIn.map(user => {
            const profile = profilesMap.get(user.id);
            return {
              ...user,
              username: profile?.username || null,
              display_name: profile?.display_name || user.display_name || null,
              email: profile?.email || user.email || null,
              phone: profile?.phone || null,
              photo_url: profile?.photo_url || null,
              county_id: profile?.county_id || null,
              city_id: profile?.city_id || null,
              is_admin: profile?.role === 'admin' || false,
              created_at: profile?.created_at || user.created_at,
              updated_at: profile?.updated_at || user.updated_at || user.created_at,
              records: [{ count: recordsCount[user.id] || 0 }]
            };
          });

          setUsers(usersWithData);
        } else {
          setUsers([]);
        }
      }

      // Load analytics data directly from database
      const { data: allUsers, error: analyticsUsersError } = await supabase
        .from('profiles')
        .select('id, created_at');

      const { error: allRecordsError } = await supabase
        .from('records')
        .select('id');

      if (!analyticsUsersError && !allRecordsError) {
        const totalUsers = allUsers?.length || 0;

        // Calculate today's data
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = today.toISOString();
        const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();

        // Get today's page views
        const { data: todayPageViews } = await supabase
          .from('analytics_events')
          .select('*', { count: 'exact' })
          .eq('event_type', 'page_view')
          .gte('timestamp', todayStart)
          .lt('timestamp', todayEnd);

        // Get today's unique visitors
        const { data: todayUniqueVisitors } = await supabase
          .from('analytics_events')
          .select('user_id')
          .eq('event_type', 'page_view')
          .gte('timestamp', todayStart)
          .lt('timestamp', todayEnd)
          .not('user_id', 'is', null);

        // Get today's sessions
        const { data: todaySessions } = await supabase
          .from('analytics_events')
          .select('session_id')
          .eq('event_type', 'page_view')
          .gte('timestamp', todayStart)
          .lt('timestamp', todayEnd);

        // Get total page views count
        const { count: totalPageViewsCount } = await supabase
          .from('analytics_events')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'page_view');

        // Get total records count
        const { count: totalRecordsCount } = await supabase
          .from('records')
          .select('*', { count: 'exact', head: true });

        // Get today's new records
        const { data: todayRecords } = await supabase
          .from('records')
          .select('*', { count: 'exact' })
          .gte('created_at', todayStart)
          .lt('created_at', todayEnd);

        // Get today's new users
        const { data: todayUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact' })
          .gte('created_at', todayStart)
          .lt('created_at', todayEnd);

        // Calculate unique visitors and sessions
        const uniqueVisitorsToday = new Set(todayUniqueVisitors?.map(v => v.user_id)).size || 0;
        const sessionsToday = new Set(todaySessions?.map(s => s.session_id)).size || 0;

        setTrafficData(prev => ({
          ...prev,
          uniqueVisitorsToday,
          sessionsToday,
          totalPageViews: totalPageViewsCount || 0,
          totalRecords: totalRecordsCount || 0,
          todayRecords: todayRecords?.length || 0,
          todayUsers: todayUsers?.length || 0
        }));

        // Detailed analytics will be loaded by loadDetailedAnalytics function

        // Calculate bounce rate and session time directly from analytics_events
        const { data: allEvents } = await supabase
          .from('analytics_events')
          .select('session_id, event_type, timestamp')
          .eq('event_type', 'page_view')
          .order('timestamp', { ascending: true });

        let bounceRate = 0;
        let avgSessionTime = 0;

        if (allEvents && allEvents.length > 0) {
          // Group events by session
          const sessionData: { [key: string]: any[] } = {};
          allEvents.forEach(event => {
            if (!sessionData[event.session_id]) {
              sessionData[event.session_id] = [];
            }
            sessionData[event.session_id].push(event);
          });

          // Calculate bounce rate (sessions with only 1 page view)
          const sessions = Object.values(sessionData);
          const singlePageSessions = sessions.filter(session => session.length === 1);
          bounceRate = sessions.length > 0 ? (singlePageSessions.length / sessions.length) * 100 : 0;

          // Calculate average session time
          let totalSessionTime = 0;
          let validSessions = 0;

          sessions.forEach(session => {
            if (session.length > 1) {
              const firstEvent = session[0];
              const lastEvent = session[session.length - 1];
              const sessionTime = new Date(lastEvent.timestamp).getTime() - new Date(firstEvent.timestamp).getTime();
              totalSessionTime += sessionTime;
              validSessions++;
            }
          });

          avgSessionTime = validSessions > 0 ? totalSessionTime / validSessions / 1000 : 0; // Convert to seconds
        }

        // console.log('Calculated Analytics:', {
        //   totalEvents: allEvents?.length || 0,
        //   bounceRate,
        //   avgSessionTime: Math.round(avgSessionTime)
        // });

        setTrafficData(prev => ({
          ...prev,
          uniqueVisitors: uniqueVisitorsToday || totalUsers,
          pageViews: totalPageViewsCount || 0, // Use total page views instead of today's
          sessions: sessionsToday || 0,
          bounceRate: bounceRate,
          avgSessionTime: avgSessionTime,
          dailyStats: [{
            date: today.toISOString().split('T')[0],
            users: todayUsers?.length || 0,
            records: todayRecords?.length || 0,
            pageViews: todayPageViews?.length || 0
          }],
          monthlyStats: [{
            month: today.toISOString().split('T')[0],
            users: totalUsers || 0,
            records: totalRecordsCount || 0,
            pageViews: totalPageViewsCount || 0
          }],
          yearlyStats: [{
            year: today.getFullYear().toString(),
            users: totalUsers || 0,
            records: totalRecordsCount || 0,
            pageViews: totalPageViewsCount || 0
          }],
          // Detailed analytics will be set by loadDetailedAnalytics function
          timelineData: []
        }));
      } else {
        // console.error('Analytics errors:', { analyticsUsersError, allRecordsError });
      }
    } catch (error) {
      // console.error('Error loading admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load shop inquiries
  const loadShopInquiries = async () => {
    try {
      const { data, error } = await supabase
        .from('fishing_shop_inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading shop inquiries:', error);
      } else {
        setShopInquiries(data || []);
      }
    } catch (error) {
      console.error('Error loading shop inquiries:', error);
    }
  };

  // Load real data from database
  useEffect(() => {
    const loadAllData = async () => {
      await loadRealData();
      await loadDetailedAnalytics();
      await loadTrafficGraphData();
      await loadShopInquiries();
    };
    loadAllData();
  }, []);

  // Load traffic data when period changes
  useEffect(() => {
    if (trafficData.selectedPeriod) {
      loadTrafficGraphData();
      loadDetailedAnalytics(); // Reload detailed analytics when period changes
    }
  }, [trafficData.selectedPeriod, trafficData.customStartDate, trafficData.customEndDate]);

  // Ensure chart loads data on first render
  useEffect(() => {
    if (trafficData.timelineData.length === 0 && trafficData.selectedPeriod) {
      loadTrafficGraphData();
    }
  }, [trafficData.timelineData.length, trafficData.selectedPeriod]);

  // Use traffic data directly to prevent memoization issues
  const memoizedTrafficData = trafficData.timelineData || [];

  // Handle period change
  const handlePeriodChange = (period: string) => {
    setTrafficData(prev => ({
      ...prev,
      selectedPeriod: period
    }));
  };

  // Get period description
  const getPeriodDescription = (period: string) => {
    switch (period) {
      case '1h': return 'Ultima oră - afișare pe minute';
      case '24h': return 'Ultimele 24 ore - afișare pe ore';
      case '7d': return 'Ultima săptămână - afișare pe zile';
      case '30d': return 'Ultimele 30 zile - afișare pe zile';
      case '1y': return 'Ultimul an - afișare pe luni';
      case 'custom': return `Perioadă custom: ${trafficData.customStartDate} - ${trafficData.customEndDate}`;
      default: return 'Selectează o perioadă';
    }
  };

  // Convert UTC time to Romania time
  const convertToRomaniaTime = (timeString: string) => {
    try {
      // If it's already in HH:MM format, convert it
      if (timeString.includes(':')) {
        const [hours, minutes] = timeString.split(':');
        const utcHours = parseInt(hours);

        // Romania is UTC+3 in summer (DST), UTC+2 in winter
        // But checking the user's feedback, seems like we need +6 hours
        // This suggests the database time might not be in UTC
        const romaniaHours = (utcHours + 6) % 24;

        return `${romaniaHours.toString().padStart(2, '0')}:${minutes}`;
      }

      // If it's a date format (YYYY-MM-DD), return as is
      return timeString;
    } catch (error) {
      // console.error('Error converting time:', error);
      return timeString;
    }
  };

  // Handle record details modal
  const handleViewRecordDetails = (record: any) => {
    setSelectedRecord(record);
    setIsRecordModalOpen(true);
  };

  const closeRecordModal = () => {
    setSelectedRecord(null);
    setIsRecordModalOpen(false);
  };

  // Handle user details modal
  const handleViewUserDetails = (user: any) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const closeUserModal = () => {
    setSelectedUser(null);
    setIsUserModalOpen(false);
  };

  // Handle view user profile
  const handleViewUserProfile = async (user: any) => {
    // First check if username is already in user object
    if (user.username) {
      window.open(`/profile/${user.username}`, '_blank');
      return;
    }

    // If no username, try to get it from profile
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (profileData?.username) {
        window.open(`/profile/${profileData.username}`, '_blank');
      } else {
        // Fallback: use ID as profile identifier (PublicProfile now supports UUID)
        window.open(`/profile/${user.id}`, '_blank');
      }
    } catch (error) {
      // Fallback: use ID as profile identifier
      window.open(`/profile/${user.id}`, '_blank');
    }
  };

  // Update daily analytics stats
  const updateAnalyticsStats = async () => {
    try {
      toast.loading('Se actualizează statisticile...', { id: 'update-stats' });

      const { error } = await supabase.rpc('update_daily_analytics_stats');
      if (error) {
        // console.error('Error updating analytics stats:', error);
        toast.error('Eroare la actualizarea statisticilor', { id: 'update-stats' });
      } else {
        toast.success('Statisticile au fost actualizate cu succes!', { id: 'update-stats' });
        // Reload data directly using loadDetailedAnalytics to get fresh data
        await loadDetailedAnalytics();
        await loadRealData(); // Also reload main stats
      }
    } catch (error) {
      // console.error('Error updating analytics stats:', error);
      toast.error('Eroare la actualizarea statisticilor', { id: 'update-stats' });
    }
  };

  const handleApproveRecord = async (recordId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('records')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: user?.id
        })
        .eq('id', recordId);

      if (error) {
        // console.error('Error approving record:', error);
        return;
      }

      // Remove from pending and reload data
      setPendingRecords(prev => prev.filter(record => record.id !== recordId));
      loadRealData(); // Reload to get updated data
    } catch (error) {
      // console.error('Error approving record:', error);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setBackupData(null);

    try {
      const response = await fetch('/.netlify/functions/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Eroare la crearea backup-ului');
      }

      setBackupData(result.backup);
      toast.success('Backup creat cu succes!');
    } catch (error: any) {
      console.error('Error creating backup:', error);
      toast.error('Eroare la crearea backup-ului: ' + (error.message || 'Necunoscută'));
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownloadBackup = () => {
    if (!backupData) return;

    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${backupData.metadata.backup_name}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Backup descărcat cu succes!');
  };

  const handleRejectRecord = async (recordId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('records')
        .update({
          status: 'rejected',
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
          rejection_reason: 'Nu îndeplinește criteriile'
        })
        .eq('id', recordId);

      if (error) {
        // console.error('Error rejecting record:', error);
        return;
      }

      // Remove from pending and reload data
      setPendingRecords(prev => prev.filter(record => record.id !== recordId));
      loadRealData(); // Reload to get updated data
    } catch (error) {
      // console.error('Error rejecting record:', error);
    }
  };

  const menuItems = [
    { id: 'analytics', label: 'Analytics & Status', icon: BarChart3 },
    { id: 'records', label: 'Moderare Recorduri', icon: CheckCircle },
    { id: 'rejected', label: 'Recorduri Respinse', icon: XCircle },
    { id: 'locations', label: 'Gestionare Locații', icon: MapPin },
    { id: 'users', label: 'Utilizatori', icon: Users },
    { id: 'shops', label: 'Mesaje Magazine', icon: Store },
    { id: 'backup', label: 'Backup', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-4 sm:py-6 md:py-12 transition-colors duration-200">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="text-center mb-6 sm:mb-8 md:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
            Panou de Administrare
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
            Gestionarea recordurilor, moderarea conținutului și administrarea
            utilizatorilor pentru Fish Trophy.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-full flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Menu className="w-4 h-4" />
                {menuItems.find(item => item.id === activeSection)?.label || 'Meniu'}
              </span>
              <span className="text-xs text-muted-foreground">
                {isMobileMenuOpen ? '✕' : '☰'}
              </span>
            </Button>
          </div>

          {/* Sidebar */}
          <div className={`w-full lg:w-56 flex-shrink-0 transition-all duration-300 ${isMobileMenuOpen ? 'block' : 'hidden lg:block'
            }`}>
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-2 sm:p-3">
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-left transition-colors text-xs sm:text-sm ${activeSection === item.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                    >
                      <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${activeSection === item.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'}`} />
                      <span className="text-xs sm:text-sm truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
              <TabsList className="hidden">
              </TabsList>

              {/* Analytics & Status Tab */}
              <TabsContent value="analytics" className="space-y-4 sm:space-y-5 md:space-y-6">
                <div className="grid gap-3 sm:gap-4 md:gap-6">
                  {/* Traffic Analytics */}
                  <Card>
                    <CardHeader className="pb-2 sm:pb-4">
                      <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="text-base sm:text-lg">Trafic Website</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={updateAnalyticsStats}
                          className="text-xs w-full sm:w-auto mt-2 sm:mt-0"
                        >
                          Actualizează
                        </Button>
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Statistici reale din baza de date
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                        <div className="text-center p-2 sm:p-2.5 md:p-3 lg:p-4 bg-muted/50 rounded-lg">
                          <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-blue-600">{trafficData.pageViews.toLocaleString('ro-RO')}</div>
                          <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">Page Views</div>
                          <div className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">Total vizualizări</div>
                        </div>
                        <div className="text-center p-2 sm:p-2.5 md:p-3 lg:p-4 bg-muted/50 rounded-lg">
                          <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-green-600">{trafficData.uniqueVisitors.toLocaleString('ro-RO')}</div>
                          <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">Vizitatori Unici</div>
                          <div className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">Utilizatori diferiți</div>
                        </div>
                        <div className="text-center p-2 sm:p-2.5 md:p-3 lg:p-4 bg-muted/50 rounded-lg">
                          <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-orange-600">{(trafficData.sessions || 0).toLocaleString('ro-RO')}</div>
                          <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">Sesiuni</div>
                          <div className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">Sesiuni active</div>
                        </div>
                        <div className="text-center p-2 sm:p-2.5 md:p-3 lg:p-4 bg-muted/50 rounded-lg">
                          <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-red-600">{trafficData.bounceRate.toFixed(1)}%</div>
                          <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">Bounce Rate</div>
                          <div className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">% care pleacă rapid</div>
                        </div>
                        <div className="text-center p-2 sm:p-2.5 md:p-3 lg:p-4 bg-muted/50 rounded-lg">
                          <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-purple-600">{Math.floor(trafficData.avgSessionTime / 60)}m</div>
                          <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">Timp Mediu</div>
                          <div className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">Timp pe sesiune</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                </div>

                {/* Detailed Analytics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                  {/* Device Statistics */}
                  <Card>
                    <CardHeader className="pb-2 sm:pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                        Dispozitive
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Distribuția pe tipuri de dispozitive
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2 sm:pt-4">
                      <div className="space-y-2 sm:space-y-3">
                        {Object.entries(trafficData.deviceStats)
                          .sort(([, a], [, b]) => b - a)
                          .map(([device, count]) => {
                            const total = Object.values(trafficData.deviceStats).reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                              <div key={device} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                                <span className="text-xs sm:text-sm capitalize truncate">{device}</span>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <div className="flex-1 sm:w-16 lg:w-20 bg-muted rounded-full h-1.5 sm:h-2">
                                    <div
                                      className="bg-blue-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-xs sm:text-sm font-medium w-8 sm:w-12 text-right">{percentage}%</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Browser Statistics */}
                  <Card>
                    <CardHeader className="pb-2 sm:pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                        Browsere
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Distribuția pe browsere
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2 sm:pt-4">
                      <div className="space-y-2 sm:space-y-3">
                        {Object.entries(trafficData.browserStats)
                          .sort(([, a], [, b]) => b - a)
                          .map(([browser, count]) => {
                            const total = Object.values(trafficData.browserStats).reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                              <div key={browser} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                                <span className="text-xs sm:text-sm truncate">{browser}</span>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <div className="flex-1 sm:w-16 lg:w-20 bg-muted rounded-full h-1.5 sm:h-2">
                                    <div
                                      className="bg-green-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-xs sm:text-sm font-medium w-8 sm:w-12 text-right">{percentage}%</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Operating Systems */}
                  <Card>
                    <CardHeader className="pb-2 sm:pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Database className="w-4 h-4 sm:w-5 sm:h-5" />
                        Sisteme de Operare
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Distribuția pe OS
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2 sm:pt-4">
                      <div className="space-y-2 sm:space-y-3">
                        {Object.entries(trafficData.osStats)
                          .sort(([, a], [, b]) => b - a)
                          .map(([os, count]) => {
                            const total = Object.values(trafficData.osStats).reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                              <div key={os} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                                <span className="text-xs sm:text-sm truncate">{os}</span>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <div className="flex-1 sm:w-16 lg:w-20 bg-muted rounded-full h-1.5 sm:h-2">
                                    <div
                                      className="bg-purple-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-xs sm:text-sm font-medium w-8 sm:w-12 text-right">{percentage}%</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Romanian Cities */}
                  <Card>
                    <CardHeader className="pb-2 sm:pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                        Orașe din România
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Distribuția pe orașe românești
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2 sm:pt-4">
                      <div className="space-y-2 sm:space-y-3">
                        {Object.entries(trafficData.cityStats)
                          .sort(([, a], [, b]) => b - a)
                          .map(([city, count]) => {
                            const total = Object.values(trafficData.cityStats).reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                            const cityColor = generateRandomColor(city);
                            return (
                              <div key={city} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                                <span className="text-xs sm:text-sm truncate">{city}</span>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <div className="flex-1 sm:w-16 lg:w-20 bg-muted rounded-full h-1.5 sm:h-2">
                                    <div
                                      className={`${cityColor} h-1.5 sm:h-2 rounded-full transition-all duration-300`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-xs sm:text-sm font-medium w-8 sm:w-12 text-right">{percentage}%</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Referrers - Mobile Optimized */}
                  <Card>
                    <CardHeader className="pb-2 sm:pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                        Surse de Trafic
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        De unde vin vizitatorii
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2 sm:pt-4">
                      <div className="space-y-2 sm:space-y-3">
                        {Object.entries(trafficData.referrerStats)
                          .sort(([, a], [, b]) => b - a)
                          .map(([referrer, count]) => {
                            const total = Object.values(trafficData.referrerStats).reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                              <div key={referrer} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                                <span className="text-xs sm:text-sm truncate">{referrer}</span>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <div className="flex-1 sm:w-16 lg:w-20 bg-muted rounded-full h-1.5 sm:h-2">
                                    <div
                                      className="bg-red-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-xs sm:text-sm font-medium w-8 sm:w-12 text-right">{percentage}%</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Most Visited Pages - Mobile Optimized */}
                  <Card>
                    <CardHeader className="pb-2 sm:pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                        Cele mai vizitate pagini
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Top 10 pagini cu cele mai multe vizite
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2 sm:pt-4">
                      <div className="space-y-2 sm:space-y-3">
                        {Object.entries(trafficData.pageViewsStats || {})
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 10)
                          .map(([page, count]) => {
                            const total = Object.values(trafficData.pageViewsStats || {}).reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                              <div key={page} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                                <span className="text-xs sm:text-sm font-mono truncate break-all">{page}</span>
                                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                  <div className="flex-1 sm:w-16 lg:w-20 bg-muted rounded-full h-1.5 sm:h-2">
                                    <div
                                      className="bg-indigo-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-xs sm:text-sm font-medium w-8 sm:w-12 text-right">{count}</span>
                                </div>
                              </div>
                            );
                          })}
                        {Object.keys(trafficData.pageViewsStats || {}).length === 0 && (
                          <div className="text-center py-6 sm:py-8 text-muted-foreground">
                            <ExternalLink className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-xs sm:text-sm">Nu există date de trafic încă</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Timeline Chart - Mobile Optimized */}
                  <Card className="md:col-span-2 lg:col-span-3">
                    <CardHeader className="pb-2 sm:pb-3 md:pb-4 lg:pb-6">
                      <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="text-lg sm:text-xl">Evoluția Traficului</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            value={trafficData.selectedPeriod}
                            onChange={(e) => handlePeriodChange(e.target.value)}
                            className="px-2 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm border rounded-md bg-background"
                          >
                            <option value="1h">Ultima oră</option>
                            <option value="24h">Ultimele 24 ore</option>
                            <option value="7d">Ultima săptămână</option>
                            <option value="30d">Ultimele 30 zile</option>
                            <option value="1y">Ultimul an</option>
                            <option value="custom">Perioadă custom</option>
                          </select>
                          {trafficData.selectedPeriod === 'custom' && (
                            <div className="flex gap-1 sm:gap-2">
                              <input
                                type="date"
                                value={trafficData.customStartDate}
                                onChange={(e) => setTrafficData(prev => ({ ...prev, customStartDate: e.target.value }))}
                                className="px-1 sm:px-2 py-1.5 sm:py-1 text-xs sm:text-sm border rounded-md bg-background"
                              />
                              <input
                                type="date"
                                value={trafficData.customEndDate}
                                onChange={(e) => setTrafficData(prev => ({ ...prev, customEndDate: e.target.value }))}
                                className="px-1 sm:px-2 py-1.5 sm:py-1 text-xs sm:text-sm border rounded-md bg-background"
                              />
                            </div>
                          )}
                        </div>
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {getPeriodDescription(trafficData.selectedPeriod)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="h-[300px] sm:h-[400px] md:h-[450px] lg:h-[500px] w-full">
                        {memoizedTrafficData.length > 0 ? (
                          <div className="h-full w-full flex flex-col">
                            {/* Metric Filters - Mobile Optimized */}
                            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 md:gap-6 mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm">
                              <button
                                onClick={() => setShowPageViews(!showPageViews)}
                                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-colors ${showPageViews
                                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                  : 'bg-gray-100 text-gray-500 border border-gray-300'
                                  }`}
                              >
                                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded ${showPageViews ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                                <span className="hidden sm:inline">Page Views</span>
                                <span className="sm:hidden">Views</span>
                              </button>
                              <button
                                onClick={() => setShowUniqueVisitors(!showUniqueVisitors)}
                                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-colors ${showUniqueVisitors
                                  ? 'bg-green-100 text-green-700 border border-green-300'
                                  : 'bg-gray-100 text-gray-500 border border-gray-300'
                                  }`}
                              >
                                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded ${showUniqueVisitors ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                <span className="hidden sm:inline">Vizitatori Unici</span>
                                <span className="sm:hidden">Unici</span>
                              </button>
                              <button
                                onClick={() => setShowSessions(!showSessions)}
                                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-colors ${showSessions
                                  ? 'bg-orange-100 text-orange-700 border border-orange-300'
                                  : 'bg-gray-100 text-gray-500 border border-gray-300'
                                  }`}
                              >
                                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded ${showSessions ? 'bg-orange-500' : 'bg-gray-400'}`}></div>
                                <span className="hidden sm:inline">Sesiuni</span>
                                <span className="sm:hidden">Ses</span>
                              </button>
                            </div>

                            {/* Line Chart - Recharts */}
                            <div className="flex-1 relative w-full" style={{ minHeight: '250px', height: '400px' }}>
                              <ResponsiveContainer width="100%" height={400} minWidth={0} minHeight={250}>
                                <LineChart data={memoizedTrafficData.map(point => ({
                                  time: convertToRomaniaTime(point.time_period),
                                  page_views: showPageViews ? (point.page_views || 0) : null,
                                  unique_visitors: showUniqueVisitors ? (point.unique_visitors || 0) : null,
                                  sessions: showSessions ? (point.sessions || 0) : null,
                                }))} margin={{ top: 5, right: 10, left: -10, bottom: 70 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1e293b' : '#f3f4f6'} />
                                  <XAxis
                                    dataKey="time"
                                    stroke="#6b7280"
                                    fontSize={10}
                                    tick={{ fill: '#6b7280' }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={70}
                                    interval="preserveStartEnd"
                                  />
                                  <YAxis
                                    stroke="#6b7280"
                                    fontSize={10}
                                    tick={{ fill: '#6b7280' }}
                                    width={40}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                                      border: isDarkMode ? '1px solid rgba(30, 41, 59, 0.5)' : '1px solid rgba(229, 231, 235, 0.5)',
                                      borderRadius: '0.5rem',
                                      color: isDarkMode ? '#f8fafc' : '#0f172a',
                                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                    }}
                                    labelStyle={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}
                                  />
                                  {showPageViews && (
                                    <Line
                                      type="monotone"
                                      dataKey="page_views"
                                      stroke="#3b82f6"
                                      strokeWidth={2}
                                      dot={{ fill: '#3b82f6', r: 4 }}
                                      activeDot={{ r: 6 }}
                                      name="Vizualizări"
                                    />
                                  )}
                                  {showUniqueVisitors && (
                                    <Line
                                      type="monotone"
                                      dataKey="unique_visitors"
                                      stroke="#10b981"
                                      strokeWidth={2}
                                      dot={{ fill: '#10b981', r: 4 }}
                                      activeDot={{ r: 6 }}
                                      name="Vizitatori Unici"
                                    />
                                  )}
                                  {showSessions && (
                                    <Line
                                      type="monotone"
                                      dataKey="sessions"
                                      stroke="#f59e0b"
                                      strokeWidth={2}
                                      dot={{ fill: '#f59e0b', r: 4 }}
                                      activeDot={{ r: 6 }}
                                      name="Sesiuni"
                                    />
                                  )}
                                  <Legend />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                              <p className="text-muted-foreground">Nu există date de trafic pentru această perioadă</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* System Info */}
                <Card>
                  <CardHeader className="pb-2 sm:pb-4">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Database className="w-4 h-4 sm:w-5 sm:h-5" />
                      Informații Sistem
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2 sm:pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground text-xs sm:text-sm">Frontend:</span>
                        <p className="font-medium text-xs sm:text-sm break-words">React 18 + Vite 7 + TypeScript</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground text-xs sm:text-sm">Backend:</span>
                        <p className="font-medium text-xs sm:text-sm break-words">Supabase + Netlify Functions</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground text-xs sm:text-sm">Hărți:</span>
                        <p className="font-medium text-xs sm:text-sm break-words">MapLibre GL 5.7 + OSM</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground text-xs sm:text-sm">UI:</span>
                        <p className="font-medium text-xs sm:text-sm break-words">Tailwind CSS + shadcn/ui + Radix UI</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground text-xs sm:text-sm">Grafice:</span>
                        <p className="font-medium text-xs sm:text-sm">Recharts 3.5</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground text-xs sm:text-sm">State Management:</span>
                        <p className="font-medium text-xs sm:text-sm break-words">React Query 5.9 (TanStack)</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground text-xs sm:text-sm">Routing:</span>
                        <p className="font-medium text-xs sm:text-sm">React Router DOM 6.20</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground text-xs sm:text-sm">Notificări:</span>
                        <p className="font-medium text-xs sm:text-sm">Sonner (Toast)</p>
                      </div>
                    </div>
                    {/* Netlify Deployment Status */}
                    <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                        <div className="space-y-0.5">
                          <span className="text-muted-foreground text-xs sm:text-sm">Status Deploy:</span>
                          <p className="font-medium text-xs sm:text-sm">Netlify</p>
                        </div>
                        <a
                          href="https://app.netlify.com/projects/fishtrophy/deploys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block transition-opacity hover:opacity-80"
                          title="Vezi status deploy Netlify"
                        >
                          <img
                            src="https://api.netlify.com/api/v1/badges/f3766656-9e69-4a97-acff-952a4caecde3/deploy-status"
                            alt="Netlify Deploy Status"
                            className="h-5 sm:h-6"
                          />
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Records Moderation Tab */}
              <TabsContent value="records" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Recorduri în Așteptare
                    </CardTitle>
                    <CardDescription>
                      {pendingRecords.length} recorduri necesită moderare
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {isLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="mt-2 text-sm text-muted-foreground">Se încarcă recordurile...</p>
                        </div>
                      ) : pendingRecords.length === 0 ? (
                        <div className="text-center py-8">
                          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                          <p className="text-muted-foreground">Nu există recorduri în așteptare</p>
                        </div>
                      ) : (
                        pendingRecords.map((record) => (
                          <div key={record.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="space-y-1 flex-1 min-w-0">
                                <h4 className="font-semibold text-sm sm:text-base">{record.species_name} - {record.weight} kg</h4>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  {record.location_name} • {record.profiles?.display_name || 'Utilizator necunoscut'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Lungime: {record.length} cm • Data: {new Date(record.date_caught).toLocaleDateString('ro-RO')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Trimis: {new Date(record.created_at).toLocaleString('ro-RO')}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApproveRecord(record.id)}
                                  className="text-green-600 hover:text-green-700 text-xs sm:text-sm flex-1 sm:flex-initial"
                                >
                                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                  <span className="hidden sm:inline">Aprobă</span>
                                  <span className="sm:hidden">✓</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectRecord(record.id)}
                                  className="text-red-600 hover:text-red-700 text-xs sm:text-sm flex-1 sm:flex-initial"
                                >
                                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                  <span className="hidden sm:inline">Respinge</span>
                                  <span className="sm:hidden">✕</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewRecordDetails(record)}
                                  className="text-xs sm:text-sm flex-1 sm:flex-initial"
                                >
                                  <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                  <span className="hidden sm:inline">Detalii</span>
                                  <span className="sm:hidden">👁</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Rejected Records Tab */}
              <TabsContent value="rejected" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      Recorduri Respinse
                    </CardTitle>
                    <CardDescription>
                      {rejectedRecords.length} recorduri au fost respinse
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {isLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                          <p className="mt-2 text-sm text-muted-foreground">Se încarcă recordurile respinse...</p>
                        </div>
                      ) : rejectedRecords.length === 0 ? (
                        <div className="text-center py-8">
                          <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-muted-foreground">Nu există recorduri respinse</p>
                        </div>
                      ) : (
                        rejectedRecords.map((record) => (
                          <div key={record.id} className="border border-red-200 rounded-lg p-4 space-y-3 bg-red-50">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="space-y-1 flex-1 min-w-0">
                                <h4 className="font-semibold text-sm sm:text-base text-red-800">
                                  {record.species_name} - {record.weight} kg
                                </h4>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  {record.location_name} • {record.profiles?.display_name || 'Utilizator necunoscut'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Respinse pe {new Date(record.verified_at).toLocaleDateString('ro-RO')}
                                </p>
                                {record.rejection_reason && (
                                  <p className="text-xs text-red-600 font-medium">
                                    Motiv: {record.rejection_reason}
                                  </p>
                                )}
                              </div>
                              <Badge variant="destructive" className="self-start sm:self-auto text-xs">Respinse</Badge>
                            </div>
                            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveRecord(record.id)}
                                className="text-green-600 hover:text-green-700 text-xs sm:text-sm flex-1 sm:flex-initial"
                              >
                                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Aprobă</span>
                                <span className="sm:hidden">✓</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewRecordDetails(record)}
                                className="text-xs sm:text-sm flex-1 sm:flex-initial"
                              >
                                <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Detalii</span>
                                <span className="sm:hidden">👁</span>
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Locations Management Tab */}
              <TabsContent value="locations" className="space-y-6">
                <MapEditor onLocationUpdate={() => {
                  // Refresh any related data if needed
                }} />
              </TabsContent>

              {/* Users Management Tab */}
              <TabsContent value="users" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Main Users List */}
                  <div className="lg:col-span-3">
                    <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                          <Users className="w-5 h-5" />
                          Gestionare Utilizatori ({users.length})
                        </CardTitle>
                        <CardDescription className="text-gray-600 dark:text-slate-300">
                          Lista tuturor utilizatorilor din baza de date
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <div className="space-y-3 sm:space-y-4 min-w-0">
                          {users.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                              <p>Nu există utilizatori în baza de date</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {/* Header Row */}
                              <div className="grid grid-cols-[60px_1fr_200px_100px_120px_100px] gap-3 px-3 py-2 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-medium text-gray-600 dark:text-slate-300">
                                <div></div>
                                <div>Utilizator</div>
                                <div>Email</div>
                                <div>Recorduri</div>
                                <div>Ultima activitate</div>
                                <div className="text-center">Acțiuni</div>
                              </div>

                              {/* User Rows */}
                              {users.map((user) => (
                                <div key={user.id} className="grid grid-cols-[60px_1fr_200px_100px_120px_100px] gap-3 items-center px-3 py-3 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors bg-white dark:bg-slate-800">
                                  {/* Avatar */}
                                  <div className="flex-shrink-0">
                                    {user.photo_url ? (
                                      <img
                                        src={getR2ImageUrlProxy(user.photo_url)}
                                        alt={user.display_name || user.email}
                                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-slate-600"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          if (target.nextElementSibling) {
                                            (target.nextElementSibling as HTMLElement).style.display = 'flex';
                                          }
                                        }}
                                      />
                                    ) : null}
                                    <div className={`w-10 h-10 ${user.photo_url ? 'hidden' : 'flex'} bg-blue-100 dark:bg-blue-900/30 rounded-full items-center justify-center`}>
                                      <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                                        {user.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Name & Username */}
                                  <div className="min-w-0">
                                    <div className="font-medium text-sm text-gray-900 dark:text-white truncate" title={user.display_name || 'Fără nume'}>
                                      {user.display_name || 'Fără nume'}
                                    </div>
                                    {user.username && (
                                      <div className="text-xs text-gray-500 dark:text-slate-400 truncate" title={`@${user.username}`}>
                                        @{user.username}
                                      </div>
                                    )}
                                    {user.is_admin && (
                                      <Badge variant="default" className="mt-1 text-xs">Admin</Badge>
                                    )}
                                  </div>

                                  {/* Email */}
                                  <div className="text-xs text-gray-600 dark:text-slate-300 truncate min-w-0" title={user.email}>
                                    {user.email}
                                  </div>

                                  {/* Records Count */}
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {user.records?.[0]?.count || 0}
                                  </div>

                                  {/* Last Sign In */}
                                  <div className="text-xs text-gray-500 dark:text-slate-400">
                                    {user.last_sign_in_at ? (
                                      new Date(user.last_sign_in_at).toLocaleDateString('ro-RO', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                      })
                                    ) : (
                                      <span className="text-gray-400 dark:text-slate-500">-</span>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex gap-1 justify-center flex-shrink-0">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleViewUserDetails(user)}
                                      className="text-xs px-2 h-7 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                                      title="Vezi detalii"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleViewUserProfile(user)}
                                      className="text-xs px-2 h-7 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                                      title="Vezi profil public"
                                      disabled={!user.username}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Statistics Sidebar */}
                  <div className="lg:col-span-1 space-y-4">
                    <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-lg text-gray-900 dark:text-white">Statistici</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900/50">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{users.length}</div>
                            <div className="text-xs text-blue-700 dark:text-blue-300">Total utilizatori</div>
                          </div>
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900/50">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {users.filter(u => u.records?.[0]?.count > 0).length}
                            </div>
                            <div className="text-xs text-green-700 dark:text-green-300">Cu recorduri</div>
                          </div>
                          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-900/50">
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                              {users.filter(u => u.is_admin).length}
                            </div>
                            <div className="text-xs text-purple-700 dark:text-purple-300">Admins</div>
                          </div>
                          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-900/50">
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                              {users.reduce((sum, u) => sum + (u.records?.[0]?.count || 0), 0)}
                            </div>
                            <div className="text-xs text-orange-700 dark:text-orange-300">Total recorduri</div>
                          </div>
                          <div className="p-3 bg-gray-50 dark:bg-slate-950/50 rounded-lg border border-gray-200 dark:border-slate-800">
                            <div className="text-2xl font-bold text-gray-600 dark:text-slate-300">
                              {users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                            </div>
                            <div className="text-xs text-gray-700 dark:text-slate-200">Activi (7 zile)</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Backup Tab */}
              <TabsContent value="backup" className="space-y-6">
                <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                      <Database className="w-5 h-5" />
                      Backup Baza de Date
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-slate-300">
                      Creează un backup complet al bazei de date. Backup-ul include toate tabelele importante.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">ℹ️ Informații</h4>
                      <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                        <li>Backup-ul include: profiles, records, fishing_locations, fish_species, user_gear, catches, private_messages</li>
                        <li>Backup-ul va fi descărcat ca fișier JSON</li>
                        <li>Recomandat: Fă backup înainte de modificări majore</li>
                        <li>Backup-ul este salvat local pe computerul tău</li>
                      </ul>
                    </div>

                    <Button
                      onClick={handleCreateBackup}
                      disabled={isCreatingBackup}
                      className="w-full sm:w-auto text-xs sm:text-sm"
                      size="lg"
                    >
                      {isCreatingBackup ? (
                        <>
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin sm:mr-2" />
                          <span className="hidden sm:inline">Se creează backup-ul...</span>
                          <span className="sm:hidden">Se creează...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                          Creează Backup
                        </>
                      )}
                    </Button>

                    {backupData && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-lg p-4 space-y-3">
                        <h4 className="font-semibold text-green-900 dark:text-green-300">✅ Backup creat cu succes!</h4>
                        <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                          <p><span className="font-medium">Tabele:</span> {backupData.summary.successful_tables}/{backupData.summary.total_tables}</p>
                          <p><span className="font-medium">Înregistrări:</span> {backupData.summary.total_records.toLocaleString('ro-RO')}</p>
                          <p><span className="font-medium">Mărime:</span> {(backupData.summary.backup_size_bytes / 1024 / 1024).toFixed(2)} MB</p>
                          <p><span className="font-medium">Data:</span> {new Date(backupData.metadata.created_at).toLocaleString('ro-RO')}</p>
                        </div>
                        <Button
                          onClick={handleDownloadBackup}
                          variant="outline"
                          className="w-full border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                          <Download className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                          Descarcă Backup
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Shop Inquiries Tab */}
              <TabsContent value="shops" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Store className="w-5 h-5" />
                      Mesaje de la Magazine de Pescuit
                    </CardTitle>
                    <CardDescription>
                      Cereri și mesaje de la proprietarii de magazine care doresc să se adauge pe platformă
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {shopInquiries.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 dark:text-slate-200">
                        <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Nu există mesaje de la magazine momentan.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {shopInquiries.map((inquiry) => (
                          <Card key={inquiry.id} className="hover:shadow-md transition-shadow bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                            <CardContent className="p-3 sm:p-4 md:p-6">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    {inquiry.shop_name}
                                  </h3>
                                  <div className="space-y-1 text-xs sm:text-sm text-gray-600 dark:text-slate-200">
                                    <p><span className="font-medium">Proprietar:</span> {inquiry.owner_name}</p>
                                    <p className="truncate"><span className="font-medium">Email:</span> {inquiry.email}</p>
                                    {inquiry.phone && <p><span className="font-medium">Telefon:</span> {inquiry.phone}</p>}
                                    <p className="break-words"><span className="font-medium">Adresă:</span> {inquiry.address}</p>
                                    {inquiry.city && <p><span className="font-medium">Oraș:</span> {inquiry.city}</p>}
                                    {inquiry.county && <p><span className="font-medium">Județ:</span> {inquiry.county}</p>}
                                    {inquiry.google_maps_link && (
                                      <p>
                                        <span className="font-medium">Google Maps:</span>{' '}
                                        <a href={inquiry.google_maps_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all">
                                          Vezi locația
                                        </a>
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Badge variant={inquiry.status === 'pending' ? 'default' : inquiry.status === 'approved' ? 'default' : 'secondary'} className="self-start sm:self-auto text-xs">
                                  {inquiry.status === 'pending' ? 'În așteptare' :
                                    inquiry.status === 'reviewed' ? 'Revizuit' :
                                      inquiry.status === 'contacted' ? 'Contactat' :
                                        inquiry.status === 'approved' ? 'Aprobat' : 'Respins'}
                                </Badge>
                              </div>

                              {inquiry.description && (
                                <div className="mb-3 sm:mb-4">
                                  <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap break-words">{inquiry.description}</p>
                                </div>
                              )}

                              {inquiry.images && inquiry.images.length > 0 && (
                                <div className="mb-3 sm:mb-4">
                                  <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Poze:</p>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {inquiry.images.map((img: string, idx: number) => (
                                      <img key={idx} src={img} alt={`Poza ${idx + 1}`} className="w-full h-20 sm:h-24 object-cover rounded-lg border border-gray-200 dark:border-slate-700" />
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 pt-3 sm:pt-4 border-t border-gray-200 dark:border-slate-700">
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                  Trimis pe {new Date(inquiry.created_at).toLocaleString('ro-RO')}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedInquiry(inquiry);
                                      setIsInquiryModalOpen(true);
                                    }}
                                    className="text-xs sm:text-sm flex-1 sm:flex-initial border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                                  >
                                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Vezi Detalii</span>
                                    <span className="sm:hidden">Detalii</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      window.location.href = `mailto:${inquiry.email}?subject=Re: Cerere Magazin - ${inquiry.shop_name}`;
                                    }}
                                    className="text-xs sm:text-sm flex-1 sm:flex-initial border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                                  >
                                    <Mail className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Răspunde</span>
                                    <span className="sm:hidden">Mail</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setInquiryToDelete(inquiry);
                                      setIsDeleteConfirmOpen(true);
                                    }}
                                    className="text-xs sm:text-sm flex-1 sm:flex-initial"
                                  >
                                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Șterge</span>
                                    <span className="sm:hidden">Del</span>
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Record Details Modal */}
      <RecordDetailsModal
        record={selectedRecord}
        isOpen={isRecordModalOpen}
        onClose={closeRecordModal}
        isAdmin={true}
        canEdit={false}
      />

      {/* Shop Inquiry Details Modal */}
      {isInquiryModalOpen && selectedInquiry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-500 dark:from-orange-600 dark:to-red-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Store className="w-6 h-6" />
                <h2 className="text-2xl font-bold">{selectedInquiry.shop_name}</h2>
              </div>
              <button
                onClick={() => {
                  setIsInquiryModalOpen(false);
                  setSelectedInquiry(null);
                }}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 bg-white dark:bg-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Informații Contact</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700 dark:text-slate-200"><span className="font-medium">Proprietar:</span> {selectedInquiry.owner_name}</p>
                    <p className="text-gray-700 dark:text-slate-200"><span className="font-medium">Email:</span> {selectedInquiry.email}</p>
                    {selectedInquiry.phone && <p className="text-gray-700 dark:text-slate-200"><span className="font-medium">Telefon:</span> {selectedInquiry.phone}</p>}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Locație</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700 dark:text-slate-200"><span className="font-medium">Adresă:</span> {selectedInquiry.address}</p>
                    {selectedInquiry.city && <p className="text-gray-700 dark:text-slate-200"><span className="font-medium">Oraș:</span> {selectedInquiry.city}</p>}
                    {selectedInquiry.county && <p className="text-gray-700 dark:text-slate-200"><span className="font-medium">Județ:</span> {selectedInquiry.county}</p>}
                    {selectedInquiry.google_maps_link && (
                      <p>
                        <a href={selectedInquiry.google_maps_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                          Vezi pe Google Maps
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {selectedInquiry.description && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Detalii</h3>
                  <p className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap">{selectedInquiry.description}</p>
                </div>
              )}

              {selectedInquiry.images && selectedInquiry.images.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Poze</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedInquiry.images.map((img: string, idx: number) => (
                      <img key={idx} src={img} alt={`Poza ${idx + 1}`} className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-slate-700" />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsInquiryModalOpen(false);
                    setSelectedInquiry(null);
                  }}
                  className="flex-1 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  Închide
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsInquiryModalOpen(false);
                    setInquiryToDelete(selectedInquiry);
                    setIsDeleteConfirmOpen(true);
                  }}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Șterge Mesaj
                </Button>
                <Button
                  onClick={() => {
                    window.location.href = `mailto:${selectedInquiry.email}?subject=Re: Cerere Magazin - ${selectedInquiry.shop_name}`;
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Răspunde prin Email
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {isUserModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <Card className="bg-white dark:bg-slate-800 border-0 shadow-2xl">
              <CardContent className="p-0">
                {/* Header - Compact */}
                <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 p-4 text-white rounded-t-lg">
                  <button
                    onClick={closeUserModal}
                    className="absolute top-3 right-3 p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex items-center space-x-3">
                    {selectedUser.photo_url ? (
                      <img
                        src={getR2ImageUrlProxy(selectedUser.photo_url)}
                        alt={selectedUser.display_name || selectedUser.email}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-white/30"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          if (target.nextElementSibling) {
                            (target.nextElementSibling as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div className={`w-12 h-12 ${selectedUser.photo_url ? 'hidden' : 'flex'} bg-white/20 rounded-xl items-center justify-center`}>
                      <span className="text-white font-bold text-lg">
                        {selectedUser.display_name?.charAt(0) || selectedUser.email?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{selectedUser.display_name || 'Fără nume'}</h2>
                      <p className="text-blue-100 text-sm">{selectedUser.email}</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 bg-white dark:bg-slate-800">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900/50">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedUser.records?.[0]?.count || 0}</div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">Recorduri</div>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900/50">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {selectedUser.is_admin ? 'Da' : 'Nu'}
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300">Admin</div>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-900/50">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {selectedUser.username ? 'Da' : 'Nu'}
                      </div>
                      <div className="text-xs text-purple-700 dark:text-purple-300">Username</div>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-900/50">
                      <div className="text-xs font-bold text-orange-600 dark:text-orange-400">
                        {selectedUser.last_sign_in_at ? new Date(selectedUser.last_sign_in_at).toLocaleDateString('ro-RO') : 'N/A'}
                      </div>
                      <div className="text-xs text-orange-700 dark:text-orange-300">Ultima autentificare</div>
                    </div>
                  </div>

                  {/* User Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Informații Personale</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                          <span className="font-medium text-gray-600 dark:text-slate-200">Email:</span>
                          <span className="text-gray-900 dark:text-white">{selectedUser.email}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                          <span className="font-medium text-gray-600 dark:text-slate-200">Telefon:</span>
                          <span className="text-gray-900 dark:text-white">{selectedUser.phone || 'Nu este specificat'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                          <span className="font-medium text-gray-600 dark:text-slate-200">Username:</span>
                          <span className="text-gray-900 dark:text-white">{selectedUser.username || 'Nu este setat'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                          <span className="font-medium text-gray-600 dark:text-slate-200">Județ:</span>
                          <span className="text-gray-900 dark:text-white">{selectedUser.county_id || 'Nu este specificat'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                          <span className="font-medium text-gray-600 dark:text-slate-200">Oraș:</span>
                          <span className="text-gray-900 dark:text-white">{selectedUser.city_id || 'Nu este specificat'}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Statistici și Activități</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                          <span className="font-medium text-gray-600 dark:text-slate-200">Recorduri:</span>
                          <span className="text-gray-900 dark:text-white font-bold">{selectedUser.records?.[0]?.count || 0}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                          <span className="font-medium text-gray-600 dark:text-slate-200">Membru din:</span>
                          <span className="text-gray-900 dark:text-white">{new Date(selectedUser.created_at).toLocaleDateString('ro-RO')}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                          <span className="font-medium text-gray-600 dark:text-slate-200">Ultima activitate:</span>
                          <span className="text-gray-900 dark:text-white">{selectedUser.updated_at ? new Date(selectedUser.updated_at).toLocaleDateString('ro-RO') : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                          <span className="font-medium text-gray-600 dark:text-slate-200">Status:</span>
                          <Badge variant={selectedUser.is_admin ? "default" : "secondary"} className="ml-2">
                            {selectedUser.is_admin ? 'Admin' : 'Utilizator'}
                          </Badge>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                          <span className="font-medium text-gray-600 dark:text-slate-200">ID:</span>
                          <span className="text-gray-900 dark:text-white font-mono text-xs">{selectedUser.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-slate-700">
                    <Button variant="outline" onClick={closeUserModal} className="border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700">
                      Închide
                    </Button>
                    <Button onClick={() => handleViewUserProfile(selectedUser)} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Vezi Profil Public
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {isDeleteConfirmOpen && inquiryToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Confirmă ștergerea</h3>
                  <p className="text-red-100 text-sm mt-1">Această acțiune este permanentă</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700 dark:text-slate-200">
                Ești sigur că vrei să ștergi mesajul de la <strong>{inquiryToDelete.shop_name}</strong>?
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Această acțiune nu poate fi anulată.
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setInquiryToDelete(null);
                  }}
                  className="flex-1 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  Anulează
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from('fishing_shop_inquiries')
                        .delete()
                        .eq('id', inquiryToDelete.id);
                      
                      if (error) throw error;
                      
                      toast.success('Mesaj șters cu succes!');
                      setIsDeleteConfirmOpen(false);
                      setInquiryToDelete(null);
                      if (isInquiryModalOpen) {
                        setIsInquiryModalOpen(false);
                        setSelectedInquiry(null);
                      }
                      await loadShopInquiries();
                    } catch (error: any) {
                      toast.error('Eroare la ștergerea mesajului: ' + (error.message || 'Necunoscută'));
                    }
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Șterge
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
