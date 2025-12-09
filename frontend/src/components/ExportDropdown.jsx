import React, { useState, useRef, useEffect } from 'react';
import { Download, FileJson, Image, ChevronDown, Database } from 'lucide-react';
import html2canvas from 'html2canvas';

export const ExportDropdown = ({ columns, columnOrder, rawData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExportingImages, setIsExportingImages] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Export current kanban state as JSON
  const handleExportKanban = () => {
    const dataToSave = {
      columns,
      columnOrder,
      exportedAt: new Date().toISOString()
    };
    
    downloadJson(dataToSave, `vevox-kanban-${new Date().toISOString().slice(0, 10)}.json`);
    setIsOpen(false);
  };

  // Export raw data as JSON
  const handleExportRawData = () => {
    if (!rawData || rawData.length === 0) {
      alert('No raw data available to export.');
      return;
    }
    
    const dataToSave = {
      totalMessages: rawData.length,
      totalLikes: rawData.reduce((acc, msg) => acc + (msg.likes || 0), 0),
      messages: rawData,
      exportedAt: new Date().toISOString()
    };
    
    downloadJson(dataToSave, `vevox-raw-data-${new Date().toISOString().slice(0, 10)}.json`);
    setIsOpen(false);
  };

  // Export each category as PNG image
  const handleExportImages = async () => {
    setIsExportingImages(true);
    setIsOpen(false);

    try {
      for (const columnId of columnOrder) {
        const column = columns[columnId];
        if (column.items.length === 0) continue;

        await exportColumnAsImage(column);
      }
      alert('All category images exported successfully!');
    } catch (error) {
      console.error('Error exporting images:', error);
      alert('Error exporting images: ' + error.message);
    } finally {
      setIsExportingImages(false);
    }
  };

  const exportColumnAsImage = async (column) => {
    // Create a temporary container for rendering
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '320px';
    container.style.backgroundColor = '#f9fafb';
    container.style.padding = '16px';
    container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    
    // Add column header
    const header = document.createElement('div');
    header.style.backgroundColor = '#f3f4f6';
    header.style.padding = '12px';
    header.style.borderRadius = '8px 8px 0 0';
    header.style.fontWeight = '600';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '8px';
    header.innerHTML = `
      <span style="text-transform: capitalize;">${column.title}</span>
      <span style="background: #e5e7eb; color: #4b5563; font-size: 12px; padding: 2px 8px; border-radius: 9999px;">
        ${column.items.length}
      </span>
    `;
    container.appendChild(header);
    
    // Add each card
    column.items.forEach((item) => {
      const card = createCardElement(item);
      container.appendChild(card);
    });
    
    document.body.appendChild(container);
    
    try {
      const canvas = await html2canvas(container, {
        backgroundColor: '#f9fafb',
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      // Download the image
      const link = document.createElement('a');
      link.download = `${column.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 300));
    } finally {
      document.body.removeChild(container);
    }
  };

  const createCardElement = (item) => {
    const card = document.createElement('div');
    card.style.backgroundColor = 'white';
    card.style.padding = '16px';
    card.style.borderRadius = '8px';
    card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    card.style.marginBottom = '12px';
    card.style.border = '1px solid #e5e7eb';
    
    // Card header with ID and timestamp
    const headerDiv = document.createElement('div');
    headerDiv.style.display = 'flex';
    headerDiv.style.justifyContent = 'space-between';
    headerDiv.style.alignItems = 'flex-start';
    headerDiv.style.marginBottom = '8px';
    headerDiv.innerHTML = `
      <span style="font-size: 12px; font-family: monospace; color: #6b7280;">#${item.id}</span>
      <span style="font-size: 12px; color: #6b7280;">${item.timestamp || ''}</span>
    `;
    card.appendChild(headerDiv);
    
    // Message content
    const message = document.createElement('p');
    message.style.color = '#1f2937';
    message.style.fontSize = '14px';
    message.style.marginBottom = '12px';
    message.style.lineHeight = '1.5';
    message.textContent = item.message;
    card.appendChild(message);
    
    // Footer with likes and sentiment
    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.justifyContent = 'space-between';
    footer.style.alignItems = 'center';
    
    const likesDiv = document.createElement('div');
    likesDiv.style.display = 'flex';
    likesDiv.style.alignItems = 'center';
    likesDiv.style.backgroundColor = '#f9fafb';
    likesDiv.style.padding = '4px 8px';
    likesDiv.style.borderRadius = '4px';
    likesDiv.style.fontSize = '14px';
    likesDiv.style.color = '#4b5563';
    likesDiv.innerHTML = `👍 <span style="font-weight: 500; margin-left: 4px;">${item.likes}</span>`;
    footer.appendChild(likesDiv);
    
    if (item.sentiment && item.sentiment !== 'neutral') {
      const sentimentBadge = document.createElement('span');
      const sentimentStyles = {
        positive: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', label: 'Positive', emoji: '👍' },
        negative: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', label: 'Negative', emoji: '👎' },
        question: { bg: '#fef3c7', color: '#b45309', border: '#fde68a', label: 'Question', emoji: '❓' }
      };
      const style = sentimentStyles[item.sentiment];
      if (style) {
        sentimentBadge.style.fontSize = '10px';
        sentimentBadge.style.padding = '2px 6px';
        sentimentBadge.style.borderRadius = '4px';
        sentimentBadge.style.backgroundColor = style.bg;
        sentimentBadge.style.color = style.color;
        sentimentBadge.style.border = `1px solid ${style.border}`;
        sentimentBadge.style.fontWeight = '500';
        sentimentBadge.textContent = `${style.emoji} ${style.label}`;
        footer.appendChild(sentimentBadge);
      }
    }
    
    card.appendChild(footer);
    return card;
  };

  const downloadJson = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExportingImages}
        className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-300 disabled:opacity-50"
        title="Export options"
      >
        {isExportingImages ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
            Exporting...
          </>
        ) : (
          <>
            <Download size={16} />
            Export
            <ChevronDown size={14} />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <button
            onClick={handleExportKanban}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
          >
            <FileJson size={18} className="text-blue-500" />
            <div>
              <div className="font-medium">Kanban JSON</div>
              <div className="text-xs text-gray-500">Current board state</div>
            </div>
          </button>
          
          <button
            onClick={handleExportRawData}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
          >
            <Database size={18} className="text-green-500" />
            <div>
              <div className="font-medium">Raw Data JSON</div>
              <div className="text-xs text-gray-500">Original message data</div>
            </div>
          </button>
          
          <div className="border-t border-gray-100 my-1" />
          
          <button
            onClick={handleExportImages}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
          >
            <Image size={18} className="text-purple-500" />
            <div>
              <div className="font-medium">Category Images</div>
              <div className="text-xs text-gray-500">PNG per category</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
