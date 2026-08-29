import { useState, useRef } from 'react';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function DocumentUpload({ 
  requirements = [], 
  onFilesChange, 
  existingDocuments = [],
  reservationId = null,
  onDocumentReplace = null,
}) {
  const [files, setFiles] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState({});
  const [errors, setErrors] = useState({});
  const [previews, setPreviews] = useState({});
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (fileList) => {
    const newFiles = { ...files };
    const newErrors = { ...errors };
    const newPreviews = { ...previews };

    Array.from(fileList).forEach((file) => {
      let docType = findDocumentType(file.name);

      if (!docType) {
        const unassigned = requirements.find(
          (req) => !newFiles[req.type] && !existingDocuments.some(
            (d) => d.document_type === req.type && d.status !== 'Rejected'
          )
        );
        if (unassigned) {
          docType = unassigned.type;
        }
      }
      
      if (!docType) {
        newErrors[file.name] = 'File does not match any required document type. Rename the file to include the document name, or upload one file at a time.';
        return;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        newErrors[file.name] = 'Only JPG, PNG, and PDF files are allowed';
        return;
      }

      if (file.size > MAX_SIZE) {
        newErrors[file.name] = 'File size exceeds 5MB limit';
        return;
      }

      newFiles[docType] = file;
      delete newErrors[file.name];

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviews((prev) => ({ ...prev, [docType]: e.target.result }));
        };
        reader.readAsDataURL(file);
      }
    });

    setFiles(newFiles);
    setErrors(newErrors);
    setPreviews(newPreviews);
    onFilesChange?.(newFiles);
  };

  const findDocumentType = (filename) => {
    const lowerName = filename.toLowerCase();
    for (const req of requirements) {
      if (lowerName.includes(req.type.toLowerCase()) || 
          lowerName.includes(req.name.toLowerCase().replace(/\s+/g, '_'))) {
        return req.type;
      }
    }
    return null;
  };

  const removeFile = (docType) => {
    const newFiles = { ...files };
    const newPreviews = { ...previews };
    delete newFiles[docType];
    delete newPreviews[docType];
    setFiles(newFiles);
    setPreviews(newPreviews);
    onFilesChange?.(newFiles);
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    return '📁';
  };

  const getDocumentStatus = (docType) => {
    const existing = existingDocuments.find(d => d.document_type === docType);
    return existing?.status || 'missing';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Verified': return 'bg-green-100 text-green-800 border-green-300';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-300';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      {requirements.length > 0 ? (
        <>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive ? 'border-parish-blue bg-parish-blue-light' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleChange}
              className="hidden"
              accept=".jpg,.jpeg,.png,.pdf"
            />
            <div className="space-y-2">
              <div className="text-4xl">📤</div>
              <p className="text-sm font-medium text-gray-700">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-gray-500">
                Accepted: JPG, PNG, PDF (max 5MB each)
              </p>
              <button
                type="button"
                onClick={onButtonClick}
                className="btn-secondary text-sm"
              >
                Select Files
              </button>
            </div>
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">
              <p className="font-medium mb-1">Upload errors:</p>
              <ul className="list-disc list-inside space-y-1">
                {Object.entries(errors).map(([name, error]) => (
                  <li key={name}>{name}: {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            {requirements.map((req) => {
              const file = files[req.type];
              const existing = existingDocuments.find(d => d.document_type === req.type);
              const status = getDocumentStatus(req.type);
              const isUploading = uploading[req.type];

              return (
                <div
                  key={req.type}
                  className={`border rounded-lg p-3 ${
                    status === 'Verified' ? 'border-green-300 bg-green-50' :
                    status === 'Rejected' ? 'border-red-300 bg-red-50' :
                    file ? 'border-blue-300 bg-blue-50' :
                    'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">
                        {file ? getFileIcon(file.type) : getFileIcon('application/pdf')}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{req.name}</p>
                        <p className="text-xs text-gray-500">
                          {req.required ? 'Required' : 'Optional'}
                        </p>
                        {file && (
                          <p className="text-xs text-gray-600 truncate">{file.name}</p>
                        )}
                        {existing && !file && (
                          <p className="text-xs text-gray-600">
                            Uploaded: {new Date(existing.uploaded_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isUploading ? (
                        <span className="text-xs text-blue-600">Uploading...</span>
                      ) : (
                        <>
                          <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(status)}`}>
                            {status === 'missing' ? 'Not uploaded' : status}
                          </span>
                          {file && (
                            <button
                              type="button"
                              onClick={() => removeFile(req.type)}
                              className="text-red-600 hover:text-red-800 text-sm"
                              aria-label="Remove file"
                            >
                              ✕
                            </button>
                          )}
                          {existing && status === 'Rejected' && onDocumentReplace && (
                            <button
                              type="button"
                              onClick={() => onDocumentReplace(req.type)}
                              className="text-xs text-blue-600 underline"
                            >
                              Replace
                            </button>
                          )}
                          {previews[req.type] && (
                            <button
                              type="button"
                              onClick={() => {
                                const win = window.open();
                                win.document.write(`<img src="${previews[req.type]}" style="max-width:100%">`);
                              }}
                              className="text-xs text-blue-600 underline"
                            >
                              Preview
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {existing && existing.remarks && status === 'Rejected' && (
                    <p className="text-xs text-red-600 mt-2 italic">
                      Remarks: "{existing.remarks}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">No document requirements for this service.</p>
      )}
    </div>
  );
}
