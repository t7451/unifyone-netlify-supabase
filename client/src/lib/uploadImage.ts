/**
 * Upload an image to /api/uploads/image. Returns the served URL.
 * Throws on non-2xx with the server's error message.
 */
export async function uploadImage(
  file: File
): Promise<{ url: string; key: string }> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`Only images are supported (got ${file.type}).`);
  }
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/uploads/image", {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      // body wasn't JSON
    }
    throw new Error(msg);
  }
  return (await res.json()) as { url: string; key: string };
}
