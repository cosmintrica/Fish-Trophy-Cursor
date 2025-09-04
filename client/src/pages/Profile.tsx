import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseApi } from '@/services/supabase-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User,
  Trophy,
  Settings,
  Camera,
  Mail,
  Lock,
  Save,
  Edit,
  Calendar,
  MapPin,
  Scale,
  Ruler,
  Wrench
} from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase';
import SearchableSelect from '@/components/SearchableSelect';
import { ROMANIA_COUNTIES, searchCities, getCountyById } from '@/data/romania-locations';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Check if user is admin - use environment variable for security
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const isAdmin = user?.email === adminEmail;
  const [profileData, setProfileData] = useState({
    displayName: user?.user_metadata?.display_name || '',
    email: user?.email || '',
    phone: '',
    location: '',
    bio: 'Pescar pasionat din România!'
  });
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [emailData, setEmailData] = useState({
    newEmail: '',
    confirmEmail: ''
  });
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingEmailLoading, setIsChangingEmailLoading] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);

  // Mock data pentru recorduri - în viitor va veni din API
  const mockRecords = [
    {
      id: 1,
      species: 'Crap',
      weight: 8.5,
      length: 75,
      location: 'Lacul Snagov',
      date: '2024-01-15',
      status: 'verified',
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop&crop=center'
    },
    {
      id: 2,
      species: 'Șalău',
      weight: 2.3,
      length: 45,
      location: 'Dunărea',
      date: '2024-01-10',
      status: 'pending',
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop&crop=center'
    }
  ];

  // Show mock records only for admin
  const records = isAdmin ? mockRecords : [];

  // Încarcă datele profilului din Supabase
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user?.id) return;

      try {
        // Încearcă să încarce din tabela profiles
        const result = await supabaseApi.getProfile(user.id);

        if (result.success && result.data) {
          const location = result.data.location || user.user_metadata?.location || '';
          const { county, city } = parseLocation(location);
          
          setProfileData({
            displayName: result.data.displayName || user.user_metadata?.display_name || '',
            email: result.data.email || user.email || '',
            phone: result.data.phone || '',
            location: location,
            bio: result.data.bio || 'Pescar pasionat din România!'
          });
          setSelectedCounty(county);
          setSelectedCity(city);
        } else {
          // Dacă nu există în baza de date, folosește datele din user_metadata
          const location = user.user_metadata?.location || '';
          const { county, city } = parseLocation(location);
          
          setProfileData({
            displayName: user.user_metadata?.display_name || '',
            email: user.email || '',
            phone: '',
            location: location,
            bio: 'Pescar pasionat din România!'
          });
          setSelectedCounty(county);
          setSelectedCity(city);
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
        // Fallback la user_metadata dacă există o eroare
        const location = user.user_metadata?.location || '';
        const { county, city } = parseLocation(location);
        
        setProfileData({
          displayName: user.user_metadata?.display_name || '',
          email: user.email || '',
          phone: '',
          location: location,
          bio: 'Pescar pasionat din România!'
        });
        setSelectedCounty(county);
        setSelectedCity(city);
      }
    };

    const checkGoogleAuthStatus = async () => {
      if (!user?.id) return;
      
      try {
        // Check if user has Google provider - verifică mai multe surse
        const hasGoogleProvider = user.app_metadata?.provider === 'google' || 
                                 user.app_metadata?.providers?.includes('google') ||
                                 user.identities?.some((identity: { provider: string }) => identity.provider === 'google');
        
        setIsGoogleUser(hasGoogleProvider);
        setNeedsPassword(!user.app_metadata?.providers?.includes('email'));
        
        console.log('Google Auth Status:', {
          provider: user.app_metadata?.provider,
          providers: user.app_metadata?.providers,
          identities: user.identities,
          hasGoogleProvider,
          emailConfirmed: user.email_confirmed_at,
          userEmail: user.email
        });
      } catch (error) {
        console.error('Error checking Google Auth status:', error);
      }
    };

    loadProfileData();
    checkGoogleAuthStatus();
  }, [user]);

  const handleProfileUpdate = async () => {
    if (!user?.id) {
      toast.error('Utilizatorul nu este autentificat');
      return;
    }

    setIsUpdatingProfile(true);
    toast.loading('Se actualizează profilul...', { id: 'profile-update' });

    try {
      // Build location from selected county and city
      const location = buildLocation(selectedCounty, selectedCity);
      
      // Actualizează Supabase Auth cu toate datele
      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          display_name: profileData.displayName,
          phone: profileData.phone,
          location: location,
          bio: profileData.bio
        }
      });
      
      if (authError) {
        toast.error('Eroare la actualizarea profilului: ' + authError.message, { id: 'profile-update' });
        return;
      }

      // Actualizează și în tabela profiles din baza de date
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          display_name: profileData.displayName,
          phone: profileData.phone,
          location: location,
          bio: profileData.bio,
          updated_at: new Date().toISOString()
        });

      if (dbError) {
        console.error('Database update error:', dbError);
        // Încearcă să creeze profilul dacă nu există
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            display_name: profileData.displayName,
            phone: profileData.phone,
            location: location,
            bio: profileData.bio,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          toast.warning('Profilul a fost actualizat în autentificare, dar nu s-a putut salva în baza de date.', { id: 'profile-update' });
        } else {
          toast.success('✅ Profilul a fost actualizat cu succes!', { id: 'profile-update' });
        }
      } else {
        toast.success('✅ Profilul a fost actualizat cu succes!', { id: 'profile-update' });
      }
      
      // Update local state
      setProfileData(prev => ({ ...prev, location }));
      setIsEditing(false);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('❌ A apărut o eroare la actualizarea profilului', { id: 'profile-update' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleEmailChange = async () => {
    if (!user?.id) {
      toast.error('Utilizatorul nu este autentificat');
      return;
    }

    if (emailData.newEmail !== emailData.confirmEmail) {
      toast.error('Email-urile nu se potrivesc');
      return;
    }

    if (emailData.newEmail === user.email) {
      toast.error('Noul email trebuie să fie diferit de cel actual');
      return;
    }

    // Validare format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.newEmail)) {
      toast.error('Formatul email-ului nu este valid');
      return;
    }

    setIsChangingEmailLoading(true);
    toast.loading('Se schimbă email-ul...', { id: 'email-change' });

    try {
      const { error } = await supabase.auth.updateUser({
        email: emailData.newEmail
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Acest email este deja folosit de alt cont', { id: 'email-change' });
        } else if (error.message.includes('Invalid email')) {
          toast.error('Formatul email-ului nu este valid', { id: 'email-change' });
        } else {
          toast.error('Eroare la schimbarea email-ului: ' + error.message, { id: 'email-change' });
        }
      } else {
        // Actualizează state-ul local cu noul email
        setProfileData(prev => ({ ...prev, email: emailData.newEmail }));
        
        toast.success('✅ Email-ul a fost schimbat! Verifică-ți noul email pentru confirmare.', { id: 'email-change' });
        setIsChangingEmail(false);
        setEmailData({ newEmail: '', confirmEmail: '' });
      }
    } catch (error) {
      console.error('Error changing email:', error);
      toast.error('❌ A apărut o eroare la schimbarea email-ului', { id: 'email-change' });
    } finally {
      setIsChangingEmailLoading(false);
    }
  };

  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);

  // Helper function to parse location string into county and city
  const parseLocation = (location: string) => {
    if (!location) return { county: '', city: '' };
    
    const parts = location.split(', ');
    if (parts.length >= 2) {
      const city = parts[0].trim();
      const countyName = parts[1].trim();
      
      // Find county by name
      const county = ROMANIA_COUNTIES.find(c => c.name === countyName);
      return {
        county: county?.id || '',
        city: city
      };
    }
    
    return { county: '', city: '' };
  };

  // Helper function to build location string from county and city
  const buildLocation = (countyId: string, city: string) => {
    if (!countyId || !city) return '';
    const county = getCountyById(countyId);
    return county ? `${city}, ${county.name}` : '';
  };

  const handleSetPasswordForGoogle = async () => {
    if (!user?.id) {
      toast.error('Utilizatorul nu este autentificat');
      return;
    }

    // Clear previous errors
    setPasswordErrors({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });

    if (!passwordData.newPassword) {
      setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola nouă este obligatorie' }));
      toast.error('Parola nouă este obligatorie');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordErrors(prev => ({ ...prev, confirmPassword: 'Parolele nu se potrivesc' }));
      toast.error('Parolele nu se potrivesc');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola trebuie să aibă cel puțin 8 caractere' }));
      toast.error('Parola trebuie să aibă cel puțin 8 caractere');
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(passwordData.newPassword);
    const hasNumber = /[0-9]/.test(passwordData.newPassword);
    
    if (!hasLetter || !hasNumber) {
      setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola trebuie să conțină cel puțin o literă și o cifră' }));
      toast.error('Parola trebuie să conțină cel puțin o literă și o cifră');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        toast.error(error.message || 'Eroare la setarea parolei');
      } else {
        toast.success('Parola a fost setată cu succes!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setNeedsPassword(false);
      }
    } catch (error) {
      console.error('Error setting password:', error);
      toast.error('Eroare la setarea parolei');
    }
  };

  const handlePasswordChange = async () => {
    if (!user?.id) {
      toast.error('Utilizatorul nu este autentificat');
      return;
    }

    // Clear previous errors
    setPasswordErrors({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });

    if (!passwordData.currentPassword) {
      setPasswordErrors(prev => ({ ...prev, currentPassword: 'Parola actuală este obligatorie' }));
      toast.error('Parola actuală este obligatorie');
      return;
    }

    if (!passwordData.newPassword) {
      setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola nouă este obligatorie' }));
      toast.error('Parola nouă este obligatorie');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordErrors(prev => ({ ...prev, confirmPassword: 'Parolele nu se potrivesc' }));
      toast.error('Parolele nu se potrivesc');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola trebuie să aibă cel puțin 8 caractere' }));
      toast.error('Parola trebuie să aibă cel puțin 8 caractere');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola nouă trebuie să fie diferită de cea actuală' }));
      toast.error('Parola nouă trebuie să fie diferită de cea actuală');
      return;
    }

    try {
      // First, verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email || '',
        password: passwordData.currentPassword
      });

      if (signInError) {
        setPasswordErrors(prev => ({ ...prev, currentPassword: 'Parola actuală este incorectă' }));
        toast.error('Parola actuală este incorectă');
        return;
      }

      // If current password is correct, update to new password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        if (error.message.includes('Password should be at least')) {
          setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola trebuie să aibă cel puțin 6 caractere' }));
          toast.error('Parola trebuie să aibă cel puțin 6 caractere');
        } else {
          toast.error('Eroare la schimbarea parolei: ' + error.message);
        }
      } else {
        toast.success('Parola a fost actualizată cu succes!');
        setIsChangingPassword(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordErrors({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        // Note: Supabase automatically signs out the user after password change
        // No need to manually redirect
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('A apărut o eroare la schimbarea parolei');
    }
  };

  const handleSendEmailVerification = async () => {
    if (!user?.id) {
      toast.error('Utilizatorul nu este autentificat');
      return;
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email ?? ''
      });

      if (error) {
        toast.error(error.message || 'Eroare la trimiterea email-ului de verificare');
      } else {
        toast.success('Email de verificare trimis cu succes! Verifică-ți inbox-ul.');
      }
    } catch (error) {
      console.error('Error sending email verification:', error);
      toast.error('Eroare la trimiterea email-ului de verificare');
    }
  };



  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true);
    toast.loading('Se conectează cu Google...', { id: 'google-link' });

    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/profile`,
        },
      });
      
      if (error) {
        if (error.message.includes('already linked')) {
          toast.error('Contul Google este deja conectat la acest cont', { id: 'google-link' });
        } else if (error.message.includes('popup_closed_by_user')) {
          toast.error('Fereastra de autentificare a fost închisă', { id: 'google-link' });
        } else if (error.message.includes('popup_blocked')) {
          toast.error('Popup-ul a fost blocat. Permite popup-urile pentru acest site', { id: 'google-link' });
        } else {
          toast.error('Eroare la conectarea cu Google: ' + error.message, { id: 'google-link' });
        }
      } else {
        toast.success('✅ Redirecționare către Google...', { id: 'google-link' });
      }
    } catch (error) {
      console.error('Error linking Google:', error);
      toast.error('❌ A apărut o eroare la conectarea cu Google', { id: 'google-link' });
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) {
      toast.error('Fișierul nu a fost selectat sau utilizatorul nu este autentificat');
      return;
    }

    // Validare tip fișier
    if (!file.type.startsWith('image/')) {
      toast.error('Te rog selectează doar fișiere imagine (JPG, PNG, etc.)');
      return;
    }

    // Validare dimensiune (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imaginea este prea mare. Te rog selectează o imagine mai mică de 5MB');
      return;
    }

    try {
      toast.info('Se încarcă imaginea...');

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update user profile with new photo URL
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) {
        throw updateError;
      }

      toast.success('Imaginea de profil a fost actualizată cu succes!');

      // Actualizează UI-ul imediat
      window.location.reload();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Eroare la upload-ul imaginii. Te rog încearcă din nou.');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      verified: { label: 'Verificat', className: 'bg-green-100 text-green-800' },
      pending: { label: 'În așteptare', className: 'bg-yellow-100 text-yellow-800' },
      rejected: { label: 'Respins', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Trebuie să fii autentificat</h1>
          <p className="text-gray-600">Conectează-te pentru a-ți vedea profilul</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profilul meu</h1>
          <p className="text-gray-600">Gestionează-ți contul și recordurile</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar cu informații de bază */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <div className="relative mx-auto mb-4">
                  <Avatar className="w-24 h-24 mx-auto">
                    <AvatarImage src={user.user_metadata?.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">
                      {user.user_metadata?.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleProfileImageUpload}
                    />
                  </label>
                </div>
                <CardTitle className="text-xl">
                  {user.user_metadata?.display_name || 'Utilizator'}
                </CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Membru din {new Date(user.created_at || Date.now()).toLocaleDateString('ro-RO')}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Trophy className="w-4 h-4" />
                    <span>{records.length} recorduri</span>
                  </div>
                  <Button
                    onClick={logout}
                    variant="outline"
                    className="w-full"
                  >
                    Ieșire din cont
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conținut principal */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="records" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="records" className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4" />
                  <span>Recorduri</span>
                </TabsTrigger>
                <TabsTrigger value="gear" className="flex items-center space-x-2">
                  <Wrench className="w-4 h-4" />
                  <span>Echipamente</span>
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>Profil</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Setări</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab Recorduri */}
              <TabsContent value="records" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Recordurile mele</h2>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Trophy className="w-4 h-4 mr-2" />
                    Adaugă Record
                  </Button>
                </div>

                {records.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Nu ai încă recorduri</h3>
                      <p className="text-gray-600 mb-4">Începe să adaugi recordurile tale de pescuit!</p>
                      <Button>Adaugă primul record</Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {records.map((record) => (
                      <Card key={record.id} className="overflow-hidden">
                        <div className="aspect-video bg-gray-200 relative">
                          <img
                            src={record.image}
                            alt={record.species}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            {getStatusBadge(record.status)}
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg">{record.species}</h3>
                            <span className="text-sm text-gray-500">{record.date}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div className="flex items-center space-x-2">
                              <Scale className="w-4 h-4 text-blue-600" />
                              <span className="text-sm">
                                <span className="font-medium">{record.weight} kg</span>
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Ruler className="w-4 h-4 text-green-600" />
                              <span className="text-sm">
                                <span className="font-medium">{record.length} cm</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>{record.location}</span>
                          </div>

                          <div className="mt-3 flex space-x-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              Vezi detalii
                            </Button>
                            {record.status === 'pending' && (
                              <Button variant="outline" size="sm" className="flex-1">
                                Editează
                              </Button>
                            )}
                            {isAdmin && record.status === 'verified' && (
                              <Button variant="outline" size="sm" className="flex-1 text-orange-600 border-orange-300">
                                Editează (Admin)
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab Echipamente */}
              <TabsContent value="gear" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Echipamentele mele</h2>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Wrench className="w-4 h-4 mr-2" />
                    Adaugă Echipament
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Mock gear data - în viitor va veni din API */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Undiță Shimano</CardTitle>
                      <CardDescription>Undiță pentru pescuit la mare</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Tip:</span> Undiță
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Marca:</span> Shimano
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Model:</span> Exage 4000
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Preț:</span> 250 RON
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Momeală Berkley</CardTitle>
                      <CardDescription>Momeală artificială pentru crap</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Tip:</span> Momeală
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Marca:</span> Berkley
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Model:</span> PowerBait
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Preț:</span> 45 RON
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Scaun de pescuit</CardTitle>
                      <CardDescription>Scaun confortabil pentru sesiuni lungi</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Tip:</span> Accesoriu
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Marca:</span> Fox
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Model:</span> R-Series
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Preț:</span> 180 RON
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Nu ai adăugat încă echipamente?</p>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Wrench className="w-4 h-4 mr-2" />
                    Adaugă primul echipament
                  </Button>
                </div>
              </TabsContent>

              {/* Tab Profil */}
              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="w-5 h-5" />
                      <span>Informații personale</span>
                    </CardTitle>
                    <CardDescription>
                      Actualizează-ți informațiile personale și preferințele
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="displayName">Nume afișat</Label>
                        <Input
                          id="displayName"
                          value={profileData.displayName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileData({...profileData, displayName: e.target.value})}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={profileData.email}
                          disabled={true}
                          className="bg-gray-100 text-gray-500 cursor-not-allowed"
                          title="Email-ul poate fi schimbat doar din secțiunea Setări"
                        />
                        <p className="text-xs text-gray-500 mt-1">Email-ul poate fi schimbat doar din secțiunea Setări</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Telefon</Label>
                        <Input
                          id="phone"
                          value={profileData.phone}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileData({...profileData, phone: e.target.value})}
                          disabled={!isEditing}
                          placeholder="+40 7XX XXX XXX"
                        />
                      </div>
                      <div>
                        <Label>Locație</Label>
                        {isEditing ? (
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="county" className="text-sm font-medium text-gray-700">
                                Județ
                              </Label>
                              <SearchableSelect
                                options={ROMANIA_COUNTIES.map(county => ({
                                  value: county.id,
                                  label: county.name
                                }))}
                                value={selectedCounty}
                                onChange={(countyId) => {
                                  setSelectedCounty(countyId);
                                  setSelectedCity(''); // Reset city when county changes
                                }}
                                placeholder="Selectează județul"
                                searchPlaceholder="Caută județ..."
                              />
                            </div>
                            <div>
                              <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                                Oraș
                              </Label>
                              <SearchableSelect
                                options={selectedCounty 
                                  ? searchCities(selectedCounty, '').map(city => ({
                                      value: city,
                                      label: city
                                    }))
                                  : []
                                }
                                value={selectedCity}
                                onChange={setSelectedCity}
                                placeholder={selectedCounty ? "Selectează orașul" : "Selectează mai întâi județul"}
                                searchPlaceholder="Caută oraș..."
                                disabled={!selectedCounty}
                              />
                            </div>
                          </div>
                        ) : (
                          <Input
                            value={profileData.location}
                            disabled={true}
                            className="bg-gray-100 text-gray-500 cursor-not-allowed"
                            placeholder="Oraș, Județ"
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="bio">Despre mine</Label>
                      <textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProfileData({...profileData, bio: e.target.value})}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Spune-ne câteva cuvinte despre tine..."
                      />
                    </div>

                    <div className="flex space-x-2">
                      {isEditing ? (
                        <>
                          <Button 
                            onClick={handleProfileUpdate} 
                            disabled={isUpdatingProfile}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {isUpdatingProfile ? 'Se salvează...' : 'Salvează'}
                          </Button>
                          <Button variant="outline" onClick={() => setIsEditing(false)}>
                            Anulează
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                          <Edit className="w-4 h-4 mr-2" />
                          Editează profilul
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab Setări */}
              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Lock className="w-5 h-5" />
                      <span>Schimbă parola</span>
                    </CardTitle>
                    <CardDescription>
                      Actualizează-ți parola pentru a-ți păstra contul în siguranță
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isGoogleUser && needsPassword ? (
                      // Google Auth user needs to set password first
                      <>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <p className="text-yellow-800 font-medium">Cont Google Auth</p>
                          </div>
                          <p className="text-yellow-700 text-sm">
                            Te-ai înregistrat cu Google. Pentru a putea schimba parola în viitor, setează o parolă acum.
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="newPassword">Parola nouă</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordData({...passwordData, newPassword: e.target.value})}
                            className={`transition-all duration-300 ${passwordErrors.newPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                            placeholder="Parola nouă (min 8 caractere, litere + cifre)"
                          />
                          {passwordErrors.newPassword && (
                            <p className="text-red-500 text-sm mt-1">{passwordErrors.newPassword}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="confirmPassword">Confirmă parola nouă</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                            className={`transition-all duration-300 ${passwordErrors.confirmPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                            placeholder="Confirmă parola nouă"
                          />
                          {passwordErrors.confirmPassword && (
                            <p className="text-red-500 text-sm mt-1">{passwordErrors.confirmPassword}</p>
                          )}
                        </div>
                        <Button onClick={handleSetPasswordForGoogle} className="bg-blue-600 hover:bg-blue-700">
                          <Save className="w-4 h-4 mr-2" />
                          Setează parola
                        </Button>
                      </>
                    ) : isGoogleUser ? (
                      // Google Auth user with password already set
                      <>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <p className="text-green-800 font-medium">Cont Google Auth</p>
                          </div>
                          <p className="text-green-700 text-sm">
                            Te-ai înregistrat cu Google și ai o parolă setată. Poți schimba parola folosind formularul de mai jos.
                          </p>
                        </div>
                        {isChangingPassword ? (
                          <>
                            <div>
                              <Label htmlFor="currentPassword">Parola actuală</Label>
                              <Input
                                id="currentPassword"
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                className={`transition-all duration-300 ${passwordErrors.currentPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                placeholder="Parola actuală"
                              />
                              {passwordErrors.currentPassword && (
                                <p className="text-red-500 text-sm mt-1">{passwordErrors.currentPassword}</p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="newPassword">Parola nouă</Label>
                              <Input
                                id="newPassword"
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                className={`transition-all duration-300 ${passwordErrors.newPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                placeholder="Parola nouă (min 8 caractere, litere + cifre)"
                              />
                              {passwordErrors.newPassword && (
                                <p className="text-red-500 text-sm mt-1">{passwordErrors.newPassword}</p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="confirmPassword">Confirmă parola nouă</Label>
                              <Input
                                id="confirmPassword"
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                className={`transition-all duration-300 ${passwordErrors.confirmPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                placeholder="Confirmă parola nouă"
                              />
                              {passwordErrors.confirmPassword && (
                                <p className="text-red-500 text-sm mt-1">{passwordErrors.confirmPassword}</p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <Button onClick={handlePasswordChange} className="bg-blue-600 hover:bg-blue-700">
                                <Save className="w-4 h-4 mr-2" />
                                Schimbă parola
                              </Button>
                              <Button variant="outline" onClick={() => setIsChangingPassword(false)}>
                                Anulează
                              </Button>
                            </div>
                          </>
                        ) : (
                          <Button onClick={() => setIsChangingPassword(true)} className="bg-blue-600 hover:bg-blue-700">
                            <Lock className="w-4 h-4 mr-2" />
                            Schimbă parola
                          </Button>
                        )}
                      </>
                    ) : (
                      // Regular email/password user
                      <>
                        {isChangingPassword ? (
                          <>
                            <div>
                              <Label htmlFor="currentPassword">Parola actuală</Label>
                              <Input
                                id="currentPassword"
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                className={`transition-all duration-300 ${passwordErrors.currentPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                placeholder="Parola actuală"
                              />
                              {passwordErrors.currentPassword && (
                                <p className="text-red-500 text-sm mt-1">{passwordErrors.currentPassword}</p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="newPassword">Parola nouă</Label>
                              <Input
                                id="newPassword"
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                className={`transition-all duration-300 ${passwordErrors.newPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                placeholder="Parola nouă (min 8 caractere, litere + cifre)"
                              />
                              {passwordErrors.newPassword && (
                                <p className="text-red-500 text-sm mt-1">{passwordErrors.newPassword}</p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="confirmPassword">Confirmă parola nouă</Label>
                              <Input
                                id="confirmPassword"
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                className={`transition-all duration-300 ${passwordErrors.confirmPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                placeholder="Confirmă parola nouă"
                              />
                              {passwordErrors.confirmPassword && (
                                <p className="text-red-500 text-sm mt-1">{passwordErrors.confirmPassword}</p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <Button onClick={handlePasswordChange} className="bg-blue-600 hover:bg-blue-700">
                                <Save className="w-4 h-4 mr-2" />
                                Schimbă parola
                              </Button>
                              <Button variant="outline" onClick={() => setIsChangingPassword(false)}>
                                Anulează
                              </Button>
                            </div>
                          </>
                        ) : (
                          <Button onClick={() => setIsChangingPassword(true)} className="bg-blue-600 hover:bg-blue-700">
                            <Lock className="w-4 h-4 mr-2" />
                            Schimbă parola
                          </Button>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Mail className="w-5 h-5" />
                      <span>Schimbă email-ul</span>
                    </CardTitle>
                    <CardDescription>
                      Actualizează-ți adresa de email și verifică-ți contul
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-blue-900">Email actual</p>
                          <p className="text-sm text-blue-700">{profileData.email}</p>
                          {user?.email_confirmed_at ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                              ✓ Verificat
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                              ⚠ Neverificat
                            </span>
                          )}
                        </div>
                        {!user?.email_confirmed_at && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleSendEmailVerification}
                            className="text-blue-600 border-blue-300"
                          >
                            Trimite verificare
                          </Button>
                        )}
                      </div>
                    </div>

                    {isChangingEmail ? (
                      <>
                        <div>
                          <Label htmlFor="newEmail">Email nou</Label>
                          <Input
                            id="newEmail"
                            type="email"
                            value={emailData.newEmail}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailData({...emailData, newEmail: e.target.value})}
                            placeholder="noul@email.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="confirmEmail">Confirmă email-ul nou</Label>
                          <Input
                            id="confirmEmail"
                            type="email"
                            value={emailData.confirmEmail}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailData({...emailData, confirmEmail: e.target.value})}
                            placeholder="noul@email.com"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            onClick={handleEmailChange} 
                            disabled={isChangingEmailLoading}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {isChangingEmailLoading ? 'Se schimbă...' : 'Schimbă email-ul'}
                          </Button>
                          <Button variant="outline" onClick={() => setIsChangingEmail(false)}>
                            Anulează
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button onClick={() => setIsChangingEmail(true)} className="bg-blue-600 hover:bg-blue-700">
                        <Mail className="w-4 h-4 mr-2" />
                        Schimbă email-ul
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>Conturi conectate</span>
                    </CardTitle>
                    <CardDescription>
                      Gestionează-ți conturile conectate pentru autentificare
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          <div>
                            <p className="font-medium text-gray-900">Google</p>
                            <p className="text-sm text-gray-600">
                              {isGoogleUser 
                                ? 'Cont conectat' 
                                : 'Nu este conectat'
                              }
                            </p>
                          </div>
                        </div>
                        <div>
                          {isGoogleUser ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Conectat
                            </span>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleLinkGoogle}
                              disabled={isLinkingGoogle}
                              className="text-blue-600 border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLinkingGoogle ? 'Se conectează...' : 'Conectează'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Mail className="w-5 h-5" />
                      <span>Preferințe email</span>
                    </CardTitle>
                    <CardDescription>
                      Gestionează-ți notificările și preferințele de email
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="font-medium">Notificări recorduri</Label>
                          <p className="text-sm text-gray-600">Primești email când recordul tău este verificat</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="font-medium">Newsletter</Label>
                          <p className="text-sm text-gray-600">Primești noutăți despre competiții și evenimente</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="font-medium">Notificări comunitate</Label>
                          <p className="text-sm text-gray-600">Primești actualizări despre activitatea comunității</p>
                        </div>
                        <input type="checkbox" className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;





