const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

const BUCKET_NAME = 'book_pdfs';

function getBucket() {
  return new GridFSBucket(mongoose.connection.db, { bucketName: BUCKET_NAME });
}

/** Uploads a PDF buffer to GridFS and resolves with the new file's ObjectId. */
function uploadPdfBuffer(buffer, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = getBucket().openUploadStream(filename, { contentType: 'application/pdf' });
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => resolve(uploadStream.id));
    uploadStream.end(buffer);
  });
}

/** Downloads a GridFS file into memory as a Buffer. */
function downloadPdfBuffer(fileId) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    getBucket().openDownloadStream(fileId)
      .on('data', (chunk) => chunks.push(chunk))
      .on('error', reject)
      .on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function deletePdf(fileId) {
  return getBucket().delete(fileId);
}

function openDownloadStream(fileId) {
  return getBucket().openDownloadStream(fileId);
}

module.exports = { uploadPdfBuffer, downloadPdfBuffer, deletePdf, openDownloadStream };
