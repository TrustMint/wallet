
import React, { useEffect, useState } from 'react';
import { UserRole } from '../../types';
import { Icons } from '../../constants';

interface StartScreenProps {
  onLogin: (role: UserRole) => void;
  isLoading: boolean;
}

const QUOTES = [
    {
        text: "Время дороже денег. Вы можете получить больше денег, но вы не можете получить больше времени.",
        author: "Джим Рон",
        accent: "#A855F7", // Purple
        delay: "200ms"
    }
];

export const StartScreen: React.FC<StartScreenProps> = ({ onLogin, isLoading }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const glassButtonStyle = (color: string) => ({
      backgroundColor: `${color}33`, 
      boxShadow: `0 20px 40px -10px ${color}33`,
  });

  return (
    <div className="fixed inset-0 h-[100dvh] w-full bg-black flex flex-col justify-between p-5 relative overflow-hidden pt-10 pb-10">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#0A84FF]/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/5 blur-[120px] rounded-full"></div>
      </div>
      
      {/* LOGO SECTION - TOP */}
      <div className="w-full max-w-sm z-10 text-center flex flex-col items-center mt-6 mx-auto">
          {/* NEW MINIMALIST EYE LOGO (BLUE GLASS) */}
          <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 bg-[#0A84FF]/30 blur-[40px] rounded-full"></div>
              <div className="relative z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#0A84FF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_25px_rgba(10,132,255,0.6)]">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                      <circle cx="12" cy="12" r="3" fill="#0A84FF" fillOpacity="0.8" />
                  </svg>
              </div>
          </div>
          
          <h1 className="text-[36px] font-mono font-bold tracking-widest text-[#0A84FF] relative z-10 drop-shadow-[0_0_30px_rgba(10,132,255,0.4)] -mt-2 inline-block">
             КВАНТ
          </h1>
          <p className="text-[#0A84FF] text-[13px] leading-relaxed font-medium tracking-wide mt-0 opacity-90 drop-shadow-[0_0_10px_rgba(10,132,255,0.3)]">Цифровая платформа городской логистики</p>
      </div>

      {/* QUOTES SECTION - REDESIGNED (TRANSPARENT) */}
      <div className="flex flex-col justify-center items-center gap-2 w-full max-w-[340px] mx-auto z-10 relative">
           {QUOTES.map((quote, idx) => (
               <div 
                   key={idx}
                   className={`relative w-full p-4 transition-all duration-1000 ease-out transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                   style={{ 
                       transitionDelay: quote.delay
                   }}
               >
                   <div className="relative z-10 flex flex-col items-center text-center">
                       {/* Decorative Quote Icon (Classic Double Quotes) */}
                       <div className="text-[#A855F7] opacity-80 mb-3 scale-100 drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]">
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                               <path d="M9.983 3v7.391c0 5.704-3.731 9.57-6.983 10.609l-.995-2.151c2.418-1.145 4.544-4.874 4.544-7.408h-3.549v-8.441h6.983zm13.017 0v7.391c0 5.704-3.748 9.571-7 10.609l-.996-2.151c2.433-1.145 4.564-4.874 4.564-7.408h-3.55v-8.441h6.982z" />
                           </svg>
                       </div>

                       <p className="font-mono text-[13px] text-neutral-200 tracking-tight leading-relaxed max-w-[95%] font-medium">
                          {quote.text}
                       </p>
                       
                       {/* Styled Author Line */}
                       <div className="flex items-center justify-center mt-4 gap-3 w-full opacity-80">
                           <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#A855F7]/60 to-transparent"></div>
                           <p className="font-mono text-[10px] text-neutral-400 font-bold uppercase tracking-widest whitespace-nowrap">
                               {quote.author}
                           </p>
                           <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#A855F7]/60 to-transparent"></div>
                       </div>
                   </div>
               </div>
           ))}
      </div>
      
      {/* BOTTOM CONTAINER (BUTTONS + FOOTER) */}
      <div>
        {/* BUTTONS SECTION - BOTTOM */}
        <div className="w-full max-w-sm space-y-3 z-10 mx-auto">
            
            <div className="text-center mb-5">
                <p className="text-white font-bold text-[24px] tracking-tight">Добро пожаловать</p>
            </div>

            <div 
                onClick={() => onLogin(UserRole.SENDER)} 
                className="relative rounded-[24px] p-3.5 transition-transform duration-200 overflow-hidden cursor-pointer active:scale-[0.98] backdrop-blur-[40px]"
                style={glassButtonStyle('#0A84FF')}
            >
              {/* Top-Left Glare */}
              <div 
                  className="absolute inset-0 rounded-[24px] pointer-events-none z-0"
                  style={{
                      boxShadow: 'inset 1px 1px 0 0 rgba(255,255,255,0.4)',
                      maskImage: 'linear-gradient(135deg, black 0%, transparent 75%)',
                      WebkitMaskImage: 'linear-gradient(135deg, black 0%, transparent 75%)'
                  }}
              ></div>
              {/* Bottom-Right Glare */}
              <div 
                  className="absolute inset-0 rounded-[24px] pointer-events-none z-0"
                  style={{
                      boxShadow: 'inset -1px -1px 0 0 rgba(255,255,255,0.4)',
                      maskImage: 'linear-gradient(315deg, black 0%, transparent 75%)',
                      WebkitMaskImage: 'linear-gradient(315deg, black 0%, transparent 75%)'
                  }}
              ></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-[#0A84FF]/10 flex items-center justify-center text-[#0A84FF] shadow-[0_0_10px_rgba(10,132,255,0.2)]"><Icons.User /></div>
                <div>
                  <h3 className="text-[16px] font-semibold text-white">Отправитель</h3>
                  <p className="text-[13px] text-white/70">Хочу отправить груз</p>
                </div>
                <div className="ml-auto text-white/50"><Icons.ArrowRight /></div>
              </div>
            </div>
            
            <div 
                onClick={() => onLogin(UserRole.COURIER)} 
                className="relative rounded-[24px] p-3.5 transition-transform duration-200 overflow-hidden cursor-pointer active:scale-[0.98] backdrop-blur-[40px]"
                style={glassButtonStyle('#A855F7')}
            >
              {/* Top-Left Glare */}
              <div 
                  className="absolute inset-0 rounded-[24px] pointer-events-none z-0"
                  style={{
                      boxShadow: 'inset 1px 1px 0 0 rgba(255,255,255,0.4)',
                      maskImage: 'linear-gradient(135deg, black 0%, transparent 75%)',
                      WebkitMaskImage: 'linear-gradient(135deg, black 0%, transparent 75%)'
                  }}
              ></div>
              {/* Bottom-Right Glare */}
              <div 
                  className="absolute inset-0 rounded-[24px] pointer-events-none z-0"
                  style={{
                      boxShadow: 'inset -1px -1px 0 0 rgba(255,255,255,0.4)',
                      maskImage: 'linear-gradient(315deg, black 0%, transparent 75%)',
                      WebkitMaskImage: 'linear-gradient(315deg, black 0%, transparent 75%)'
                  }}
              ></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-[#A855F7]/10 flex items-center justify-center text-[#A855F7] shadow-[0_0_10px_rgba(168,85,247,0.2)]"><Icons.Car /></div>
                <div>
                  <h3 className="text-[16px] font-semibold text-white">Курьер</h3>
                  <p className="text-[13px] text-white/70">Хочу заработать</p>
                </div>
                <div className="ml-auto text-white/50"><Icons.ArrowRight /></div>
              </div>
            </div>
        </div>

        {/* LEGAL FOOTER */}
        <div className="w-full text-center z-10 mt-4">
            <p className="text-[10px] text-white/30 leading-snug max-w-[280px] mx-auto">
                Авторизуясь, вы принимаете условия <a href="#" className="underline hover:text-white/50 transition-colors">Пользовательского соглашения</a> и <a href="#" className="underline hover:text-white/50 transition-colors">Политику конфиденциальности</a>
            </p>
        </div>
      </div>
        
      {isLoading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex flex-col items-center justify-center space-y-6">
          <div className="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};
