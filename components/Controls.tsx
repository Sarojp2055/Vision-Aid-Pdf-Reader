
import React from 'react';
import { ViewSettings, Theme, FileType } from '../types';

// SVG Icon Components
const SunIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const ContrastIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.5A6.5 6.5 0 1012 5.5a6.5 6.5 0 000 13zM12 17.5V6.5" />
  </svg>
);

const MicrophoneIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 10v4m0 0H9m4 0h4m-4-8a3 3 0 013 3v2a3 3 0 01-6 0v-2a3 3 0 013-3z" />
  </svg>
);

interface ControlsProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  viewSettings: ViewSettings;
  setViewSettings: (settings: ViewSettings) => void;
  currentPage: number;
  totalPages: number;
  handlePageChange: (newPage: number) => void;
  handleExtractText: () => void;
  isLoadingText: boolean;
  fileType: FileType;
  resetApp: () => void;
  handleDownload: (type: 'original' | 'enhanced') => void;
  enhancedContent: string | null;
  onConversationClick: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  theme,
  setTheme,
  viewSettings,
  setViewSettings,
  currentPage,
  totalPages,
  handlePageChange,
  handleExtractText,
  isLoadingText,
  fileType,
  resetApp,
  handleDownload,
  enhancedContent,
  onConversationClick,
}) => {
  const toggleSetting = (key: keyof ViewSettings) => {
    setViewSettings({ ...viewSettings, [key]: !viewSettings[key] });
  };

  const buttonBaseStyle = "flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
  const lightButtonStyle = "bg-white text-slate-700 hover:bg-slate-50 focus:ring-blue-500";
  const darkButtonStyle = "bg-slate-700 text-slate-200 hover:bg-slate-600 focus:ring-blue-400";
  const highContrastButtonStyle = "bg-high-contrast-bg border-2 border-high-contrast-accent text-high-contrast-accent hover:bg-high-contrast-accent hover:text-high-contrast-bg focus:ring-high-contrast-text";
  
  const getButtonStyle = (isActive = false) => {
    const activeLight = "bg-blue-500 text-white";
    const activeDark = "bg-blue-500 text-white";
    const activeHighContrast = "bg-high-contrast-accent text-high-contrast-bg";

    switch(theme) {
      case Theme.Dark: return isActive ? activeDark : darkButtonStyle;
      case Theme.HighContrast: return isActive ? activeHighContrast : highContrastButtonStyle;
      case Theme.Light:
      default:
        return isActive ? activeLight : lightButtonStyle;
    }
  };

  return (
    <div className="w-full p-4 bg-slate-100 dark:bg-gray-900 high-contrast:bg-black high-contrast:border-t-2 high-contrast:border-high-contrast-accent transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* View Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => toggleSetting('isInverted')} className={`${buttonBaseStyle} ${getButtonStyle(viewSettings.isInverted)}`}>Invert Colors</button>
          <button onClick={() => toggleSetting('isHighContrast')} className={`${buttonBaseStyle} ${getButtonStyle(viewSettings.isHighContrast)}`}>High Contrast</button>
          <button onClick={() => toggleSetting('isGrayscale')} className={`${buttonBaseStyle} ${getButtonStyle(viewSettings.isGrayscale)}`}>Grayscale</button>
          <button onClick={handleExtractText} disabled={isLoadingText} className={`${buttonBaseStyle} ${getButtonStyle()}`}>
            {isLoadingText ? 'Extracting...' : 'Extract Text'}
          </button>
          <button onClick={onConversationClick} className={`${buttonBaseStyle} ${getButtonStyle()} bg-purple-500 text-white hover:bg-purple-600`}>
            <MicrophoneIcon className="w-5 h-5" />
            <span>Talk</span>
          </button>
          {enhancedContent ? (
            <>
              <button onClick={() => handleDownload('enhanced')} className={`${buttonBaseStyle} ${getButtonStyle()} bg-green-500 text-white hover:bg-green-600`}>
                Download Enhanced
              </button>
              <button onClick={() => handleDownload('original')} className={`${buttonBaseStyle} ${getButtonStyle()}`}>
                Download Original
              </button>
            </>
          ) : (
             <button onClick={() => handleDownload('original')} className={`${buttonBaseStyle} ${getButtonStyle()}`}>
                Download
              </button>
          )}
          <button onClick={resetApp} className={`${buttonBaseStyle} ${getButtonStyle()} bg-red-500 text-white hover:bg-red-600`}>
            New File
          </button>
        </div>

        {/* PDF Navigation */}
        {fileType === 'pdf' && totalPages > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1} className={`${buttonBaseStyle} ${getButtonStyle()} disabled:opacity-50 disabled:cursor-not-allowed`}>
              Prev
            </button>
            <span className="px-3 py-1.5 rounded-md text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 high-contrast:bg-high-contrast-bg high-contrast:text-high-contrast-text high-contrast:border border-high-contrast-accent">
              {currentPage} / {totalPages}
            </span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages} className={`${buttonBaseStyle} ${getButtonStyle()} disabled:opacity-50 disabled:cursor-not-allowed`}>
              Next
            </button>
          </div>
        )}
        
        {/* Theme Toggles */}
        <div className="flex items-center gap-2">
           <button onClick={() => setTheme(Theme.Light)} className={`${buttonBaseStyle} ${getButtonStyle(theme === Theme.Light)}`} aria-label="Light Mode"><SunIcon className="w-5 h-5" /></button>
           <button onClick={() => setTheme(Theme.Dark)} className={`${buttonBaseStyle} ${getButtonStyle(theme === Theme.Dark)}`} aria-label="Dark Mode"><MoonIcon className="w-5 h-5" /></button>
           <button onClick={() => setTheme(Theme.HighContrast)} className={`${buttonBaseStyle} ${getButtonStyle(theme === Theme.HighContrast)}`} aria-label="High Contrast Mode"><ContrastIcon className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
};

export default Controls;