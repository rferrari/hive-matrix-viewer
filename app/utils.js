const hivejs = require("@hiveio/hive-js");
const fs = require('fs');
const path = require('path');

function saveAccountsToFile(accounts, filename) {
  try {
    const dataObj = { accounts };
    fs.writeFileSync(filename, JSON.stringify(dataObj, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error saving accounts to ${filename}:`, error.message);
  }
}

function loadAccountsFromFile(fileName) {
  try {
    if (fs.existsSync(fileName)) {
      const data = fs.readFileSync(fileName, 'utf8');
      const dataObj = JSON.parse(data);
      return dataObj.accounts;
    } else {
      console.log(`File not found: ${fileName}. A new array was returned.`);
      return [];
    }
  } catch (error) {
    console.error('Error loading array data:', error.message);
    return [];
  }
}

function validateHiveAccount(account) {
  const match = account.match(/^[a-z][a-z0-9.-]{2,15}$/);
  return match !== null && match[0] === account;
}

function verifyHiveAccountExist(account) {
  try {
    return new Promise((resolve, reject) => {
      hivejs.api.getAccounts([account], function (err, response) {
        if (err || !response || response.length === 0) resolve(false);
        else resolve(true);
      });
    });
  } catch (err) {
    console.error("Failed fetching hive account info");
    return false;
  }
}

function getHiveAccountInfo(account) {
  try {
    return new Promise((resolve, reject) => {
      hivejs.api.getAccounts([account], function (err, response) {
        if (err) {
          console.log(err);
          reject(err);
        }
        resolve(response);
      });
    });
  } catch (err) {
    console.error("Failed fetching hive account info from bots loader");
  }
}

function getDate() {
  const now = new Date();
  const options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
  return now.toLocaleString('en-US', options); // Customize locale and options as needed
}

function isNumber(value) {
  return /^[0-9]+(\.[0-9]+)?$/.test(value);
}

function removeMarkdown(markdown) {
  const regexRules = [
    { regex: /\[([^\]]+)\]\([^\)]+\)/g, replacement: '$1' },
    { regex: /\*\*([^*]+)\*\*/g, replacement: '$1' },
    { regex: /\*([^*]+)\*/g, replacement: '$1' },
    { regex: /__([^_]+)__/g, replacement: '$1' },
    { regex: /_([^_]+)_/g, replacement: '$1' },
    { regex: /`([^`]+)`/g, replacement: '$1' },
    { regex: /^#+\s+(.*)/gm, replacement: '$1' },
    { regex: /#{1,6}\s?/g, replacement: '' },
    { regex: /^\s*[-*+]\s+/gm, replacement: '' },
    { regex: /^\s*\d+\.\s+/gm, replacement: '' },
    { regex: /^\s*>\s+/gm, replacement: '' },
    { regex: /!\[([^\]]*)\]\([^\)]+\)/g, replacement: '' },
    { regex: /---|\*\*\*|___/g, replacement: '' },
    { regex: /<[^>]*>/g, replacement: '' },
    { regex: /\/+/g, replacement: ' ' },
  ];

  let cleanedText = markdown;
  regexRules.forEach(rule => {
    cleanedText = cleanedText.replace(rule.regex, rule.replacement);
  });

  return cleanedText.trim();
}

module.exports = {
  saveAccountsToFile,
  loadAccountsFromFile,
  validateHiveAccount,
  verifyHiveAccountExist,
  getHiveAccountInfo,
  getDate,
  isNumber,
  removeMarkdown
};
