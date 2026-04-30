/*
  Flow2Exit ECG Upload Web App
  Paste this file into Google Apps Script.

  Deploy settings:
  - Deploy > New deployment > Web app
  - Execute as: Me
  - Who has access: Anyone
*/

const FOLDER_ID = "1wJ2jY4R5qqSAXn41RZyvTf_-c4ezLTJL";
const SECRET_TOKEN = "flow2exit-secret-123";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");

    if (data.token !== SECRET_TOKEN) {
      return jsonResponse({ success: false, error: "Unauthorized request" });
    }

    if (!data.fileName || !data.base64 || !data.mimeType) {
      return jsonResponse({ success: false, error: "Missing fileName, base64, or mimeType" });
    }

    if (!String(data.mimeType).match(/^image\//) && data.mimeType !== "application/pdf") {
      return jsonResponse({ success: false, error: "Only ECG images and PDF files are allowed" });
    }

    const folder = DriveApp.getFolderById(FOLDER_ID);
    const bytes = Utilities.base64Decode(data.base64);
    const blob = Utilities.newBlob(bytes, data.mimeType, data.fileName);

    const file = folder.createFile(blob);
    file.setDescription(
      "Flow2Exit ECG attachment" +
      "\nPatient: " + (data.patient_name || "") +
      "\nMRN: " + (data.mrn || "") +
      "\nSummary ID: " + (data.summary_id || "")
    );

    // Prototype-friendly: anyone with the link can view the ECG file.
    // For a real medical system, replace this with restricted sharing.
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return jsonResponse({
      success: true,
      fileName: file.getName(),
      fileId: file.getId(),
      fileUrl: file.getUrl()
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
