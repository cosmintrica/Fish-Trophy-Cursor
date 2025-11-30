import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled down 300px
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-4 z-50 w-10 h-10 flex items-center justify-center group hover:bg-gray-100 rounded-full transition-all duration-200"
      aria-label="Înapoi sus"
      style={{
        willChange: 'transform',
        transform: 'translateZ(0)'
      }}
    >
      <ChevronUp className="w-5 h-5 text-gray-500 group-hover:text-gray-700 group-hover:scale-110 transition-all duration-200" />
    </button>
  );
}

