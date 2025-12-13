import { useMemo } from 'react';

interface BaseStructuredData {
  '@context': string;
  '@type': string;
}

interface WebsiteStructuredData extends BaseStructuredData {
  '@type': 'WebSite';
  name: string;
  description: string;
  url: string;
  potentialAction: {
    '@type': 'SearchAction';
    target: string;
    'query-input': string;
  };
  publisher: {
    '@type': 'Organization';
    name: string;
    logo: {
      '@type': 'ImageObject';
      url: string;
    };
  };
}

interface OrganizationStructuredData extends BaseStructuredData {
  '@type': 'Organization';
  name: string;
  description: string;
  url: string;
  logo: string;
  sameAs: string[];
  contactPoint: {
    '@type': 'ContactPoint';
    contactType: 'customer service';
    availableLanguage: string[];
  };
  address: {
    '@type': 'PostalAddress';
    addressCountry: string;
  };
}

interface ArticleStructuredData extends BaseStructuredData {
  '@type': 'Article';
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified: string;
  author: {
    '@type': 'Person';
    name: string;
  };
  publisher: {
    '@type': 'Organization';
    name: string;
    logo: {
      '@type': 'ImageObject';
      url: string;
    };
  };
  mainEntityOfPage: {
    '@type': 'WebPage';
    '@id': string;
  };
}

interface RecordStructuredData extends BaseStructuredData {
  '@type': 'SportsEvent';
  name: string;
  description: string;
  startDate: string;
  location: {
    '@type': 'Place';
    name: string;
    address: {
      '@type': 'PostalAddress';
      addressCountry: string;
    };
  };
  organizer: {
    '@type': 'Person';
    name: string;
  };
  sport: string;
  result: {
    '@type': 'SportsResult';
    name: string;
    value: string;
  };
}

interface SpeciesStructuredData extends BaseStructuredData {
  '@type': 'Thing';
  name: string;
  description: string;
  alternateName: string;
  image: string;
  sameAs: string[];
  additionalProperty: {
    '@type': 'PropertyValue';
    name: string;
    value: string;
  }[];
}

