"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function MedicineForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const body = {
      name: String(formData.get("name") || ""),
      genericName: formData.get("genericName") || null,
      strength: formData.get("strength") || null,
      form: formData.get("form") || "tablet",
      unit: formData.get("unit") || "piece",
      stock: Number(formData.get("stock") || 0),
      minStock: Number(formData.get("minStock") || 10),
      price: Number(formData.get("price") || 0),
      isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
    };

    try {
      const res = await fetch("/api/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message || "Failed to add medicine");
        setLoading(false);
        return;
      }
      router.push("/pharmacy");
      router.refresh();
    } catch (err) {
      setError("Failed to add medicine");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)]">Name *</label>
        <input name="name" required className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)]">Generic name</label>
          <input name="genericName" className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)]">Strength</label>
          <input name="strength" className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)]">Form</label>
          <select name="form" defaultValue="tablet" className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]">
            <option value="tablet">tablet</option>
            <option value="capsule">capsule</option>
            <option value="syrup">syrup</option>
            <option value="injection">injection</option>
            <option value="cream">cream</option>
            <option value="ointment">ointment</option>
            <option value="drops">drops</option>
            <option value="inhaler">inhaler</option>
            <option value="other">other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)]">Unit</label>
          <input name="unit" defaultValue="piece" className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)]">Price</label>
          <input name="price" type="number" min="0" step="0.01" defaultValue="0" className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)]">Stock</label>
          <input name="stock" type="number" min="0" defaultValue="0" className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)]">Min stock</label>
          <input name="minStock" type="number" min="0" defaultValue="10" className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
        <input type="checkbox" name="isActive" defaultChecked />
        Active
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save medicine"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/pharmacy")}>Cancel</Button>
      </div>
    </form>
  );
}
