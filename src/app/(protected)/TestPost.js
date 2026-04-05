import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Button } from 'react-native-paper';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const IMAGE_VARIANTS = {
  thumbnail: {
    size: 400,
    quality: 0.7,
    fileName: 'thumbnail.webp',
    mimeType: 'image/webp',
  },
  standard: {
    size: 1080,
    quality: 0.8,
    fileName: 'standard.webp',
    mimeType: 'image/webp',
  },
};

const PREVIEW_VARIANT = {
  size: 1080,
  quality: 0.8,
  mimeType: 'image/webp',
};

const TestPost = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const { t } = useTranslation();

  const createSquareImageVariant = async (imageAsset, variant) => {
    if (!imageAsset?.uri) {
      throw new Error('Invalid image asset. Missing uri.');
    }

    const sourceWidth = imageAsset.width ?? variant.size;
    const sourceHeight = imageAsset.height ?? variant.size;
    const squareSize = Math.min(sourceWidth, sourceHeight);
    const originX = Math.max(0, Math.floor((sourceWidth - squareSize) / 2));
    const originY = Math.max(0, Math.floor((sourceHeight - squareSize) / 2));

    const processed = await ImageManipulator.manipulateAsync(
      imageAsset.uri,
      [
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
      ],
      {
        compress: variant.quality,
        format: ImageManipulator.SaveFormat.WEBP,
      }
    );

    return {
      uri: processed.uri,
      width: processed.width,
      height: processed.height,
      mimeType: variant.mimeType,
    };
  };

  const createPreviewImage = async (imageAsset) => {
    const preview = await createSquareImageVariant(imageAsset, PREVIEW_VARIANT);

    return {
      ...preview,
      originalAsset: imageAsset,
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

  const handlePickImage = async () => {
    try {
      setProcessingImage(true);

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Permission to access the media library is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });


      if (result.canceled) {
        return;
      }

      const pickedImage = result.assets[0];
      const preview = await createPreviewImage(pickedImage);
      console.log('Preview image ready:', preview);
      setSelectedImage(pickedImage);
      setPreviewImage(preview);
    } catch (error) {
      console.error('Error preparing image:', error);
      Alert.alert('Oops', 'Unable to prepare image.');
    } finally {
      setProcessingImage(false);
    }
  };

  const handleUploadImage = async () => {
    try {
      if (!selectedImage?.uri) {
        Alert.alert('Select image', 'Please select an image first.');
        return;
      }

      setPublishing(true);
      const postId = `test-post-${Date.now()}`;
      const { thumbnail, standard } = await createPostImageVariants(selectedImage);

      const [thumbnailUrl, standardUrl] = await Promise.all([
        uploadToStorage(
          thumbnail.uri,
          `posts/${postId}/${IMAGE_VARIANTS.thumbnail.fileName}`,
          IMAGE_VARIANTS.thumbnail.mimeType
        ),
        uploadToStorage(
          standard.uri,
          `posts/${postId}/${IMAGE_VARIANTS.standard.fileName}`,
          IMAGE_VARIANTS.standard.mimeType
        ),
      ]);

      console.log('Thumbnail URL:', thumbnailUrl);
      console.log('Standard URL:', standardUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setPublishing(false);
    }
  };

  const uploadToStorage = async (uri, storagePath, contentType) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const storage = getStorage();
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, blob, {
        cacheControl: 'public, max-age=31536000',
        contentType,
      });

      return await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload: ${progress}%`);
          },
          (error) => {
            console.error('Upload failed:', error);
            Alert.alert('Oops', 'Upload failed, check connection.');
            reject(error);
          },
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('Done! URL:', url);
            resolve(url);
          }
        );
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('Navigation.add')}</Text>

        <TouchableOpacity
          onPress={handlePickImage}
          style={styles.imagePicker}
          disabled={processingImage || publishing}
        >
          {processingImage ? (
            <ActivityIndicator size="small" color="#00BCD4" />
          ) : previewImage?.uri ? (
            <Image source={{ uri: previewImage.uri }} style={styles.previewImage} />
          ) : (
            <Text style={styles.imagePickerText}>{t('PostScreen.selectImageFromGallery')}</Text>
          )}
        </TouchableOpacity>

        <Button
          mode="contained"
          onPress={handleUploadImage}
          style={{ marginTop: 20 }}
          disabled={processingImage || publishing}
        >
          {publishing ? 'Uploading...' : 'Upload WebP'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00BCD4',
    marginBottom: 16,
  },
  imagePicker: {
    height: 240,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 188, 212, 0.4)',
    backgroundColor: 'rgba(0, 188, 212, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagePickerText: {
    color: '#0891b2',
    fontSize: 15,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  captionInput: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 188, 212, 0.25)',
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    textAlignVertical: 'top',
  },
  sectionTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 12,
    color: '#64748b',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tagCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  tagCardActive: {
    borderColor: '#00BCD4',
    backgroundColor: 'rgba(0, 188, 212, 0.12)',
  },
  tagTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  tagTitleActive: {
    color: '#0891b2',
  },
  tagDescription: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
  },
  publishButton: {
    marginTop: 12,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#00BCD4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  legalText: {
    marginTop: 10,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
});

export default TestPost;
