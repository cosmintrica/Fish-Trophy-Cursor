import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, Save, User, ExternalLink, Eye, Globe, Youtube, Phone, MapPin } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import { Link } from 'react-router-dom';

interface ProfileEditTabProps {
    profileData: {
        displayName: string;
        phone: string;
        bio: string;
        website: string;
        youtube_channel: string;
        show_gear_publicly: boolean;
        show_county_publicly?: boolean;
        show_city_publicly?: boolean;
        show_website_publicly?: boolean;
        show_youtube_publicly?: boolean;
        username?: string;
    };
    setProfileData: (data: any) => void;
    selectedCounty: string;
    setSelectedCounty: (county: string) => void;
    selectedCity: string;
    setSelectedCity: (city: string) => void;
    counties: { id: string; name: string }[];
    cities: { id: string; name: string }[];
    isUpdatingProfile: boolean;
    userId?: string;
    username?: string;
    onLoadCities: (countyId: string) => void;
    onUpdateProfile: (profileDataToUpdate: any, selectedCounty: string, selectedCity: string) => Promise<boolean> | boolean;
}

export const ProfileEditTab = ({
    profileData,
    setProfileData,
    selectedCounty,
    setSelectedCounty,
    selectedCity,
    setSelectedCity,
    counties,
    cities,
    isUpdatingProfile,
    userId,
    username,
    onLoadCities,
    onUpdateProfile
}: ProfileEditTabProps) => {
    const [isEditing, setIsEditing] = useState(false);

    const handleCountyChange = (countyId: string) => {
        setSelectedCounty(countyId);
        setSelectedCity('');
        onLoadCities(countyId);
    };

    const handleSave = async () => {
        const success = await onUpdateProfile(profileData, selectedCounty, selectedCity);
        if (success) {
            setIsEditing(false);
        }
    };

    const countyOptions = counties.map(county => ({ value: county.id, label: county.name }));
    const cityOptions = cities.map(city => ({ value: city.id, label: city.name }));

    // Get county and city names for display
    const countyName = counties.find(c => c.id === selectedCounty)?.name || '';
    const cityName = cities.find(c => c.id === selectedCity)?.name || '';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-50">Informații profil</h2>
                {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} variant="outline">
                        <Edit className="w-4 h-4 mr-2" />
                        Editează
                    </Button>
                ) : (
                    <div className="flex space-x-2">
                        <Button onClick={() => setIsEditing(false)} variant="outline">
                            Anulează
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isUpdatingProfile}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isUpdatingProfile ? 'Se salvează...' : 'Salvează'}
                        </Button>
                    </div>
                )}
            </div>

            <Card>
                <CardContent className="pt-6 space-y-4">
                    {/* Nume complet */}
                    <div>
                        <Label className="text-gray-900 dark:text-slate-50">Nume complet *</Label>
                        {isEditing ? (
                            <Input
                                value={profileData.displayName}
                                onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                                placeholder="Numele tău complet"
                                className="dark:bg-slate-800 dark:text-slate-50 dark:border-slate-700"
                            />
                        ) : (
                            <div className="mt-2 flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                                <User className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                                <p className="text-gray-900 dark:text-slate-50 font-medium">{profileData.displayName || '-'}</p>
                            </div>
                        )}
                    </div>

                    {/* Telefon */}
                    <div>
                        <Label className="text-gray-900 dark:text-slate-50">Telefon</Label>
                        {isEditing ? (
                            <Input
                                value={profileData.phone}
                                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                placeholder="+40 XXX XXX XXX"
                                className="dark:bg-slate-800 dark:text-slate-50 dark:border-slate-700"
                            />
                        ) : (
                            <div className="mt-2 flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                                <Phone className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                                <p className="text-gray-900 dark:text-slate-50">{profileData.phone || '-'}</p>
                            </div>
                        )}
                    </div>

                    {/* Județ */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-gray-900 dark:text-slate-50">Județ *</Label>
                            {isEditing && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-xs text-gray-600">Public</span>
                                    <div
                                        onClick={() => setProfileData({ ...profileData, show_county_publicly: !profileData.show_county_publicly })}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${profileData.show_county_publicly ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profileData.show_county_publicly ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </div>
                                </label>
                            )}
                        </div>
                        {isEditing ? (
                            <SearchableSelect
                                options={countyOptions}
                                value={selectedCounty}
                                onChange={handleCountyChange}
                                placeholder="Selectează județul"
                            />
                        ) : (
                            <div className="mt-2">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                                    <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    <p className="text-gray-900 dark:text-slate-50 flex-1">{countyName || '-'}</p>
                                    <span className={`text-xs px-2 py-1 rounded-full ${profileData.show_county_publicly
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                                        }`}>
                                        {profileData.show_county_publicly ? 'Public' : 'Privat'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Oraș */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-gray-900 dark:text-slate-50">Oraș *</Label>
                            {isEditing && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-xs text-gray-600">Public</span>
                                    <div
                                        onClick={() => setProfileData({ ...profileData, show_city_publicly: !profileData.show_city_publicly })}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${profileData.show_city_publicly ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profileData.show_city_publicly ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </div>
                                </label>
                            )}
                        </div>
                        {isEditing ? (
                            <SearchableSelect
                                options={cityOptions}
                                value={selectedCity}
                                onChange={setSelectedCity}
                                placeholder="Selectează orașul"
                                disabled={!selectedCounty}
                            />
                        ) : (
                            <div className="mt-2">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                                    <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    <p className="text-gray-900 dark:text-slate-50 flex-1">{cityName || '-'}</p>
                                    <span className={`text-xs px-2 py-1 rounded-full ${profileData.show_city_publicly
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                                        }`}>
                                        {profileData.show_city_publicly ? 'Public' : 'Privat'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bio */}
                    <div>
                        <Label className="text-gray-900 dark:text-slate-50">Bio</Label>
                        {isEditing ? (
                            <textarea
                                value={profileData.bio}
                                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                                placeholder="Spune ceva despre tine..."
                                className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded-md min-h-[100px] dark:bg-slate-800 dark:text-slate-50"
                            />
                        ) : (
                            <div className="mt-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/50">
                                <p className="text-gray-900 dark:text-slate-50 whitespace-pre-wrap leading-relaxed">{profileData.bio || '-'}</p>
                            </div>
                        )}
                    </div>

                    {/* Website */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-gray-900 dark:text-slate-50">Website</Label>
                            {isEditing && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-xs text-gray-600">Public</span>
                                    <div
                                        onClick={() => setProfileData({ ...profileData, show_website_publicly: !profileData.show_website_publicly })}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${profileData.show_website_publicly ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profileData.show_website_publicly ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </div>
                                </label>
                            )}
                        </div>
                        {isEditing ? (
                            <Input
                                value={profileData.website}
                                onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                                placeholder="https://..."
                                className="dark:bg-slate-800 dark:text-slate-50 dark:border-slate-700"
                            />
                        ) : (
                            <div className="mt-2">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                                    <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    <div className="flex-1">
                                        {profileData.website ? (
                                            <a href={profileData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                                {profileData.website}
                                            </a>
                                        ) : <span className="text-gray-500 dark:text-slate-400">-</span>}
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${profileData.show_website_publicly
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                                        }`}>
                                        {profileData.show_website_publicly ? 'Public' : 'Privat'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* YouTube Channel */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-gray-900 dark:text-slate-50">Canal YouTube</Label>
                            {isEditing && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-xs text-gray-600">Public</span>
                                    <div
                                        onClick={() => setProfileData({ ...profileData, show_youtube_publicly: !profileData.show_youtube_publicly })}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${profileData.show_youtube_publicly ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profileData.show_youtube_publicly ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </div>
                                </label>
                            )}
                        </div>
                        {isEditing ? (
                            <Input
                                value={profileData.youtube_channel}
                                onChange={(e) => setProfileData({ ...profileData, youtube_channel: e.target.value })}
                                placeholder="https://youtube.com/@..."
                                className="dark:bg-slate-800 dark:text-slate-50 dark:border-slate-700"
                            />
                        ) : (
                            <div className="mt-2">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                                    <Youtube className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    <div className="flex-1">
                                        {profileData.youtube_channel ? (
                                            <a href={profileData.youtube_channel} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                                {profileData.youtube_channel}
                                            </a>
                                        ) : <span className="text-gray-500 dark:text-slate-400">-</span>}
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${profileData.show_youtube_publicly
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                                        }`}>
                                        {profileData.show_youtube_publicly ? 'Public' : 'Privat'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                </CardContent>
            </Card>
        </div>
    );
};
