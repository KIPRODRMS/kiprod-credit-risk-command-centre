type RegisterSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  resultCount?: number;
};

export default function RegisterSearch({
  value,
  onChange,
  placeholder,
  resultCount,
}: RegisterSearchProps) {
  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
      <label className="relative block min-w-0 flex-1">
        <span className="sr-only">Search register</span>
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-600">
          ⌕
        </span>
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-11 w-full rounded-xl border border-slate-400 bg-white py-2.5 pl-10 pr-10 text-base font-medium text-slate-950 shadow-sm outline-none placeholder:text-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="absolute inset-y-0 right-2 my-auto h-8 rounded-lg px-2 text-lg font-bold text-slate-700 hover:bg-slate-100"
          >
            ×
          </button>
        )}
      </label>
      {typeof resultCount === "number" && (
        <span className="whitespace-nowrap text-sm font-bold text-slate-800">
          {resultCount} result{resultCount === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}
