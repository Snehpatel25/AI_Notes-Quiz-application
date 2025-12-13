import CryptoJS from 'crypto-js';

export const encryptNote = (content, password) => {
  try {
    return CryptoJS.AES.encrypt(content, password).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
};

export const decryptNote = (encryptedContent, password) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedContent, password);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Invalid password');
  }
};

export const hashPassword = (password) => {
  return CryptoJS.SHA256(password).toString();
};





