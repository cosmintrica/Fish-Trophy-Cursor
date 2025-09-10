import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseApi } from '@/services/supabase-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import RecordDetailsModal from '@/components/RecordDetailsModal';
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
  Wrench,
  Fish
} from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase';
import SearchableSelect from '@/components/SearchableSelect';
import EditRecordModal from '@/components/EditRecordModal';
// import { ROMANIA_COUNTIES, searchCities, getCountyById } from '@/data/romania-locations'; // Now using database

const Profile = () => {
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
    bio: 'Pescar pasionat din România!'
  });
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [counties, setCounties] = useState<{id: string, name: string}[]>([]);
  const [cities, setCities] = useState<{id: string, name: string}[]>([]);
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

  // Modal states
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  // State pentru echipamente
  const [userGear, setUserGear] = useState<Array<{
    id: string;
    brand: string;
    model: string;
    quantity: number;
    purchase_date?: string;
    purchase_price?: number;
    notes?: string;
    description?: string;
    gear_type?: string;
  }>>([]);
  const [isLoadingGear, setIsLoadingGear] = useState(false);
  const [isAddingGear, setIsAddingGear] = useState(false);
  const [showAddGearModal, setShowAddGearModal] = useState(false);
  const [newGear, setNewGear] = useState({
    gear_type: 'undita',
    brand: '',
    model: '',
    description: '',
    quantity: 1,
    purchase_date: '',
    price: 0
  });

  // Real records from database
  const [records, setRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Load user's records from database
  const loadUserRecords = async () => {
    if (!user?.id) return;

    setLoadingRecords(true);
    try {
      const { data, error } = await supabase
        .from('records')
        .select(`
          *,
          fish_species:species_id(name),
          fishing_locations:location_id(name, type, county)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error loading user records:', error);
    } finally {
      setLoadingRecords(false);
    }
  };

  // Încarcă judetele din baza de date
  const loadCounties = async () => {
    try {
      const { data, error } = await supabase
        .from('counties')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error loading counties:', error);
        return;
      }

      console.log('🔍 Counties loaded:', data?.length || 0, 'counties');
      setCounties(data || []);
    } catch (error) {
      console.error('Error loading counties:', error);
    }
  };

  // Încarcă orașele pentru un județ
  const loadCities = async (countyId: string) => {
    if (!countyId) {
      setCities([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name')
        .eq('county_id', countyId)
        .order('name');

      if (error) {
        console.error('Error loading cities:', error);
        return;
      }

      console.log('🔍 Cities loaded for county', countyId, ':', data?.length || 0, 'cities');
      setCities(data || []);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  // Încarcă datele profilului din Supabase
  const loadProfileData = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Încarcă judetele PRIMUL
      await loadCounties();

      // Încearcă să încarce din tabela profiles
      const result = await supabaseApi.getProfile(user.id);

      if (result.success && result.data) {
        console.log('🔍 Profile data loaded:', {
          county_id: result.data.county_id,
          city_id: result.data.city_id,
          displayName: result.data.displayName
        });

        setProfileData({
          displayName: result.data.displayName || user.user_metadata?.display_name || '',
          email: result.data.email || user.email || '',
          phone: result.data.phone || '',
          bio: result.data.bio || 'Pescar pasionat din România!'
        });
        setSelectedCounty(result.data.county_id || '');
        setSelectedCity(result.data.city_id || '');

        // Load cities for the selected county
        if (result.data.county_id) {
          console.log('🔍 Loading cities for county:', result.data.county_id);
          await loadCities(result.data.county_id);
        }
      } else {
        // Dacă nu există în baza de date, folosește datele din user_metadata
        setProfileData({
          displayName: user.user_metadata?.display_name || '',
          email: user.email || '',
          phone: '',
          bio: 'Pescar pasionat din România!'
        });
        setSelectedCounty(user.user_metadata?.county_id || '');
        setSelectedCity(user.user_metadata?.city_id || '');
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      // Fallback la user_metadata daca exista o eroare
      setProfileData({
        displayName: user.user_metadata?.display_name || '',
        email: user.email || '',
        phone: '',
        bio: 'Pescar pasionat din România!'
      });
      setSelectedCounty(user.user_metadata?.county_id || '');
      setSelectedCity(user.user_metadata?.city_id || '');
    }
  }, [user]);

  // Încarcă datele de locație separat pentru afișare
  const loadLocationData = useCallback(async () => {
    if (!selectedCounty && !selectedCity) return;

    try {
      // Reload counties if not loaded
      if (counties.length === 0) {
        await loadCounties();
      }

      // Load cities if county is selected but cities not loaded
      if (selectedCounty && cities.length === 0) {
        await loadCities(selectedCounty);
      }
    } catch (error) {
      console.error('Error loading location data:', error);
    }
  }, [selectedCounty, selectedCity, counties.length, cities.length]);

  const checkGoogleAuthStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      const hasGoogleProvider = user.app_metadata?.provider === 'google' ||
                               user.app_metadata?.providers?.includes('google') ||
                               user.identities?.some((identity: { provider: string }) => identity.provider === 'google');

      setIsGoogleUser(hasGoogleProvider);
      setNeedsPassword(!user.app_metadata?.providers?.includes('email'));
    } catch (error) {
      console.error('Error checking Google Auth status:', error);
    }
  }, [user]);

  // Încarcă echipamentele utilizatorului
  const loadUserGear = useCallback(async () => {
    if (!user?.id) return;

    setIsLoadingGear(true);
    try {
      const { data, error } = await supabase
        .from('user_gear')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading gear:', error);
        toast.error('Eroare la încărcarea echipamentelor');
        return;
      }

      setUserGear(data || []);
    } catch (error) {
      console.error('Error loading gear:', error);
      toast.error('Eroare la încărcarea echipamentelor');
    } finally {
      setIsLoadingGear(false);
    }
  }, [user]);

  // useEffect pentru încărcarea datelor - secvențial pentru a evita cereri multiple
  useEffect(() => {
    const loadDataSequentially = async () => {
      if (!user) return;

      try {
        await loadProfileData();
        await checkGoogleAuthStatus();
        await loadUserGear();
        await loadUserRecords();
      } catch (error) {
        console.error('Error loading profile data:', error);
      }
    };

    loadDataSequentially();
  }, [user, checkGoogleAuthStatus, loadProfileData, loadUserGear, loadUserRecords]);

  // Load location data when county/city changes
  useEffect(() => {
    loadLocationData();
  }, [loadLocationData]);

  // Adaugă echipament nou
  const addGear = async () => {
    if (!user?.id) return;

    // Validare câmpuri obligatorii
    if (!newGear.brand.trim()) {
      toast.error('Marca este obligatorie');
      return;
    }
    if (!newGear.model.trim()) {
      toast.error('Modelul este obligatoriu');
      return;
    }
    if (!newGear.quantity || newGear.quantity < 1) {
      toast.error('Cantitatea trebuie să fie cel puțin 1');
      return;
    }

    setIsAddingGear(true);
    try {
      console.log('Adding gear with data:', {
        user_id: user.id,
        gear_type: newGear.gear_type,
        brand: newGear.brand,
        model: newGear.model,
        description: newGear.description,
        quantity: newGear.quantity,
        purchase_date: newGear.purchase_date || null,
        price: newGear.price
      });

      const { data, error } = await supabase
        .from('user_gear')
        .insert({
          user_id: user.id,
          gear_type: newGear.gear_type,
          brand: newGear.brand,
          model: newGear.model,
          description: newGear.description,
          quantity: newGear.quantity,
          purchase_date: newGear.purchase_date || null,
          purchase_price: newGear.price
        })
        .select();

      console.log('Gear insert result:', { data, error });

      if (error) {
        console.error('Error adding gear:', error);
        toast.error('Eroare la adăugarea echipamentului');
        return;
      }

      toast.success('Echipamentul a fost adăugat cu succes!');
      setShowAddGearModal(false);
      setNewGear({
        gear_type: 'undita',
        brand: '',
        model: '',
        description: '',
        quantity: 1,
        purchase_date: '',
        price: 0
      });
      loadUserGear();
    } catch (error) {
      console.error('Error adding gear:', error);
      toast.error('Eroare la adăugarea echipamentului');
    } finally {
      setIsAddingGear(false);
    }
  };

  // Șterge echipament
  const deleteGear = async (gearId: string) => {
    try {
      console.log('Deleting gear with ID:', gearId);
      console.log('Current user ID:', user?.id);

      const { error } = await supabase
        .from('user_gear')
        .delete()
        .eq('id', gearId)
        .eq('user_id', user?.id); // Adaugă și user_id pentru siguranță

      if (error) {
        console.error('Error deleting gear:', error);
        toast.error(`Eroare la ștergerea echipamentului: ${error.message}`);
        return;
      }

      console.log('Gear deleted successfully');
      toast.success('Echipamentul a fost șters cu succes!');
      loadUserGear();
    } catch (error) {
      console.error('Error deleting gear:', error);
      toast.error('Eroare la ștergerea echipamentului');
    }
  };

  const handleProfileUpdate = async () => {
    if (!user?.id) {
      toast.error('Utilizatorul nu este autentificat');
      return;
    }

    setIsUpdatingProfile(true);
    toast.loading('Se actualizeaza profilul...', { id: 'profile-update' });

    try {
      // Actualizeaza Supabase Auth cu toate datele
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          display_name: profileData.displayName,
          phone: profileData.phone,
          bio: profileData.bio
        }
      });

      if (authError) {
        toast.error('Eroare la actualizarea profilului: ' + authError.message, { id: 'profile-update' });
        return;
      }

      // Actualizează și în tabela profiles din baza de date
      console.log('Updating profile in database:', {
        id: user.id,
        email: user.email,
        display_name: profileData.displayName,
        phone: profileData.phone,
        bio: profileData.bio,
        selectedCounty: selectedCounty,
        selectedCity: selectedCity
      });

      // Try update first, then insert if not exists
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({
          email: user.email,
          display_name: profileData.displayName,
          phone: profileData.phone,
          county_id: selectedCounty || null,
          city_id: selectedCity || null,
          bio: profileData.bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select();

      if (updateError) {
        console.error('Update error, trying insert:', updateError);

        // If update fails, try insert
        const { data: insertData, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            display_name: profileData.displayName,
            phone: profileData.phone,
            county_id: selectedCounty || null,
            city_id: selectedCity || null,
            bio: profileData.bio,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (insertError) {
          console.error('Insert error:', insertError);
          toast.error('Eroare la actualizarea bazei de date: ' + insertError.message, { id: 'profile-update' });
          return;
        }

        console.log('Profile inserted successfully:', insertData);
      } else {
        console.log('Profile updated successfully:', updateData);
      }

      console.log('Profile update/insert completed successfully');
      toast.success('Profilul a fost actualizat cu succes!', { id: 'profile-update' });

      // Reload profile data to get updated county_id and city_id
      await loadProfileData();
      setIsEditing(false);

    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('A apărut o eroare la actualizarea profilului', { id: 'profile-update' });
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
      toast.error('Noul email trebuie sa fie diferit de cel actual');
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
        // Actualizeaza state-ul local cu noul email
        setProfileData(prev => ({ ...prev, email: emailData.newEmail }));

        toast.success('Email-ul a fost schimbat! Verifică-ți noul email pentru confirmare.', { id: 'email-change' });
        setIsChangingEmail(false);
        setEmailData({ newEmail: '', confirmEmail: '' });
      }
    } catch (error) {
      console.error('Error changing email:', error);
      toast.error('A apărut o eroare la schimbarea email-ului', { id: 'email-change' });
    } finally {
      setIsChangingEmailLoading(false);
    }
  };

  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);

  // Helper function to parse location string into county and city

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
      setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola noua este obligatorie' }));
      toast.error('Parola noua este obligatorie');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordErrors(prev => ({ ...prev, confirmPassword: 'Parolele nu se potrivesc' }));
      toast.error('Parolele nu se potrivesc');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola trebuie sa aiba cel pu?in 8 caractere' }));
      toast.error('Parola trebuie sa aiba cel pu?in 8 caractere');
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(passwordData.newPassword);
    const hasNumber = /[0-9]/.test(passwordData.newPassword);

    if (!hasLetter || !hasNumber) {
      setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola trebuie sa con?ina cel pu?in o litera ?i o cifra' }));
      toast.error('Parola trebuie sa con?ina cel pu?in o litera ?i o cifra');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        toast.error(error.message || 'Eroare la setarea parolei');
      } else {
        toast.success('Parola a fost setata cu succes!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setNeedsPassword(false);
      }
    } catch (error) {
      console.error('Error setting password:', error);
      toast.error('Eroare la setarea parolei');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    if (!deletePassword) {
      toast.error('Introdu parola pentru a confirma ștergerea contului');
      return;
    }

    setIsDeletingAccount(true);
    toast.loading('Se șterge contul...', { id: 'delete-account' });

    try {
      // Verify password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email || '',
        password: deletePassword
      });

      if (signInError) {
        toast.error('Parola introdusă este incorectă', { id: 'delete-account' });
        return;
      }

      // Delete user data from profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
      }

      // Delete user gear
      const { error: gearError } = await supabase
        .from('user_gear')
        .delete()
        .eq('user_id', user.id);

      if (gearError) {
        console.error('Error deleting gear:', gearError);
      }

      // Delete user records
      const { error: recordsError } = await supabase
        .from('records')
        .delete()
        .eq('angler', user.id);

      if (recordsError) {
        console.error('Error deleting records:', recordsError);
      }

      // Success - all data deleted
      toast.success('Cont șters cu succes! Toate datele au fost eliminate.', { id: 'delete-account' });

      // Sign out
      await supabase.auth.signOut();

    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Eroare la ștergerea contului. Contactează suportul.', { id: 'delete-account' });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
      setDeletePassword('');
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
      setPasswordErrors(prev => ({ ...prev, currentPassword: 'Parola actuala este obligatorie' }));
      toast.error('Parola actuala este obligatorie');
      return;
    }

    if (!passwordData.newPassword) {
      setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola noua este obligatorie' }));
      toast.error('Parola noua este obligatorie');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordErrors(prev => ({ ...prev, confirmPassword: 'Parolele nu se potrivesc' }));
      toast.error('Parolele nu se potrivesc');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola trebuie sa aiba cel pu?in 8 caractere' }));
      toast.error('Parola trebuie sa aiba cel pu?in 8 caractere');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola noua trebuie sa fie diferita de cea actuala' }));
      toast.error('Parola noua trebuie sa fie diferita de cea actuala');
      return;
    }

    try {
      // First, verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email || '',
        password: passwordData.currentPassword
      });

      if (signInError) {
        setPasswordErrors(prev => ({ ...prev, currentPassword: 'Parola actuala este incorecta' }));
        toast.error('Parola actuala este incorecta');
        return;
      }

      // If current password is correct, update to new password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        if (error.message.includes('Password should be at least')) {
          setPasswordErrors(prev => ({ ...prev, newPassword: 'Parola trebuie sa aiba cel pu?in 6 caractere' }));
          toast.error('Parola trebuie sa aiba cel pu?in 6 caractere');
        } else {
          toast.error('Eroare la schimbarea parolei: ' + error.message);
        }
      } else {
        toast.success('Parola a fost actualizata cu succes!');
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




  const handleProfileImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
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
      toast.loading('Se încarcă imaginea...', { id: 'profile-image-upload' });

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

      toast.success('Imaginea de profil a fost actualizata cu succes!', { id: 'profile-image-upload' });

      // Actualizeaza UI-ul imediat
      window.location.reload();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Eroare la upload-ul imaginii. Te rog încearcă din nou.', { id: 'profile-image-upload' });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      verified: { label: 'Verificat', className: 'bg-green-100 text-green-800' },
      pending: { label: 'În așteptare', className: 'bg-yellow-100 text-yellow-800' },
      rejected: { label: 'Respins - Editează și trimite din nou', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const openRecordModal = (record: any) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const handleEditSuccess = () => {
    // Reload user records after successful edit
    loadUserRecords();
  };

  const closeRecordModal = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Trebuie sa fii autentificat</h1>
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

          {/* Con?inut principal */}
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
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      // Navigate to records page or open modal
                      window.location.href = '/records';
                    }}
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Adaugă Record
                  </Button>
                </div>

                {loadingRecords ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Se încarcă recordurile...</p>
                    </CardContent>
                  </Card>
                ) : records.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Nu ai încă recorduri</h3>
                      <p className="text-gray-600 mb-4">Începe să adaugi recordurile tale de pescuit!</p>
                      <Button
                        onClick={() => {
                          window.location.href = '/records';
                        }}
                      >
                        Adaugă primul record
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {records.map((record) => (
                      <Card key={record.id} className="overflow-hidden">
                        <div className="aspect-video bg-gray-200 relative">
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                            <Fish className="w-16 h-16 text-blue-400" />
                          </div>
                          <div className="absolute top-2 right-2">
                            {getStatusBadge(record.status)}
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg">{record.fish_species?.name || 'Specie necunoscută'}</h3>
                            <span className="text-sm text-gray-500">{new Date(record.captured_at).toLocaleDateString('ro-RO')}</span>
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
                                <span className="font-medium">{record.length_cm} cm</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>{record.fishing_locations?.name || 'Locație necunoscută'}</span>
                          </div>

                          <div className="mt-3 flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => openRecordModal(record)}
                            >
                              Vezi detalii
                            </Button>
                            {record.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                  setEditingRecord(record);
                                  setIsEditModalOpen(true);
                                }}
                              >
                                Editează
                              </Button>
                            )}
                            {record.status === 'rejected' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-red-600 border-red-300"
                                onClick={() => {
                                  setEditingRecord(record);
                                  setIsEditModalOpen(true);
                                }}
                              >
                                Editează și trimite din nou
                              </Button>
                            )}
                            {isAdmin && record.status === 'verified' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-orange-600 border-orange-300"
                                onClick={() => {
                                  setEditingRecord(record);
                                  setIsEditModalOpen(true);
                                }}
                              >
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
                  <Button
                    onClick={() => setShowAddGearModal(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Wrench className="w-4 h-4 mr-2" />
                    Adaugă echipament
                  </Button>
                </div>

                {isLoadingGear ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Se încarcă echipamentele...</p>
                  </div>
                ) : userGear.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userGear.map((gear) => (
                      <Card key={gear.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{gear.brand} {gear.model}</CardTitle>
                              <CardDescription>{gear.description}</CardDescription>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteGear(gear.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Șterge
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Tip:</span> {gear.gear_type}
                            </p>
                            {gear.brand && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Marcă:</span> {gear.brand}
                              </p>
                            )}
                            {gear.model && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Model:</span> {gear.model}
                              </p>
                            )}
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Cantitate:</span> {gear.quantity}
                            </p>
                            {gear.purchase_price && gear.purchase_price > 0 && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Preț:</span> {gear.purchase_price} RON
                              </p>
                            )}
                            {gear.purchase_date && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Data cumpărării:</span> {new Date(gear.purchase_date).toLocaleDateString('ro-RO')}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Nu ai adăugat încă echipamente?</h3>
                    <p className="text-gray-600 mb-6">Folosește butonul "Adaugă echipament" de sus pentru a începe să îți organizezi inventarul.</p>
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
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setProfileData({...profileData, displayName: e.target.value})}
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
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setProfileData({...profileData, phone: e.target.value})}
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
                                options={counties.map(county => ({
                                  value: county.id,
                                  label: county.name
                                }))}
                                value={selectedCounty}
                                onChange={async (countyId) => {
                                  setSelectedCounty(countyId);
                                  setSelectedCity(''); // Reset city when county changes
                                  await loadCities(countyId);
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
                                options={cities.map(city => ({
                                  value: city.id,
                                  label: city.name
                                }))}
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
                            value={(() => {
                              // Așteaptă să se încarce counties și cities
                              if (counties.length === 0 || cities.length === 0) {
                                return 'Se încarcă...';
                              }

                              const countyName = counties.find(c => c.id === selectedCounty)?.name || '';
                              const cityName = cities.find(c => c.id === selectedCity)?.name || '';

                              if (countyName && cityName) {
                                return `${cityName}, ${countyName}`;
                              } else if (countyName) {
                                return countyName;
                              }
                              return 'Locația nu este setată';
                            })()}
                            disabled={true}
                            className="bg-gray-100 text-gray-500 cursor-not-allowed"
                            placeholder="Locația nu este setată"
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="bio">Despre mine</Label>
                      <textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setProfileData({...profileData, bio: e.target.value})}
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

              {/* Tab Setari */}
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
                          <Label htmlFor="newPassword">Parola noua</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setPasswordData({...passwordData, newPassword: e.target.value})}
                            className={`transition-all duration-300 ${passwordErrors.newPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                            placeholder="Parola noua (min 8 caractere, litere + cifre)"
                          />
                          {passwordErrors.newPassword && (
                            <p className="text-red-500 text-sm mt-1">{passwordErrors.newPassword}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="confirmPassword">Confirma parola noua</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                            className={`transition-all duration-300 ${passwordErrors.confirmPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                            placeholder="Confirma parola noua"
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
                              <Label htmlFor="currentPassword">Parola actuala</Label>
                              <Input
                                id="currentPassword"
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                className={`transition-all duration-300 ${passwordErrors.currentPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                placeholder="Parola actuala"
                              />
                              {passwordErrors.currentPassword && (
                                <p className="text-red-500 text-sm mt-1">{passwordErrors.currentPassword}</p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="newPassword">Parola noua</Label>
                              <Input
                                id="newPassword"
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                className={`transition-all duration-300 ${passwordErrors.newPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                placeholder="Parola noua (min 8 caractere, litere + cifre)"
                              />
                              {passwordErrors.newPassword && (
                                <p className="text-red-500 text-sm mt-1">{passwordErrors.newPassword}</p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="confirmPassword">Confirma parola noua</Label>
                              <Input
                                id="confirmPassword"
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                className={`transition-all duration-300 ${passwordErrors.confirmPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                placeholder="Confirma parola noua"
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
                              <Label htmlFor="currentPassword">Parola actuala</Label>
                              <Input
                                id="currentPassword"
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                className={`transition-all duration-300 ${passwordErrors.currentPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                placeholder="Parola actuala"
                              />
                              {passwordErrors.currentPassword && (
                                <p className="text-red-500 text-sm mt-1">{passwordErrors.currentPassword}</p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="newPassword">Parola noua</Label>
                              <Input
                                id="newPassword"
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                className={`transition-all duration-300 ${passwordErrors.newPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                placeholder="Parola noua (min 8 caractere, litere + cifre)"
                              />
                              {passwordErrors.newPassword && (
                                <p className="text-red-500 text-sm mt-1">{passwordErrors.newPassword}</p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="confirmPassword">Confirma parola noua</Label>
                              <Input
                                id="confirmPassword"
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                className={`transition-all duration-300 ${passwordErrors.confirmPassword ? 'border-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                placeholder="Confirma parola noua"
                              />
                              {passwordErrors.confirmPassword && (
                                <p className="text-red-500 text-sm mt-1">{passwordErrors.confirmPassword}</p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <Button onClick={handlePasswordChange} className="bg-blue-600 hover:bg-blue-700">
                                <Save className="w-4 h-4 mr-2" />
                                Schimba parola
                              </Button>
                              <Button variant="outline" onClick={() => setIsChangingPassword(false)}>
                                Anuleaza
                              </Button>
                            </div>
                          </>
                        ) : (
                          <Button onClick={() => setIsChangingPassword(true)} className="bg-blue-600 hover:bg-blue-700">
                            <Lock className="w-4 h-4 mr-2" />
                            Schimba parola
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
                              ✔ Verificat
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                              ✖ Neverificat
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
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmailData({...emailData, newEmail: e.target.value})}
                            placeholder="noul@email.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="confirmEmail">Confirma email-ul nou</Label>
                          <Input
                            id="confirmEmail"
                            type="email"
                            value={emailData.confirmEmail}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmailData({...emailData, confirmEmail: e.target.value})}
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
                            <span className="text-gray-500 text-sm">
                              Nu este conectat
                            </span>
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

                {/* Secțiunea de ștergere cont */}
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-red-700">
                      <User className="w-5 h-5" />
                      <span>Ștergere cont</span>
                    </CardTitle>
                    <CardDescription className="text-red-600">
                      Această acțiune este permanentă și nu poate fi anulată
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-red-100 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">!</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-red-800 font-medium mb-2">Atenție!</h4>
                          <p className="text-red-700 text-sm mb-3">
                            Ștergerea contului va elimina permanent:
                          </p>
                          <ul className="text-red-700 text-sm space-y-1 ml-4">
                            <li>• Toate datele personale și profilul</li>
                            <li>• Toate recordurile și realizările</li>
                            <li>• Echipamentele salvate</li>
                            <li>• Istoricul de activitate</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {!showDeleteConfirm ? (
                      <Button
                        variant="destructive"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Șterge contul
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="deletePassword" className="text-red-700 font-medium">
                            Confirmă parola pentru a șterge contul
                          </Label>
                          <Input
                            id="deletePassword"
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="Introdu parola contului"
                            className="mt-2 border-red-300 focus:border-red-500"
                          />
                        </div>
                        <div className="flex space-x-3">
                          <Button
                            variant="destructive"
                            onClick={handleDeleteAccount}
                            disabled={isDeletingAccount || !deletePassword}
                            className="flex-1"
                          >
                            {isDeletingAccount ? (
                              <>
                                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                Se șterge...
                              </>
                            ) : (
                              <>
                                <User className="w-4 h-4 mr-2" />
                                Confirmă ștergerea
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeletePassword('');
                            }}
                            className="flex-1"
                          >
                            Anulează
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Modal pentru adăugarea echipamentelor */}
      {showAddGearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Adaugă echipament nou</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddGearModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="gear_type">Tip echipament</Label>
                  <select
                    id="gear_type"
                    value={newGear.gear_type}
                    onChange={(e) => setNewGear(prev => ({ ...prev, gear_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="undita">Undiță</option>
                    <option value="mulineta">Mulinetă</option>
                    <option value="scaun">Scaun</option>
                    <option value="rucsac">Rucsac</option>
                    <option value="vesta">Vestă</option>
                    <option value="cizme">Cizme</option>
                    <option value="altceva">Altceva</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="brand">Marcă *</Label>
                  <Input
                    id="brand"
                    value={newGear.brand}
                    onChange={(e) => setNewGear(prev => ({ ...prev, brand: e.target.value }))}
                    placeholder="Ex: Shimano, Daiwa, Fox..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <Label htmlFor="model">Model *</Label>
                  <Input
                    id="model"
                    value={newGear.model}
                    onChange={(e) => setNewGear(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="Ex: Exage 4000, PowerBait..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descriere</Label>
                  <textarea
                    id="description"
                    value={newGear.description}
                    onChange={(e) => setNewGear(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrierea echipamentului..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Cantitate</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={newGear.quantity}
                      onChange={(e) => setNewGear(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="price">Preț (RON)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newGear.price}
                      onChange={(e) => setNewGear(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="purchase_date">Data cumpărării (opțional)</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={newGear.purchase_date}
                    onChange={(e) => setNewGear(prev => ({ ...prev, purchase_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowAddGearModal(false)}
                  disabled={isAddingGear}
                >
                  Anulează
                </Button>
                <Button
                  onClick={addGear}
                  disabled={isAddingGear}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isAddingGear ? 'Se adaugă...' : 'Adaugă echipament'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Details Modal */}
      <RecordDetailsModal
        record={selectedRecord}
        isOpen={isModalOpen}
        onClose={closeRecordModal}
        isAdmin={isAdmin}
        canEdit={selectedRecord?.status === 'pending'}
      />

      {/* Edit Record Modal */}
      <EditRecordModal
        record={editingRecord}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRecord(null);
        }}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default Profile;





