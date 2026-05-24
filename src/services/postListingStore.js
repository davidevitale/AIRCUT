let listingContext = {
  posts: [],
  selectedPostId: null,
  returnTo: null,
};

export const setPostListingContext = ({
  posts = [],
  selectedPostId = null,
  returnTo = null,
} = {}) => {
  listingContext = {
    posts: Array.isArray(posts) ? posts : [],
    selectedPostId,
    returnTo,
  };
};

export const getPostListingContext = () => listingContext;
