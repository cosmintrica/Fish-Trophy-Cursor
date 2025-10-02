// Service pentru gestionarea datelor forum-ului (mock pentru dezvoltare)
// Va fi înlocuit cu Supabase în producție

export interface ForumTopic {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  author: string;
  authorRank: string;
  authorAvatar?: string;
  replies: number;
  views: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  lastPost: {
    id: string;
    author: string;
    authorRank: string;
    time: string;
    content: string;
  };
}

export interface ForumPost {
  id: string;
  topicId: string;
  content: string;
  author: string;
  authorRank: string;
  authorAvatar?: string;
  createdAt: string;
  editedAt?: string;
  likes: number;
  dislikes: number;
}

export interface ForumSubcategory {
  id: string;
  name: string;
  description: string;
  topicCount: number;
  postCount: number;
  lastPost?: {
    topicId: string;
    topicTitle: string;
    author: string;
    time: string;
  };
}

export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  isCollapsed?: boolean;
  subcategories: ForumSubcategory[];
  totalTopics: number;
  totalPosts: number;
  lastPost?: {
    topicId: string;
    topicTitle: string;
    author: string;
    time: string;
  };
}

// Mock storage în localStorage
class ForumStorage {
  private getTopics(): ForumTopic[] {
    const stored = localStorage.getItem('forum-topics');
    const topics = stored ? JSON.parse(stored) : this.getDefaultTopics();
    
    // Dacă localStorage e gol, salvează datele default
    if (!stored) {
      this.setTopics(topics);
    }
    
    return topics;
  }

  private setTopics(topics: ForumTopic[]): void {
    localStorage.setItem('forum-topics', JSON.stringify(topics));
  }

  private getPosts(): ForumPost[] {
    const stored = localStorage.getItem('forum-posts');
    const posts = stored ? JSON.parse(stored) : this.getDefaultPosts();
    
    // Dacă localStorage e gol, salvează datele default
    if (!stored) {
      this.setPosts(posts);
    }
    
    return posts;
  }

  private setPosts(posts: ForumPost[]): void {
    localStorage.setItem('forum-posts', JSON.stringify(posts));
  }

