"use client";

type PaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({ page, pageSize, totalItems, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <nav className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Register pagination">
      <p className="text-sm font-semibold text-slate-700">
        Showing {start}–{end} of {totalItems}
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex">
        <button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
          Previous
        </button>
        <span className="min-w-20 text-center text-xs font-bold text-slate-800 sm:min-w-24 sm:text-sm">Page {page} of {totalPages}</span>
        <button type="button" disabled={page === totalPages} onClick={() => onPageChange(page + 1)} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
          Next page
        </button>
      </div>
    </nav>
  );
}
