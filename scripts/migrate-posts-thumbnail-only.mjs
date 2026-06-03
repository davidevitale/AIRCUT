#!/usr/bin/env node

const DRY_RUN = process.argv.includes("--dry-run");
const DEFAULT_BUCKET = "aircut-9f140.firebasestorage.app";

const storagePathFromUrl = (url) => {
  if (!url || typeof url !== "string") return null;

  const match = url.match(/\/o\/([^?]+)/);
  if (!match?.[1]) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
};

const deleteIfExists = async (bucket, storagePath) => {
  if (!storagePath) return false;

  if (DRY_RUN) {
    console.log(`[dry-run] would delete storage object: ${storagePath}`);
    return true;
  }

  try {
    await bucket.file(storagePath).delete({ ignoreNotFound: true });
    console.log(`deleted storage object: ${storagePath}`);
    return true;
  } catch (error) {
    console.warn(`could not delete ${storagePath}: ${error.message}`);
    return false;
  }
};

const main = async () => {
  let admin;

  try {
    const adminModule = await import("firebase-admin");
    admin = adminModule.default || adminModule;
  } catch {
    throw new Error(
      "firebase-admin is required for this migration. Install it locally before running this script.",
    );
  }

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || DEFAULT_BUCKET;

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket,
  });

  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  const postsSnapshot = await db.collection("posts").get();
  let updatedPosts = 0;
  let deletedStandards = 0;

  for (const postDoc of postsSnapshot.docs) {
    const post = postDoc.data();
    const thumbnailUrl = post.thumbnailUrl;

    if (thumbnailUrl && post.imageUrl !== thumbnailUrl) {
      console.log(`${postDoc.id}: imageUrl -> thumbnailUrl`);
      if (!DRY_RUN) {
        await postDoc.ref.update({ imageUrl: thumbnailUrl });
      }
      updatedPosts += 1;
    }

    const storagePath = `posts/${post.postId || postDoc.id}/standard.webp`;
    const deleted = await deleteIfExists(bucket, storagePath);
    if (deleted) deletedStandards += 1;
  }

  const barbersSnapshot = await db.collection("barbers").get();
  let updatedBarbers = 0;
  let deletedLegacyProfiles = 0;

  for (const barberDoc of barbersSnapshot.docs) {
    const barber = barberDoc.data();

    if (barber.profileImageThumbnail && barber.profileImage !== barber.profileImageThumbnail) {
      console.log(`${barberDoc.id}: profileImage -> profileImageThumbnail`);

      const oldProfilePath = storagePathFromUrl(barber.profileImage);
      const shouldDeleteOldProfile = oldProfilePath && /\.(jpe?g|png)$/i.test(oldProfilePath);

      if (!DRY_RUN) {
        await barberDoc.ref.update({ profileImage: barber.profileImageThumbnail });
      }

      updatedBarbers += 1;

      if (shouldDeleteOldProfile) {
        const deleted = await deleteIfExists(bucket, oldProfilePath);
        if (deleted) deletedLegacyProfiles += 1;
      }
    }
  }

  console.log("migration complete", {
    dryRun: DRY_RUN,
    updatedPosts,
    deletedStandards,
    updatedBarbers,
    deletedLegacyProfiles,
  });
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
