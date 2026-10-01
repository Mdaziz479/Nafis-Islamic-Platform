import type { ReactNode } from "react";

type SectionHeadingProps = {
  id?: string;
  level?: 1 | 2;
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
};

export function SectionHeading({
  id,
  level = 2,
  title,
  eyebrow,
  description,
  action,
}: SectionHeadingProps) {
  const Heading = level === 1 ? "h1" : "h2";

  return (
    <div className="section-heading">
      <div className="section-heading-copy">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <Heading id={id}>{title}</Heading>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}