  private getDefaultTopics(): ForumTopic[] {
    return [
      // Pescuit Crap
      {
        id: '1',
        categoryId: 'tehnici-crap',
        title: 'Captură excepțională de crap la Snagov - 8.5kg!',
        content: 'Salut pescari! Ieri am avut o captură incredibilă la Snagov. Un crap de 8.5kg pe boilie de capsuni. A luptat aproape 20 de minute! Vă las câteva poze și detalii despre echipamentul folosit...',
        author: 'PescarExpert',
        authorRank: 'expert',
        replies: 23,
        views: 456,
        isPinned: true,
        isLocked: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        lastPost: {
          id: 'p1',
          author: 'CrapMaster',
          authorRank: 'maestru',
          time: 'acum 15m',
          content: 'Felicitări pentru captură! Ce lanseta ai folosit?'
        }
      },
      {
        id: '2',
        categoryId: 'momeli-crap',
        title: 'Cele mai bune momeli pentru crap în această perioadă',
        content: 'Ce momeli recomandați pentru crap în această perioadă? Eu am avut succes cu boilies de capsuni și porumb fermentat.',
        author: 'MomeliSpecialist',
        authorRank: 'maestru',
        replies: 45,
        views: 892,
        isPinned: false,
        isLocked: false,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        lastPost: {
          id: 'p2',
          author: 'FeederPro',
          authorRank: 'pescar',
          time: 'acum 1h',
          content: 'Eu recomand pellets de halibut, merg foarte bine acum.'
        }
      },
      {
        id: '3',
        categoryId: 'echipament-crap',
        title: 'Review lansete Nash Dwarf - Perfecte pentru crap!',
        content: 'Am testat noile lansete Nash Dwarf timp de 3 luni. Iată părerea mea detaliată...',
        author: 'CrapGear',
        authorRank: 'expert',
        replies: 18,
        views: 324,
        isPinned: false,
        isLocked: false,
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        lastPost: {
          id: 'p3',
          author: 'EquipmentReviewer',
          authorRank: 'maestru',
          time: 'acum 2h',
          content: 'Excelent review! Ce părere ai despre mulineta?'
        }
      },
      // Pescuit Păstrăv
      {
        id: '4',
        categoryId: 'pastrav-munte',
        title: 'Păstrăvi frumoși pe râul Argeș',
        content: 'Weekend-ul trecut am fost pe Argeș și am prins câțiva păstrăvi frumoși. Apa era perfectă, vremea ideală.',
        author: 'TroutMaster',
        authorRank: 'expert',
        replies: 12,
        views: 234,
        isPinned: false,
        isLocked: false,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        lastPost: {
          id: 'p4',
          author: 'MunteanPescar',
          authorRank: 'pescar',
          time: 'acum 3h',
          content: 'Ce momeală ai folosit? Eu încerc cu viermi dar fără succes.'
        }
      },
      {
        id: '5',
        categoryId: 'pastrav-iazuri',
        title: 'Iazurile de la Mogoșoaia - Experiența mea',
        content: 'Am fost ieri la iazurile de păstrăv de la Mogoșoaia. Prețurile au crescut, dar peștii sunt frumoși...',
        author: 'IazuriExpert',
        authorRank: 'pescar',
        replies: 8,
        views: 156,
        isPinned: false,
        isLocked: false,
        createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        lastPost: {
          id: 'p5',
          author: 'PescuitPlata',
          authorRank: 'incepator',
          time: 'acum 5h',
          content: 'Cât costă acum o zi de pescuit acolo?'
        }
      },
      // Echipament
      {
        id: '6',
        categoryId: 'lansete-mulinete',
        title: 'Comparație lansete: Shimano vs Daiwa vs Abu Garcia',
        content: 'Am testat 3 lansete în aceeași categorie de preț. Iată concluziile...',
        author: 'EquipmentTester',
        authorRank: 'maestru',
        replies: 67,
        views: 1234,
        isPinned: true,
        isLocked: false,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        lastPost: {
          id: 'p6',
          author: 'GearHead',
          authorRank: 'expert',
          time: 'acum 30m',
          content: 'Excelentă comparație! Ai testat și Penn?'
        }
      },
      // Locații
      {
        id: '7',
        categoryId: 'lacuri-balti',
        title: 'Lacul Snagov - Ghid complet 2025',
        content: 'Tot ce trebuie să știi despre pescuitul pe Snagov: locuri, tehnici, regulament...',
        author: 'SnagovGuide',
        authorRank: 'expert',
        replies: 89,
        views: 2156,
        isPinned: true,
        isLocked: false,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        lastPost: {
          id: 'p7',
          author: 'LocalFisher',
          authorRank: 'pescar',
          time: 'acum 1h',
          content: 'Mulțumesc pentru ghid! Știi cumva dacă se poate pescui noaptea?'
        }
      },
      // Mai multe topicuri pentru diversitate
      {
        id: '8',
        categoryId: 'rauri',
        title: 'Dunărea la Giurgiu - Experiențe și sfaturi',
        content: 'Am pescuit weekend-ul trecut pe Dunăre la Giurgiu. Iată ce am învățat despre curenți și locurile bune...',
        author: 'DanubeExplorer',
        authorRank: 'expert',
        replies: 34,
        views: 678,
        isPinned: false,
        isLocked: false,
        createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        lastPost: {
          id: 'p8',
          author: 'RiverMaster',
          authorRank: 'maestru',
          time: 'acum 4h',
          content: 'Excelente sfaturi! Ai încercat și zona de la Călărași?'
        }
      },
      {
        id: '9',
        categoryId: 'accesorii',
        title: 'Review scaun de pescuit Matrix Deluxe',
        content: 'După 6 luni de folosire intensă, iată părerea mea despre acest scaun...',
        author: 'ComfortFisher',
        authorRank: 'pescar',
        replies: 16,
        views: 245,
        isPinned: false,
        isLocked: false,
        createdAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
        lastPost: {
          id: 'p9',
          author: 'GearCollector',
          authorRank: 'expert',
          time: 'acum 6h',
          content: 'Mulțumesc pentru review! Cât te-a costat?'
        }
      },
      {
        id: '10',
        categoryId: 'concursuri',
        title: '🏆 Concurs Fish Trophy - Martie 2025',
        content: 'Se apropie concursul lunar Fish Trophy! Înscrierea se face până pe 25 martie...',
        author: 'FishTrophyAdmin',
        authorRank: 'maestru',
        replies: 67,
        views: 1234,
        isPinned: true,
        isLocked: false,
        createdAt: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
        lastPost: {
          id: 'p10',
          author: 'CompetitionLover',
          authorRank: 'expert',
          time: 'acum 2h',
          content: 'Mă înscriu și eu! Ce premii sunt anul acesta?'
        }
      },
      {
        id: '11',
        categoryId: 'discutii-generale',
        title: 'Vremea și influența asupra pescuitului',
        content: 'Am observat că vremea influențează mult activitatea peștilor. Ce părere aveți?',
        author: 'WeatherWatcher',
        authorRank: 'pescar',
        replies: 28,
        views: 456,
        isPinned: false,
        isLocked: false,
        createdAt: new Date(Date.now() - 144 * 60 * 60 * 1000).toISOString(),
        lastPost: {
          id: 'p11',
          author: 'MeteoFisher',
          authorRank: 'expert',
          time: 'acum 8h',
          content: 'Absolut! Presiunea atmosferică e foarte importantă.'
        }
      },
      {
        id: '12',
        categoryId: 'tehnici-crap',
        title: 'Montajul Ronnie Rig - Tutorial complet',
        content: 'Tutorial pas cu pas pentru montajul Ronnie Rig, unul dintre cele mai eficiente montaje pentru crap...',
        author: 'RigMaster',
        authorRank: 'maestru',
        replies: 45,
        views: 890,
        isPinned: false,
        isLocked: false,
        createdAt: new Date(Date.now() - 168 * 60 * 60 * 1000).toISOString(),
        lastPost: {
          id: 'p12',
          author: 'CarpTechnician',
          authorRank: 'expert',
          time: 'acum 12h',
          content: 'Foarte util! Ai poze cu montajul finalizat?'
        }
      },
      // Topicuri suplimentare pentru toate categoriile
      {
        id: '13',
        categoryId: 'pastrav-munte',
        title: 'Râul Olt la Făgăraș - Păstrăvi sălbatici',
        content: 'Am explorat râul Olt în zona Făgăraș. Păstrăvi frumoși, apa cristalină, peisaj de vis...',
        author: 'MountainAngler',
        authorRank: 'expert',
        replies: 19,
        views: 387,
        isPinned: false,
        isLocked: false,
        createdAt: new Date(Date.now() - 192 * 60 * 60 * 1000).toISOString(),
        lastPost: {
          id: 'p13',
          author: 'AlpineFisher',
          authorRank: 'pescar',
          time: 'acum 6h',
          content: 'Ce momeală recomanzi pentru păstrăvii sălbatici?'
        }
      },
      {
        id: '14',
        categoryId: 'accesorii',
        title: 'Senzori de mușcătură - Comparație 2025',
        content: 'Am testat 5 modele de senzori: Delkim, Fox, Nash, JRC și Carp Pro. Iată concluziile...',
        author: 'SensorTester',
        authorRank: 'maestru',
        replies: 31,
        views: 567,
        isPinned: false,
        isLocked: false,
        createdAt: new Date(Date.now() - 216 * 60 * 60 * 1000).toISOString(),
        lastPost: {
          id: 'p14',
          author: 'TechSavvy',
          authorRank: 'expert',
          time: 'acum 3h',
          content: 'Delkim sunt scumpi dar merită investiția!'
        }
      },
      {
        id: '15',
        categoryId: 'discutii-generale',
        title: 'Întâlnire pescari București - Aprilie 2025',
        content: 'Organizez o întâlnire a pescarilor din București. Cine e interesat să participe?',
        author: 'BucharestOrganizer',
        authorRank: 'expert',
        replies: 42,
        views: 789,
        isPinned: true,
        isLocked: false,
        createdAt: new Date(Date.now() - 240 * 60 * 60 * 1000).toISOString(),
        lastPost: {
          id: 'p15',
          author: 'LocalFriend',
          authorRank: 'pescar',
          time: 'acum 1h',
          content: 'Eu sunt interesat! Unde și când?'
        }
      },
      {
        id: '16',
        categoryId: 'rauri',
        title: 'Argeșul la Pitești - Ghid pentru începători',
        content: 'Pentru cei care vor să înceapă pescuitul pe Argeș, iată un ghid complet...',
        author: 'ArgesGuide',
        authorRank: 'expert',
        replies: 23,
        views: 445,
        isPinned: false,
        isLocked: false,
        createdAt: new Date(Date.now() - 264 * 60 * 60 * 1000).toISOString(),
        lastPost: {
          id: 'p16',
          author: 'BeginnerFisher',
          authorRank: 'incepator',
          time: 'acum 5h',
          content: 'Mulțumesc! E permis pescuitul și în timpul săptămânii?'
        }
      }
    ];
  }

