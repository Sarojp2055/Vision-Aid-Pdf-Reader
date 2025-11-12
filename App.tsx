import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Theme, ViewSettings, FileType, TranscriptEntry } from './types';
import { 
  extractTextFromImage, 
  enhanceImage,
  connectToLiveSession,
  decode,
  decodeAudioData,
  createAudioBlob
} from './services/geminiService';
import Controls from './components/Controls';
import Viewer from './components/Viewer';
import { LiveSession, LiveServerMessage } from '@google/genai';

// Since pdfjs is loaded from a script tag, we declare it globally for TypeScript
declare const pdfjsLib: any;

const Spinner: React.FC = () => (
  <div className="flex justify-center items-center h-full">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 dark:border-blue-400 high-contrast:border-high-contrast-accent"></div>
  </div>
);

const FileUpload: React.FC<{ onFileSelect: (file: File) => void }> = ({ onFileSelect }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onFileSelect(event.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto p-8 border-4 border-dashed rounded-2xl border-slate-300 dark:border-slate-600 high-contrast:border-high-contrast-accent transition-colors duration-300">
      <div className="text-center">
        <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100 high-contrast:text-high-contrast-accent">Upload a file</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 high-contrast:text-high-contrast-text">PDF or Image files are supported</p>
        <div className="mt-6">
            <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-semibold text-blue-600 dark:text-blue-400 high-contrast:text-yellow-300 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 dark:ring-offset-gray-900">
                <span>Select a file</span>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,image/*" />
            </label>
        </div>
      </div>
    </div>
  );
};

const ConversationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onToggleConversation: () => void;
  transcript: TranscriptEntry[];
  isConnecting: boolean;
  isConversationActive: boolean;
}> = ({ isOpen, onClose, onToggleConversation, transcript, isConnecting, isConversationActive }) => {
  if (!isOpen) return null;

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const getButtonText = () => {
    if (isConnecting) return "Connecting...";
    if (isConversationActive) return "Stop Conversation";
    return "Start Conversation";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 high-contrast:bg-black high-contrast:border-2 high-contrast:border-high-contrast-accent rounded-lg shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100 high-contrast:text-high-contrast-accent">Voice Conversation</h2>

        <div className="overflow-y-auto flex-grow pr-4 mb-4 border rounded-md p-2 bg-slate-50 dark:bg-slate-900 high-contrast:bg-black border-slate-200 dark:border-slate-700 high-contrast:border-high-contrast-accent">
          {transcript.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 10v4m0 0H9m4 0h4m-4-8a3 3 0 013 3v2a3 3 0 01-6 0v-2a3 3 0 013-3z" /></svg>
              <p className="mt-2">{isConnecting ? "Connecting..." : "Press Start and begin speaking..."}</p>
            </div>
          )}
          {transcript.map((entry, index) => (
            <div key={index} className={`mb-2 p-3 rounded-lg max-w-[80%] ${entry.speaker === "user" ? "bg-blue-100 dark:bg-blue-900 ml-auto" : "bg-slate-100 dark:bg-slate-700 mr-auto"}`}>
              <p className="text-sm font-bold capitalize text-slate-600 dark:text-slate-300 high-contrast:text-high-contrast-text">{entry.speaker}</p>
              <p className="text-md text-slate-800 dark:text-slate-100 high-contrast:text-high-contrast-text">{entry.text}</p>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>

        <div className="mt-auto flex justify-between items-center">
          <button
            onClick={onToggleConversation}
            disabled={isConnecting}
            className={`px-6 py-2 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed ${isConversationActive ? "bg-red-600 hover:bg-red-700 focus:ring-red-500" : "bg-green-600 hover:bg-green-700 focus:ring-green-500"}`}
          >
            {getButtonText()}
          </button>
          <button
            onClick={onClose}
            disabled={isConversationActive || isConnecting}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:ring-offset-slate-800 disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(Theme.Dark);
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | ArrayBuffer | null>(null);
  const [fileType, setFileType] = useState<FileType>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingText, setIsLoadingText] = useState<boolean>(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [enhancedContent, setEnhancedContent] = useState<string | null>(null);
  
  // TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    isInverted: false,
    isHighContrast: false,
    isGrayscale: false,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Conversation State
  const [isConversationModalOpen, setIsConversationModalOpen] = useState(false);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [conversationTranscript, setConversationTranscript] = useState<TranscriptEntry[]>([]);
  
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');


  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(Theme.Light, Theme.Dark, Theme.HighContrast);
    root.classList.add(theme);
    if(theme === Theme.HighContrast) {
        root.classList.add('high-contrast');
    } else {
        root.classList.remove('high-contrast');
    }
  }, [theme]);

  // TTS Cleanup effect
  useEffect(() => {
    if (!isModalOpen && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [isModalOpen]);

  const resetState = () => {
    setFile(null);
    setFileContent(null);
    setFileType(null);
    setPdfDoc(null);
    setCurrentPage(1);
    setTotalPages(0);
    setIsLoading(false);
    setViewSettings({ isInverted: false, isHighContrast: false, isGrayscale: false });
    setEnhancedContent(null);
    setIsEnhancing(false);
  };

  useEffect(() => {
    if (!file) return;

    // Reset states for the new file
    setViewSettings({ isInverted: false, isHighContrast: false, isGrayscale: false });
    setEnhancedContent(null);
    setIsEnhancing(false);
    setCurrentPage(1);

    setIsLoading(true);
    const reader = new FileReader();

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const type = file.type.startsWith('image/') ? 'image' : (file.type === 'application/pdf' || fileExt === 'pdf' ? 'pdf' : null);
    setFileType(type);

    reader.onload = async (e) => {
      const result = e.target?.result;
      if (!result) return;
      
      setFileContent(result);

      if (type === 'pdf') {
        try {
          const doc = await pdfjsLib.getDocument({ data: result as ArrayBuffer }).promise;
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(1);
        } catch (error) {
          console.error("Error loading PDF:", error);
          alert("Failed to load PDF file. It might be corrupted or protected.");
          resetState();
        }
      }
      setIsLoading(false);
    };

    if (type === 'image') {
      reader.readAsDataURL(file);
    } else if (type === 'pdf') {
      reader.readAsArrayBuffer(file);
    } else {
        alert('Unsupported file type.');
        resetState();
    }
  }, [file]);
  
  // Effect to trigger AI enhancement
  useEffect(() => {
    const applyEnhancements = async () => {
      const hasActiveSettings = Object.values(viewSettings).some(v => v);
      
      if (!hasActiveSettings) {
        if (enhancedContent) setEnhancedContent(null);
        return;
      }
      
      setIsEnhancing(true);

      const offscreenCanvas = document.createElement('canvas');
      const context = offscreenCanvas.getContext('2d');

      if (!context || (!fileContent && !pdfDoc)) {
          console.error("Cannot create offscreen canvas for enhancement.");
          setIsEnhancing(false);
          return;
      }
      
      try {
        if (fileType === 'image' && typeof fileContent === 'string') {
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              offscreenCanvas.width = img.width;
              offscreenCanvas.height = img.height;
              context.drawImage(img, 0, 0);
              resolve();
            };
            img.onerror = reject;
            img.src = fileContent;
          });
        } else if (fileType === 'pdf' && pdfDoc) {
          const page = await pdfDoc.getPage(currentPage);
          const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
          offscreenCanvas.width = viewport.width;
          offscreenCanvas.height = viewport.height;
          const renderContext = { canvasContext: context, viewport: viewport };
          await page.render(renderContext).promise;
        } else {
            return;
        }

        const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.95);
        const base64Data = dataUrl.split(',')[1];
        
        const resultDataUrl = await enhanceImage(base64Data, 'image/jpeg', viewSettings);
        setEnhancedContent(resultDataUrl);
      } catch (error) {
        console.error("Failed to enhance content:", error);
        alert(error instanceof Error ? error.message : "An unknown error occurred during enhancement.");
        setViewSettings({ isInverted: false, isHighContrast: false, isGrayscale: false });
        setEnhancedContent(null);
      } finally {
        setIsEnhancing(false);
      }
    };

    applyEnhancements();
  }, [viewSettings, currentPage, fileContent, fileType, pdfDoc]);

  const stopConversation = useCallback(async () => {
    // If there's no session promise, we're already stopped or never started.
    // This check makes the function idempotent and safe to call multiple times.
    if (!sessionPromiseRef.current) {
      return;
    }

    // Immediately nullify the ref to prevent re-entrancy from other callers
    // like the onclose event handler.
    const sessionPromise = sessionPromiseRef.current;
    sessionPromiseRef.current = null;
    
    try {
      const session = await sessionPromise;
      session.close();
    } catch (e) {
      console.error("Error closing session:", e);
    }
    
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
    }
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
    }
    
    // Check state before closing to prevent the "Cannot close a closed AudioContext" error.
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
    }
    
    audioSourcesRef.current.forEach((source) => source.stop());
    audioSourcesRef.current.clear();
    
    setIsConversationActive(false);
    setIsConnecting(false);
  }, []);

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    setConversationTranscript([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      // Fix: Cast window to any to support webkitAudioContext for older browsers
      inputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      sessionPromiseRef.current = connectToLiveSession({
        onopen: () => {
          setIsConnecting(false);
          setIsConversationActive(true);
          if (!inputAudioContextRef.current) return;
          mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
          scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
          scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob = createAudioBlob(inputData);
            sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
          };
          mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
          scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
          if (message.serverContent?.outputTranscription) currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
          if (message.serverContent?.turnComplete) {
            const userInput = currentInputTranscriptionRef.current.trim();
            const modelOutput = currentOutputTranscriptionRef.current.trim();
            setConversationTranscript((prev) => {
              const newTranscript = [...prev];
              if (userInput) newTranscript.push({ speaker: "user", text: userInput });
              if (modelOutput) newTranscript.push({ speaker: "model", text: modelOutput });
              return newTranscript;
            });
            currentInputTranscriptionRef.current = "";
            currentOutputTranscriptionRef.current = "";
          }
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio && outputAudioContextRef.current) {
            const ctx = outputAudioContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.addEventListener("ended", () => audioSourcesRef.current.delete(source));
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            audioSourcesRef.current.add(source);
          }
        },
        onerror: (e: ErrorEvent) => {
          console.error("Conversation error:", e);
          alert("A conversation error occurred. Please try again.");
          stopConversation();
        },
        onclose: (e: CloseEvent) => stopConversation(),
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      alert("Could not access microphone. Please check your browser permissions.");
      setIsConnecting(false);
    }
  }, [stopConversation]);

  // This effect ensures that if the component unmounts, the conversation is properly cleaned up.
  useEffect(() => {
    return () => {
      // stopConversation is idempotent, so it's safe to call here.
      stopConversation();
    };
  }, [stopConversation]);

  const handleOpenConversationModal = () => {
    setIsConversationModalOpen(true);
    startConversation();
  };

  const handleCloseConversationModal = () => {
    if (isConversationActive || isConnecting) stopConversation();
    setIsConversationModalOpen(false);
  };

  const handleToggleConversation = () => {
    if (isConversationActive || isConnecting) stopConversation();
    else startConversation();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleExtractText = async () => {
    setIsLoadingText(true);
    
    const offscreenCanvas = document.createElement('canvas');
    const context = offscreenCanvas.getContext('2d');

    if (!context || (!fileContent && !pdfDoc)) {
      setExtractedText("Could not prepare content for text extraction.");
      setIsModalOpen(true);
      setIsLoadingText(false);
      return;
    }
    
    try {
        if (fileType === 'image' && typeof fileContent === 'string') {
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              offscreenCanvas.width = img.width;
              offscreenCanvas.height = img.height;
              context.drawImage(img, 0, 0);
              resolve();
            };
            img.onerror = reject;
            img.src = fileContent;
          });
        } else if (fileType === 'pdf' && pdfDoc) {
          const page = await pdfDoc.getPage(currentPage);
          const viewport = page.getViewport({ scale: 2.0 }); // Use a high scale for best OCR
          offscreenCanvas.width = viewport.width;
          offscreenCanvas.height = viewport.height;
          const renderContext = { canvasContext: context, viewport: viewport, };
          await page.render(renderContext).promise;
        } else {
          throw new Error("No content available to extract text from.");
        }

        const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.95);
        const base64Data = dataUrl.split(',')[1];

        const text = await extractTextFromImage(base64Data, 'image/jpeg');
        setExtractedText(text);
        setIsModalOpen(true);
    } catch(error) {
        console.error("Failed to extract text:", error);
        setExtractedText("Sorry, an error occurred while extracting text.");
        setIsModalOpen(true);
    } finally {
        setIsLoadingText(false);
    }
  };

  const handleDownload = (type: 'original' | 'enhanced') => {
    if (type === 'enhanced' && enhancedContent) {
      const link = document.createElement('a');
      link.href = enhancedContent;
      link.download = `enhanced-${file?.name?.split('.')[0] || 'view'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (file) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(file);
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
  };

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  const handlePlayPauseSpeech = () => {
    if (isSpeaking) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    } else {
      const utterance = new SpeechSynthesisUtterance(extractedText);
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };
      utterance.onerror = () => {
        console.error("Speech synthesis error");
        setIsSpeaking(false);
        setIsPaused(false);
      }
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      setIsPaused(false);
    }
  };

  const handleStopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };


  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-800 high-contrast:bg-high-contrast-bg text-slate-900 dark:text-slate-100 high-contrast:text-high-contrast-text transition-colors duration-300">
      <header className="p-4 bg-slate-100 dark:bg-gray-900 high-contrast:bg-black high-contrast:border-b-2 high-contrast:border-high-contrast-accent shadow-md z-10">
          <h1 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100 high-contrast:text-high-contrast-accent">
            Vision Aid Viewer
          </h1>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center overflow-hidden relative">
        {(isLoading || isEnhancing) && (
          <div className="absolute inset-0 bg-white/75 dark:bg-slate-800/75 z-20">
            <Spinner />
          </div>
        )}
        {!file && !isLoading && <FileUpload onFileSelect={setFile} />}
        {file && !isLoading && fileContent && (
            <Viewer
              fileContent={fileContent}
              fileType={fileType}
              pdfDoc={pdfDoc}
              currentPage={currentPage}
              viewSettings={viewSettings}
              onCanvasReady={handleCanvasReady}
              enhancedContent={enhancedContent}
            />
        )}
      </main>

      {file && !isLoading && (
        <Controls
          theme={theme}
          setTheme={setTheme}
          viewSettings={viewSettings}
          setViewSettings={setViewSettings}
          currentPage={currentPage}
          totalPages={totalPages}
          handlePageChange={handlePageChange}
          handleExtractText={handleExtractText}
          isLoadingText={isLoadingText}
          fileType={fileType}
          resetApp={resetState}
          handleDownload={handleDownload}
          enhancedContent={enhancedContent}
          onConversationClick={handleOpenConversationModal}
        />
      )}
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 high-contrast:bg-black high-contrast:border-2 high-contrast:border-high-contrast-accent rounded-lg shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col">
                <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100 high-contrast:text-high-contrast-accent">Extracted Text</h2>
                <div className="overflow-y-auto flex-grow pr-4 text-lg leading-relaxed text-slate-700 dark:text-slate-300 high-contrast:text-high-contrast-text">
                  <pre className="whitespace-pre-wrap font-sans">{extractedText}</pre>
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                     <button 
                      onClick={handlePlayPauseSpeech} 
                      disabled={!extractedText}
                      className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSpeaking && !isPaused ? 'Pause' : 'Read Aloud'}
                    </button>
                    {isSpeaking && (
                      <button 
                        onClick={handleStopSpeech} 
                        className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:ring-offset-slate-800"
                      >
                        Stop
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:ring-offset-slate-800 high-contrast:bg-high-contrast-accent high-contrast:text-high-contrast-bg"
                  >
                    Close
                  </button>
                </div>
            </div>
        </div>
      )}
      <ConversationModal
        isOpen={isConversationModalOpen}
        onClose={handleCloseConversationModal}
        onToggleConversation={handleToggleConversation}
        transcript={conversationTranscript}
        isConnecting={isConnecting}
        isConversationActive={isConversationActive}
      />
    </div>
  );
};

export default App;