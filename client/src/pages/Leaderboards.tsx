import { useState } from 'react';
import { Trophy, Medal, Crown, Target, Calendar, MapPin, Users, Award } from 'lucide-react';

// Mock data pentru demonstrație
const mockLeaderboards = {
  overall: [
    { rank: 1, name: 'Mihai Popescu', totalWeight: 45.2, totalFish: 127, avatar: '/icon_premium.png', team: 'Echipa Zaga Zaga' },
    { rank: 2, name: 'Ana Ionescu', totalWeight: 38.7, totalFish: 98, avatar: '/icon_free.png', team: 'Pescarii Dunarii' },
    { rank: 3, name: 'Alexandru Marin', totalWeight: 35.1, totalFish: 89, avatar: '/icon_premium.png', team: 'Echipa Zaga Zaga' },
    { rank: 4, name: 'Maria Popa', totalWeight: 32.8, totalFish: 76, avatar: '/icon_free.png', team: 'Lacul Snagov' },
    { rank: 5, name: 'Ion Georgescu', totalWeight: 29.4, totalFish: 65, avatar: '/icon_premium.png', team: 'Pescarii Dunarii' }
  ],
  monthly: [
    { rank: 1, name: 'Ana Ionescu', weight: 12.5, fish: 23, species: 'Crap', avatar: '/icon_free.png', team: 'Pescarii Dunarii' },
    { rank: 2, name: 'Mihai Popescu', weight: 11.8, fish: 19, species: 'Șalău', avatar: '/icon_premium.png', team: 'Echipa Zaga Zaga' },
    { rank: 3, name: 'Alexandru Marin', weight: 10.2, fish: 18, species: 'Biban', avatar: '/icon_premium.png', team: 'Echipa Zaga Zaga' }
  ],
  species: [
    { species: 'Crap', record: 12.5, holder: 'Mihai Popescu', date: '2024-03-15', location: 'Lacul Snagov' },
    { species: 'Șalău', record: 8.2, holder: 'Ana Ionescu', date: '2024-02-28', location: 'Dunărea' },
    { species: 'Biban', record: 1.8, holder: 'Alexandru Marin', date: '2024-04-02', location: 'Lacul Herăstrău' },
    { species: 'Platca', record: 3.2, holder: 'Maria Popa', date: '2024-01-20', location: 'Lacul Cernica' }
  ]
};

const mockTeams = [
  { name: 'Echipa Zaga Zaga', members: 12, totalWeight: 156.7, rank: 1, color: 'bg-blue-500' },
  { name: 'Pescarii Dunarii', members: 8, totalWeight: 134.2, rank: 2, color: 'bg-green-500' },
  { name: 'Lacul Snagov', members: 15, totalWeight: 98.4, rank: 3, color: 'bg-purple-500' }
];

