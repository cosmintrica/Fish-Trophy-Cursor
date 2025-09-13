import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import SearchableSelect from '@/components/SearchableSelect';

interface ProfileFormProps {
  profileData: {
    displayName: string;
    email: string;
    phone: string;
    bio: string;
  };
  selectedCounty: string;
  selectedCity: string;
  counties: {id: string, name: string}[];
  cities: {id: string, name: string}[];
  onProfileDataChange: (field: string, value: string) => void;
  onCountyChange: (countyId: string) => void;
  onCityChange: (cityId: string) => void;
  isUpdating: boolean;
}

const ProfileForm: React.FC<ProfileFormProps> = ({
  profileData,
  selectedCounty,
  selectedCity,
  counties,
  cities,
  onProfileDataChange,
  onCountyChange,
  onCityChange,
  isUpdating
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Informații Personale</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="displayName">Nume de afișare</Label>
          <Input
            id="displayName"
            type="text"
            value={profileData.displayName}
            onChange={(e) => onProfileDataChange('displayName', e.target.value)}
            placeholder="Numele tău"
            disabled={isUpdating}
            aria-describedby="displayName-help"
          />
          <p id="displayName-help" className="text-sm text-gray-500 mt-1">
            Numele care va fi afișat pe profilul tău public
          </p>
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={profileData.email}
            disabled
            className="bg-gray-50"
            aria-describedby="email-help"
          />
          <p id="email-help" className="text-sm text-gray-500 mt-1">
            Email-ul nu poate fi modificat
          </p>
        </div>

        <div>
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            type="tel"
            value={profileData.phone}
            onChange={(e) => onProfileDataChange('phone', e.target.value)}
            placeholder="Numărul tău de telefon"
            disabled={isUpdating}
            aria-describedby="phone-help"
          />
          <p id="phone-help" className="text-sm text-gray-500 mt-1">
            Opțional - pentru contact
          </p>
        </div>

        <div>
          <Label htmlFor="county">Județ</Label>
          <SearchableSelect
            options={counties.map(c => ({ value: c.id, label: c.name }))}
            value={selectedCounty}
            onChange={onCountyChange}
            placeholder="Selectează județul"
            disabled={isUpdating}
            aria-describedby="county-help"
          />
          <p id="county-help" className="text-sm text-gray-500 mt-1">
            Județul în care locuiești
          </p>
        </div>

        <div>
          <Label htmlFor="city">Oraș</Label>
          <SearchableSelect
            options={cities.map(c => ({ value: c.id, label: c.name }))}
            value={selectedCity}
            onChange={onCityChange}
            placeholder="Selectează orașul"
            disabled={isUpdating || !selectedCounty}
            aria-describedby="city-help"
          />
          <p id="city-help" className="text-sm text-gray-500 mt-1">
            Orașul în care locuiești
          </p>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="bio">Despre mine</Label>
          <Textarea
            id="bio"
            value={profileData.bio}
            onChange={(e) => onProfileDataChange('bio', e.target.value)}
            placeholder="Spune-ne ceva despre tine..."
            rows={4}
            disabled={isUpdating}
            aria-describedby="bio-help"
          />
          <p id="bio-help" className="text-sm text-gray-500 mt-1">
            O scurtă descriere despre tine și pasiunea ta pentru pescuit
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileForm;
