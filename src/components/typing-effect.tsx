"use client";

import { useState, useEffect } from 'react';

const sentences = [
  "خودت را رشد بده",
  "مستقل شو",
  "یک «تو» جدید بساز"
];

export function TypingEffect() {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (isDeleting) {
      if (subIndex === 0) {
        setIsDeleting(false);
        setIndex((prev) => (prev + 1) % sentences.length);
      } else {
        const timer = setTimeout(() => {
          setSubIndex((prev) => prev - 1);
          setText(sentences[index].substring(0, subIndex - 1));
        }, 50);
        return () => clearTimeout(timer);
      }
    } else {
      if (subIndex === sentences[index].length) {
        const pauseTimer = setTimeout(() => {
          setIsDeleting(true);
        }, 2000);
        return () => clearTimeout(pauseTimer);
      } else {
        const timer = setTimeout(() => {
          setSubIndex((prev) => prev + 1);
          setText(sentences[index].substring(0, subIndex + 1));
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [subIndex, index, isDeleting]);

  return (
    <p className="max-w-2xl text-sm md:text-base text-primary-foreground/80 min-h-[48px]">
      {text}
      <span className="animate-pulse">_</span>
    </p>
  );
}
