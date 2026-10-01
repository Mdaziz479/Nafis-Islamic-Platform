type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state-mark" aria-hidden="true">
        ···
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}