const Leaderboards = () => {
  const [activeTab, setActiveTab] = useState('overall');
  const [timeframe, setTimeframe] = useState('all-time');
  const [selectedSpecies, setSelectedSpecies] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-amber-600" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            🏆 Leaderboards & Recorduri
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Urmărește cele mai mari capturi din România și concurează pentru 
            locul de frunte în clasamentele noastre.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Timeframe Selector */}
          <div className="flex justify-center">
            <div className="bg-muted/50 p-1 rounded-lg">
              {['all-time', 'monthly', 'weekly'].map(period => (
                <button
                  key={period}
                  onClick={() => setTimeframe(period)}
                  className={`px-4 py-2 rounded-md text-sm transition-colors ${
                    timeframe === period 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {period === 'all-time' ? 'Tot Timpul' : 
                   period === 'monthly' ? 'Luna Aceasta' : 'Săptămâna Aceasta'}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Specie:</label>
              <select 
                value={selectedSpecies} 
                onChange={(e) => setSelectedSpecies(e.target.value)}
                className="px-3 py-1 border border-border rounded-md bg-background text-foreground text-sm"
              >
                <option value="all">Toate speciile</option>
                <option value="crap">Crap</option>
                <option value="salau">Șalău</option>
                <option value="biban">Biban</option>
                <option value="platca">Platca</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Locație:</label>
              <select 
                value={selectedLocation} 
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-3 py-1 border border-border rounded-md bg-background text-foreground text-sm"
              >
                <option value="all">Toate locațiile</option>
                <option value="snagov">Lacul Snagov</option>
                <option value="dunarea">Dunărea</option>
                <option value="herastrau">Lacul Herăstrău</option>
                <option value="cernica">Lacul Cernica</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-muted/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('overall')}
              className={`px-6 py-2 rounded-md transition-colors ${
                activeTab === 'overall' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Trophy className="w-4 h-4 inline mr-2" />
              Clasament General
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-6 py-2 rounded-md transition-colors ${
                activeTab === 'monthly' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Luna Aceasta
            </button>
            <button
              onClick={() => setActiveTab('species')}
              className={`px-6 py-2 rounded-md transition-colors ${
                activeTab === 'species' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Target className="w-4 h-4 inline mr-2" />
              Recorduri pe Specii
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`px-6 py-2 rounded-md transition-colors ${
                activeTab === 'teams' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Echipe
            </button>
          </div>
        </div>

        {/* Overall Leaderboard */}
        {activeTab === 'overall' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Clasament General</h2>
              <p className="text-muted-foreground">
                Top pescari după greutatea totală a capturilor
              </p>
            </div>

            <div className="space-y-4">
              {mockLeaderboards.overall.map((angler) => (
                <div key={angler.name} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex items-center justify-center w-12 h-12 mr-4">
                        {getRankIcon(angler.rank)}
                      </div>
                      <img 
                        src={angler.avatar} 
                        alt={angler.name}
                        className="w-12 h-12 rounded-full object-cover mr-4"
                        loading="lazy"
                        decoding="async"
                      />
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{angler.name}</h3>
                        <p className="text-sm text-muted-foreground">{angler.team}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{angler.totalWeight} kg</div>
                      <div className="text-sm text-muted-foreground">{angler.totalFish} pești</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly Leaderboard */}
        {activeTab === 'monthly' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Luna Aceasta</h2>
              <p className="text-muted-foreground">
                Cele mai bune performanțe din luna curentă
              </p>
            </div>

            <div className="space-y-4">
              {mockLeaderboards.monthly.map((angler) => (
                <div key={angler.name} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex items-center justify-center w-12 h-12 mr-4">
                        {getRankIcon(angler.rank)}
                      </div>
                      <img 
                        src={angler.avatar} 
                        alt={angler.name}
                        className="w-12 h-12 rounded-full object-cover mr-4"
                        loading="lazy"
                        decoding="async"
                      />
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{angler.name}</h3>
                        <p className="text-sm text-muted-foreground">{angler.team}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{angler.weight} kg</div>
                      <div className="text-sm text-muted-foreground">{angler.fish} pești • {angler.species}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Species Records */}
        {activeTab === 'species' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Recorduri pe Specii</h2>
              <p className="text-muted-foreground">
                Cele mai mari capturi pentru fiecare specie
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mockLeaderboards.species.map((record) => (
                <div key={record.species} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-foreground">{record.species}</h3>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{record.record} kg</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Users className="w-4 h-4 mr-2" />
                      <span>{record.holder}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{new Date(record.date).toLocaleDateString('ro-RO')}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{record.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teams Leaderboard */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Clasament Echipe</h2>
            <p className="text-muted-foreground">
                Cele mai performante echipe de pescari
              </p>
            </div>

            <div className="space-y-4">
              {mockTeams.map((team) => (
                <div key={team.name} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex items-center justify-center w-12 h-12 mr-4">
                        {getRankIcon(team.rank)}
                      </div>
                      <div className={`w-12 h-12 rounded-full ${team.color} flex items-center justify-center mr-4`}>
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{team.name}</h3>
                        <p className="text-sm text-muted-foreground">{team.members} membri</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{team.totalWeight} kg</div>
                      <div className="text-sm text-muted-foreground">total capturi</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Development Note */}
        <div className="mt-16 text-center">
          <div className="bg-muted/50 p-6 rounded-2xl max-w-2xl mx-auto">
            <h3 className="text-lg font-bold mb-2">🚧 Schiță de Dezvoltare</h3>
            <p className="text-muted-foreground text-sm">
              Această pagină este o schiță funcțională care demonstrează design-ul și structura 
              pentru leaderboards și recorduri. Funcționalitatea completă va fi implementată 
              în următoarele faze de dezvoltare.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboards;
