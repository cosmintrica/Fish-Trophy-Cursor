import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, Save, User, ExternalLink, Eye } from 'lucide-react';
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
    onUpdateProfile: () => void;
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
        const success = await onUpdateProfile();
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
                <h2 className="text-2xl font-bold">Informații profil</h2>
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
                        <Label>Nume complet *</Label>
                        {isEditing ? (
                            <Input
                                value={profileData.displayName}
                                onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                                placeholder="Numele tău complet"
                            />
                        ) : (
                            <p className="mt-2 text-gray-900">{profileData.displayName || '-'}</p>
                        )}
                    </div>

                    {/* Telefon */}
                    <div>
                        <Label>Telefon</Label>
                        {isEditing ? (
                            <Input
                                value={profileData.phone}
                                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                placeholder="+40 XXX XXX XXX"
                            />
                        ) : (
                            <p className="mt-2 text-gray-900">{profileData.phone || '-'}</p>
                        )}
                    </div>

                    {/* Județ */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label>Județ *</Label>
                            {isEditing && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-xs text-gray-600">Public</span>
                                    <input
                                        type="checkbox"
                                        checked={profileData.show_county_publicly || false}
                                        onChange={(e) => setProfileData({ ...profileData, show_county_publicly: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
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
                            <p className="mt-2 text-gray-900">{countyName || '-'}</p>
                        )}
                    </div>

                    {/* Oraș */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label>Oraș *</Label>
                            {isEditing && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-xs text-gray-600">Public</span>
                                    <input
                                        type="checkbox"
                                        checked={profileData.show_city_publicly || false}
                                        onChange={(e) => setProfileData({ ...profileData, show_city_publicly: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
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
                            <p className="mt-2 text-gray-900">{cityName || '-'}</p>
                        )}
                    </div>

                    {/* Bio */}
                    <div>
                        <Label>Bio</Label>
                        {isEditing ? (
                            <textarea
                                value={profileData.bio}
                                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                                placeholder="Spune ceva despre tine..."
                                className="w-full mt-1 p-2 border border-gray-300 rounded-md min-h-[100px]"
                            />
                        ) : (
                            <p className="mt-2 text-gray-900 whitespace-pre-wrap">{profileData.bio || '-'}</p>
                        )}
                    </div>

                    {/* Website */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label>Website</Label>
                            {isEditing && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-xs text-gray-600">Public</span>
                                    <input
                                        type="checkbox"
                                        checked={profileData.show_website_publicly || false}
                                        onChange={(e) => setProfileData({ ...profileData, show_website_publicly: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                </label>
                            )}
                        </div>
                        {isEditing ? (
                            <Input
                                value={profileData.website}
                                onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                                placeholder="https://..."
                            />
                        ) : (
                            <p className="mt-2 text-gray-900">
                                {profileData.website ? (
                                    <a href={profileData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        {profileData.website}
                                    </a>
                                ) : '-'}
                            </p>
                        )}
                    </div>

                    {/* YouTube Channel */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label>Canal YouTube</Label>
                            {isEditing && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-xs text-gray-600">Public</span>
                                    <input
                                        type="checkbox"
                                        checked={profileData.show_youtube_publicly || false}
                                        onChange={(e) => setProfileData({ ...profileData, show_youtube_publicly: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                </label>
                            )}
                        </div>
                        {isEditing ? (
                            <Input
                                value={profileData.youtube_channel}
                                onChange={(e) => setProfileData({ ...profileData, youtube_channel: e.target.value })}
                                placeholder="https://youtube.com/@..."
                            />
                        ) : (
                            <p className="mt-2 text-gray-900">
                                {profileData.youtube_channel ? (
                                    <a href={profileData.youtube_channel} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        {profileData.youtube_channel}
                                    </a>
                                ) : '-'}
                            </p>
                        )}
                    </div>

                </CardContent>
            </Card>
        </div>
    );
};