  private getDefaultPosts(): ForumPost[] {
    return [
      {
        id: 'p1',
        topicId: '1',
        content: 'Felicitări pentru captură! Ce lanseta ai folosit? Și ce fir? Mă gândesc să îmi iau echipament nou pentru crap.',
        author: 'CrapMaster',
        authorRank: 'maestru',
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        likes: 5,
        dislikes: 0
      },
      {
        id: 'p2',
        topicId: '2',
        content: 'Eu recomand pellets de halibut, merg foarte bine acum. Am prins 3 carpi weekend-ul trecut.',
        author: 'FeederPro',
        authorRank: 'pescar',
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        likes: 8,
        dislikes: 1
      },
      {
        id: 'p3',
        topicId: '4',
        content: 'Ce momeală ai folosit? Eu încerc cu viermi dar fără succes. Poate ai vreo recomandare?',
        author: 'MunteanPescar',
        authorRank: 'pescar',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        likes: 2,
        dislikes: 0
      },
      {
        id: 'p4',
        topicId: '1',
        content: 'Lanseta e o Fox Warrior S 12ft 3.5lb, cu mulineta Shimano Baitrunner DL 10000. Firul e Gardner GT-HD 0.35mm. Combinația perfectă pentru crap mare!',
        author: 'PescarExpert',
        authorRank: 'expert',
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        likes: 12,
        dislikes: 0
      },
      {
        id: 'p5',
        topicId: '2',
        content: 'Și eu confirm! Pellets de halibut sunt top. Încearcă să le înmuiezi în Liquid Food înainte. Face diferența!',
        author: 'BaitExpert',
        authorRank: 'expert',
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        likes: 6,
        dislikes: 0
      },
      {
        id: 'p6',
        topicId: '6',
        content: 'Shimano câștigă la durabilitate, dar Daiwa are un raport calitate-preț mai bun. Abu Garcia e pentru cei cu buget mai mic.',
        author: 'GearReviewer',
        authorRank: 'maestru',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        likes: 15,
        dislikes: 2
      },
      {
        id: 'p7',
        topicId: '7',
        content: 'Pe Snagov pescuitul de noapte e permis, dar trebuie să ai autorizație specială. Contactează administratorul lacului.',
        author: 'SnagovGuide',
        authorRank: 'expert',
        createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        likes: 8,
        dislikes: 0
      },
      {
        id: 'p8',
        topicId: '8',
        content: 'La Călărași e foarte bine, dar accesul e mai dificil. Recomand să mergi cu cineva care știe zona.',
        author: 'DanubeExplorer',
        authorRank: 'expert',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        likes: 4,
        dislikes: 0
      },
      {
        id: 'p9',
        topicId: '9',
        content: 'L-am luat cu 450 lei de la Fishing Megastore. Calitate foarte bună pentru banii ăștia!',
        author: 'ComfortFisher',
        authorRank: 'pescar',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        likes: 3,
        dislikes: 0
      },
      {
        id: 'p10',
        topicId: '10',
        content: 'Premiul 1: Set complet lansete + mulinete Nash. Premiul 2: Cort Fox EOS 2 persoane. Premiul 3: Boilies pentru un an!',
        author: 'FishTrophyAdmin',
        authorRank: 'administrator',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        likes: 23,
        dislikes: 0
      },
      {
        id: 'p11',
        topicId: '11',
        content: 'Eu urmăresc barometrul înainte să merg la pescuit. Când scade presiunea, peștii devin mai activi.',
        author: 'WeatherWatcher',
        authorRank: 'pescar',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        likes: 7,
        dislikes: 1
      },
      {
        id: 'p12',
        topicId: '12',
        content: 'Poze urmează în curând! Montajul e foarte eficient pentru peștii precauți. Am prins 5 carpi cu el săptămâna trecută.',
        author: 'RigMaster',
        authorRank: 'maestru',
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        likes: 9,
        dislikes: 0
      },
      // Mai multe postări pentru topicuri diverse
      {
        id: 'p13',
        topicId: '1',
        content: 'Și eu am prins ceva similar pe Snagov! 7.2kg pe boilie de ananas. Locația face diferența!',
        author: 'SnagovPro',
        authorRank: 'expert',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        likes: 8,
        dislikes: 0
      },
      {
        id: 'p14',
        topicId: '2',
        content: 'Pentru această perioadă recomand și tiger nuts. Le înmuiez 24h și le fierb 20 min. Rezultate excelente!',
        author: 'NutSpecialist',
        authorRank: 'maestru',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        likes: 11,
        dislikes: 0
      },
      {
        id: 'p15',
        topicId: '6',
        content: 'Penn Spinfisher e o alternativă bună pentru cei cu buget mediu. Am una de 3 ani și merge perfect!',
        author: 'PennUser',
        authorRank: 'pescar',
        createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        likes: 5,
        dislikes: 1
      },
      {
        id: 'p16',
        topicId: '10',
        content: 'Când se deschid înscrierile? Vreau să particip cu echipa mea din Constanța!',
        author: 'TeamCaptain',
        authorRank: 'expert',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        likes: 4,
        dislikes: 0
      },
      {
        id: 'p17',
        topicId: '7',
        content: 'Pe Snagov e interzis cu barca după 22:00. Doar de pe mal poți pescui noaptea, cu autorizație.',
        author: 'RegulatiiExpert',
        authorRank: 'moderator',
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        likes: 12,
        dislikes: 0
      },
      // Postări pentru topicurile noi
      {
        id: 'p18',
        topicId: '13',
        content: 'Pentru păstrăvii sălbatici recomand viermi de pământ și muste artificiale. Evită momelile mari!',
        author: 'MountainAngler',
        authorRank: 'expert',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        likes: 7,
        dislikes: 0
      },
      {
        id: 'p19',
        topicId: '14',
        content: 'Delkim TXi-D sunt top! Costă mult dar detectează și cea mai mică mușcătură. Investiție pe viață!',
        author: 'SensorTester',
        authorRank: 'maestru',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        likes: 9,
        dislikes: 1
      },
      {
        id: 'p20',
        topicId: '15',
        content: 'Propun să ne întâlnim la Lacul Herăstrău, sâmbătă 15 aprilie, ora 10:00. Cine vine?',
        author: 'BucharestOrganizer',
        authorRank: 'expert',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        likes: 15,
        dislikes: 0
      },
      {
        id: 'p21',
        topicId: '16',
        content: 'Pe Argeș poți pescui oricând, dar evită weekendurile când e aglomerat. Miercurea e perfectă!',
        author: 'ArgesGuide',
        authorRank: 'expert',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        likes: 6,
        dislikes: 0
      },
      // Conversații multiple pentru același topic
      {
        id: 'p22',
        topicId: '1',
        content: 'Am văzut pozele pe Instagram! Felicitări! Ce adâncime ai pescuit și la ce distanță de mal?',
        author: 'PhotoFan',
        authorRank: 'pescar',
        createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        likes: 3,
        dislikes: 0
      },
      {
        id: 'p23',
        topicId: '2',
        content: 'Eu am încercat și cu porumb dulce conservat. Merge surprinzător de bine, mai ales dimineața!',
        author: 'SimpleBait',
        authorRank: 'incepator',
        createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        likes: 5,
        dislikes: 0
      },
      {
        id: 'p24',
        topicId: '10',
        content: 'Înscrierile se deschid pe 1 martie! Urmăriți site-ul Fish Trophy pentru detalii complete.',
        author: 'FishTrophyAdmin',
        authorRank: 'administrator',
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        likes: 18,
        dislikes: 0
      }
    ];
  }

