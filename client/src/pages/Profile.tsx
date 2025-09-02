import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
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
  Ruler
} from 'lucide-react';
import { toast } from 'sonner';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { storage } from '@/lib/firebase';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Check if user is admin - use environment variable for security
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'cosmin.trica@outlook.com';
  const isAdmin = user?.email === adminEmail;
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    location: '',
    bio: 'Pescar pasionat din România!'
  });
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

  // Încarcă datele profilului din API
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user?.uid) return;

      try {
        const response = await fetch(`/api/users/${user.uid}/profile`);
        const result = await response.json();

        if (result.success && result.data) {
          setProfileData({
            displayName: result.data.displayName || user.displayName || '',
            email: result.data.email || user.email || '',
            phone: result.data.phone || '',
            location: result.data.location || '',
            bio: result.data.bio || 'Pescar pasionat din România!'
          });

          // Afișează mesaj dacă este mock data
          if (result.message && result.message.includes('Mock')) {
            console.log('ℹ️ Using mock data - database connection pending');
          }
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
      }
    };

    loadProfileData();
  }, [user]);

  const handleProfileUpdate = async () => {
    if (!user?.uid) {
      toast.error('Utilizatorul nu este autentificat');
      return;
    }

    try {
      const profileDataToSend = {
        displayName: profileData.displayName,
        email: profileData.email || user.email,
        phone: profileData.phone,
        location: profileData.location,
        bio: profileData.bio,
        photo_url: user.photoURL || ''
      };

      // Actualizează Firebase Auth
      await updateProfile(user, { displayName: profileData.displayName });

      // Salvează în baza de date prin API
      const response = await fetch(`/api/users/${user.uid}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileDataToSend)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Profilul a fost actualizat cu succes!');
        setIsEditing(false);
        // Actualizează datele locale
        if (result.data) {
          setProfileData({
            displayName: result.data.displayName,
            email: result.data.email,
            phone: result.data.phone || '',
            location: result.data.location || '',
            bio: result.data.bio || ''
          });
        }

        // Afișează mesaj dacă este mock data
        if (result.message && result.message.includes('Mock')) {
          toast.info('Datele sunt salvate temporar (mock). Conexiunea la baza de date va fi activată în curând.');
        }
      } else {
        toast.error(result.error || 'Eroare la actualizarea profilului');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Eroare la actualizarea profilului');
    }
  };

  const handleEmailChange = async () => {
    if (!user?.uid) {
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

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/.netlify/functions/auth-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          action: 'change-email',
          newEmail: emailData.newEmail
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Email-ul a fost actualizat! Verifică-ți noul email pentru confirmare.');
        setIsChangingEmail(false);
        setEmailData({ newEmail: '', confirmEmail: '' });
      } else {
        toast.error(result.error || 'Eroare la schimbarea email-ului');
      }
    } catch (error) {
      console.error('Error changing email:', error);
      toast.error('Eroare la schimbarea email-ului');
    }
  };

  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handlePasswordChange = async () => {
    if (!user?.uid) {
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
      const idToken = await user.getIdToken();
      const response = await fetch('/.netlify/functions/auth-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          action: 'change-password',
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Parola a fost actualizată cu succes!');
        setIsChangingPassword(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordErrors({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        // Set field-specific error
        if (result.field) {
          setPasswordErrors(prev => ({ ...prev, [result.field]: result.error }));
        }
        toast.error(result.error || 'Eroare la schimbarea parolei');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Eroare la schimbarea parolei');
    }
  };

  const handleSendEmailVerification = async () => {
    if (!user?.uid) {
      toast.error('Utilizatorul nu este autentificat');
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          action: 'send-verification'
        })
      });

      const result = await response.json();

      if (result.success) {
        if (result.data.emailSent) {
          toast.success('Email de verificare trimis cu succes! Verifică-ți inbox-ul.');
        } else {
          toast.success('Link de verificare generat! Verifică server logs pentru link.');
        }
      } else {
        toast.error(result.error || 'Eroare la trimiterea email-ului de verificare');
      }
    } catch (error) {
      console.error('Error sending email verification:', error);
      toast.error('Eroare la trimiterea email-ului de verificare');
    }
  };



  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) {
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

      const storageRef = ref(storage, `profiles/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateProfile(user, { photoURL: url });

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
                    <AvatarImage src={user.photoURL || undefined} />
                    <AvatarFallback className="text-2xl">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
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
                  {user.displayName || 'Utilizator'}
                </CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Membru din {new Date(user.metadata?.creationTime || Date.now()).toLocaleDateString('ro-RO')}</span>
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="records" className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4" />
                  <span>Recordurile mele</span>
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
                        <Label htmlFor="location">Locație</Label>
                        <Input
                          id="location"
                          value={profileData.location}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileData({...profileData, location: e.target.value})}
                          disabled={!isEditing}
                          placeholder="Oraș, Județ"
                        />
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
                          <Button onClick={handleProfileUpdate} className="bg-blue-600 hover:bg-blue-700">
                            <Save className="w-4 h-4 mr-2" />
                            Salvează
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
                          <p className="text-sm text-blue-700">{user?.email}</p>
                          {user?.emailVerified ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                              ✓ Verificat
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                              ⚠ Neverificat
                            </span>
                          )}
                        </div>
                        {!user?.emailVerified && (
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
                          <Button onClick={handleEmailChange} className="bg-blue-600 hover:bg-blue-700">
                            <Save className="w-4 h-4 mr-2" />
                            Schimbă email-ul
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





