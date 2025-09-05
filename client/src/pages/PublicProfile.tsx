import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Scale, Ruler, Calendar, Trophy, Wrench, Globe } from 'lucide-react';
import RecordDetailsModal from '@/components/RecordDetailsModal';

interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  photo_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  created_at: string;
}

interface UserRecord {
  id: string;
  user_id: string;
  species_id: string;
  location_id: string;
  weight: number;
  length_cm: number;
  captured_at: string;
  notes?: string;
  photo_url?: string;
  video_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  fish_species?: {
    name: string;
  };
  fishing_locations?: {
    name: string;
    type: string;
    county: string;
  };
}

interface UserGear {
  id: string;
  name: string;
  brand: string;
  model: string;
  quantity: number;
  category: string;
  condition: string;
  notes?: string;
}

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRecords, setUserRecords] = useState<UserRecord[]>([]);
  const [userGear, setUserGear] = useState<UserGear[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<UserRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (userId) {
      loadUserData();
    }
  }, [userId]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profileData);

      // Load user records
      const { data: recordsData, error: recordsError } = await supabase
        .from('records')
        .select(`
          *,
          fish_species:species_id(name),
          fishing_locations:location_id(name, type, county)
        `)
        .eq('user_id', userId)
        .in('status', ['verified', 'pending'])
        .order('weight', { ascending: false });

      if (recordsError) throw recordsError;
      setUserRecords(recordsData || []);

      // Load user gear
      const { data: gearData, error: gearError } = await supabase
        .from('user_gear')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (gearError) throw gearError;
      setUserGear(gearData || []);

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openRecordModal = (record: UserRecord) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const closeRecordModal = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800">Verificat</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">În așteptare</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Respins</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="bg-white rounded-lg p-6 mb-6">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Profilul nu a fost găsit</h1>
            <p className="text-gray-600">Utilizatorul cu acest ID nu există sau profilul este privat.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start space-x-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={userProfile.photo_url} />
                <AvatarFallback className="text-2xl">
                  {userProfile.display_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {userProfile.display_name || 'Utilizator'}
                </h1>
                
                {userProfile.bio && (
                  <p className="text-gray-600 mb-4">{userProfile.bio}</p>
                )}
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  {userProfile.location && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {userProfile.location}
                    </div>
                  )}
                  
                  {userProfile.website && (
                    <div className="flex items-center">
                      <Globe className="w-4 h-4 mr-1" />
                      <a 
                        href={userProfile.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Website
                      </a>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Membru din {new Date(userProfile.created_at).toLocaleDateString('ro-RO')}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Records Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              Recorduri de pescuit ({userRecords.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userRecords.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Acest utilizator nu are încă recorduri de pescuit.
              </p>
            ) : (
              <div className="space-y-4">
                {userRecords.map((record) => (
                  <div 
                    key={record.id} 
                    className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => openRecordModal(record)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{record.fish_species?.name}</h3>
                          {getStatusBadge(record.status)}
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <MapPin className="w-4 h-4 mr-1" />
                          {record.fishing_locations?.name}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center">
                            <Scale className="w-4 h-4 mr-1" />
                            {record.weight} kg
                          </div>
                          <div className="flex items-center">
                            <Ruler className="w-4 h-4 mr-1" />
                            {record.length_cm} cm
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(record.captured_at).toLocaleDateString('ro-RO')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {record.weight} kg
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.fishing_locations?.type}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gear Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wrench className="w-5 h-5 mr-2" />
              Echipamente ({userGear.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userGear.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Acest utilizator nu a adăugat încă echipamente.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userGear.map((gear) => (
                  <div key={gear.id} className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-2">{gear.name}</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>Brand:</strong> {gear.brand}</div>
                      <div><strong>Model:</strong> {gear.model}</div>
                      <div><strong>Cantitate:</strong> {gear.quantity}</div>
                      <div><strong>Categorie:</strong> {gear.category}</div>
                      <div><strong>Stare:</strong> {gear.condition}</div>
                      {gear.notes && (
                        <div><strong>Note:</strong> {gear.notes}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Record Details Modal */}
        <RecordDetailsModal
          record={selectedRecord}
          isOpen={isModalOpen}
          onClose={closeRecordModal}
          isAdmin={false}
          canEdit={false}
        />
      </div>
    </div>
  );
};

export default PublicProfile;
