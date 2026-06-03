import { collection, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import { getAllBarberPosts } from "./postService";
import { getLocalizedTagText, includesSearchQuery } from "./authService";

// Ricerca per hashtag
const searchPostsByHashtag = async (hashtag) => {
  try {
    console.log('searchPostsByHashtag: Searching for hashtag:', hashtag);

    // Assicurati che l'hashtag inizi con #
    const searchHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;

    // Prima ottieni tutti i post
    const allPosts = await getAllBarberPosts();

    const normalizedSearchTag = searchHashtag
      .toLowerCase()
      .replace(/^#/, '')
      .replace(/\s+/g, '');

    // Filtra i post che contengono l'hashtag in selectedTags
    const filteredPosts = allPosts.filter(post => {
      const tags = Array.isArray(post.selectedTags) ? post.selectedTags : [];
      if (tags.length === 0) return false;

      return tags.some((tag) => {
        const rawValues = [
          tag?.id,
          tag?.en,
          tag?.it,
          getLocalizedTagText(tag),
        ].filter(Boolean);

        return rawValues.some((value) => (
          String(value).toLowerCase().replace(/^#/, '').replace(/\s+/g, '') === normalizedSearchTag
        ));
      });
    });

    console.log('searchPostsByHashtag: Found posts:', filteredPosts.length);
    return filteredPosts;
  } catch (error) {
    console.error('Errore ricerca per hashtag:', error);
    return [];
  }
};

const searchPostsByBarberText = async (searchText) => {
  try {
    console.log('searchPostsByBarberText: Searching for:', searchText);

    if (!searchText || searchText.trim().length < 2) {
      return [];
    }

    const searchQuery = searchText.toLowerCase().trim();
    const allPosts = await getAllBarberPosts();

    const filteredPosts = allPosts.filter((post) => (
      includesSearchQuery(
        [
          post.name,
          post.barberName,
          post.salonName,
          post.salonName,
          post.nickName,
          post.firstName,
          post.lastName,
        ],
        searchQuery
      )
    ));

    console.log('searchPostsByBarberText: Found posts:', filteredPosts.length);
    return filteredPosts;
  } catch (error) {
    console.error('Errore ricerca post per nome barbiere:', error);
    return [];
  }
};

// Ricerca barbieri per nome
const searchBarbersByName = async (searchText) => {
  try {
    console.log('searchBarbersByName: Searching for:', searchText);

    if (!searchText || searchText.trim().length < 2) {
      return [];
    }

    const searchQuery = searchText.toLowerCase().trim();
    const barbersRef = collection(db, 'barbers');
    const barbersSnapshot = await getDocs(barbersRef);
    const results = [];

    barbersSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const salonName = data.salonName || data.salonName || '';
      const barberName = data.barberName || data.firstName || '';
      const location = data.address || data.via || '';
      const matchesBarber = includesSearchQuery(
        [
          salonName,
          barberName,
          data.name,
          data.nickName,
          data.firstName,
          data.lastName,
          data.nomiDipendenti,
          location,
        ],
        searchQuery
      );

      if (matchesBarber) {
        results.push({
          id: docSnap.id,
          salonName: salonName,
          salonName,
          barberName,
          nickName: data.nickName || '',
          nomiDipendenti: data.nomiDipendenti,
          via: location,
          telefono: data.telephone || data.telefono,
          emailContatto: data.emailContact || data.emailContatto,
          sitoWeb: data.website || data.sitoWeb,
          typesCut: data.typesCut || data.tipiTaglio || [],
          profileImage: data.profileImageThumbnail || data.profileImage || null,
          followerCount: Math.floor(Math.random() * 1000),
          isFollowing: false,
          type: 'barber'
        });
      }
    });

    console.log('searchBarbersByName: Found results:', results.length);
    return results;
  } catch (error) {
    console.error('Errore ricerca barbieri:', error);
    return [];
  }
};
// Ricerca intelligente combinata
const smartSearch = async (searchText, excludeUserId = null) => {
  try {
    console.log('smartSearch: Searching for:', searchText);

    if (!searchText || searchText.trim().length === 0) {
      return { type: 'empty', results: [] };
    }

    const trimmedText = searchText.trim();

    if (trimmedText.startsWith('#')) {
      // Ricerca per hashtag
      const posts = await searchPostsByHashtag(trimmedText);
      return { type: 'hashtag', hashtag: trimmedText, posts: posts, users: [] };
    } else {
      const [posts, barbers] = await Promise.all([
        searchPostsByBarberText(trimmedText),
        searchBarbersByName(trimmedText),
      ]);

      console.log('smartSearch: Posts found:', posts.length);
      console.log('smartSearch: Barbers found:', barbers.length);

      // Filtra per escludere l'utente corrente (non mostrare se stesso)
      let filteredBarbers = barbers;
      if (excludeUserId) {
        filteredBarbers = barbers.filter(barber => barber.id !== excludeUserId);
        console.log('smartSearch: Filtered barbers (excluding self):', filteredBarbers.length);
      }

      return { type: 'barbers', searchText: trimmedText, posts, users: filteredBarbers };
    }
  } catch (error) {
    console.error('Errore ricerca intelligente:', error);
    return { type: 'error', posts: [], users: [] };
  }
};


export {
  searchPostsByHashtag,
  searchPostsByBarberText,
  searchBarbersByName,
  smartSearch,
}

