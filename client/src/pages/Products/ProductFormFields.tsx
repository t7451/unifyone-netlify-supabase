import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isValidImageUrl } from "./Products.utils";
import type {
  CategoryOption,
  ProductForm,
  ProductStatus,
} from "./Products.types";

export function ProductFormFields({
  form,
  setForm,
  errors,
  onTouch,
}: {
  form: ProductForm;
  setForm: (f: ProductForm) => void;
  errors?: { name?: string; price?: string };
  onTouch?: (field: string) => void;
}) {
  const categories = trpc.products.categories.useQuery();
  const categoryList = (categories.data ?? []) as CategoryOption[];
  const [imgBroken, setImgBroken] = useState(false);
  const showImagePreview = isValidImageUrl(form.imageUrl) && !imgBroken;

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300 text-sm">Product Name *</Label>
        <Input
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          onBlur={() => onTouch?.("name")}
          placeholder="e.g. Premium Widget Pro"
          className={`bg-white/5 border-white/10 text-white mt-1 focus:border-[#D4A843]/50 ${errors?.name ? "border-red-500/70" : ""}`}
        />
        {errors?.name && (
          <p className="text-red-400 text-xs mt-1">{errors.name}</p>
        )}
      </div>
      <div>
        <Label className="text-gray-300 text-sm">Description</Label>
        <Textarea
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Product description..."
          rows={3}
          className="bg-white/5 border-white/10 text-white mt-1 resize-none focus:border-[#D4A843]/50"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-gray-300 text-sm">Price *</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              $
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              onBlur={() => onTouch?.("price")}
              placeholder="0.00"
              className={`bg-white/5 border-white/10 text-white pl-7 focus:border-[#D4A843]/50 ${errors?.price ? "border-red-500/70" : ""}`}
            />
          </div>
          {errors?.price && (
            <p className="text-red-400 text-xs mt-1">{errors.price}</p>
          )}
        </div>
        <div>
          <Label className="text-gray-300 text-sm">Compare-at Price</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              $
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.compareAtPrice}
              onChange={e =>
                setForm({ ...form, compareAtPrice: e.target.value })
              }
              placeholder="0.00"
              className="bg-white/5 border-white/10 text-white pl-7 focus:border-[#D4A843]/50"
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-gray-300 text-sm">SKU</Label>
          <Input
            value={form.sku}
            onChange={e => setForm({ ...form, sku: e.target.value })}
            placeholder="SKU-001"
            className="bg-white/5 border-white/10 text-white mt-1 focus:border-[#D4A843]/50"
          />
        </div>
        <div>
          <Label className="text-gray-300 text-sm">Barcode</Label>
          <Input
            value={form.barcode}
            onChange={e => setForm({ ...form, barcode: e.target.value })}
            placeholder="UPC / EAN"
            className="bg-white/5 border-white/10 text-white mt-1 focus:border-[#D4A843]/50"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-gray-300 text-sm">Status</Label>
          <Select
            value={form.status}
            onValueChange={value =>
              setForm({ ...form, status: value as ProductStatus })
            }
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0F172A] border-white/10">
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-300 text-sm">Category</Label>
          <Select
            value={form.categoryId}
            onValueChange={v => setForm({ ...form, categoryId: v })}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent className="bg-[#0F172A] border-white/10">
              <SelectItem value="none">None</SelectItem>
              {categoryList.map(category => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="border-t border-white/10 pt-4">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
          Inventory
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-gray-300 text-sm">Stock Quantity</Label>
            <Input
              type="number"
              min="0"
              value={form.initialStock}
              onChange={e => setForm({ ...form, initialStock: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1 focus:border-[#D4A843]/50"
            />
          </div>
          <div>
            <Label className="text-gray-300 text-sm">Low Stock Alert</Label>
            <Input
              type="number"
              min="0"
              value={form.lowStockThreshold}
              onChange={e =>
                setForm({ ...form, lowStockThreshold: e.target.value })
              }
              className="bg-white/5 border-white/10 text-white mt-1 focus:border-[#D4A843]/50"
            />
          </div>
        </div>
      </div>
      <div>
        <Label className="text-gray-300 text-sm">Weight (lbs)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={form.weight}
          onChange={e => setForm({ ...form, weight: e.target.value })}
          placeholder="0.00"
          className="bg-white/5 border-white/10 text-white mt-1 focus:border-[#D4A843]/50"
        />
      </div>
      <div>
        <Label className="text-gray-300 text-sm">Image URL</Label>
        <div className="mt-1 flex items-start gap-3">
          <Input
            value={form.imageUrl}
            onChange={e => {
              setForm({ ...form, imageUrl: e.target.value });
              setImgBroken(false);
            }}
            placeholder="https://example.com/image.jpg"
            className="bg-white/5 border-white/10 text-white focus:border-[#D4A843]/50"
          />
          {showImagePreview && (
            <div className="h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-white/5 shrink-0">
              <img
                src={form.imageUrl}
                alt="Product preview"
                className="h-full w-full object-cover"
                onError={() => setImgBroken(true)}
              />
            </div>
          )}
        </div>
        {form.imageUrl && !showImagePreview && (
          <p className="mt-2 text-xs text-gray-500">
            Enter a valid image URL to preview the thumbnail.
          </p>
        )}
      </div>
    </div>
  );
}
