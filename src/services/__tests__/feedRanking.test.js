import {
  rankPostsByUserTags,
  getFeedPriority,
  FEED_PRIORITY,
} from '../feedRanking';

const post = (id, tags, createdAt) => ({
  id,
  selectedTags: tags,
  createdAt,
});

describe('getFeedPriority (Task 1 - 3 fasce)', () => {
  test('>= 2 match => fascia Alta', () => {
    expect(getFeedPriority(2)).toBe(FEED_PRIORITY.HIGH);
    expect(getFeedPriority(3)).toBe(FEED_PRIORITY.HIGH);
  });
  test('1 match => fascia Media', () => {
    expect(getFeedPriority(1)).toBe(FEED_PRIORITY.MEDIUM);
  });
  test('0 match => fascia Bassa', () => {
    expect(getFeedPriority(0)).toBe(FEED_PRIORITY.LOW);
  });
});

describe('rankPostsByUserTags (Task 1)', () => {
  const userTags = ['fade', 'curly', 'beard'];

  test('ordina per fascia: Alta (>=2) prima di Media (1) prima di Bassa (0)', () => {
    const posts = [
      post('generic', ['scissors', 'blowdry'], '2026-01-01'),       // 0 match -> Bassa
      post('one', ['beard', 'hot towel'], '2026-01-01'),            // 1 match -> Media
      post('many', ['fade', 'curly', 'beard', 'skin fade'], '2026-01-01'), // 3 match -> Alta
    ];
    const ranked = rankPostsByUserTags(posts, userTags).map((p) => p.id);
    expect(ranked).toEqual(['many', 'one', 'generic']);
  });

  test('a parità di fascia, più tag in comune prima', () => {
    const posts = [
      post('two', ['fade', 'curly'], '2026-01-01'),                  // 2 match
      post('three', ['fade', 'curly', 'beard'], '2026-01-01'),       // 3 match
    ];
    const ranked = rankPostsByUserTags(posts, userTags).map((p) => p.id);
    expect(ranked).toEqual(['three', 'two']);
  });

  test('a parità di match, i post più recenti prima', () => {
    const posts = [
      post('older', ['beard'], '2026-01-01'),   // 1 match, vecchio
      post('newer', ['fade'], '2026-06-01'),    // 1 match, recente
    ];
    const ranked = rankPostsByUserTags(posts, userTags).map((p) => p.id);
    expect(ranked).toEqual(['newer', 'older']);
  });

  test('i post senza tag in comune finiscono in fondo', () => {
    const posts = [
      post('generic', ['scissors'], '2026-12-01'), // 0 match, ma molto recente
      post('match', ['fade'], '2026-01-01'),       // 1 match, vecchio
    ];
    const ranked = rankPostsByUserTags(posts, userTags).map((p) => p.id);
    // La fascia vince sulla data: il post con match resta primo.
    expect(ranked).toEqual(['match', 'generic']);
  });

  test('utente senza tag => feed cronologico (più recenti prima)', () => {
    const posts = [
      post('a', ['fade'], '2026-01-01'),
      post('b', ['curly'], '2026-06-01'),
      post('c', ['beard'], '2026-03-01'),
    ];
    const ranked = rankPostsByUserTags(posts, []).map((p) => p.id);
    expect(ranked).toEqual(['b', 'c', 'a']);
  });

  test('gestisce tag come oggetti localizzati {id,en,it}', () => {
    const posts = [
      post('obj', [{ id: 'fade', en: 'Fade', it: 'Sfumatura' }], '2026-01-01'),
      post('none', [{ id: 'scissors', en: 'Scissors', it: 'Forbici' }], '2026-01-01'),
    ];
    const ranked = rankPostsByUserTags(posts, userTags).map((p) => p.id);
    expect(ranked).toEqual(['obj', 'none']);
  });

  test('non muta l\'array originale', () => {
    const posts = [post('a', ['fade'], '2026-01-01'), post('b', ['x'], '2026-01-01')];
    const copy = [...posts];
    rankPostsByUserTags(posts, userTags);
    expect(posts).toEqual(copy);
  });
});
