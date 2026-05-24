let listingContext = {
  posts: [],
  selectedPostId: null,
};

export const setPostListingContext = ({ posts = [], selectedPostId = null } = {}) => {
  listingContext = {
    posts: Array.isArray(posts) ? posts : [],
    selectedPostId,
  };
};

export const getPostListingContext = () => listingContext;