  // Metode publice pentru gestionarea topicurilor
  getTopicsByCategory(categoryId: string): ForumTopic[] {
    return this.getTopics().filter(topic => topic.categoryId === categoryId);
  }

  getTopicById(topicId: string): ForumTopic | null {
    return this.getTopics().find(topic => topic.id === topicId) || null;
  }

  createTopic(categoryId: string, title: string, content: string, author: string, authorRank: string): ForumTopic {
    const topics = this.getTopics();
    const newTopic: ForumTopic = {
      id: Date.now().toString(),
      categoryId,
      title,
      content,
      author,
      authorRank,
      replies: 0,
      views: 0,
      isPinned: false,
      isLocked: false,
      createdAt: new Date().toISOString(),
      lastPost: {
        id: 'initial',
        author,
        authorRank,
        time: 'acum',
        content: content.substring(0, 100) + '...'
      }
    };
    
    topics.unshift(newTopic); // Adaugă la început
    this.setTopics(topics);
    return newTopic;
  }

  // Metode pentru postări
  getPostsByTopic(topicId: string): ForumPost[] {
    return this.getPosts().filter(post => post.topicId === topicId);
  }

  createPost(topicId: string, content: string, author: string, authorRank: string): ForumPost {
    const posts = this.getPosts();
    const topics = this.getTopics();
    
    const newPost: ForumPost = {
      id: Date.now().toString(),
      topicId,
      content,
      author,
      authorRank,
      createdAt: new Date().toISOString(),
      likes: 0,
      dislikes: 0
    };
    
    posts.push(newPost);
    this.setPosts(posts);
    
    // Actualizează statisticile topicului
    const topicIndex = topics.findIndex(t => t.id === topicId);
    if (topicIndex !== -1) {
      topics[topicIndex].replies += 1;
      topics[topicIndex].lastPost = {
        id: newPost.id,
        author,
        authorRank,
        time: 'acum',
        content: content.substring(0, 100) + '...'
      };
      this.setTopics(topics);
    }
    
    return newPost;
  }

