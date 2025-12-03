"use client";

import React from "react";

export default function FloatingBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
    >
      {/* Soft blue blobs with subtle motion */}
      <div
        className="absolute top-[-10%] left-[-10%] w-80 h-80 rounded-full bg-gradient-to-br from-blue-200 to-blue-400 opacity-40 blur-2xl animate-float-slow"
      />
      <div
        className="absolute bottom-[12%] left-[18%] w-96 h-96 rounded-full bg-gradient-to-br from-blue-300 to-blue-500 opacity-30 blur-3xl animate-float-medium"
        style={{ animationDelay: "1.5s" }}
      />
      <div
        className="absolute top-[35%] right-[12%] w-64 h-64 rounded-full bg-gradient-to-br from-cyan-200 to-blue-400 opacity-30 blur-2xl animate-float-fast"
        style={{ animationDelay: "0.8s" }}
      />
      <div
        className="absolute bottom-[-6%] right-[-6%] w-[28rem] h-[28rem] rounded-full bg-gradient-to-br from-blue-200 to-indigo-400 opacity-20 blur-3xl animate-float-slow"
        style={{ animationDelay: "3s" }}
      />
    </div>
  );
}