// モバイル向けカードレイアウトコンポーネント
import React, { useState, useRef, useEffect } from 'react';

interface CardData {
  id: string;
  title: string;
  icon: string;
  color: string;
  content: React.ReactNode;
}

interface MobileCardLayoutProps {
  cards: CardData[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const MobileCardLayout: React.FC<MobileCardLayoutProps> = ({ 
  cards, 
  activeTab, 
  onTabChange 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const index = cards.findIndex(card => card.id === activeTab);
    if (index !== -1) {
      setCurrentIndex(index);
    }
  }, [activeTab, cards]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentIndex < cards.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      onTabChange(cards[newIndex].id);
    }
    
    if (isRightSwipe && currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      onTabChange(cards[newIndex].id);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* メインコンテンツエリア - スワイプ可能なカード */}
      <div className="flex-1 overflow-hidden px-4 py-4">
        <div 
          ref={containerRef}
          className="relative h-full"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className="flex transition-transform duration-300 h-full"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {cards.map((card, index) => (
              <div
                key={card.id}
                className="w-full flex-shrink-0 px-2"
              >
                <div className={`
                  h-full bg-white rounded-2xl shadow-lg border border-gray-200 
                  overflow-hidden transform transition-transform
                  ${currentIndex === index ? 'scale-100' : 'scale-95'}
                `}>
                  {/* カードヘッダー */}
                  <div className={`
                    bg-gradient-to-r ${card.color} 
                    px-4 py-3 flex items-center justify-between
                  `}>
                    <div className="flex items-center">
                      <i className={`${card.icon} text-white text-lg mr-2`}></i>
                      <h3 className="text-white font-medium">{card.title}</h3>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-full px-2 py-1">
                      <span className="text-white text-xs">
                        {index + 1} / {cards.length}
                      </span>
                    </div>
                  </div>
                  
                  {/* カードコンテンツ */}
                  <div className="p-4 h-full overflow-y-auto">
                    {card.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* ページインジケーター */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
            {cards.map((_, index) => (
              <div
                key={index}
                className={`
                  h-2 rounded-full transition-all duration-300
                  ${currentIndex === index 
                    ? 'w-8 bg-blue-500' 
                    : 'w-2 bg-gray-300'
                  }
                `}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* 固定タブバー */}
      <div className="bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around items-center py-2">
          {cards.map((card, index) => (
            <button
              key={card.id}
              onClick={() => {
                setCurrentIndex(index);
                onTabChange(card.id);
              }}
              className={`
                flex flex-col items-center justify-center 
                px-3 py-2 rounded-lg transition-all relative
                ${currentIndex === index 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-600 hover:bg-gray-50'
                }
              `}
            >
              <i className={`${card.icon} text-xl mb-1`}></i>
              <span className="text-xs font-medium">{card.title}</span>
              {currentIndex === index && (
                <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-blue-600 rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};