/**
 * AddressInput.tsx
 *
 * Text input with a debounced Nominatim suggestion dropdown for RoutePulse.
 * Handles keyboard navigation (ArrowDown/Up, Enter, Escape) and click-to-select.
 */

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from "react";
import { flushSync } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddressSuggestions } from "@/hooks/useAddressSuggestions";
import { MapPin, Loader2 } from "lucide-react";

interface AddressInputProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  pinColor: "blue" | "red";
  name: string;
}

export function AddressInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  pinColor,
  name,
}: AddressInputProps) {
  const { suggestions, isLoading } = useAddressSuggestions(value);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const ignoreBlurRef = useRef(false);

  const hasSuggestions = open && suggestions.length > 0;

  const selectSuggestion = useCallback(
    (suggestion: string) => {
      onChange(suggestion);
      setOpen(false);
      setHighlighted(-1);
    },
    [onChange]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!hasSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlighted(i => Math.min(i + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted(i => Math.max(i - 1, 0));
        break;
      case "Enter":
        if (highlighted >= 0) {
          e.preventDefault();
          selectSuggestion(suggestions[highlighted]!);
        }
        break;
      case "Escape":
        setOpen(false);
        setHighlighted(-1);
        break;
    }
  };

  // Close dropdown when clicking outside.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={containerRef} className="space-y-2 relative">
      <Label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs font-medium"
      >
        <MapPin
          className={`w-3.5 h-3.5 ${pinColor === "blue" ? "text-blue-500" : "text-red-500"}`}
        />{" "}
        {label}
      </Label>
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={e => {
          // flushSync prevents Chrome address-autofill from splicing old
          // and new text together when the user picks a suggestion.
          const raw = e.target.value;
          flushSync(() => onChange(raw));
          setOpen(true);
          setHighlighted(-1);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
          // On mobile, scroll the input into view so the dropdown isn't
          // hidden behind the virtual keyboard.
          containerRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }}
        onBlur={() => {
          // Delay closing so a mousedown on a suggestion row can fire first.
          window.setTimeout(() => {
            if (!ignoreBlurRef.current) setOpen(false);
          }, 150);
        }}
        onKeyDown={handleKeyDown}
        name={name}
        autoComplete="off"
        data-lpignore="true"
        data-1p-ignore=""
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="search"
        className="bg-background"
      />

      {hasSuggestions && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 right-0 top-full mt-1 max-h-36 sm:max-h-52 overflow-auto rounded-md border bg-background shadow-lg text-sm"
          onMouseEnter={() => {
            ignoreBlurRef.current = true;
          }}
          onMouseLeave={() => {
            ignoreBlurRef.current = false;
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={s + i}
              role="option"
              aria-selected={i === highlighted}
              onMouseDown={e => {
                e.preventDefault();
                selectSuggestion(s);
              }}
              className={`px-3 py-2 cursor-pointer truncate ${
                i === highlighted
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}

      {isLoading && open && (
        <div className="absolute right-3 top-[1.85rem] flex items-center">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
