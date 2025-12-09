import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { ThumbsUp, ThumbsDown, HelpCircle, Minus, Clock } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const MessageCard = ({ message, index }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    // Extract only HH:MM from formats like "09 December 2025 19:07"
    const timeMatch = timestamp.match(/(\d{2}:\d{2})$/);
    return timeMatch ? timeMatch[1] : timestamp;
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case "positive":
        return <ThumbsUp size={14} className="text-green-600" />;
      case "negative":
        return <ThumbsDown size={14} className="text-red-600" />;
      case "question":
        return <HelpCircle size={14} className="text-amber-600" />;
      default:
        return null; // Neutral doesn't strictly need an icon, or maybe a minus
    }
  };

  const getSentimentBadge = (sentiment) => {
    if (!sentiment || sentiment === "neutral") return null;

    const styles = {
      positive: "bg-green-100 text-green-700 border-green-200",
      negative: "bg-red-100 text-red-700 border-red-200",
      question: "bg-amber-100 text-amber-700 border-amber-200",
    };

    const labels = {
      positive: "Positive",
      negative: "Negative",
      question: "Question",
    };

    return (
      <span
        className={twMerge(
          "text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 font-medium",
          styles[sentiment]
        )}
      >
        {getSentimentIcon(sentiment)}
        {labels[sentiment]}
      </span>
    );
  };

  return (
    <Draggable draggableId={String(message.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={clsx(
            "bg-white p-4 rounded-lg shadow-sm mb-3 border border-gray-200 hover:shadow-md transition-shadow relative group",
            snapshot.isDragging && "shadow-lg ring-2 ring-blue-500 rotate-2"
          )}
          style={{ ...provided.draggableProps.style }}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono text-gray-500">
              #{message.id}
            </span>
            <div className="flex items-center text-xs text-gray-500">
              <Clock size={12} className="mr-1" />
              {formatTime(message.timestamp)}
            </div>
          </div>

          <p className="text-gray-800 text-sm mb-3 line-clamp-4 leading-relaxed">
            {message.message}
          </p>

          <div className="flex justify-between items-center">
            <div className="flex items-center text-gray-600 text-sm bg-gray-50 px-2 py-1 rounded">
              <ThumbsUp size={14} className="mr-1.5" />
              <span className="font-medium">{message.likes}</span>
            </div>

            {getSentimentBadge(message.sentiment)}
          </div>
        </div>
      )}
    </Draggable>
  );
};
