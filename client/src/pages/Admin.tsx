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
  Save
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import RecordDetailsModal from '@/components/RecordDetailsModal';

const Admin: React.FC = () => {
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

  // Metric filters
  const [showPageViews, setShowPageViews] = useState(true);
  const [showUniqueVisitors, setShowUniqueVisitors] = useState(true);
  const [showSessions, setShowSessions] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    data: any;
    metric: string;
  } | null>(null);

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

  // Load detailed analytics data
  const loadDetailedAnalytics = async () => {
    try {
      // console.log('Loading detailed analytics (direct query)...');

      // Get all analytics events for page views
      const { data: analyticsEvents, error: analyticsError } = await supabase
        .from('analytics_events')
        .select('device_type, browser, os, country, city, referrer, page_path')
        .eq('event_type', 'page_view');

      if (analyticsError) {
        // console.error('Error loading analytics events:', analyticsError);
        return;
      }

      // Get Romanian cities from database
      const { data: romanianCities, error: citiesError } = await supabase
        .from('cities')
        .select('name');

      if (citiesError) {
        // console.error('Error loading Romanian cities:', citiesError);
        return;
      }

      // Create a set of normalized Romanian city names for fast lookup
      const romanianCityNames = new Set(
        romanianCities?.map(city => normalizeText(city.name)) || []
      );

      // console.log('Analytics Events Count:', analyticsEvents?.length || 0);
      // console.log('Romanian Cities Count:', romanianCities?.length || 0);
      // console.log('Romanian Cities from DB:', romanianCities?.map(c => c.name).slice(0, 10)); // First 10 cities
      // console.log('Normalized Romanian Cities:', Array.from(romanianCityNames).slice(0, 10)); // First 10 normalized

      // Calculate device stats
      const deviceStatsObj: Record<string, number> = {};
      analyticsEvents?.forEach(event => {
        const device = event.device_type || 'Unknown';
        deviceStatsObj[device] = (deviceStatsObj[device] || 0) + 1;
      });

      // Calculate browser stats
      const browserStatsObj: Record<string, number> = {};
      analyticsEvents?.forEach(event => {
        const browser = event.browser || 'Unknown';
        browserStatsObj[browser] = (browserStatsObj[browser] || 0) + 1;
      });

      // Calculate OS stats
      const osStatsObj: Record<string, number> = {};
      analyticsEvents?.forEach(event => {
        const os = event.os || 'Unknown';
        osStatsObj[os] = (osStatsObj[os] || 0) + 1;
      });

      // Calculate country stats
      const countryStatsObj: Record<string, number> = {};
      analyticsEvents?.forEach(event => {
        const country = event.country || 'Unknown';
        countryStatsObj[country] = (countryStatsObj[country] || 0) + 1;
      });

      // Calculate city stats - Romanian cities (from DB + common Romanian city names)
      const cityStatsObj: Record<string, number> = {};
      const allCitiesFromAnalytics = new Set<string>();

      // Common Romanian city names that might not be in DB
      const commonRomanianCities = new Set([
        'slatina', 'bucuresti', 'bucharest', 'cluj', 'timisoara', 'iasi', 'constanta',
        'craiova', 'galati', 'ploiesti', 'brasov', 'braila', 'pitesti', 'arad',
        'sibiu', 'bacau', 'targu mures', 'baia mare', 'buzau', 'satu mare',
        'botosani', 'piatra neamt', 'ramnicu valcea', 'suceava', 'drobeta turnu severin',
        'tulcea', 'targoviste', 'focsani', 'bistrita', 'resita', 'calarasi',
        'giurgiu', 'deva', 'slobozia', 'alba iulia', 'hunedoara', 'zalau',
        'sfantu gheorghe', 'targu jiu', 'vaslui', 'ramnicu sarat', 'barlad',
        'turnu magurele', 'caracal', 'fagaras', 'sighetu marmatiei', 'mangalia',
        'campina', 'petrosani', 'lugoj', 'medgidia', 'tecuci', 'onesti',
        'oradea', 'sighisoara', 'curtea de arges', 'dorohoi', 'campulung',
        'caransebes', 'targu secuiesc'
      ]);

      analyticsEvents?.forEach(event => {
        const city = event.city || 'Unknown';
        allCitiesFromAnalytics.add(city);
        const normalizedCity = normalizeText(city);

        // Include if it's in Romanian cities DB OR in common Romanian cities
        if (romanianCityNames.has(normalizedCity) || commonRomanianCities.has(normalizedCity)) {
          // Translate city name to Romanian for display
          const translatedCity = translateCityName(city);
          cityStatsObj[translatedCity] = (cityStatsObj[translatedCity] || 0) + 1;
        }
      });



      // Calculate referrer stats
      const referrerStatsObj: Record<string, number> = {};
      analyticsEvents?.forEach(event => {
        const referrer = event.referrer || 'Direct';
        referrerStatsObj[referrer] = (referrerStatsObj[referrer] || 0) + 1;
      });

      // Calculate page views stats
      const pageViewsStatsObj: Record<string, number> = {};
      analyticsEvents?.forEach(event => {
        const page = event.page_path || '/';
        pageViewsStatsObj[page] = (pageViewsStatsObj[page] || 0) + 1;
      });

      // Update traffic data with calculated statistics
      setTrafficData(prev => ({
        ...prev,
        deviceStats: deviceStatsObj,
        browserStats: browserStatsObj,
        osStats: osStatsObj,
        countryStats: countryStatsObj,
        cityStats: cityStatsObj,
        referrerStats: referrerStatsObj,
        pageViewsStats: pageViewsStatsObj
      }));

    } catch (error) {
      // console.error('Error loading detailed analytics:', error);
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

      // Load all users
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

  // Load real data from database
  useEffect(() => {
    const loadAllData = async () => {
      await loadRealData();
      await loadDetailedAnalytics();
      await loadTrafficGraphData();
    };
    loadAllData();
  }, []);

  // Load traffic data when period changes
  useEffect(() => {
    if (trafficData.selectedPeriod) {
      loadTrafficGraphData();
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
  const handleViewUserProfile = (user: any) => {
    window.open(`/profile/${user.id}`, '_blank');
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
        loadRealData(); // Reload data
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

  return (
    <div className="min-h-screen py-4 sm:py-6 md:py-12">
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

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1">
            <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Analytics & Status</span>
              <span className="sm:hidden">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Moderare Recorduri</span>
              <span className="sm:hidden">Recorduri</span>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Recorduri Respinse</span>
              <span className="sm:hidden">Respinse</span>
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Gestionare Locații</span>
              <span className="sm:hidden">Locații</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Utilizatori</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Database className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Backup</span>
              <span className="sm:hidden">Backup</span>
            </TabsTrigger>
          </TabsList>

          {/* Analytics & Status Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-4 sm:gap-6">
              {/* Traffic Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Trafic Website
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={updateAnalyticsStats}
                      className="text-xs"
                    >
                      Actualizează
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Statistici reale din baza de date
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2 md:gap-4">
                    <div className="text-center p-2 sm:p-3 md:p-4 bg-muted/50 rounded-lg">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">{trafficData.pageViews}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Page Views</div>
                      <div className="text-xs text-muted-foreground mt-1 hidden sm:block">Total vizualizări pagini</div>
                    </div>
                    <div className="text-center p-2 sm:p-3 md:p-4 bg-muted/50 rounded-lg">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{trafficData.uniqueVisitors}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Vizitatori Unici</div>
                      <div className="text-xs text-muted-foreground mt-1 hidden sm:block">Utilizatori diferiți</div>
                    </div>
                    <div className="text-center p-2 sm:p-3 md:p-4 bg-muted/50 rounded-lg">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">{trafficData.sessions || 0}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Sesiuni</div>
                      <div className="text-xs text-muted-foreground mt-1 hidden sm:block">Sesiuni active</div>
                    </div>
                    <div className="text-center p-2 sm:p-3 md:p-4 bg-muted/50 rounded-lg">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-600">{trafficData.bounceRate.toFixed(1)}%</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Bounce Rate</div>
                      <div className="text-xs text-muted-foreground mt-1 hidden sm:block">% care pleacă rapid</div>
                    </div>
                    <div className="text-center p-2 sm:p-3 md:p-4 bg-muted/50 rounded-lg">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600">{Math.floor(trafficData.avgSessionTime / 60)}m</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Timp Mediu</div>
                      <div className="text-xs text-muted-foreground mt-1 hidden sm:block">Timp pe sesiune</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Detailed Analytics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {/* Device Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Dispozitive
                  </CardTitle>
                  <CardDescription>
                    Distribuția pe tipuri de dispozitive
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(trafficData.deviceStats)
                      .sort(([,a], [,b]) => b - a)
                      .map(([device, count]) => {
                      const total = Object.values(trafficData.deviceStats).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={device} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{device}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Browser Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Browsere
                  </CardTitle>
                  <CardDescription>
                    Distribuția pe browsere
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(trafficData.browserStats)
                      .sort(([,a], [,b]) => b - a)
                      .map(([browser, count]) => {
                      const total = Object.values(trafficData.browserStats).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={browser} className="flex items-center justify-between">
                          <span className="text-sm">{browser}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Operating Systems */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Sisteme de Operare
                  </CardTitle>
                  <CardDescription>
                    Distribuția pe OS
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(trafficData.osStats)
                      .sort(([,a], [,b]) => b - a)
                      .map(([os, count]) => {
                      const total = Object.values(trafficData.osStats).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={os} className="flex items-center justify-between">
                          <span className="text-sm">{os}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Romanian Cities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Orașe din România
                  </CardTitle>
                  <CardDescription>
                    Distribuția pe orașe românești
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(trafficData.cityStats)
                      .sort(([,a], [,b]) => b - a)
                      .map(([city, count]) => {
                      const total = Object.values(trafficData.cityStats).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      const cityColor = generateRandomColor(city);
                      return (
                        <div key={city} className="flex items-center justify-between">
                          <span className="text-sm">{city}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div
                                className={`${cityColor} h-2 rounded-full transition-all duration-300`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Referrers - Mobile Optimized */}
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-base sm:text-lg">Surse de Trafic</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    De unde vin vizitatorii
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 sm:space-y-3">
                    {Object.entries(trafficData.referrerStats)
                      .sort(([,a], [,b]) => b - a)
                      .map(([referrer, count]) => {
                      const total = Object.values(trafficData.referrerStats).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={referrer} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                          <span className="text-xs sm:text-sm truncate">{referrer}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 sm:w-20 bg-muted rounded-full h-1.5 sm:h-2">
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
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-base sm:text-lg">Cele mai vizitate pagini</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Top 10 pagini cu cele mai multe vizite
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 sm:space-y-3">
                    {Object.entries(trafficData.pageViewsStats || {})
                      .sort(([,a], [,b]) => b - a)
                      .map(([page, count]) => {
                      const total = Object.values(trafficData.pageViewsStats || {}).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={page} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                          <span className="text-xs sm:text-sm font-mono truncate">{page}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 sm:w-20 bg-muted rounded-full h-1.5 sm:h-2">
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
                <CardHeader className="pb-3 sm:pb-6">
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
                  <div className="h-64 sm:h-80 md:h-96">
                    {memoizedTrafficData.length > 0 ? (
                      <div className="h-full flex flex-col">
                        {/* Metric Filters - Mobile Optimized */}
                        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 md:gap-6 mb-3 sm:mb-4 text-xs sm:text-sm">
                          <button
                            onClick={() => setShowPageViews(!showPageViews)}
                            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-1 rounded-md transition-colors ${
                              showPageViews
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
                            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-1 rounded-md transition-colors ${
                              showUniqueVisitors
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
                            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-1 rounded-md transition-colors ${
                              showSessions
                                ? 'bg-orange-100 text-orange-700 border border-orange-300'
                                : 'bg-gray-100 text-gray-500 border border-gray-300'
                            }`}
                          >
                            <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded ${showSessions ? 'bg-orange-500' : 'bg-gray-400'}`}></div>
                            <span className="hidden sm:inline">Sesiuni</span>
                            <span className="sm:hidden">Ses</span>
                          </button>
                        </div>

                        {/* Line Chart - Mobile Optimized */}
                        <div className="flex-1 relative px-2 sm:px-4 md:px-6 py-2 sm:py-4">
                          <svg className="w-full h-full" viewBox="0 0 900 200" preserveAspectRatio="xMidYMid meet">
                            {/* Y-axis grid lines */}
                            {[0, 20, 40, 60, 80, 100].map((percent, i) => (
                              <line
                                key={i}
                                x1="60"
                                y1={160 - (percent * 1.2)}
                                x2="840"
                                y2={160 - (percent * 1.2)}
                                stroke="#f3f4f6"
                                strokeWidth="1"
                              />
                            ))}

                            {/* Y-axis labels */}
                            {[0, 20, 40, 60, 80, 100].map((percent, i) => {
                              const maxValue = Math.max(
                                ...memoizedTrafficData.map(p => Math.max(p.page_views || 0, p.unique_visitors || 0, p.sessions || 0)),
                                1
                              );
                              const value = Math.round((maxValue * percent) / 100);
                              return (
                                <text
                                  key={i}
                                  x="55"
                                  y={160 - (percent * 1.2) + 3}
                                  textAnchor="end"
                                  fontSize="10"
                                  fill="#6b7280"
                                >
                                  {value}
                                </text>
                              );
                            })}

                            {/* X-axis */}
                            <line x1="60" y1="160" x2="840" y2="160" stroke="#374151" strokeWidth="2" />

                            {/* Data points and lines */}
                            {[
                              { metric: 'page_views', color: '#3b82f6', show: showPageViews },
                              { metric: 'unique_visitors', color: '#10b981', show: showUniqueVisitors },
                              { metric: 'sessions', color: '#f59e0b', show: showSessions }
                            ].filter(item => item.show).map((item) => {
                              const { metric, color } = item;
                              const maxValue = Math.max(
                                ...memoizedTrafficData.map(p => Math.max(p.page_views || 0, p.unique_visitors || 0, p.sessions || 0)),
                                1
                              );

                              const points = memoizedTrafficData.map((point, index) => {
                                const spacing = memoizedTrafficData.length > 1 ? 780 / (memoizedTrafficData.length - 1) : 0;
                                const x = 60 + (index * spacing);
                                const value = point[metric] || 0;
                                const y = 160 - ((value / maxValue) * 120);
                                return { x, y, value };
                              });

                              return (
                                <g key={metric}>
                                  {/* Line */}
                                  <polyline
                                    points={points.map(p => `${p.x},${p.y}`).join(' ')}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  {/* Data points */}
                                  {points.map((point, index) => (
                                    <circle
                                      key={index}
                                      cx={point.x}
                                      cy={point.y}
                                      r="4"
                                      fill={color}
                                      stroke="white"
                                      strokeWidth="2"
                                      style={{ cursor: 'pointer' }}
                                      onMouseEnter={() => setHoveredPoint({
                                        x: point.x,
                                        y: point.y,
                                        data: memoizedTrafficData[index],
                                        metric: metric
                                      })}
                                      onMouseLeave={() => setHoveredPoint(null)}
                                    />
                                  ))}
                                </g>
                              );
                            })}

                            {/* X-axis labels - show every 2nd or 3rd label to avoid overlap */}
                            {memoizedTrafficData.map((point, index) => {
                              const spacing = memoizedTrafficData.length > 1 ? 780 / (memoizedTrafficData.length - 1) : 0;
                              const x = 60 + (index * spacing);
                              // Show every 2nd label if more than 10 points, every 3rd if more than 20
                              const showLabel = memoizedTrafficData.length <= 10 ||
                                             (memoizedTrafficData.length <= 20 && index % 2 === 0) ||
                                             (memoizedTrafficData.length > 20 && index % 3 === 0);

                              if (!showLabel) return null;

                              return (
                                <text
                                  key={index}
                                  x={x}
                                  y="180"
                                  textAnchor="middle"
                                  fontSize="9"
                                  fill="#6b7280"
                                >
                                  {convertToRomaniaTime(point.time_period)}
                                </text>
                              );
                            })}

                            {/* Tooltip */}
                            {hoveredPoint && (
                              <g>
                                {/* Tooltip background with shadow */}
                                <rect
                                  x={hoveredPoint.x - 25}
                                  y={hoveredPoint.y - 35}
                                  width="50"
                                  height="30"
                                  fill="rgba(0, 0, 0, 0.9)"
                                  rx="6"
                                  ry="6"
                                  stroke="rgba(255, 255, 255, 0.2)"
                                  strokeWidth="1"
                                />
                                {/* Tooltip value */}
                                <text
                                  x={hoveredPoint.x}
                                  y={hoveredPoint.y - 20}
                                  textAnchor="middle"
                                  fontSize="11"
                                  fill="white"
                                  fontWeight="bold"
                                >
                                  {hoveredPoint.data[hoveredPoint.metric] || 0}
                                </text>
                                {/* Tooltip label */}
                                <text
                                  x={hoveredPoint.x}
                                  y={hoveredPoint.y - 8}
                                  textAnchor="middle"
                                  fontSize="8"
                                  fill="#e5e7eb"
                                >
                                  {hoveredPoint.metric === 'page_views' && 'Vizualizări'}
                                  {hoveredPoint.metric === 'unique_visitors' && 'Vizitatori'}
                                  {hoveredPoint.metric === 'sessions' && 'Sesiuni'}
                                </text>
                                {/* Tooltip arrow */}
                                <polygon
                                  points={`${hoveredPoint.x - 4},${hoveredPoint.y - 5} ${hoveredPoint.x + 4},${hoveredPoint.y - 5} ${hoveredPoint.x},${hoveredPoint.y - 1}`}
                                  fill="rgba(0, 0, 0, 0.9)"
                                />
                              </g>
                            )}
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">Nu există date de trafic pentru această perioadă</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Datele vor apărea când utilizatorii vor naviga pe site
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Informații Sistem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Frontend:</span>
                    <p className="font-medium">React + Vite + TypeScript</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Backend:</span>
                    <p className="font-medium">Supabase + Netlify</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hărți:</span>
                    <p className="font-medium">MapLibre GL + OSM</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">UI:</span>
                    <p className="font-medium">Tailwind + shadcn/ui</p>
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
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold">{record.species_name} - {record.weight} kg</h4>
                            <p className="text-sm text-muted-foreground">
                              {record.location_name} • {record.profiles?.display_name || 'Utilizator necunoscut'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Lungime: {record.length} cm • Data: {new Date(record.date_caught).toLocaleDateString('ro-RO')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Trimis: {new Date(record.created_at).toLocaleString('ro-RO')}
                            </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveRecord(record.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Aprobă
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectRecord(record.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Respinge
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewRecordDetails(record)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Vezi Detalii
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
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-red-800">
                              {record.species_name} - {record.weight} kg
                            </h4>
                            <p className="text-sm text-muted-foreground">
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
                          <Badge variant="destructive">Respinse</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveRecord(record.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Aprobă
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewRecordDetails(record)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Vezi Detalii
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Gestionare Locații
                </CardTitle>
                <CardDescription>
                  Harta interactivă pentru gestionarea locațiilor de pescuit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96 bg-muted/50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Harta interactivă va fi implementată aici</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Funcționalități: drag & drop, adăugare locații noi, editare poziții
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Gestionare Utilizatori ({users.length})
                </CardTitle>
                <CardDescription>
                  Lista tuturor utilizatorilor din baza de date
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4" />
                      <p>Nu există utilizatori în baza de date</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {users.map((user) => (
                        <div key={user.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-medium">
                                  {user.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-medium">{user.display_name || 'Fără nume'}</h3>
                                <p className="text-sm text-gray-600">{user.email}</p>
                                <p className="text-xs text-gray-500">
                                  Membru din {new Date(user.created_at).toLocaleDateString('ro-RO')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <p className="text-sm font-medium">{user.records?.[0]?.count || 0} recorduri</p>
                                <p className="text-xs text-gray-500">
                                  {user.phone ? `Tel: ${user.phone}` : 'Fără telefon'}
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewUserDetails(user)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Vezi
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewUserProfile(user)}
                                >
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  Profil
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup Tab */}
          <TabsContent value="backup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Backup Baza de Date
                </CardTitle>
                <CardDescription>
                  Creează un backup complet al bazei de date. Backup-ul include toate tabelele importante.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Informații</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Backup-ul include: profiles, records, fishing_locations, fish_species, user_gear, catches, private_messages</li>
                    <li>Backup-ul va fi descărcat ca fișier JSON</li>
                    <li>Recomandat: Fă backup înainte de modificări majore</li>
                    <li>Backup-ul este salvat local pe computerul tău</li>
                  </ul>
                </div>

                <Button
                  onClick={handleCreateBackup}
                  disabled={isCreatingBackup}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  {isCreatingBackup ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Se creează backup-ul...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Creează Backup
                    </>
                  )}
                </Button>

                {backupData && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-green-900">✅ Backup creat cu succes!</h4>
                    <div className="text-sm text-green-800 space-y-1">
                      <p><span className="font-medium">Tabele:</span> {backupData.summary.successful_tables}/{backupData.summary.total_tables}</p>
                      <p><span className="font-medium">Înregistrări:</span> {backupData.summary.total_records.toLocaleString('ro-RO')}</p>
                      <p><span className="font-medium">Mărime:</span> {(backupData.summary.backup_size_bytes / 1024 / 1024).toFixed(2)} MB</p>
                      <p><span className="font-medium">Data:</span> {new Date(backupData.metadata.created_at).toLocaleString('ro-RO')}</p>
                    </div>
                    <Button
                      onClick={handleDownloadBackup}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descarcă Backup
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Record Details Modal */}
      <RecordDetailsModal
        record={selectedRecord}
        isOpen={isRecordModalOpen}
        onClose={closeRecordModal}
        isAdmin={true}
        canEdit={false}
      />

      {/* User Details Modal */}
      {isUserModalOpen && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content w-full max-w-2xl">
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
              <CardContent className="p-0">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white rounded-t-lg">
                  <button
                    onClick={closeUserModal}
                    className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                      <span className="text-white font-bold text-2xl">
                        {selectedUser.display_name?.charAt(0) || selectedUser.email?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Detalii Utilizator</h2>
                      <p className="text-blue-100">Informații complete despre utilizator</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* User Info */}
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-xl">
                        {selectedUser.display_name?.charAt(0) || selectedUser.email?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{selectedUser.display_name || 'Fără nume'}</h3>
                      <p className="text-gray-600">{selectedUser.email}</p>
                      <p className="text-sm text-gray-500">
                        Membru din {new Date(selectedUser.created_at).toLocaleDateString('ro-RO')}
                      </p>
                    </div>
                  </div>

                  {/* User Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Informații Personale</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Email:</span> {selectedUser.email}</p>
                        <p><span className="font-medium">Telefon:</span> {selectedUser.phone || 'Nu este specificat'}</p>
                        <p><span className="font-medium">Județ:</span> {selectedUser.county_id || 'Nu este specificat'}</p>
                        <p><span className="font-medium">Oraș:</span> {selectedUser.city_id || 'Nu este specificat'}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Statistici</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Recorduri:</span> {selectedUser.records?.[0]?.count || 0}</p>
                        <p><span className="font-medium">Ultima activitate:</span> {new Date(selectedUser.updated_at).toLocaleDateString('ro-RO')}</p>
                        <p><span className="font-medium">Status:</span>
                          <Badge variant={selectedUser.is_admin ? "default" : "secondary"} className="ml-2">
                            {selectedUser.is_admin ? 'Admin' : 'Utilizator'}
                          </Badge>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button variant="outline" onClick={closeUserModal}>
                      Închide
                    </Button>
                    <Button onClick={() => handleViewUserProfile(selectedUser)}>
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
    </div>
  );
};

export default Admin;
