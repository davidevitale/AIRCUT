import { ref, uploadString, getDownloadURL } from "firebase/storage";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { storage } from '../../config/firebase';

console.log("✅ mediaService.js caricato (NO BLOB + MediaType)", new Date().toISOString());

/* -------------------------------------------------------
   PERMESSI
------------------------------------------------------- */
export const requestGalleryPermissions = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    alert("Scusa, abbiamo bisogno dei permessi per accedere alla galleria!");
    return false;
  }
  return true;
};

/* -------------------------------------------------------
   PICK IMAGES (sempre array)
------------------------------------------------------- */
export const pickImages = async (allowsMultipleSelection = true) => {
  const hasPermission = await requestGalleryPermissions();
  if (!hasPermission) return null;

  try {
    // Compatibilità tra nuove e vecchie API (MediaType vs MediaTypeOptions)
    const useNew = !!(ImagePicker && ImagePicker.MediaType && (ImagePicker.MediaType.Image || ImagePicker.MediaType.Video));
    const options = {
      allowsMultipleSelection,
      allowsEditing: false,
      quality: 0.9,
      ...(useNew ? { mediaTypes: [ImagePicker.MediaType.Image] } : {}),
    };

    const result = await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled) return null;

    return (result.assets || []).map((a) => ({
      uri: a.uri,
      fileName: a.fileName ?? null,
      type: a.type ?? "image",
      mimeType: a.mimeType ?? null,
      width: a.width,
      height: a.height,
      fileSize: a.fileSize,
    }));
  } catch (error) {
    console.error("Errore nella selezione immagini:", error);
    return null;
  }
};

/* -------------------------------------------------------
   PICK VIDEOS (sempre array)
------------------------------------------------------- */
export const pickVideos = async (allowsMultipleSelection = true) => {
  const hasPermission = await requestGalleryPermissions();
  if (!hasPermission) return null;

  try {
    const useNew = !!(ImagePicker && ImagePicker.MediaType && (ImagePicker.MediaType.Image || ImagePicker.MediaType.Video));
    const options = {
      allowsMultipleSelection,
      allowsEditing: false,
      quality: 1,
      ...(useNew ? { mediaTypes: [ImagePicker.MediaType.Video] } : {}),
    };

    const result = await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled) return null;

    return (result.assets || []).map((a) => ({
      uri: a.uri,
      fileName: a.fileName ?? null,
      type: a.type ?? "video",
      mimeType: a.mimeType ?? null,
      duration: a.duration,
      fileSize: a.fileSize,
    }));
  } catch (error) {
    console.error("Errore nella selezione video:", error);
    return null;
  }
};

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */
const extFromUri = (uri) => {
  const m = uri?.match(/\.(\w+)(\?|$)/);
  return (m?.[1] || "jpg").toLowerCase();
};

const normalizeContentType = (mimeType, uri, folder) => {
  if (mimeType && typeof mimeType === "string") return mimeType;

  const ext = extFromUri(uri);
  const isVideo = folder.includes("videos") || folder.includes("video");

  if (isVideo) {
    if (ext === "mov") return "video/quicktime";
    return "video/mp4";
  }

  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
};

// Base64 -> Uint8Array (senza dipendenze)
const base64ToUint8Array = (base64) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const str = base64.replace(/=+$/, "");
  const output = [];

  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < str.length; i++) {
    const val = chars.indexOf(str[i]);
    if (val === -1) continue;

    buffer = (buffer << 6) | val;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 0xff);
    }
  }

  return new Uint8Array(output);
};

/* -------------------------------------------------------
   UPLOAD SINGOLO FILE (NO BLOB)
------------------------------------------------------- */
export const uploadFile = async (uri, fileName, userId, folder = "portfolio", contentType) => {
  try {
    const storageRef = ref(storage, `${folder}/${userId}/${fileName}`);
    const ct = normalizeContentType(contentType, uri, folder);

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log("uploadFile -> start", { folder, fileName, ct, len: base64?.length });

    // 1) Prova con data_url (spesso evita codepath con Blob su RN)
    try {
      const dataUrl = `data:${ct};base64,${base64}`;
      await uploadString(storageRef, dataUrl, 'data_url', { contentType: ct });
      console.log("uploadFile -> uploaded via data_url");
    } catch (e1) {
      console.warn("uploadFile data_url failed, retry base64", e1?.message || e1);
      // 2) Fallback a base64 semplice || Simple fallback to base64
      await uploadString(storageRef, base64, 'base64', { contentType: ct });
      console.log("uploadFile -> uploaded via base64 fallback");
    }

    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Errore upload file:", error);
    throw error;
  }
};

/* -------------------------------------------------------
   UPLOAD MULTIPLI (sequenziale)
------------------------------------------------------- */
export const uploadMultipleFiles = async (files, userId, folder = "portfolio", onProgress = () => { }) => {
  try {
    if (!Array.isArray(files) || files.length === 0) return [];

    const results = [];
    const total = files.length;

    for (let index = 0; index < total; index++) {
      const file = files[index];
      if (!file?.uri) continue;

      const extFromMime = file.mimeType ? file.mimeType.split("/")[1] : null;
      const ext = (extFromMime || extFromUri(file.uri) || "jpg").toLowerCase();

      const fileName = `${Date.now()}_${index}.${ext}`;
      const url = await uploadFile(file.uri, fileName, userId, folder, file.mimeType);

      onProgress(index + 1, total);

      results.push({
        url,
        type: file.type,
        fileName,
        uploadedAt: new Date().toISOString(),
      });
    }

    return results;
  } catch (error) {
    console.error("Errore upload multipli:", error);
    throw error;
  }
};