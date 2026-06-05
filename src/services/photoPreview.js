// Selezione foto preview per i risultati di ricerca (Task 2).
// Funzioni PURE per ordinare le foto di un profilo: prima quelle con più like,
// con fallback alle più recenti a parità di like.

export const getPostLikeCount = (post) => {
  if (Array.isArray(post?.likes)) return post.likes.length;
  return (
    post?.likesCount ??
    post?.likeCount ??
    (typeof post?.likes === 'number' ? post.likes : 0)
  );
};

export const getPostCreatedMillis = (post) => {
  const value = post?.createdAt;
  if (!value) return 0;
  if (typeof value === 'object') {
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

// Ritorna le prime `count` foto ordinate per like desc (fallback recenti desc).
export const getTopPostsByLikes = (posts = [], count = 3) => (
  [...(Array.isArray(posts) ? posts : [])]
    .sort((a, b) => {
      const likeDiff = getPostLikeCount(b) - getPostLikeCount(a);
      if (likeDiff !== 0) return likeDiff;
      return getPostCreatedMillis(b) - getPostCreatedMillis(a);
    })
    .slice(0, count)
);
