import { getTopPostsByLikes, getPostLikeCount } from '../photoPreview';

const p = (id, likes, createdAt) => ({ id, likes, createdAt });

describe('getPostLikeCount', () => {
  test('conta gli elementi se likes è un array', () => {
    expect(getPostLikeCount({ likes: ['a', 'b', 'c'] })).toBe(3);
  });
  test('usa likesCount/likeCount se likes non è un array', () => {
    expect(getPostLikeCount({ likesCount: 7 })).toBe(7);
    expect(getPostLikeCount({ likeCount: 4 })).toBe(4);
  });
  test('usa likes numerico come fallback', () => {
    expect(getPostLikeCount({ likes: 5 })).toBe(5);
  });
  test('default 0', () => {
    expect(getPostLikeCount({})).toBe(0);
  });
});

describe('getTopPostsByLikes (Task 2)', () => {
  test('ritorna le 3 foto con più like', () => {
    const posts = [
      p('a', 1, '2026-01-01'),
      p('b', 10, '2026-01-01'),
      p('c', 5, '2026-01-01'),
      p('d', 8, '2026-01-01'),
    ];
    const top = getTopPostsByLikes(posts, 3).map((x) => x.id);
    expect(top).toEqual(['b', 'd', 'c']);
  });

  test('a parità di like, fallback alle più recenti', () => {
    const posts = [
      p('old', 5, '2026-01-01'),
      p('new', 5, '2026-06-01'),
    ];
    const top = getTopPostsByLikes(posts, 3).map((x) => x.id);
    expect(top).toEqual(['new', 'old']);
  });

  test('se ci sono meno di 3 foto ritorna solo quelle disponibili', () => {
    const posts = [p('a', 1, '2026-01-01'), p('b', 2, '2026-01-01')];
    expect(getTopPostsByLikes(posts, 3)).toHaveLength(2);
  });

  test('input vuoto => array vuoto', () => {
    expect(getTopPostsByLikes([], 3)).toEqual([]);
    expect(getTopPostsByLikes(undefined, 3)).toEqual([]);
  });

  test('non muta l\'array originale', () => {
    const posts = [p('a', 1, '2026-01-01'), p('b', 9, '2026-01-01')];
    const copy = [...posts];
    getTopPostsByLikes(posts, 3);
    expect(posts).toEqual(copy);
  });
});
