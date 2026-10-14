const STORAGE_KEY = 'patrol_session';

let cache = {
  token: '',
  user: null
};

function restore() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY);
    if (raw) cache = JSON.parse(raw);
  } catch (e) {
    cache = { token: '', user: null };
  }
}

function persist() {
  wx.setStorageSync(STORAGE_KEY, JSON.stringify(cache));
}

module.exports = {
  restore,
  getToken() {
    return cache.token;
  },
  getUser() {
    return cache.user;
  },
  setSession(token, user) {
    cache.token = token;
    cache.user = user;
    persist();
  },
  clear() {
    cache = { token: '', user: null };
    wx.removeStorageSync(STORAGE_KEY);
  }
};
