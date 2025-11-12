import React, { useRef, useEffect } from 'react';
import { ViewSettings } from '../types';

interface ViewerProps {
  fileContent: string | ArrayBuffer | null;
  fileType: 'pdf' | 'image' | null;
  pdfDoc: any; 
  currentPage: number;
  viewSettings: ViewSettings;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
  enhancedContent: string | null;
}

const Viewer: React.FC<ViewerProps> = ({ fileContent, fileType, pdfDoc, currentPage, viewSettings, onCanvasReady, enhancedContent }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;
    
    onCanvasReady(canvas);

    const render = async () => {
      // Clear canvas before drawing
      context.clearRect(0, 0, canvas.width, canvas.height);
      const container = canvas.parentElement;
      if (!container) return;
      const containerWidth = container.clientWidth;

      // Prioritize rendering enhanced content if it exists
      if (enhancedContent) {
        const img = new Image();
        img.onload = () => {
          const scale = containerWidth / img.width;
          canvas.width = containerWidth;
          canvas.height = img.height * scale;
          context.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = enhancedContent;
        return; // Stop here if enhanced content is rendered
      }


      if (fileType === 'image' && typeof fileContent === 'string') {
        const img = new Image();
        img.onload = () => {
          const scale = containerWidth / img.width;
          canvas.width = containerWidth;
          canvas.height = img.height * scale;
          context.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = fileContent;
      } else if (fileType === 'pdf' && pdfDoc) {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.5 });
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };
        await page.render(renderContext).promise;
      }
    };

    render();
  }, [fileContent, fileType, pdfDoc, currentPage, onCanvasReady, enhancedContent]);

  return (
    <div className="w-full flex-grow flex items-center justify-center p-4 overflow-auto">
      <canvas ref={canvasRef} className={`transition-all duration-300`} />
    </div>
  );
};

export default Viewer;