export function useStructuredData() {
  const websiteData = useMemo((): WebsiteStructuredData => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Fish Trophy',
    description: 'Platforma Pescarilor din România - Descoperă cele mai bune locații de pescuit, urmărește recordurile și concurează cu alții pescari pasionați.',
    url: 'https://fishtrophy.ro',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://fishtrophy.ro/search?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Fish Trophy',
      logo: {
        '@type': 'ImageObject',
        url: 'https://fishtrophy.ro/icon-512.png'
      }
    }
  }), []);

  const organizationData = useMemo((): OrganizationStructuredData => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Fish Trophy',
    description: 'Platforma Pescarilor din România - Comunitatea pescarilor români',
    url: 'https://fishtrophy.ro',
    logo: 'https://fishtrophy.ro/icon-512.png',
    sameAs: [
      'https://facebook.com/fishtrophy',
      'https://twitter.com/fishtrophy',
      'https://instagram.com/fishtrophy'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Romanian', 'English']
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'RO'
    }
  }), []);

  const createArticleData = (article: {
    headline: string;
    description: string;
    image: string;
    datePublished: string;
    dateModified: string;
    author: string;
    url: string;
  }): ArticleStructuredData => ({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.headline,
    description: article.description,
    image: article.image,
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    author: {
      '@type': 'Person',
      name: article.author
    },
    publisher: {
      '@type': 'Organization',
      name: 'Fish Trophy',
      logo: {
        '@type': 'ImageObject',
        url: 'https://fishtrophy.ro/icon-512.png'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url
    }
  });

  const createRecordData = (record: {
    species: string;
    weight: string;
    angler: string;
    location: string;
    date: string;
    url: string;
  }): RecordStructuredData => ({
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `Record ${record.species} - ${record.weight}`,
    description: `Record de pescuit: ${record.species} de ${record.weight} prins de ${record.angler}`,
    startDate: record.date,
    location: {
      '@type': 'Place',
      name: record.location,
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'RO'
      }
    },
    organizer: {
      '@type': 'Person',
      name: record.angler
    },
    sport: 'Fishing',
    result: {
      '@type': 'SportsResult',
      name: 'Weight',
      value: record.weight
    }
  });

  const createSpeciesData = (species: {
    name: string;
    scientificName: string;
    description: string;
    image: string;
    url: string;
  }): SpeciesStructuredData => ({
    '@context': 'https://schema.org',
    '@type': 'Thing',
    name: species.name,
    description: species.description,
    alternateName: species.scientificName,
    image: species.image,
    sameAs: [
      `https://ro.wikipedia.org/wiki/${encodeURIComponent(species.scientificName)}`,
      `https://en.wikipedia.org/wiki/${encodeURIComponent(species.scientificName)}`
    ],
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Scientific Name',
        value: species.scientificName
      },
      {
        '@type': 'PropertyValue',
        name: 'Type',
        value: 'Fish Species'
      }
    ]
  });

  const navigationData = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'itemListElement': [
      {
        '@type': 'SiteNavigationElement',
        'position': 1,
        'name': 'Forum Pescuit',
        'description': 'Comunitatea pescarilor din România',
        'url': 'https://fishtrophy.ro/forum'
      },
      {
        '@type': 'SiteNavigationElement',
        'position': 2,
        'name': 'Recorduri',
        'description': 'Cele mai mari capturi din România',
        'url': 'https://fishtrophy.ro/records'
      },
      {
        '@type': 'SiteNavigationElement',
        'position': 3,
        'name': 'Specii Pești',
        'description': 'Informații complete despre speciile de pești',
        'url': 'https://fishtrophy.ro/species'
      },
      {
        '@type': 'SiteNavigationElement',
        'position': 4,
        'name': 'Ghid Submisie',
        'description': 'Regulament și ghid pentru adăugarea capturilor',
        'url': 'https://fishtrophy.ro/submission-guide'
      }
    ]
  }), []);

  // BreadcrumbList helper - pentru navigare
  const createBreadcrumbData = (items: Array<{ name: string; url: string }>) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  });

  // ProfilePage helper - pentru profile publice
  const createProfilePageData = (profile: {
    name: string;
    description: string;
    image?: string;
    url: string;
    recordCount?: number;
    catchCount?: number;
  }) => ({
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: profile.name,
      description: profile.description,
      image: profile.image || 'https://fishtrophy.ro/icon-512.png',
      url: profile.url,
      ...(profile.recordCount !== undefined && {
        additionalProperty: [
          {
            '@type': 'PropertyValue',
            name: 'Recorduri',
            value: profile.recordCount.toString()
          },
          ...(profile.catchCount !== undefined ? [{
            '@type': 'PropertyValue',
            name: 'Capturi',
            value: profile.catchCount.toString()
          }] : [])
        ]
      })
    }
  });

  // VideoObject helper - pentru recorduri/capturi cu video
  const createVideoObjectData = (video: {
    name: string;
    description: string;
    thumbnailUrl: string;
    contentUrl: string;
    uploadDate: string;
    duration?: string; // ISO 8601 format (e.g., "PT2M30S" for 2 minutes 30 seconds)
    author?: string;
  }) => ({
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.name,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    contentUrl: video.contentUrl,
    uploadDate: video.uploadDate,
    ...(video.duration && { duration: video.duration }),
    ...(video.author && {
      author: {
        '@type': 'Person',
        name: video.author
      }
    }),
    publisher: {
      '@type': 'Organization',
      name: 'Fish Trophy',
      logo: {
        '@type': 'ImageObject',
        url: 'https://fishtrophy.ro/icon-512.png'
      }
    }
  });

  return {
    websiteData,
    organizationData,
    navigationData,
    createArticleData,
    createRecordData,
    createSpeciesData,
    createBreadcrumbData,
    createProfilePageData,
    createVideoObjectData
  };
}
