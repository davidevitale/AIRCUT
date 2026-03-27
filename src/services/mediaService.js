import { ref, uploadString, getDownloadURL } from "firebase/storage";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { storage } from "../../config/firebase";

console.log("âœ… mediaService.js caricato // loaded (NO BLOB + MediaType)", new Date().toISOString());

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
    // CompatibilitÃ  tra nuove e vecchie API (MediaType vs MediaTypeOptions)
    const useNew = !!(
      ImagePicker &&
      ImagePicker.MediaType &&
      (ImagePicker.MediaType.Image || ImagePicker.MediaType.Video)
    );
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
    const useNew = !!(
      ImagePicker &&
      ImagePicker.MediaType &&
      (ImagePicker.MediaType.Image || ImagePicker.MediaType.Video)
    );
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

/* -------------------------------------------------------
   UPLOAD SINGOLO FILE (NO BLOB)
------------------------------------------------------- */
export const uploadFile = async (uri, fileName, userId, folder = "portfolio", contentType) => {
  try {
    const storageRef = ref(storage, `${folder}/${userId}/${fileName}`);
    const ct = normalizeContentType(contentType, uri, folder);
    const metadata = {
      contentType: ct,
      cacheControl: "public, max-age=31536000",
    };

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });

    console.log("uploadFile -> start", { folder, fileName, ct, len: base64?.length });

    try {
      const dataUrl = `data:${ct};base64,${base64}`;
      await uploadString(storageRef, dataUrl, "data_url", metadata);
      console.log("uploadFile -> uploaded via data_url");
    } catch (e1) {
      console.warn("uploadFile data_url failed, retry base64", e1?.message || e1);
      await uploadString(storageRef, base64, "base64", metadata);
      console.log("uploadFile -> uploaded via base64 fallback");
    }

    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Errore upload file:", error);
    throw error;
  }
};

export const uploadFileToPath = async (uri, storagePath, contentType) => {
  try {
    const storageRef = ref(storage, storagePath);
    const ct = normalizeContentType(contentType, uri, storagePath);
    const metadata = {
      contentType: ct,
      cacheControl: "public, max-age=31536000",
    };

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });

    console.log("uploadFileToPath -> start", { storagePath, ct, len: base64?.length });

    try {
      const dataUrl = `data:${ct};base64,${base64}`;
      await uploadString(storageRef, dataUrl, "data_url", metadata);
      console.log("uploadFileToPath -> uploaded via data_url");
    } catch (e1) {
      console.warn("uploadFileToPath data_url failed, retry base64", e1?.message || e1);
      await uploadString(storageRef, base64, "base64", metadata);
      console.log("uploadFileToPath -> uploaded via base64 fallback");
    }

    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Errore upload file to path:", error);
    throw error;
  }
};

/* -------------------------------------------------------
   UPLOAD MULTIPLI (sequenziale)
------------------------------------------------------- */
export const uploadMultipleFiles = async (
  files,
  userId,
  folder = "portfolio",
  onProgress = () => {}
) => {
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
