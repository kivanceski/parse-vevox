import { useState, useEffect } from 'react';

const STORAGE_KEY = 'vevox-kanban-data';
const RAW_DATA_KEY = 'vevox-raw-data';

export const useKanbanData = () => {
  const [columns, setColumns] = useState({
    'uncategorized': {
      id: 'uncategorized',
      title: 'Uncategorized',
      items: [],
    },
    'ui_ux': {
      id: 'ui_ux',
      title: 'UI/UX',
      items: [],
    },
    'library': {
      id: 'library',
      title: 'Library',
      items: [],
    },
    'ai': {
      id: 'ai',
      title: 'AI',
      items: [],
    },
    'headless': {
      id: 'headless',
      title: 'Headless UI',
      items: [],
    }
  });
  
  const [columnOrder, setColumnOrder] = useState(['uncategorized', 'ui_ux', 'library', 'ai', 'headless']);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        const savedRawData = localStorage.getItem(RAW_DATA_KEY);
        
        if (savedRawData) {
          setRawData(JSON.parse(savedRawData));
        }
        
        if (savedData) {
          const parsed = JSON.parse(savedData);
          // Check if the saved data has the new column structure. If not, we might need to migrate or reset.
          // Simple check: see if 'ui_ux' exists.
          if (parsed.columns && parsed.columns['ui_ux']) {
              setColumns(parsed.columns);
              setColumnOrder(parsed.columnOrder);
          } else {
             // Migration or Fallback: If old structure, put everything in uncategorized
             // For simplicity in this session, we might just default to initial state if structure mismatches,
             // but let's try to preserve items if possible.
             if (parsed.columns) {
                 const allItems = Object.values(parsed.columns).flatMap(c => c.items);
                 setColumns(prev => ({
                     ...prev,
                     'uncategorized': { ...prev.uncategorized, items: allItems }
                 }));
             }
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ columns, columnOrder }));
    }
  }, [columns, columnOrder, loading]);

  const moveCard = (source, destination) => {
    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceColumn = columns[source.droppableId];
    const destColumn = columns[destination.droppableId];
    const sourceItems = [...sourceColumn.items];
    const destItems = source.droppableId === destination.droppableId 
      ? sourceItems 
      : [...destColumn.items];

    const [removed] = sourceItems.splice(source.index, 1);
    destItems.splice(destination.index, 0, removed);

    setColumns({
      ...columns,
      [source.droppableId]: {
        ...sourceColumn,
        items: sourceItems,
      },
      [destination.droppableId]: {
        ...destColumn,
        items: destItems,
      },
    });
  };

  const updateCategoryForIds = (classificationResult) => {
    // classificationResult: { messageId: { category: 'ui_ux', sentiment: 'positive' } }
    
    const newColumns = { ...columns };
    
    // Gather all items
    let allItems = [];
    Object.values(newColumns).forEach(col => {
      allItems = [...allItems, ...col.items];
    });

    // Clear columns
    Object.keys(newColumns).forEach(key => {
      newColumns[key].items = [];
    });

    allItems.forEach(item => {
      let targetCat = 'uncategorized';
      
      if (classificationResult[item.id]) {
        const result = classificationResult[item.id];
        
        // Update the item's sentiment/tag
        item.sentiment = result.sentiment; // 'positive', 'negative', 'question', 'neutral'
        
        // Determine Target Column
        const assignedCat = result.category ? result.category.toLowerCase() : 'uncategorized';
        
        if (newColumns[assignedCat]) {
          targetCat = assignedCat;
        }
      }
      
      newColumns[targetCat].items.push(item);
    });

    setColumns(newColumns);
  };

  const addMessages = (messages) => {
    // Store raw data for export
    setRawData(prev => [...prev, ...messages]);
    localStorage.setItem(RAW_DATA_KEY, JSON.stringify([...rawData, ...messages]));
    
    setColumns(prev => ({
        ...prev,
        'uncategorized': {
            ...prev['uncategorized'],
            items: [...prev['uncategorized'].items, ...messages]
        }
    }));
  };

  const resetData = () => {
    if (confirm("Are you sure you want to clear all data?")) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(RAW_DATA_KEY);
        window.location.reload();
    }
  };

  return { columns, columnOrder, loading, moveCard, updateCategoryForIds, resetData, addMessages, rawData };
};
