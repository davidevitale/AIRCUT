import * as ImageManipulator from "expo-image-manipulator";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { getCurrentUserData } from "./authService";
import { pickImages, uploadFileToPath } from "./mediaService";

const WEBP_FORMAT = ImageManipulator.SaveFormat.WEBP;

const IMAGE_VARIANTS = {
  thumbnail: {
    size: 400,
    quality: 0.7,
    fileName: "thumbnail.webp",
    mimeType: "image/webp",
  },
  standard: {
    size: 1080,
    quality: 0.8,
    fileName: "standard.webp",
    mimeType: "image/webp",
  },
};

const normalizePreferences = (registrationPreferences = []) => {
  if (!Array.isArray(registrationPreferences)) {
    return [];
  }

  return registrationPreferences.filter(
    (tagId) => typeof tagId === "string" && tagId.trim().length > 0
  );
};

export const processImageToSquare = async (imageAsset) => {
  if (!imageAsset?.uri) {
    throw new Error("Invalid image asset. Missing uri.");
  }

  const sourceWidth = imageAsset.width ?? IMAGE_VARIANTS.standard.size;
  const sourceHeight = imageAsset.height ?? IMAGE_VARIANTS.standard.size;
  const squareSize = Math.min(sourceWidth, sourceHeight);

  const originX = Math.max(0, Math.floor((sourceWidth - squareSize) / 2));
  const originY = Math.max(0, Math.floor((sourceHeight - squareSize) / 2));

  const actions = [
    {
      crop: {
        originX,
        originY,
        width: squareSize,
        height: squareSize,
      },
    },
  ];

  if (squareSize > IMAGE_VARIANTS.standard.size) {
    actions.push({
      resize: {
        width: IMAGE_VARIANTS.standard.size,
        height: IMAGE_VARIANTS.standard.size,
      },
    });
  }

  const processed = await ImageManipulator.manipulateAsync(imageAsset.uri, actions, {
    compress: IMAGE_VARIANTS.standard.quality,
    format: WEBP_FORMAT,
  });

  return {
    uri: processed.uri,
    width: processed.width,
    height: processed.height,
    mimeType: IMAGE_VARIANTS.standard.mimeType,
    originalAsset: imageAsset,
  };
};

const createSquareImageVariant = async (imageAsset, variant) => {
  if (!imageAsset?.uri) {
    throw new Error("Invalid image asset. Missing uri.");
  }

  const sourceWidth = imageAsset.width ?? variant.size;
  const sourceHeight = imageAsset.height ?? variant.size;
  const squareSize = Math.min(sourceWidth, sourceHeight);
  const originX = Math.max(0, Math.floor((sourceWidth - squareSize) / 2));
  const originY = Math.max(0, Math.floor((sourceHeight - squareSize) / 2));

  const actions = [
    {
      crop: {
        originX,
        originY,
        width: squareSize,
        height: squareSize,
      },
    },
    {
      resize: {
        width: variant.size,
        height: variant.size,
      },
    },
  ];

  const processed = await ImageManipulator.manipulateAsync(imageAsset.uri, actions, {
    compress: variant.quality,
    format: WEBP_FORMAT,
  });

  return {
    uri: processed.uri,
    width: processed.width,
    height: processed.height,
    mimeType: variant.mimeType,
  };
};

const createPostImageVariants = async (image) => {
  const sourceAsset = image?.originalAsset?.uri ? image.originalAsset : image;

  const [thumbnail, standard] = await Promise.all([
    createSquareImageVariant(sourceAsset, IMAGE_VARIANTS.thumbnail),
    createSquareImageVariant(sourceAsset, IMAGE_VARIANTS.standard),
  ]);

  return { thumbnail, standard };
};

export const pickAndProcessImageFromGallery = async () => {
  const images = await pickImages(false);

  if (!images || images.length === 0) {
    return null;
  }

  return processImageToSquare(images[0]);
};

export const validateSelectedTagsAgainstPreferences = ({
  selectedTags,
  registrationPreferences,
}) => {
  if (!Array.isArray(selectedTags) || selectedTags.length === 0) {
    return false;
  }

  const normalizedPreferences = normalizePreferences(registrationPreferences);
  if (normalizedPreferences.length === 0) {
    return false;
  }

  const preferenceSet = new Set(normalizedPreferences);

  return selectedTags.every(
    (tagId) => typeof tagId === "string" && preferenceSet.has(tagId)
  );
};

export const publishPost = async ({
  barberId,
  image,
  caption,
  selectedTags,
  registrationPreferences,
}) => {
  const isValid = validateSelectedTagsAgainstPreferences({
    selectedTags,
    registrationPreferences,
  });

  if (!isValid) {
    throw new Error("Selected tags are invalid for the registration preferences.");
  }

  if (!barberId || !image?.uri) {
    throw new Error("Missing required post data.");
  }

  const postRef = doc(collection(db, "posts"));
  const postId = postRef.id;
  const { thumbnail, standard } = await createPostImageVariants(image);

  const [thumbnailUrl, imageUrl, currentUser] = await Promise.all([
    uploadFileToPath(
      thumbnail.uri,
      `posts/${postId}/${IMAGE_VARIANTS.thumbnail.fileName}`,
      thumbnail.mimeType
    ),
    uploadFileToPath(
      standard.uri,
      `posts/${postId}/${IMAGE_VARIANTS.standard.fileName}`,
      standard.mimeType
    ),
    getCurrentUserData(),
  ]);

  const barberProfile = currentUser?.userData || {};
  const createdAt = new Date().toISOString();
  const postDoc = {
    postId,
    barberId,
    caption: caption?.trim() || "",
    selectedTags,
    imageUrl,
    thumbnailUrl,
    likes: [],
    createdAt,
    barberName:
      barberProfile.salonName ||
      barberProfile.nomeSalone ||
      barberProfile.firstName ||
      "",
    barberProfileImage: barberProfile.profileImage || null,
  }

  await setDoc(postRef, postDoc);

  return {
    success: true,
    postId,
    imageUrl,
    thumbnailUrl,
  };
};
