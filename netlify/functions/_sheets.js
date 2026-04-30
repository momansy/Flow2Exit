const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

function json(statusCode, body){
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) };
}
function options(){ return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }, body: '' }; }
function assertEnv(){
  if(!SHEET_ID || !EMAIL || !PRIVATE_KEY) throw new Error('Missing Google Sheets environment variables. Add GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY in Netlify.');
}
async function client(){
  assertEnv();
  const auth = new google.auth.JWT(EMAIL, null, PRIVATE_KEY, ['https://www.googleapis.com/auth/spreadsheets']);
  return google.sheets({ version: 'v4', auth });
}
async function readRange(range){
  const sheets = await client();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range });
  return res.data.values || [];
}
async function appendRow(range, row){
  const sheets = await client();
  await sheets.spreadsheets.values.append({ spreadsheetId: SHEET_ID, range, valueInputOption: 'USER_ENTERED', requestBody: { values: [row] } });
}
async function updateRow(range, row){
  const sheets = await client();
  await sheets.spreadsheets.values.update({ spreadsheetId: SHEET_ID, range, valueInputOption: 'USER_ENTERED', requestBody: { values: [row] } });
}
module.exports = { json, options, readRange, appendRow, updateRow };
