/**
 * Topic Skeleton Component
 * Loading placeholder pentru topicuri - subtil și compact
 */

export function TopicSkeleton() {
  return (
    <div 
      className="animate-pulse"
      style={{
        padding: '0.5rem 0.75rem',
        borderBottom: '1px solid #f3f4f6',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        minHeight: '3.5rem'
      }}
    >
      {/* Marker skeleton - mic și subtil */}
      <div 
        style={{
          width: '32px',
          height: '32px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          flexShrink: 0
        }}
      />
      
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title skeleton - mai mic */}
        <div 
          style={{
            height: '14px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            width: '60%',
            marginBottom: '0.375rem'
          }}
        />
        
        {/* Meta info skeleton - foarte subtil */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            height: '12px'
          }}
        >
          <div 
            style={{
              height: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '4px',
              width: '80px'
            }}
          />
          <div 
            style={{
              height: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '4px',
              width: '60px'
            }}
          />
        </div>
      </div>
      
      {/* Stats skeleton - subtil */}
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.25rem',
          minWidth: '40px'
        }}
      >
        <div 
          style={{
            height: '12px',
            backgroundColor: '#f9fafb',
            borderRadius: '4px',
            width: '24px'
          }}
        />
      </div>
    </div>
  )
}

/**
 * Topic List Skeleton
 * Multiple topic skeletons
 */
export function TopicListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <TopicSkeleton key={i} />
      ))}
    </div>
  )
}

