import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "article" | "div" | "section";
};

export function Card({ as: Element = "article", className = "", ...props }: CardProps) {
  return <Element className={`card ${className}`.trim()} {...props} />;
}