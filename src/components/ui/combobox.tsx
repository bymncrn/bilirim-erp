import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Ek arama anahtarları: stok kodu, barkod, telefon vb. */
  keywords?: string;
  hint?: string;
};

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Seçiniz…",
  searchPlaceholder = "Yazarak arayın…",
  emptyText = "Sonuç bulunamadı.",
  className,
  triggerClassName,
  disabled,
  ariaLabel,
  /** Seçim sonrası değeri sıfırla (ürün ekleme kutuları için) */
  resetOnSelect,
  /** Listenin en altında görünen ek eylem (ör. yeni ürün ekle) */
  footerAction,
}: {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  ariaLabel?: string;
  resetOnSelect?: boolean;
  footerAction?: { label: string; onSelect: (query: string) => void } | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between gap-2 px-3 text-left font-normal",
            !selected && "text-muted-foreground",
            triggerClassName,
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-[--radix-popover-trigger-width] min-w-[240px] p-0", className)}
        align="start"
      >
        <Command
          filter={(itemValue, search) =>
            itemValue.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr")) ? 1 : 0
          }
        >
          <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={`${o.label} ${o.keywords ?? ""} ${o.value}`}
                  onSelect={() => {
                    onValueChange(resetOnSelect ? o.value : o.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{o.label}</span>
                    {o.hint ? (
                      <span className="truncate text-xs text-muted-foreground">{o.hint}</span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {footerAction ? (
            <div className="border-t border-border p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-sm"
                onClick={() => {
                  setOpen(false);
                  footerAction.onSelect(query);
                }}
              >
                <Plus className="h-4 w-4" /> {footerAction.label}
              </Button>
            </div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
