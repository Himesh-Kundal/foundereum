import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export const PillButton: React.FC<ButtonProps> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <button
      {...props}
      className={`px-6 py-2.5 rounded-full border border-[#16181D] bg-transparent text-[#16181D] font-mono text-xs uppercase tracking-wider font-semibold hover:bg-[#16181D] hover:text-[#F4F1E9] transition-all cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
};

interface BlockButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "forge" | "danger" | "ghost" | "dark";
  className?: string;
}

export const BlockButton: React.FC<BlockButtonProps> = ({
  children,
  variant = "forge",
  className = "",
  ...props
}) => {
  let styleClasses = "bg-[#F05423] text-[#16181D] hover:bg-[#d9481b] border-[#16181D]";

  if (variant === "danger") {
    styleClasses = "bg-[#C6402E] text-white hover:bg-[#a83324] border-[#16181D]";
  } else if (variant === "ghost") {
    styleClasses = "bg-transparent text-[#16181D] hover:bg-[#EDE9DE] border-[#16181D]";
  } else if (variant === "dark") {
    styleClasses = "bg-[#16181D] text-[#F4F1E9] hover:bg-[#2a2e37] border-[#16181D]";
  }

  return (
    <button
      {...props}
      className={`px-4 py-2 border font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${styleClasses} ${className}`}
    >
      {children}
    </button>
  );
};
