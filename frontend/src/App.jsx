import React, { useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { KanbanColumn } from './components/KanbanColumn';
import { ExportDropdown } from './components/ExportDropdown';
import { useKanbanData } from './hooks/useKanbanData';
import { classifyMessages, getAvailableModels } from './services/gemini';
import { Brain, RotateCcw, Loader2, Settings, Link } from 'lucide-react';

function App() {
  const { columns, columnOrder, loading, moveCard, updateCategoryForIds, resetData, addMessages, rawData } = useKanbanData();
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem('gemini_model') || 'gemini-1.5-pro');
  const [availableModels, setAvailableModels] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [checkingModels, setCheckingModels] = useState(false);
  
  // URL Input State
  const [vevoxUrl, setVevoxUrl] = useState('');
  const [fetchingData, setFetchingData] = useState(false);

  const onDragEnd = (result) => {
    const { destination, source } = result;
    moveCard(source, destination);
  };

  const handleFetchModels = async () => {
     if (!apiKey) return;
     setCheckingModels(true);
     const models = await getAvailableModels(apiKey);
     setAvailableModels(models);
     setCheckingModels(false);
     
     const hasGemini3 = models.find(m => m.name.includes("gemini-3") || m.name.includes("gemini-3-pro"));
     if (hasGemini3) {
        setSelectedModel(hasGemini3.name.replace("models/", ""));
     }
  };

  const handleScrape = async () => {
    if (!vevoxUrl) {
        alert("Please enter a Vevox URL");
        return;
    }
    
    setFetchingData(true);
    try {
        const response = await fetch('http://localhost:3000/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: vevoxUrl })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch');
        }

        if (data.messages && data.messages.length > 0) {
            addMessages(data.messages);
            setVevoxUrl(''); // Clear input
            alert(`Successfully loaded ${data.totalMessages} messages!`);
        } else {
            alert('No messages found or empty response.');
        }

    } catch (error) {
        alert("Error fetching data: " + error.message);
    } finally {
        setFetchingData(false);
    }
  };

  const handleCategorize = async () => {
    if (!apiKey) {
      setShowKeyInput(true);
      return;
    }
    
    localStorage.setItem('gemini_model', selectedModel);

    setIsProcessing(true);
    try {
      const allMessages = Object.values(columns).flatMap(col => col.items);
      const categories = Object.values(columns).map(c => ({ id: c.id, title: c.title }));

      if (allMessages.length === 0) {
        alert("No messages to categorize!");
        setIsProcessing(false);
        return;
      }

      const mapping = await classifyMessages(apiKey, allMessages, categories, selectedModel);
      
      updateCategoryForIds(mapping);
      alert('Categorization complete!');
    } catch (error) {
      alert('Error categorizing: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2 whitespace-nowrap">
                Vevox Analyzer
                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">Local</span>
              </h1>
              
              <div className="flex items-center gap-2 w-full md:w-[400px]">
                  <input 
                    type="text" 
                    placeholder="Paste Vevox URL here..." 
                    value={vevoxUrl}
                    onChange={(e) => setVevoxUrl(e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button 
                    onClick={handleScrape}
                    disabled={fetchingData}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-1 whitespace-nowrap"
                  >
                    {fetchingData ? <Loader2 className="animate-spin" size={16} /> : <Link size={16} />}
                    Fetch
                  </button>
              </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                title="AI Settings"
            >
                <Settings size={20} />
            </button>

            {showKeyInput && (
              <div className="absolute top-16 right-4 bg-white p-4 shadow-xl rounded-lg border border-gray-200 z-50 w-80">
                  <h3 className="font-semibold mb-2">Gemini Settings</h3>
                  <div className="mb-3">
                      <label className="block text-xs text-gray-500 mb-1">API Key</label>
                      <input 
                        type="password" 
                        placeholder="Paste API Key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="border rounded px-2 py-1 text-sm w-full mb-2"
                      />
                      <button 
                        onClick={handleFetchModels}
                        disabled={!apiKey || checkingModels}
                        className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 w-full"
                      >
                        {checkingModels ? "Fetching Models..." : "Check Available Models"}
                      </button>
                  </div>

                  <div className="mb-3">
                      <label className="block text-xs text-gray-500 mb-1">Model</label>
                      {availableModels.length > 0 ? (
                          <select 
                            value={selectedModel} 
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="border rounded px-2 py-1 text-sm w-full"
                          >
                            {availableModels.filter(m => m.name.includes("gemini")).map(m => {
                                const shortName = m.name.replace("models/", "");
                                return <option key={m.name} value={shortName}>{shortName}</option>
                            })}
                          </select>
                      ) : (
                          <input 
                            type="text" 
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            placeholder="e.g. gemini-1.5-pro"
                            className="border rounded px-2 py-1 text-sm w-full"
                          />
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Default: gemini-1.5-pro. Use "gemini-3-pro" if available.
                      </p>
                  </div>
              </div>
            )}

            <button
              onClick={handleCategorize}
              disabled={isProcessing}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-white transition-colors
                ${isProcessing ? 'bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Brain size={16} />}
              {isProcessing ? 'Thinking...' : 'AI Categorize'}
            </button>

            <ExportDropdown 
              columns={columns} 
              columnOrder={columnOrder} 
              rawData={rawData} 
            />

            <button
              onClick={resetData}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200"
              title="Clear all data"
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden py-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex h-full w-screen pb-4">
            {columnOrder.map((columnId) => {
              const column = columns[columnId];
              return <KanbanColumn key={column.id} column={column} />;
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}

export default App;