  // Actualizare views pentru topic
  incrementTopicViews(topicId: string): void {
    const topics = this.getTopics();
    const topicIndex = topics.findIndex(t => t.id === topicId);
    if (topicIndex !== -1) {
      topics[topicIndex].views += 1;
      this.setTopics(topics);
    }
  }

  // Like/Dislike postări
  likePost(postId: string): void {
    const posts = this.getPosts();
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex !== -1) {
      posts[postIndex].likes += 1;
      this.setPosts(posts);
    }
  }

  dislikePost(postId: string): void {
    const posts = this.getPosts();
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex !== -1) {
      posts[postIndex].dislikes += 1;
      this.setPosts(posts);
    }
  }

  // Categorii cu statistici și sub-forumuri
  getCategories(): ForumCategory[] {
    const topics = this.getTopics();
    const posts = this.getPosts();
    const collapsed = this.getCollapsedState();
    
    // Stats calculation complete

    return [
      {
        id: 'pescuit-crap',
        name: 'Pescuit la Crap',
        description: 'Tehnici, momeli și echipament pentru pescuitul la crap',
        icon: '🐟',
        isCollapsed: collapsed['pescuit-crap'] || false,
        subcategories: [
          {
            id: 'tehnici-crap',
            name: 'Tehnici și Tactici',
            description: 'Metode de pescuit, montaje și tactici pentru crap',
            topicCount: topics.filter(t => t.categoryId === 'tehnici-crap').length,
            postCount: posts.filter(p => {
              const topic = topics.find(t => t.id === p.topicId);
              return topic && topic.categoryId === 'tehnici-crap';
            }).length,
            lastPost: this.getLastPostForCategory('tehnici-crap')
          },
          {
            id: 'momeli-crap',
            name: 'Momeli și Arome',
            description: 'Boilies, pellets, momeli naturale și arome',
            topicCount: topics.filter(t => t.categoryId === 'momeli-crap').length,
            postCount: posts.filter(p => {
              const topic = topics.find(t => t.id === p.topicId);
              return topic && topic.categoryId === 'momeli-crap';
            }).length,
            lastPost: this.getLastPostForCategory('momeli-crap')
          },
          {
            id: 'echipament-crap',
            name: 'Echipament Crap',
            description: 'Lansete, mulinete, rod pod-uri și accesorii',
            topicCount: topics.filter(t => t.categoryId === 'echipament-crap').length,
            postCount: posts.filter(p => {
              const topic = topics.find(t => t.id === p.topicId);
              return topic && topic.categoryId === 'echipament-crap';
            }).length,
            lastPost: this.getLastPostForCategory('echipament-crap')
          }
        ],
        totalTopics: topics.filter(t => ['tehnici-crap', 'momeli-crap', 'echipament-crap'].includes(t.categoryId)).length,
        totalPosts: posts.filter(p => {
          const topic = topics.find(t => t.id === p.topicId);
          return topic && ['tehnici-crap', 'momeli-crap', 'echipament-crap'].includes(topic.categoryId);
        }).length,
        lastPost: this.getLastPostForCategories(['tehnici-crap', 'momeli-crap', 'echipament-crap'])
      },
      {
        id: 'pescuit-pastrav',
        name: 'Pescuit la Păstrăv',
        description: 'Locații, sezoane și tactici pentru păstrăv',
        icon: '🐠',
        isCollapsed: collapsed['pescuit-pastrav'] || false,
        subcategories: [
          {
            id: 'pastrav-munte',
            name: 'Păstrăv de Munte',
            description: 'Râuri montane, păstrăv sălbatic și tehnici specifice',
            topicCount: topics.filter(t => t.categoryId === 'pastrav-munte').length,
            postCount: posts.filter(p => topics.find(t => t.id === p.topicId)?.categoryId === 'pastrav-munte').length,
            lastPost: this.getLastPostForCategory('pastrav-munte')
          },
          {
            id: 'pastrav-iazuri',
            name: 'Iazuri de Păstrăv',
            description: 'Pescuit la plată, iazuri comerciale și preturi',
            topicCount: topics.filter(t => t.categoryId === 'pastrav-iazuri').length,
            postCount: posts.filter(p => topics.find(t => t.id === p.topicId)?.categoryId === 'pastrav-iazuri').length,
            lastPost: this.getLastPostForCategory('pastrav-iazuri')
          }
        ],
        totalTopics: topics.filter(t => ['pastrav-munte', 'pastrav-iazuri'].includes(t.categoryId)).length,
        totalPosts: posts.filter(p => {
          const topic = topics.find(t => t.id === p.topicId);
          return topic && ['pastrav-munte', 'pastrav-iazuri'].includes(topic.categoryId);
        }).length,
        lastPost: this.getLastPostForCategories(['pastrav-munte', 'pastrav-iazuri'])
      },
      {
        id: 'echipament',
        name: 'Echipament și Accesorii',
        description: 'Reviews, recomandări și discuții despre echipament',
        icon: '🎯',
        isCollapsed: collapsed['echipament'] || false,
        subcategories: [
          {
            id: 'lansete-mulinete',
            name: 'Lansete și Mulinete',
            description: 'Reviews, comparații și recomandări echipament',
            topicCount: topics.filter(t => t.categoryId === 'lansete-mulinete').length,
            postCount: posts.filter(p => topics.find(t => t.id === p.topicId)?.categoryId === 'lansete-mulinete').length,
            lastPost: this.getLastPostForCategory('lansete-mulinete')
          },
          {
            id: 'accesorii',
            name: 'Accesorii și Gadget-uri',
            description: 'Scaune, umbrele, lăzi, senzori și alte accesorii',
            topicCount: topics.filter(t => t.categoryId === 'accesorii').length,
            postCount: posts.filter(p => topics.find(t => t.id === p.topicId)?.categoryId === 'accesorii').length,
            lastPost: this.getLastPostForCategory('accesorii')
          }
        ],
        totalTopics: topics.filter(t => ['lansete-mulinete', 'accesorii'].includes(t.categoryId)).length,
        totalPosts: posts.filter(p => {
          const topic = topics.find(t => t.id === p.topicId);
          return topic && ['lansete-mulinete', 'accesorii'].includes(topic.categoryId);
        }).length,
        lastPost: this.getLastPostForCategories(['lansete-mulinete', 'accesorii'])
      },
      {
        id: 'locatii',
        name: 'Locații de Pescuit',
        description: 'Recomandări și informații despre locații',
        icon: '📍',
        isCollapsed: collapsed['locatii'] || false,
        subcategories: [
          {
            id: 'lacuri-balti',
            name: 'Lacuri și Bălți',
            description: 'Snagov, Herastrau, Cernica și alte lacuri',
            topicCount: topics.filter(t => t.categoryId === 'lacuri-balti').length,
            postCount: posts.filter(p => topics.find(t => t.id === p.topicId)?.categoryId === 'lacuri-balti').length,
            lastPost: this.getLastPostForCategory('lacuri-balti')
          },
          {
            id: 'rauri',
            name: 'Râuri și Canale',
            description: 'Dunărea, Argeș, Olt și alte râuri',
            topicCount: topics.filter(t => t.categoryId === 'rauri').length,
            postCount: posts.filter(p => topics.find(t => t.id === p.topicId)?.categoryId === 'rauri').length,
            lastPost: this.getLastPostForCategory('rauri')
          }
        ],
        totalTopics: topics.filter(t => ['lacuri-balti', 'rauri'].includes(t.categoryId)).length,
        totalPosts: posts.filter(p => {
          const topic = topics.find(t => t.id === p.topicId);
          return topic && ['lacuri-balti', 'rauri'].includes(topic.categoryId);
        }).length,
        lastPost: this.getLastPostForCategories(['lacuri-balti', 'rauri'])
      },
      {
        id: 'comunitate',
        name: 'Comunitate și Evenimente',
        description: 'Discuții generale și evenimente comunitate',
        icon: '👥',
        isCollapsed: collapsed['comunitate'] || false,
        subcategories: [
          {
            id: 'discutii-generale',
            name: 'Discuții Generale',
            description: 'Conversații libere despre pescuit și nu numai',
            topicCount: topics.filter(t => t.categoryId === 'discutii-generale').length,
            postCount: posts.filter(p => topics.find(t => t.id === p.topicId)?.categoryId === 'discutii-generale').length,
            lastPost: this.getLastPostForCategory('discutii-generale')
          },
          {
            id: 'concursuri',
            name: 'Concursuri și Evenimente',
            description: 'Anunțuri și discuții despre concursuri de pescuit',
            topicCount: topics.filter(t => t.categoryId === 'concursuri').length,
            postCount: posts.filter(p => topics.find(t => t.id === p.topicId)?.categoryId === 'concursuri').length,
            lastPost: this.getLastPostForCategory('concursuri')
          }
        ],
        totalTopics: topics.filter(t => ['discutii-generale', 'concursuri'].includes(t.categoryId)).length,
        totalPosts: posts.filter(p => {
          const topic = topics.find(t => t.id === p.topicId);
          return topic && ['discutii-generale', 'concursuri'].includes(topic.categoryId);
        }).length,
        lastPost: this.getLastPostForCategories(['discutii-generale', 'concursuri'])
      }
    ];
  }

  // State pentru categorii collapsed
  private getCollapsedState(): { [key: string]: boolean } {
    const stored = localStorage.getItem('forum-collapsed-categories');
    return stored ? JSON.parse(stored) : {};
  }

  private setCollapsedState(state: { [key: string]: boolean }): void {
    localStorage.setItem('forum-collapsed-categories', JSON.stringify(state));
  }

  toggleCategoryCollapse(categoryId: string): void {
    const current = this.getCollapsedState();
    current[categoryId] = !current[categoryId];
    this.setCollapsedState(current);
  }

  private getLastPostForCategory(categoryId: string): { topicId: string; topicTitle: string; author: string; time: string; } | undefined {
    const topics = this.getTopics().filter(t => t.categoryId === categoryId);
    if (topics.length === 0) return undefined;
    
    const latestTopic = topics.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    return {
      topicId: latestTopic.id,
      topicTitle: latestTopic.title,
      author: latestTopic.lastPost.author,
      time: latestTopic.lastPost.time
    };
  }

  private getLastPostForCategories(categoryIds: string[]): { topicId: string; topicTitle: string; author: string; time: string; } | undefined {
    const topics = this.getTopics().filter(t => categoryIds.includes(t.categoryId));
    if (topics.length === 0) return undefined;
    
    const latestTopic = topics.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    return {
      topicId: latestTopic.id,
      topicTitle: latestTopic.title,
      author: latestTopic.lastPost.author,
      time: latestTopic.lastPost.time
    };
  }

  // Statistici forum
  getForumStats() {
    const topics = this.getTopics();
    const posts = this.getPosts();
    
    return {
      totalTopics: topics.length,
      totalPosts: posts.length,
      totalMembers: 1247, // Static pentru acum
      onlineUsers: 47,
      newestMember: 'DebutantFericit'
    };
  }
}

// Creăm instanța și forțăm inițializarea
const storage = new ForumStorage();

// Forțăm reinițializarea datelor la primul import
if (typeof window !== 'undefined') {
  // Clear old data și reinițializează
  localStorage.removeItem('forum-topics');
  localStorage.removeItem('forum-posts');
  
  // Forțăm încărcarea datelor default
  storage.getTopics();
  storage.getPosts();
}

export const forumStorage = storage;
