import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { MessageCard } from './MessageCard';

export const KanbanColumn = ({ column }) => {
  return (
    <div className="flex flex-col w-1/5 h-full mx-2">
      <div className="bg-gray-100 p-3 rounded-t-lg font-semibold flex justify-between items-center">
        <span className="capitalize">{column.title}</span>
        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
          {column.items.length}
        </span>
      </div>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 bg-gray-50 p-2 rounded-b-lg overflow-y-auto min-h-[150px] transition-colors ${
              snapshot.isDraggingOver ? 'bg-blue-50' : ''
            }`}
          >
            {column.items.map((item, index) => (
              <MessageCard key={item.id} message={item} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};



