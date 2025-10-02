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
      {
        id: '1',
        categoryId: '1',
        title: 'Cea mai bună momelă pentru crap la Snagov',
        content: 'Am fost la Snagov weekend-ul trecut și am prins 3 crapi frumoși cu...',
        author: 'PescarExpert',
        authorRank: 'expert',
        replies: 23,
        views: 1567,
        isPinned: true,
        isLocked: false,
        createdAt: '2024-01-15T10:30:00Z',
        lastPost: {
          id: '23',
          author: 'CrapMaster',
          authorRank: 'maestru',
          time: '15m',
          content: 'Excelent sfat! Am încercat și eu...'
        }
      },
      {
        id: '2',
        categoryId: '1',
        title: 'Pescuitul la păstrăv în Carpați - ghid complet',
        content: 'Voi face un ghid detaliat pentru pescuitul la păstrăv în munții Carpați...',
        author: 'TroutMaster',
        authorRank: 'maestru',
        replies: 89,
        views: 3445,
        isPinned: false,
        isLocked: false,
        createdAt: '2024-01-14T14:20:00Z',
        lastPost: {
          id: '89',
          author: 'MountainFisher',
          authorRank: 'pescar',
          time: '3h',
          content: 'Mulțumesc pentru ghid! Foarte util...'
        }
      }
    ];
  }

  private getDefaultPosts(): ForumPost[] {
    return [
      {
        id: '1',
        topicId: '1',
        content: 'Am fost la Snagov weekend-ul trecut și am prins 3 crapi frumoși cu momele de porumb. Cea mai bună a fost porumbul dulce cu miros de vanilie.',
        author: 'PescarExpert',
        authorRank: 'expert',
        createdAt: '2024-01-15T10:30:00Z',
        likes: 12,
        dislikes: 0
      },
      {
        id: '23',
        topicId: '1',
        content: 'Excelent sfat! Am încercat și eu porumbul cu vanilie și chiar funcționează. Multumesc pentru recomandare!',
        author: 'CrapMaster',
        authorRank: 'maestru',
        createdAt: '2024-01-15T15:45:00Z',
        likes: 5,
        dislikes: 0
      }
    ];
  }

  // Public methods
  getCategories(): ForumCategory[] {
    try {
      const topics = this.getTopics();
      const posts = this.getPosts();
      
      return [
      {
        id: '1',
        name: 'Pescuit în Apă Dulce',
        description: 'Discuții despre pescuitul în râuri, lacuri și bălți din România',
        icon: '🎣',
        isCollapsed: false,
        totalTopics: topics.filter(t => t.categoryId === '1').length,
        totalPosts: posts.filter(p => topics.find(t => t.id === p.topicId)?.categoryId === '1').length,
        lastPost: {
          topicId: '1',
          topicTitle: 'Cea mai bună momelă pentru crap la Snagov',
          author: 'CrapMaster',
          time: '15m'
        },
        subcategories: [
          {
            id: '1-1',
            name: 'Pescuit la Crap',
            description: 'Tehnici, momeli și echipament pentru pescuitul la crap',
            topicCount: 234,
            postCount: 1567,
            lastPost: {
              topicId: '1',
              topicTitle: 'Cea mai bună momelă pentru crap la Snagov',
              author: 'PescarExpert',
              time: '15m'
            }
          },
          {
            id: '1-2',
            name: 'Pescuit la Păstrăv',
            description: 'Locații, sezoane și tactici pentru păstrăv',
            topicCount: 89,
            postCount: 445,
            lastPost: {
              topicId: '2',
              topicTitle: 'Pescuitul la păstrăv în Carpați - ghid complet',
              author: 'TroutMaster',
              time: '3h'
            }
          }
        ]
      },
      {
        id: '3',
        name: 'Echipament și Accesorii',
        description: 'Reviews, recomandări și discuții despre echipamentul de pescuit',
        icon: '🎯',
        isCollapsed: false,
        totalTopics: 78,
        totalPosts: 334,
        lastPost: {
          topicId: '3',
          topicTitle: 'Lansete și Mulinete - Reviews, comparații și recomandări',
          author: 'EquipmentPro',
          time: '1h'
        },
        subcategories: [
          {
            id: '3-1',
            name: 'Lansete și Mulinete',
            description: 'Reviews, comparații și recomandări',
            topicCount: 78,
            postCount: 334,
            lastPost: {
              topicId: '3',
              topicTitle: 'Lansete și Mulinete - Reviews, comparații și recomandări',
              author: 'EquipmentPro',
              time: '1h'
            }
          },
          {
            id: '3-2',
            name: 'Momeli și Nade',
            description: 'Artificiale, naturale și DIY',
            topicCount: 156,
            postCount: 892,
            lastPost: {
              topicId: '4',
              topicTitle: 'Momeli și Nade - Artificiale, naturale și DIY',
              author: 'MomeliMaster',
              time: '4h'
            }
          }
        ]
      }
    ];
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  getForumStats() {
    return {
      totalTopics: 567,
      totalPosts: 3247,
      totalMembers: 1247,
      onlineUsers: 47
    };
  }

  toggleCategoryCollapse(categoryId: string): void {
    const stored = localStorage.getItem('forum-categories-collapsed');
    const collapsed = stored ? JSON.parse(stored) : {};
    collapsed[categoryId] = !collapsed[categoryId];
    localStorage.setItem('forum-categories-collapsed', JSON.stringify(collapsed));
  }

  getTopicsByCategory(categoryId: string): ForumTopic[] {
    return this.getTopics().filter(topic => topic.categoryId === categoryId);
  }

  getPostsByTopic(topicId: string): ForumPost[] {
    return this.getPosts().filter(post => post.topicId === topicId);
  }

  createTopic(topic: Omit<ForumTopic, 'id' | 'createdAt'>): ForumTopic {
    const topics = this.getTopics();
    const newTopic: ForumTopic = {
      ...topic,
      id: (topics.length + 1).toString(),
      createdAt: new Date().toISOString()
    };
    topics.push(newTopic);
    this.setTopics(topics);
    return newTopic;
  }

  createPost(post: Omit<ForumPost, 'id' | 'createdAt'>): ForumPost {
    const posts = this.getPosts();
    const newPost: ForumPost = {
      ...post,
      id: (posts.length + 1).toString(),
      createdAt: new Date().toISOString()
    };
    posts.push(newPost);
    this.setPosts(posts);
    return newPost;
  }

  getUser(userId: string) {
    // Mock user data
    return {
      id: userId,
      username: 'TestUser',
      email: 'test@example.com',
      rank: 'pescar',
      isAdmin: false
    };
  }
}

export const forumStorage = new ForumStorage();