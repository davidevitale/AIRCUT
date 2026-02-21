import * as ImageManipulator from "expo-image-manipulator";
import { pickImages } from "./mediaService";

const IMAGE_PIPELINE_CONFIG = {
  maxSize: 1080,
  quality: 0.8,
  format: ImageManipulator.SaveFormat.JPEG,
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

  const sourceWidth = imageAsset.width ?? IMAGE_PIPELINE_CONFIG.maxSize;
  const sourceHeight = imageAsset.height ?? IMAGE_PIPELINE_CONFIG.maxSize;
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

  if (squareSize > IMAGE_PIPELINE_CONFIG.maxSize) {
    actions.push({
      resize: {
        width: IMAGE_PIPELINE_CONFIG.maxSize,
        height: IMAGE_PIPELINE_CONFIG.maxSize,
      },
    });
  }

  const processed = await ImageManipulator.manipulateAsync(imageAsset.uri, actions, {
    compress: IMAGE_PIPELINE_CONFIG.quality,
    format: IMAGE_PIPELINE_CONFIG.format,
  });

  return {
    uri: processed.uri,
    width: processed.width,
    height: processed.height,
    mimeType: "image/jpeg",
  };
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

  console.log("postService.publishPost called", {
    barberId,
    image,
    caption,
    selectedTags,
    registrationPreferences,
  });

  return {
    success: true,
    postId: `draft_${Date.now()}`,
  };
};
