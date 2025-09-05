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
  Server
} from 'lucide-react';

const Admin: React.FC = () => {
  const [trafficData, setTrafficData] = useState({
    pageViews: 0,
    uniqueVisitors: 0,
    bounceRate: 0,
    avgSessionTime: 0
  });

  const [buildStatus] = useState({
    status: 'success',
    lastDeploy: new Date().toISOString(),
    buildTime: '2m 34s',
    commitHash: 'abc1234'
  });

  const [pendingRecords, setPendingRecords] = useState([
    {
      id: '1',
      species: 'Crap',
      weight: '12.5 kg',
      location: 'Lacul Băneasa',
      angler: 'Ion Popescu',
      submittedAt: '2024-01-15T10:30:00Z',
      imageUrl: '/placeholder-fish.jpg'
    },
    {
      id: '2',
      species: 'Știucă',
      weight: '8.2 kg',
      location: 'Dunărea',
      angler: 'Maria Ionescu',
      submittedAt: '2024-01-15T09:15:00Z',
      imageUrl: '/placeholder-fish.jpg'
    }
  ]);

  // Simulate traffic data loading
  useEffect(() => {
    const interval = setInterval(() => {
      setTrafficData(prev => ({
        pageViews: prev.pageViews + Math.floor(Math.random() * 5),
        uniqueVisitors: prev.uniqueVisitors + Math.floor(Math.random() * 2),
        bounceRate: 35 + Math.random() * 10,
        avgSessionTime: 180 + Math.random() * 60
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleApproveRecord = (recordId: string) => {
    setPendingRecords(prev => prev.filter(record => record.id !== recordId));
  };

  const handleRejectRecord = (recordId: string) => {
    setPendingRecords(prev => prev.filter(record => record.id !== recordId));
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
                  {pendingRecords.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold">{record.species} - {record.weight}</h4>
                          <p className="text-sm text-muted-foreground">
                            {record.location} • {record.angler}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Trimis: {new Date(record.submittedAt).toLocaleString('ro-RO')}
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
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4 mr-1" />
                          Vezi Detalii
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {pendingRecords.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Nu există recorduri în așteptare
                    </div>
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
