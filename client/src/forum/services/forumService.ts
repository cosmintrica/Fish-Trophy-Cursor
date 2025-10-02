// Mock forum service pentru dezvoltare
export const forumStorage = {
  getCategories: () => Promise.resolve([]),
  getTopics: () => Promise.resolve([]),
  getPosts: () => Promise.resolve([]),
  createTopic: () => Promise.resolve(null),
  createPost: () => Promise.resolve(null),
  getUser: () => Promise.resolve(null)
};
