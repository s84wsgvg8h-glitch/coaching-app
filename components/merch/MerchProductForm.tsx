"use client";

import { useRef, useState } from "react";
import {
  Copy,
  ImagePlus,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import ProductPreviewCard from "@/components/merch/ProductPreviewCard";
import { uploadMerchImage } from "@/lib/merchImages";
import {
  duplicateMerchItem,
  formatMerchPrice,
  saveMerchItem,
  type MerchColorVariant,
  type MerchItem,
  type MerchItemStatus,
  type MerchStockBySize,
} from "@/lib/merch";
import type { MerchShopStats } from "@/lib/merchShopStats";

const DEFAULT_SIZES = ["S", "M", "L", "XL", "One size"];
const DEFAULT_COLORS: MerchColorVariant[] = [
  { name: "Zwart", value: "#111827" },
  { name: "Wit", value: "#ffffff" },
  { name: "Navy", value: "#1e3a8a" },
];

const STATUS_OPTIONS: Array<{
  value: MerchItemStatus;
  label: string;
  hint: string;
}> = [
  { value: "concept", label: "Concept", hint: "Alleen zichtbaar voor jou" },
  { value: "live", label: "Live", hint: "Direct zichtbaar in de shop" },
  { value: "soldout", label: "Uitverkocht", hint: "Niet bestelbaar" },
];

type MerchProductFormProps = {
  userId: string;
  item?: MerchItem | null;
  sortOrder: number;
  collections: string[];
  stats?: MerchShopStats;
  onSaved: () => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  onToast: (message: string) => void;
};

export default function MerchProductForm({
  userId,
  item,
  sortOrder,
  collections,
  stats,
  onSaved,
  onCancel,
  onDelete,
  onToast,
}: MerchProductFormProps) {
  const isEdit = Boolean(item?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(item?.title || "");
  const [description, setDescription] = useState(item?.description || "");
  const [price, setPrice] = useState(
    item?.price !== null && item?.price !== undefined ? String(item.price) : "",
  );
  const [costPrice, setCostPrice] = useState(
    item?.cost_price !== null && item?.cost_price !== undefined
      ? String(item.cost_price)
      : "",
  );
  const [imageUrls, setImageUrls] = useState<string[]>(
    item?.image_urls?.length
      ? item.image_urls
      : item?.image_url
        ? [item.image_url]
        : [],
  );
  const [sizes, setSizes] = useState<string[]>(
    item?.sizes?.length ? item.sizes : [...DEFAULT_SIZES],
  );
  const [stockBySize, setStockBySize] = useState<MerchStockBySize>(
    item?.stock_by_size || {},
  );
  const [status, setStatus] = useState<MerchItemStatus>(
    item?.status || "concept",
  );
  const [collection, setCollection] = useState(item?.collection || "");
  const [colors, setColors] = useState<MerchColorVariant[]>(
    item?.color_variants?.length ? item.color_variants : [...DEFAULT_COLORS],
  );
  const [featured, setFeatured] = useState(item?.featured ?? false);
  const [limited, setLimited] = useState(item?.limited ?? false);
  const [preorder, setPreorder] = useState(item?.preorder ?? false);
  const [preorderTarget, setPreorderTarget] = useState(
    item?.preorder_target ? String(item.preorder_target) : "",
  );
  const [preorderClosesAt, setPreorderClosesAt] = useState(
    toDatetimeLocal(item?.preorder_closes_at || null),
  );
  const [goLiveAt, setGoLiveAt] = useState(
    toDatetimeLocal(item?.go_live_at || null),
  );
  const [materialInfo, setMaterialInfo] = useState(item?.material_info || "");
  const [sizeGuideText, setSizeGuideText] = useState(item?.size_guide_text || "");
  const [deliveryTimeText, setDeliveryTimeText] = useState(
    item?.delivery_time_text || "",
  );
  const [returnPolicyOverride, setReturnPolicyOverride] = useState(
    item?.return_policy_override || "",
  );
  const [customSize, setCustomSize] = useState("");
  const [customColorName, setCustomColorName] = useState("");
  const [customColorValue, setCustomColorValue] = useState("#111827");
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const sold = item && stats ? stats.salesByItemId[item.id] || 0 : 0;
  const revenueCents = item && stats ? stats.revenueByItemId[item.id] || 0 : 0;
  const profitCents = item && stats ? stats.profitByItemId[item.id] || 0 : 0;

  const collectionOptions = [...new Set([...collections, collection].filter(Boolean))];

  async function handleImageFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (list.length === 0) return;

    setUploading(true);
    const uploaded: string[] = [];
    for (const file of list) {
      if (imageUrls.length + uploaded.length >= 6) break;
      const { url, error: uploadError } = await uploadMerchImage(userId, file);
      if (uploadError || !url) {
        setError(uploadError?.message || "Upload mislukt.");
        continue;
      }
      uploaded.push(url);
    }
    setUploading(false);
    if (uploaded.length > 0) {
      setImageUrls((current) => [...current, ...uploaded].slice(0, 6));
    }
  }

  async function handleSave(nextStatus?: MerchItemStatus) {
    setSaving(true);
    setError("");

    const normalizedSizes = normalizeSizes(sizes);
    const normalizedStock = normalizeStockForSizes(stockBySize, normalizedSizes);
    const finalStatus = nextStatus || status;

    if (!title.trim()) {
      setError("Titel is verplicht.");
      setSaving(false);
      return;
    }

    const parsedPrice = price.trim() ? Number(price) : 0;
    if (!parsedPrice || parsedPrice <= 0) {
      setError("Prijs moet groter dan 0 zijn.");
      setSaving(false);
      return;
    }

    if (normalizedSizes.length === 0) {
      setError("Voeg minimaal één maat toe.");
      setSaving(false);
      return;
    }

    if (Object.values(normalizedStock).some((value) => value < 0)) {
      setError("Voorraad mag niet negatief zijn.");
      setSaving(false);
      return;
    }

    const { error: saveError } = await saveMerchItem({
      id: item?.id,
      title,
      description: description.slice(0, 1000) || null,
      price: parsedPrice,
      cost_price: costPrice.trim() ? Number(costPrice) : null,
      image_url: imageUrls[0] || null,
      image_urls: imageUrls,
      buy_url: item?.buy_url || null,
      sizes: normalizedSizes,
      stock_by_size: normalizedStock,
      color_variants: colors,
      collection: collection || null,
      status: finalStatus,
      active: finalStatus === "live" || finalStatus === "soldout",
      featured,
      limited,
      preorder,
      preorder_target: preorderTarget.trim() ? Number(preorderTarget) : null,
      preorder_closes_at: fromDatetimeLocal(preorderClosesAt),
      go_live_at: fromDatetimeLocal(goLiveAt),
      archived_at: item?.archived_at || null,
      material_info: materialInfo.trim() || null,
      size_guide_text: sizeGuideText.trim() || null,
      delivery_time_text: deliveryTimeText.trim() || null,
      return_policy_override: returnPolicyOverride.trim() || null,
      sort_order: item?.sort_order ?? sortOrder,
    });

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    onSaved();
  }

  async function handleDuplicate() {
    if (!item) return;
    const { error: dupError } = await duplicateMerchItem(item);
    if (dupError) {
      onToast(dupError.message);
      return;
    }
    onToast("Product gedupliceerd.");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#09090b]/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-app-border/60 px-4 py-3 md:px-6">
        <div>
          <h2 className="text-lg font-semibold text-app-text">
            {isEdit ? "Product bewerken" : "Product toevoegen"}
          </h2>
          {isEdit && item?.updated_at ? (
            <p className="text-[12px] text-app-muted">
              Laatst aangepast:{" "}
              {new Date(item.updated_at).toLocaleString("nl-NL")}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-app-border p-2 text-app-muted hover:bg-app-surface-muted hover:text-app-text"
          aria-label="Sluiten"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-[1400px] gap-6 p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {isEdit && stats ? (
              <div className="grid gap-3 sm:grid-cols-4">
                <StatChip label="Verkocht" value={String(sold)} />
                <StatChip
                  label="Omzet"
                  value={formatMerchPrice(revenueCents / 100)}
                />
                <StatChip
                  label="Winst"
                  value={formatMerchPrice(profitCents / 100)}
                />
                <StatChip label="Top maat" value="—" />
              </div>
            ) : null}

            <Section title="Basisgegevens">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Titel">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Limitless Hoodie"
                    required
                    className="ui-auth-input w-full"
                  />
                </Field>
                <Field label="Prijs in euro">
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="49.95"
                    inputMode="decimal"
                    className="ui-auth-input w-full"
                  />
                </Field>
                <Field label="Kostprijs in euro">
                  <input
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="22.00"
                    inputMode="decimal"
                    className="ui-auth-input w-full"
                  />
                </Field>
                <Field label="Collectie">
                  <select
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                    className="ui-auth-input w-full"
                  >
                    <option value="">Geen collectie</option>
                    {collectionOptions.map((entry) => (
                      <option key={entry} value={entry}>
                        {entry}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>

            <Section title="Maten & voorraad">
              <div className="flex flex-wrap gap-2">
                {normalizeSizes(sizes).map((size) => (
                  <div
                    key={size}
                    className="inline-flex items-center gap-2 rounded-xl border border-app-border/70 bg-app-surface-muted/30 px-2 py-1.5"
                  >
                    <span className="text-[12px] font-medium text-app-text">
                      {size}
                    </span>
                    <input
                      value={
                        stockBySize[size] === undefined
                          ? ""
                          : String(stockBySize[size])
                      }
                      onChange={(event) => {
                        const raw = event.target.value;
                        setStockBySize((current) => {
                          const next = { ...current };
                          if (raw.trim() === "") {
                            delete next[size];
                          } else {
                            next[size] = Math.max(0, Number(raw) || 0);
                          }
                          return next;
                        });
                      }}
                      inputMode="numeric"
                      placeholder="∞"
                      className="ui-auth-input h-8 w-16 px-2 py-1 text-right text-[11px]"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  placeholder="Nieuwe maat"
                  className="ui-auth-input h-9 w-32 text-[12px]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = customSize.trim();
                    if (!next) return;
                    setSizes((current) =>
                      normalizeSizes([...current, next]),
                    );
                    setCustomSize("");
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-app-border px-3 py-2 text-[12px] text-app-text hover:bg-app-surface-muted"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Maat toevoegen
                </button>
              </div>
              <p className="mt-2 text-[11px] text-app-subtle">
                Leeg of ∞ betekent onbeperkt. 0 schakelt de maat uit voor atleten.
              </p>
            </Section>

            <Section title="Productafbeeldingen">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) void handleImageFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files) {
                    void handleImageFiles(e.dataTransfer.files);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border border-dashed p-8 text-center transition ${
                  dragOver
                    ? "border-sky-500/60 bg-sky-500/5"
                    : "border-app-border/70 bg-app-surface-muted/20 hover:border-sky-500/40"
                }`}
              >
                <Upload className="mx-auto h-8 w-8 text-app-muted" />
                <p className="mt-2 text-[13px] font-medium text-app-text">
                  Sleep afbeeldingen hierheen of klik om te uploaden
                </p>
                <p className="mt-1 text-[11px] text-app-muted">
                  Max 6 afbeeldingen · eerste is hoofdafbeelding
                </p>
                {uploading ? (
                  <p className="mt-2 text-[12px] text-sky-400">Uploaden...</p>
                ) : null}
              </div>
              {imageUrls.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {imageUrls.map((url, index) => (
                    <div key={url} className="relative">
                      <img
                        src={url}
                        alt=""
                        className={`h-20 w-20 rounded-xl object-cover ${
                          index === 0 ? "ring-2 ring-sky-500/50" : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setImageUrls((current) =>
                            current.filter((entry) => entry !== url),
                          )
                        }
                        className="absolute -right-1 -top-1 rounded-full bg-black/80 p-1 text-white"
                        aria-label="Verwijder afbeelding"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {imageUrls.length < 6 ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-app-border text-app-muted hover:border-sky-500/40"
                    >
                      <ImagePlus className="h-5 w-5" />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </Section>

            <Section title="Beschrijving">
              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value.slice(0, 1000))
                }
                placeholder="Beschrijf je product, materialen, pasvorm, verzorgingstips, etc."
                rows={4}
                className="ui-auth-input w-full"
              />
              <p className="mt-1 text-right text-[11px] text-app-subtle">
                {description.length}/1000
              </p>
            </Section>

            <Section title="Productinfo">
              <div className="grid gap-3">
                <input
                  value={materialInfo}
                  onChange={(event) => setMaterialInfo(event.target.value)}
                  placeholder="Materiaal (bijv. 80% katoen, 20% polyester)"
                  className="ui-auth-input"
                />
                <input
                  value={deliveryTimeText}
                  onChange={(event) => setDeliveryTimeText(event.target.value)}
                  placeholder="Levertijd (bijv. 5-7 werkdagen)"
                  className="ui-auth-input"
                />
                <textarea
                  value={sizeGuideText}
                  onChange={(event) => setSizeGuideText(event.target.value)}
                  placeholder="Maattabel / maatadvies"
                  rows={3}
                  className="ui-auth-input w-full"
                />
                <textarea
                  value={returnPolicyOverride}
                  onChange={(event) => setReturnPolicyOverride(event.target.value)}
                  placeholder="Retour/ruil-info (optioneel, overschrijft shopinstelling)"
                  rows={2}
                  className="ui-auth-input w-full"
                />
              </div>
            </Section>

            <Section title="Productstatus">
              <div className="grid gap-2 sm:grid-cols-3">
                {STATUS_OPTIONS.map((option) => {
                  const active = status === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStatus(option.value)}
                      className={`rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-sky-500/50 bg-sky-500/10 ring-1 ring-sky-500/30"
                          : "border-app-border/70 bg-app-surface-muted/20 hover:border-app-border"
                      }`}
                    >
                      <span className="block text-[13px] font-semibold text-app-text">
                        {option.label}
                      </span>
                      <span className="mt-1 block text-[11px] text-app-muted">
                        {option.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Gaat live op">
              <input
                type="datetime-local"
                value={goLiveAt}
                onChange={(event) => setGoLiveAt(event.target.value)}
                className="ui-auth-input w-full max-w-sm"
              />
              <p className="mt-1 text-[11px] text-app-subtle">
                Optioneel. Leeg + status Live = direct zichtbaar.
              </p>
            </Section>

            <Section title="Kleurvarianten">
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <span
                    key={`${color.name}-${color.value}`}
                    className="inline-flex items-center gap-2 rounded-full border border-app-border px-2.5 py-1 text-[11px] text-app-muted"
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: color.value }}
                    />
                    {color.name}
                    <button
                      type="button"
                      onClick={() =>
                        setColors((current) =>
                          current.filter(
                            (entry) =>
                              !(
                                entry.name === color.name &&
                                entry.value === color.value
                              ),
                          ),
                        )
                      }
                      className="text-app-subtle hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  value={customColorName}
                  onChange={(e) => setCustomColorName(e.target.value)}
                  placeholder="Kleur naam"
                  className="ui-auth-input h-9 w-28 text-[12px]"
                />
                <input
                  type="color"
                  value={customColorValue}
                  onChange={(e) => setCustomColorValue(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-app-border bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => {
                    const name = customColorName.trim() || "Kleur";
                    setColors((current) => [
                      ...current,
                      { name, value: customColorValue },
                    ]);
                    setCustomColorName("");
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-app-border px-3 py-2 text-[12px] text-app-text hover:bg-app-surface-muted"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Kleur toevoegen
                </button>
              </div>
            </Section>

            <Section title="Product flags">
              <div className="grid gap-3 md:grid-cols-3">
                <ToggleCard
                  checked={featured}
                  onChange={setFeatured}
                  title="Featured"
                  description="Toon badge en promoot dit product op je merch pagina."
                />
                <ToggleCard
                  checked={limited}
                  onChange={setLimited}
                  title="Limited"
                  description="Beperk beschikbaarheid met aftellende badge."
                />
                <ToggleCard
                  checked={preorder}
                  onChange={setPreorder}
                  title="Pre-order"
                  description="Laat klanten vooruitbestellen. Ideaal voor nieuwe drops."
                />
              </div>
              {preorder ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input
                    value={preorderTarget}
                    onChange={(event) => setPreorderTarget(event.target.value)}
                    placeholder="Pre-order doel (bv. 50)"
                    inputMode="numeric"
                    className="ui-auth-input"
                  />
                  <input
                    type="datetime-local"
                    value={preorderClosesAt}
                    onChange={(event) =>
                      setPreorderClosesAt(event.target.value)
                    }
                    className="ui-auth-input"
                  />
                </div>
              ) : null}
            </Section>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </div>

          <div className="xl:sticky xl:top-4 xl:self-start">
            <ProductPreviewCard
              title={title}
              description={description}
              price={price}
              imageUrl={imageUrls[0] || ""}
              imageUrls={imageUrls}
              sizes={normalizeSizes(sizes)}
              colors={colors}
              status={status}
              featured={featured}
              limited={limited}
              preorder={preorder}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-app-border/60 bg-[#11161D]/95 px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="app-btn-secondary"
          >
            Annuleren
          </button>
          <div className="flex flex-wrap gap-2">
            {isEdit ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleDuplicate()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-app-border px-4 py-2.5 text-[13px] text-app-text hover:bg-app-surface-muted"
                >
                  <Copy className="h-4 w-4" />
                  Dupliceren
                </button>
                {onDelete && item ? (
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 px-4 py-2.5 text-[13px] text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Verwijderen
                  </button>
                ) : null}
              </>
            ) : null}
            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => void handleSave("concept")}
              className="app-btn-secondary disabled:opacity-60"
            >
              Opslaan als concept
            </button>
            <button
              type="button"
              disabled={saving || uploading || !title.trim()}
              onClick={() => void handleSave()}
              className="app-btn-primary disabled:opacity-60"
            >
              {saving
                ? "Opslaan..."
                : isEdit
                  ? "Opslaan wijzigingen"
                  : "Toevoegen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-app-border/70 bg-[#161B22]/60 p-4 md:p-5">
      <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-app-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-app-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function ToggleCard({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-2xl border p-4 text-left transition ${
        checked
          ? "border-sky-500/40 bg-sky-500/10 ring-1 ring-sky-500/20"
          : "border-app-border/70 bg-app-surface-muted/20 hover:border-app-border"
      }`}
    >
      <span className="block text-[13px] font-semibold text-app-text">
        {title}
      </span>
      <span className="mt-1 block text-[11px] leading-relaxed text-app-muted">
        {description}
      </span>
    </button>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-app-border/60 bg-app-surface-muted/30 p-3">
      <p className="text-[10px] uppercase tracking-wide text-app-subtle">
        {label}
      </p>
      <p className="mt-1 text-[16px] font-semibold text-app-text">{value}</p>
    </div>
  );
}

function normalizeSizes(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeStockForSizes(
  stock: MerchStockBySize,
  sizes: string[],
): MerchStockBySize {
  const sourceSizes = sizes.length ? sizes : ["One size"];
  const next: MerchStockBySize = {};
  for (const size of sourceSizes) {
    if (stock[size] !== undefined) {
      next[size] = Math.max(0, Number(stock[size]) || 0);
    }
  }
  return next;
}

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
