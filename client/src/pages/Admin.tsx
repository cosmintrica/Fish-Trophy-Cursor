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
  Server,
  ExternalLink,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const Admin: React.FC = () => {
  const [trafficData, setTrafficData] = useState({
    pageViews: 0,
    uniqueVisitors: 0,
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
    referrerStats: {} as Record<string, number>
  });

  const [buildStatus] = useState({
    status: 'success',
    lastDeploy: new Date().toISOString(),
    buildTime: '2m 34s',
    commitHash: 'abc1234'
  });

  const [pendingRecords, setPendingRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load real data from database
  useEffect(() => {
    loadRealData();
  }, []);

  const loadRealData = async () => {
    setIsLoading(true);
    try {
      // Load pending records
      const { data: records, error: recordsError } = await supabase
        .from('records')
        .select(`
          id,
          species_name,
          weight,
          length,
          location_name,
          date_caught,
          time_caught,
          status,
          created_at,
          profiles!inner(display_name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (recordsError) {
        console.error('Error loading records:', recordsError);
      } else {
        setPendingRecords(records || []);
      }

      // Load detailed analytics data
      const [analyticsResponse, demographicsResponse, timelineResponse, referrersResponse] = await Promise.all([
        fetch('/api/analytics-detailed/overview'),
        fetch('/api/analytics-detailed/demographics'),
        fetch('/api/analytics-detailed/timeline?period=daily&limit=30'),
        fetch('/api/analytics-detailed/referrers')
      ]);

      const [analyticsResult, demographicsResult, timelineResult, referrersResult] = await Promise.all([
        analyticsResponse.json(),
        demographicsResponse.json(),
        timelineResponse.json(),
        referrersResponse.json()
      ]);

      if (analyticsResult.success) {
        const data = analyticsResult.data;
        setTrafficData(prev => ({
          ...prev,
          uniqueVisitors: data.visitors.total,
          pageViews: data.pageViews.total,
          bounceRate: data.bounceRate.value,
          avgSessionTime: data.avgSessionTime.value,
          dailyStats: [{ 
            date: new Date().toISOString().split('T')[0], 
            users: data.visitors.today,
            records: data.records.today,
            pageViews: data.pageViews.today
          }],
          monthlyStats: [{ 
            month: new Date().toISOString().split('T')[0], 
            users: data.visitors.thisMonth,
            records: data.records.total,
            pageViews: Math.floor(data.pageViews.total * 0.1)
          }],
          yearlyStats: [{ 
            year: new Date().getFullYear().toString(), 
            users: data.visitors.thisYear,
            records: data.records.total,
            pageViews: data.pageViews.total
          }],
          // Add new detailed data
          deviceStats: demographicsResult.success ? demographicsResult.data.devices : {},
          browserStats: demographicsResult.success ? demographicsResult.data.browsers : {},
          osStats: demographicsResult.success ? demographicsResult.data.operatingSystems : {},
          countryStats: demographicsResult.success ? demographicsResult.data.countries : {},
          referrerStats: referrersResult.success ? referrersResult.data : {},
          timelineData: timelineResult.success ? timelineResult.data : []
        }));
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRecord = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('records')
        .update({ 
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', recordId);

      if (error) {
        console.error('Error approving record:', error);
        return;
      }

      setPendingRecords(prev => prev.filter(record => record.id !== recordId));
    } catch (error) {
      console.error('Error approving record:', error);
    }
  };

  const handleRejectRecord = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('records')
        .update({ 
          status: 'rejected',
          verified_at: new Date().toISOString(),
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          rejection_reason: 'Nu îndeplinește criteriile'
        })
        .eq('id', recordId);

      if (error) {
        console.error('Error rejecting record:', error);
        return;
      }

      setPendingRecords(prev => prev.filter(record => record.id !== recordId));
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics & Status
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Moderare Recorduri
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
            <div className="grid md:grid-cols-2 gap-6">
              {/* Traffic Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Trafic Website
                  </CardTitle>
                  <CardDescription>
                    Statistici în timp real
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{trafficData.pageViews}</div>
                      <div className="text-sm text-muted-foreground">Page Views</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{trafficData.uniqueVisitors}</div>
                      <div className="text-sm text-muted-foreground">Vizitatori Unici</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{trafficData.bounceRate.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Bounce Rate</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{Math.floor(trafficData.avgSessionTime / 60)}m</div>
                      <div className="text-sm text-muted-foreground">Timp Mediu</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Build Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    Status Deployment
                  </CardTitle>
                  <CardDescription>
                    Informații despre build și deployment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Netlify Status:</span>
                    <a 
                      href="https://app.netlify.com/projects/fishtrophy/deploys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:opacity-80 transition-opacity"
                    >
                      <img 
                        src="https://api.netlify.com/api/v1/badges/f3766656-9e69-4a97-acff-952a4caecde3/deploy-status" 
                        alt="Netlify Status" 
                        className="h-6"
                      />
                    </a>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge variant={buildStatus.status === 'success' ? 'default' : 'destructive'}>
                        {buildStatus.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Ultimul Deploy:</span>
                      <span className="text-sm">{new Date(buildStatus.lastDeploy).toLocaleString('ro-RO')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Timp Build:</span>
                      <span className="text-sm">{buildStatus.buildTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Commit:</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{buildStatus.commitHash}</code>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>• Supabase conectat automat</p>
                      <p>• Variabile de mediu configurate</p>
                      <p>• Build automat la push pe GitHub</p>
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

              {/* Countries */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Țări
                  </CardTitle>
                  <CardDescription>
                    Distribuția geografică
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(trafficData.countryStats).map(([country, count]) => {
                      const total = Object.values(trafficData.countryStats).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={country} className="flex items-center justify-between">
                          <span className="text-sm">{country}</span>
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

              {/* Timeline Chart */}
              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Evoluția Traficului
                  </CardTitle>
                  <CardDescription>
                    Ultimele 30 de zile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Graficul va fi implementat în curând</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {trafficData.timelineData.length} puncte de date disponibile
                      </p>
                    </div>
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
                          <Button size="sm" variant="ghost">
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
                  Gestionare Utilizatori
                </CardTitle>
                <CardDescription>
                  Administrarea conturilor utilizatorilor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4" />
                  <p>Panoul de gestionare utilizatori va fi implementat aici</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
