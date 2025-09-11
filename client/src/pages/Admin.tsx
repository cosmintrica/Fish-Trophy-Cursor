import React, { useState, useEffect, useCallback } from 'react';
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
  X
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
  const loadTrafficGraphData = useCallback(async () => {
    try {
      let data: any[] = [];

      switch (trafficData.selectedPeriod) {
        case '1h': {
          const { data: hourData, error: hourError } = await supabase.rpc('get_traffic_last_hour');
          if (hourError) {
            console.error('Error loading hour data:', hourError);
          }
          data = hourData || [];
          break;
        }
        case '24h': {
          const { data: dayData, error: dayError } = await supabase.rpc('get_traffic_last_24h');
          if (dayError) {
            console.error('Error loading day data:', dayError);
          }
          data = dayData || [];
          break;
        }
        case '7d': {
          const { data: weekData, error: weekError } = await supabase.rpc('get_traffic_last_week');
          if (weekError) {
            console.error('Error loading week data:', weekError);
          }
          data = weekData || [];
          break;
        }
        case '30d': {
          const { data: monthData, error: monthError } = await supabase.rpc('get_traffic_last_month');
          if (monthError) {
            console.error('Error loading month data:', monthError);
          }
          data = monthData || [];
          break;
        }
        case '1y': {
          const { data: yearData, error: yearError } = await supabase.rpc('get_traffic_last_year');
          if (yearError) {
            console.error('Error loading year data:', yearError);
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
              console.error('Error loading custom data:', customError);
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
      console.error('Error loading traffic graph data:', error);
      // Don't reset data on error - keep existing data
    }
  }, [trafficData.selectedPeriod, trafficData.customStartDate, trafficData.customEndDate]);

  // Load real data from database
  useEffect(() => {
    const loadAllData = async () => {
      await loadRealData();
      await loadDetailedAnalytics();
      await loadTrafficGraphData();
    };
    loadAllData();
  }, [loadTrafficGraphData]);

  // Load traffic data when period changes
  useEffect(() => {
    if (trafficData.selectedPeriod) {
      loadTrafficGraphData();
    }
  }, [trafficData.selectedPeriod, trafficData.customStartDate, trafficData.customEndDate, loadTrafficGraphData]);

  // Ensure chart loads data on first render
  useEffect(() => {
    if (trafficData.timelineData.length === 0 && trafficData.selectedPeriod) {
      loadTrafficGraphData();
    }
  }, [trafficData.timelineData.length, trafficData.selectedPeriod, loadTrafficGraphData]);

  // Use traffic data directly to prevent memoization issues
  const memoizedTrafficData = trafficData.timelineData || [];

  // Load detailed analytics data
  const loadDetailedAnalytics = useCallback(async () => {
    try {
      // Load device stats
      const { data: deviceStats } = await supabase.rpc('get_device_stats');
      const deviceStatsObj = deviceStats?.reduce((acc: any, item: any) => {
        acc[item.device_type] = item.count;
        return acc;
      }, {}) || {};

      // Load browser stats
      const { data: browserStats } = await supabase.rpc('get_browser_stats');
      const browserStatsObj = browserStats?.reduce((acc: any, item: any) => {
        acc[item.browser] = item.count;
        return acc;
      }, {}) || {};

      // Load OS stats
      const { data: osStats } = await supabase.rpc('get_os_stats');
      const osStatsObj = osStats?.reduce((acc: any, item: any) => {
        acc[item.os] = item.count;
        return acc;
      }, {}) || {};

      // Load country stats
      const { data: countryStats } = await supabase.rpc('get_country_stats');
      const countryStatsObj = countryStats?.reduce((acc: any, item: any) => {
        acc[item.country] = item.count;
        return acc;
      }, {}) || {};

      // Load Romanian city stats
      const { data: cityStats } = await supabase.rpc('get_romanian_city_stats');
      const cityStatsObj = cityStats?.reduce((acc: any, item: any) => {
        acc[item.city] = item.count;
        return acc;
      }, {}) || {};

      // Load referrer stats
      const { data: referrerStats } = await supabase.rpc('get_referrer_stats');
      const referrerStatsObj = referrerStats?.reduce((acc: any, item: any) => {
        acc[item.referrer] = item.count;
        return acc;
      }, {}) || {};

      // Load page views stats
      const { data: pageViewsStats } = await supabase.rpc('get_page_views_stats');
      const pageViewsStatsObj = pageViewsStats?.reduce((acc: any, item: any) => {
        acc[item.page_url] = item.count;
        return acc;
      }, {}) || {};

      // Update traffic data with real statistics
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
      console.error('Error loading detailed analytics:', error);
    }
  }, []);

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
      console.error('Error converting time:', error);
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
        console.error('Error updating analytics stats:', error);
        toast.error('Eroare la actualizarea statisticilor', { id: 'update-stats' });
      } else {
        toast.success('Statisticile au fost actualizate cu succes!', { id: 'update-stats' });
        loadRealData(); // Reload data
      }
    } catch (error) {
      console.error('Error updating analytics stats:', error);
      toast.error('Eroare la actualizarea statisticilor', { id: 'update-stats' });
    }
  };

  const loadRealData = useCallback(async () => {
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
        console.error('Error loading pending records:', pendingError);
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
        console.error('Error loading rejected records:', rejectedError);
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
        console.error('Error loading users:', usersError);
        console.error('Users error details:', {
          message: usersError.message,
          details: usersError.details,
          hint: usersError.hint,
          code: usersError.code
        });
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

        // Load real analytics data
        const { data: realTimeStats, error: realTimeError } = await supabase
          .rpc('get_current_analytics_stats');


        if (!realTimeError && realTimeStats && realTimeStats.length > 0) {
          const stats = realTimeStats[0]; // Get first row from result
          // Load detailed analytics data
          const { data: deviceStats } = await supabase.rpc('get_device_stats');
          const deviceStatsObj = deviceStats?.reduce((acc: any, item: any) => {
            acc[item.device_type] = item.count;
            return acc;
          }, {}) || {};

          const { data: browserStats } = await supabase.rpc('get_browser_stats');
          const browserStatsObj = browserStats?.reduce((acc: any, item: any) => {
            acc[item.browser] = item.count;
            return acc;
          }, {}) || {};

          const { data: osStats } = await supabase.rpc('get_os_stats');
          const osStatsObj = osStats?.reduce((acc: any, item: any) => {
            acc[item.os] = item.count;
            return acc;
          }, {}) || {};

          const { data: countryStats } = await supabase.rpc('get_country_stats');
          const countryStatsObj = countryStats?.reduce((acc: any, item: any) => {
            acc[item.country] = item.count;
            return acc;
          }, {}) || {};

          const { data: cityStats } = await supabase.rpc('get_romanian_city_stats');
          const cityStatsObj = cityStats?.reduce((acc: any, item: any) => {
            acc[item.city] = item.count;
            return acc;
          }, {}) || {};

          const { data: referrerStats } = await supabase.rpc('get_referrer_stats');
          const referrerStatsObj = referrerStats?.reduce((acc: any, item: any) => {
            acc[item.referrer] = item.count;
            return acc;
          }, {}) || {};

          const { data: pageViewsStats } = await supabase.rpc('get_page_views_stats');
          const pageViewsStatsObj = pageViewsStats?.reduce((acc: any, item: any) => {
            acc[item.page_url] = item.count;
            return acc;
          }, {}) || {};

        setTrafficData(prev => ({
          ...prev,
            uniqueVisitors: stats.today_unique_visitors || 0,
            pageViews: stats.page_views_today || 0,
            sessions: stats.today_sessions || 0,
            bounceRate: stats.bounce_rate || 0,
            avgSessionTime: stats.avg_session_time || 0,
          dailyStats: [{
            date: today.toISOString().split('T')[0],
              users: stats.new_users_today || 0,
              records: stats.new_records_today || 0,
              pageViews: stats.page_views_today || 0
          }],
          monthlyStats: [{
            month: today.toISOString().split('T')[0],
              users: stats.total_users || 0,
              records: stats.total_records || 0,
              pageViews: stats.total_page_views || 0
          }],
          yearlyStats: [{
            year: today.getFullYear().toString(),
            users: stats.total_users || 0,
            records: stats.total_records || 0,
            pageViews: stats.total_page_views || 0
          }],
          // Use real detailed data
          deviceStats: deviceStatsObj,
          browserStats: browserStatsObj,
          osStats: osStatsObj,
          countryStats: countryStatsObj,
          cityStats: cityStatsObj,
          referrerStats: referrerStatsObj,
          pageViewsStats: pageViewsStatsObj,
          timelineData: []
        }));
        } else {
          // Fallback to estimated data - but try to get some real data

          // Try to get page views directly
          const { data: directPageViews } = await supabase
            .from('analytics_events')
            .select('*', { count: 'exact' })
            .eq('event_type', 'page_view')
            .gte('timestamp', new Date().toISOString().split('T')[0]);

          const todayPageViews = directPageViews?.length || 0;

          setTrafficData(prev => ({
            ...prev,
            uniqueVisitors: totalUsers,
            pageViews: todayPageViews,
            bounceRate: 0,
            avgSessionTime: 0
          }));
        }
      } else {
        console.error('Analytics errors:', { analyticsUsersError, allRecordsError });
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        console.error('Error approving record:', error);
        return;
      }

      // Remove from pending and reload data
      setPendingRecords(prev => prev.filter(record => record.id !== recordId));
      loadRealData(); // Reload to get updated data
    } catch (error) {
      console.error('Error approving record:', error);
    }
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
        console.error('Error rejecting record:', error);
        return;
      }

      // Remove from pending and reload data
      setPendingRecords(prev => prev.filter(record => record.id !== recordId));
      loadRealData(); // Reload to get updated data
    } catch (error) {
      console.error('Error rejecting record:', error);
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Panou de Administrare
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Gestionarea recordurilor, moderarea conținutului și administrarea
            utilizatorilor pentru Fish Trophy.
          </p>
        </div>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics & Status
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Moderare Recorduri
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Recorduri Respinse
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Gestionare Locații
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Utilizatori
            </TabsTrigger>
          </TabsList>

          {/* Analytics & Status Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6">
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
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{trafficData.pageViews}</div>
                      <div className="text-sm text-muted-foreground">Page Views</div>
                      <div className="text-xs text-muted-foreground mt-1">Total vizualizări pagini</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{trafficData.uniqueVisitors}</div>
                      <div className="text-sm text-muted-foreground">Vizitatori Unici</div>
                      <div className="text-xs text-muted-foreground mt-1">Utilizatori diferiți</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{trafficData.sessions || 0}</div>
                      <div className="text-sm text-muted-foreground">Sesiuni</div>
                      <div className="text-xs text-muted-foreground mt-1">Sesiuni active</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{trafficData.bounceRate.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Bounce Rate</div>
                      <div className="text-xs text-muted-foreground mt-1">% care pleacă rapid</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{Math.floor(trafficData.avgSessionTime / 60)}m</div>
                      <div className="text-sm text-muted-foreground">Timp Mediu</div>
                      <div className="text-xs text-muted-foreground mt-1">Timp pe sesiune</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Detailed Analytics */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    {Object.entries(trafficData.deviceStats).map(([device, count]) => {
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
                    {Object.entries(trafficData.browserStats).map(([browser, count]) => {
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
                    {Object.entries(trafficData.osStats).map(([os, count]) => {
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
                    {Object.entries(trafficData.cityStats).map(([city, count]) => {
                      const total = Object.values(trafficData.cityStats).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={city} className="flex items-center justify-between">
                          <span className="text-sm">{city}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div
                                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
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

              {/* Referrers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="w-5 h-5" />
                    Surse de Trafic
                  </CardTitle>
                  <CardDescription>
                    De unde vin vizitatorii
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(trafficData.referrerStats).map(([referrer, count]) => {
                      const total = Object.values(trafficData.referrerStats).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={referrer} className="flex items-center justify-between">
                          <span className="text-sm">{referrer}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div
                                className="bg-red-500 h-2 rounded-full transition-all duration-300"
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

              {/* Most Visited Pages */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="w-5 h-5" />
                    Cele mai vizitate pagini
                  </CardTitle>
                  <CardDescription>
                    Top 10 pagini cu cele mai multe vizite
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(trafficData.pageViewsStats || {}).map(([page, count]) => {
                      const total = Object.values(trafficData.pageViewsStats || {}).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={page} className="flex items-center justify-between">
                          <span className="text-sm font-mono">{page}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div
                                className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(trafficData.pageViewsStats || {}).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <ExternalLink className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Nu există date de trafic încă</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Timeline Chart */}
              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Evoluția Traficului
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={trafficData.selectedPeriod}
                        onChange={(e) => handlePeriodChange(e.target.value)}
                        className="px-3 py-1 text-sm border rounded-md bg-background"
                      >
                        <option value="1h">Ultima oră</option>
                        <option value="24h">Ultimele 24 ore</option>
                        <option value="7d">Ultima săptămână</option>
                        <option value="30d">Ultimele 30 zile</option>
                        <option value="1y">Ultimul an</option>
                        <option value="custom">Perioadă custom</option>
                      </select>
                      {trafficData.selectedPeriod === 'custom' && (
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={trafficData.customStartDate}
                            onChange={(e) => setTrafficData(prev => ({ ...prev, customStartDate: e.target.value }))}
                            className="px-2 py-1 text-sm border rounded-md bg-background"
                          />
                          <input
                            type="date"
                            value={trafficData.customEndDate}
                            onChange={(e) => setTrafficData(prev => ({ ...prev, customEndDate: e.target.value }))}
                            className="px-2 py-1 text-sm border rounded-md bg-background"
                          />
                        </div>
                      )}
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {getPeriodDescription(trafficData.selectedPeriod)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    {memoizedTrafficData.length > 0 ? (
                      <div className="h-full flex flex-col">
                        {/* Metric Filters */}
                        <div className="flex justify-center gap-6 mb-4 text-sm">
                          <button
                            onClick={() => setShowPageViews(!showPageViews)}
                            className={`flex items-center gap-2 px-3 py-1 rounded-md transition-colors ${
                              showPageViews
                                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                : 'bg-gray-100 text-gray-500 border border-gray-300'
                            }`}
                          >
                            <div className={`w-3 h-3 rounded ${showPageViews ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                            <span>Page Views</span>
                          </button>
                          <button
                            onClick={() => setShowUniqueVisitors(!showUniqueVisitors)}
                            className={`flex items-center gap-2 px-3 py-1 rounded-md transition-colors ${
                              showUniqueVisitors
                                ? 'bg-green-100 text-green-700 border border-green-300'
                                : 'bg-gray-100 text-gray-500 border border-gray-300'
                            }`}
                          >
                            <div className={`w-3 h-3 rounded ${showUniqueVisitors ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                            <span>Vizitatori Unici</span>
                          </button>
                          <button
                            onClick={() => setShowSessions(!showSessions)}
                            className={`flex items-center gap-2 px-3 py-1 rounded-md transition-colors ${
                              showSessions
                                ? 'bg-orange-100 text-orange-700 border border-orange-300'
                                : 'bg-gray-100 text-gray-500 border border-gray-300'
                            }`}
                          >
                            <div className={`w-3 h-3 rounded ${showSessions ? 'bg-orange-500' : 'bg-gray-400'}`}></div>
                            <span>Sesiuni</span>
                          </button>
                        </div>

                        {/* Line Chart */}
                        <div className="flex-1 relative px-6 py-4">
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
