export function Board({ board, category }: { board: (string | null)[][]; category: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="chip !bg-sun !px-4 !py-1 !text-sm shadow-[0_3px_0_var(--color-ink)]">
        Temat: <span className="normal-case tracking-normal">{category}</span>
      </div>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-3" aria-label="Hasło">
        {board.map((word, w) => (
          <div key={w} className="flex gap-1">
            {word.map((ch, i) =>
              ch === null ? (
                <div key={i} className="tile tile-hidden" aria-label="ukryta litera" />
              ) : /\p{L}/u.test(ch) ? (
                <div key={`${i}-${ch}`} className="tile anim-flip">
                  {ch}
                </div>
              ) : (
                <div key={i} className="tile tile-symbol">
                  {ch}
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
