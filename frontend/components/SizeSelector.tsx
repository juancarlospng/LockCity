"use client";
export function SizeSelector({
  sizes,
  selected,
  onSelect,
  disabledSizes = [],
}: {
  sizes: string[];
  selected?: string;
  onSelect: (size: string) => void;
  disabledSizes?: string[];
}) {
  return (
    <fieldset className="mt-7">
      <legend className="eyebrow">Size</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {sizes.length ? (
          sizes.map((size) => (
            <button
              className="lc-choice"
              type="button"
              key={size}
              disabled={disabledSizes.includes(size)}
              aria-pressed={selected === size}
              onClick={() => onSelect(size)}
            >
              {size}
            </button>
          ))
        ) : (
          <p className="text-sm text-steel">
            Sizes will be listed with the product.
          </p>
        )}
      </div>
    </fieldset>
  );
}
