"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CONDITIONS, DEAL_TYPES, DELIVERY_METHODS, GRADES, MAX_PHOTOS } from "@/lib/constants";
import { validateListingFields, validateUpload } from "@/lib/validation";
import { formatPrice } from "@/lib/utils";
import { createListing, updateListing } from "@/app/actions/listings";
import type { Listing, ListingPhoto } from "@/lib/types/database";

type Props = {
  userId: string;
  listing?: Listing & { listing_photos: ListingPhoto[] };
};

export function ListingForm({ userId, listing }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!listing;

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [title, setTitle] = useState(listing?.title ?? "");
  const [schoolName, setSchoolName] = useState(listing?.school_name ?? "");
  const [grade, setGrade] = useState(listing?.grade ?? "");
  const [subject, setSubject] = useState(listing?.subject ?? "");
  const [publisher, setPublisher] = useState(listing?.publisher ?? "");
  const [edition, setEdition] = useState(listing?.edition ?? "");
  const [condition, setCondition] = useState<string>(listing?.condition ?? "good");
  const [dealType, setDealType] = useState<string>(listing?.deal_type ?? "sale");
  const [price, setPrice] = useState(
    listing?.price_cents ? (listing.price_cents / 100).toFixed(2) : "",
  );
  const [locationText, setLocationText] = useState(listing?.location_text ?? "");
  const [deliveryMethod, setDeliveryMethod] = useState<string>(
    listing?.delivery_method ?? "flexible",
  );

  // Photos
  const [existingPhotos, setExistingPhotos] = useState<ListingPhoto[]>(
    listing?.listing_photos ?? [],
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const totalPhotos = existingPhotos.length + newFiles.length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_PHOTOS - totalPhotos;
    const toAdd: File[] = [];
    const uploadErrors: string[] = [];

    for (const file of files.slice(0, remaining)) {
      const check = validateUpload(file);
      if (!check.valid) {
        uploadErrors.push(`${file.name}: ${check.error}`);
      } else {
        toAdd.push(file);
      }
    }

    if (uploadErrors.length) {
      setErrors((prev) => ({ ...prev, photos: uploadErrors.join(". ") }));
    } else {
      setErrors((prev) => {
        const { photos, ...rest } = prev;
        return rest;
      });
    }

    setNewFiles((prev) => [...prev, ...toAdd]);
    setPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    // Reset input para permitir selecionar mesmo arquivo
    e.target.value = "";
  };

  const removeNewFile = (idx: number) => {
    URL.revokeObjectURL(previews[idx]);
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeExistingPhoto = async (photo: ListingPhoto) => {
    await supabase.storage.from("listing-photos").remove([photo.path]);
    await supabase.from("listing_photos").delete().eq("id", photo.id);
    setExistingPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  };

  const uploadPhotos = async (listingId: string): Promise<void> => {
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const ext = file.name.split(".").pop() || "jpg";
      const safeName = `${Date.now()}_${i}.${ext}`;
      const path = `${userId}/${listingId}/${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from("listing-photos")
        .upload(path, file, { contentType: file.type });

      if (uploadErr) throw uploadErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("listing-photos").getPublicUrl(path);

      await supabase.from("listing_photos").insert({
        listing_id: listingId,
        url: publicUrl,
        path,
        sort_order: existingPhotos.length + i,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos
    const fieldErrors = validateListingFields({
      title,
      school_name: schoolName,
      grade,
      condition,
      deal_type: dealType,
      price,
    });

    if (!isEditing && totalPhotos === 0 && newFiles.length === 0) {
      fieldErrors.photos = "Adicione pelo menos 1 foto";
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const formPayload = {
        title,
        school_name: schoolName,
        grade,
        subject: subject || undefined,
        publisher: publisher || undefined,
        edition: edition || undefined,
        condition,
        deal_type: dealType,
        price: dealType === "sale" ? price : undefined,
        location_text: locationText || undefined,
        delivery_method: deliveryMethod,
      };

      if (isEditing) {
        // Server action — validação + sanitização server-side
        const result = await updateListing(listing.id, formPayload);

        if (result.error) {
          if (result.fieldErrors) {
            setErrors(result.fieldErrors);
          } else {
            setErrors({ _form: result.error });
          }
          setLoading(false);
          return;
        }
        await uploadPhotos(listing.id);
        router.push(`/listings/${listing.id}`);
      } else {
        // Server action — validação + sanitização server-side
        const result = await createListing(formPayload);

        if (result.error) {
          if (result.fieldErrors) {
            setErrors(result.fieldErrors);
          } else {
            setErrors({ _form: result.error });
          }
          setLoading(false);
          return;
        }
        await uploadPhotos(result.id!);
        router.push(`/listings/${result.id}`);
      }

      router.refresh();
    } catch (err: any) {
      setErrors({ _form: err.message || "Erro ao salvar anúncio." });
    } finally {
      setLoading(false);
    }
  };

  // Preview card
  const previewPriceCents =
    dealType === "sale" && price ? Math.round(parseFloat(price) * 100) : null;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors._form && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {errors._form}
          </div>
        )}

        {/* ─── Bloco 1: Informações do livro ─── */}
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold">Informações do livro</h2>

          <div>
            <label className="label">Título do livro *</label>
            <input
              className={`input ${errors.title ? "border-red-400" : ""}`}
              required
              placeholder="Ex: Matemática — Projeto Teláris"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500">{errors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Escola *</label>
              <input
                className={`input ${errors.school_name ? "border-red-400" : ""}`}
                required
                placeholder="Nome da escola"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
              {errors.school_name && (
                <p className="mt-1 text-xs text-red-500">{errors.school_name}</p>
              )}
            </div>
            <div>
              <label className="label">Série/Ano *</label>
              <select
                className={`input ${errors.grade ? "border-red-400" : ""}`}
                required
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                <option value="">Selecione</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              {errors.grade && (
                <p className="mt-1 text-xs text-red-500">{errors.grade}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Matéria</label>
              <input
                className="input"
                placeholder="Ex: Matemática"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Editora</label>
              <input
                className="input"
                placeholder="Ex: Ática"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Edição</label>
              <input
                className="input"
                placeholder="Ex: 3ª ed."
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Estado *</label>
              <select
                className="input"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                {Object.entries(CONDITIONS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tipo *</label>
              <select
                className="input"
                value={dealType}
                onChange={(e) => setDealType(e.target.value)}
              >
                {Object.entries(DEAL_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                Preço (R$) {dealType === "sale" && "*"}
              </label>
              <input
                className={`input ${errors.price ? "border-red-400" : ""}`}
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                disabled={dealType === "donation"}
                value={dealType === "donation" ? "" : price}
                onChange={(e) => setPrice(e.target.value)}
              />
              {errors.price && (
                <p className="mt-1 text-xs text-red-500">{errors.price}</p>
              )}
            </div>
          </div>
        </div>

        {/* ─── Bloco 2: Fotos, local e entrega ─── */}
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold">Fotos, local e entrega</h2>

          {/* Fotos */}
          <div>
            <label className="label">
              Fotos ({totalPhotos}/{MAX_PHOTOS}) *
            </label>
            <div className="flex flex-wrap gap-3">
              {existingPhotos.map((photo) => (
                <div key={photo.id} className="relative h-24 w-24">
                  <img
                    src={photo.url}
                    alt=""
                    className="h-full w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingPhoto(photo)}
                    className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {previews.map((src, i) => (
                <div key={i} className="relative h-24 w-24">
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewFile(i)}
                    className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {totalPhotos < MAX_PHOTOS && (
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-brand-400 hover:text-brand-500">
                  <Upload className="h-5 w-5" />
                  <span className="text-[10px]">Adicionar</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>
            {errors.photos && (
              <p className="mt-1 text-xs text-red-500">{errors.photos}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              JPG, PNG ou WebP. Máx 5 MB cada.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Localização</label>
              <input
                className="input"
                placeholder="Bairro, cidade"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Entrega</label>
              <select
                className="input"
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value)}
              >
                {Object.entries(DELIVERY_METHODS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ─── Ações ─── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="btn-secondary order-2 sm:order-1"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? "Fechar preview" : "Preview do anúncio"}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary order-1 sm:order-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEditing ? (
              "Salvar alterações"
            ) : (
              "Publicar anúncio"
            )}
          </button>
        </div>
      </form>

      {/* ─── Preview card ─── */}
      {showPreview && (
        <div className="card overflow-hidden">
          <p className="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 uppercase">
            Preview do anúncio
          </p>
          <div className="flex gap-4 p-4">
            {(previews[0] || existingPhotos[0]?.url) ? (
              <img
                src={previews[0] || existingPhotos[0]?.url}
                alt=""
                className="h-28 w-28 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                Sem foto
              </div>
            )}
            <div className="flex-1 space-y-1">
              <p className="font-semibold">{title || "Título do livro"}</p>
              <p className="text-sm text-gray-500">
                {grade || "Série"} · {schoolName || "Escola"}
              </p>
              <p className="text-xl font-bold text-brand-600">
                {formatPrice(previewPriceCents)}
              </p>
              {locationText && (
                <p className="text-xs text-gray-400">{locationText}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
