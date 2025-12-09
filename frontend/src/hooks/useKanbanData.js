import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'vevox-kanban-data';
const RAW_DATA_KEY = 'vevox-raw-data';

/**
 * Sort items by likes in descending order
 * Handles edge cases: missing likes, non-numeric values, null/undefined items
 */
const sortByLikes = (items) => {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    const likesA = typeof a?.likes === 'number' ? a.likes : 0;
    const likesB = typeof b?.likes === 'number' ? b.likes : 0;
    return likesB - likesA;
  });
};

/**
 * Sort all items in all columns by likes
 */
const sortAllColumnsByLikes = (columns) => {
  if (!columns || typeof columns !== 'object') return columns;
  
  const sortedColumns = {};
  Object.keys(columns).forEach(key => {
    const column = columns[key];
    if (column && Array.isArray(column.items)) {
      sortedColumns[key] = {
        ...column,
        items: sortByLikes(column.items)
      };
    } else {
      sortedColumns[key] = column;
    }
  });
  return sortedColumns;
};

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
              setColumns(sortAllColumnsByLikes(parsed.columns));
              setColumnOrder(parsed.columnOrder);
          } else {
             // Migration or Fallback: If old structure, put everything in uncategorized
             // For simplicity in this session, we might just default to initial state if structure mismatches,
             // but let's try to preserve items if possible.
             if (parsed.columns) {
                 const allItems = Object.values(parsed.columns).flatMap(c => c.items);
                 setColumns(prev => sortAllColumnsByLikes({
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
    
    if (!sourceColumn || !destColumn) return;
    
    const sourceItems = [...sourceColumn.items];
    const destItems = source.droppableId === destination.droppableId 
      ? sourceItems 
      : [...destColumn.items];

    const [removed] = sourceItems.splice(source.index, 1);
    destItems.splice(destination.index, 0, removed);

    // Sort destination column by likes after adding the card
    const sortedDestItems = sortByLikes(destItems);

    setColumns({
      ...columns,
      [source.droppableId]: {
        ...sourceColumn,
        items: sourceItems,
      },
      [destination.droppableId]: {
        ...destColumn,
        items: sortedDestItems,
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

    // Sort all columns by likes after categorization
    setColumns(sortAllColumnsByLikes(newColumns));
  };

  const addMessages = (messages) => {
    if (!Array.isArray(messages) || messages.length === 0) return;
    
    // Store raw data for export
    setRawData(prev => {
      const newRawData = [...prev, ...messages];
      localStorage.setItem(RAW_DATA_KEY, JSON.stringify(newRawData));
      return newRawData;
    });
    
    setColumns(prev => {
        const newItems = sortByLikes([...prev['uncategorized'].items, ...messages]);
        return {
            ...prev,
            'uncategorized': {
                ...prev['uncategorized'],
                items: newItems
            }
        };
    });
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
