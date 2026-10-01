type SearchInputProps = {
  className?: string;
  placeholder?: string;
};

export function SearchInput({
  className = "",
  placeholder = "Search",
}: SearchInputProps) {
  return (
    <form action="/search" className={`search-form ${className}`.trim()} role="search">
      <label className="sr-only" htmlFor="site-search">
        Search the site
      </label>
      <input
        id="site-search"
        type="search"
        name="q"
        placeholder={placeholder}
      />
      <button className="search-submit" type="submit" aria-label="Submit search">
        <span aria-hidden="true">⌕</span>
      </button>
    </form>
  );
}