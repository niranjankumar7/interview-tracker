/**
 * Job Review Modal Component
 * Allows user to review and edit extracted job data before saving
 */
// Confidence threshold for low confidence warning
const LOW_CONFIDENCE_THRESHOLD = 0.7;
export function createJobReviewModal(props) {
    const { extraction, onSave, onCancel, saveStatus, errorMessage } = props;
    const { data, confidence } = extraction;
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'job-review-modal';
    modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Review Job Details</h2>
          <button class="close-btn" aria-label="Close">×</button>
        </div>
        
        ${confidence.overall < LOW_CONFIDENCE_THRESHOLD ? `
          <div class="warning-banner">
            <span class="warning-icon">⚠️</span>
            <div class="warning-text">
              <strong>Low Confidence Extraction</strong>
              <p>Please review and correct the details before saving.</p>
            </div>
          </div>
        ` : ''}
        
        <div class="confidence-indicator ${getConfidenceClass(confidence.overall)}">
          <span class="confidence-label">Confidence:</span>
          <span class="confidence-value">${getConfidenceLabel(confidence.overall)}</span>
        </div>
        
        <div class="form-group">
          <label for="company-input">Company *</label>
          <div class="input-wrapper">
            <input 
              type="text" 
              id="company-input" 
              value="${escapeHtml(data.company)}"
              placeholder="Enter company name"
              ${saveStatus === 'saving' ? 'disabled' : ''}
            />
            <button class="edit-btn" data-field="company" title="Edit">✎</button>
          </div>
          ${confidence.company < LOW_CONFIDENCE_THRESHOLD ? `
            <span class="field-warning">Low confidence - please verify</span>
          ` : ''}
        </div>
        
        <div class="form-group">
          <label for="role-input">Role *</label>
          <div class="input-wrapper">
            <input 
              type="text" 
              id="role-input" 
              value="${escapeHtml(data.role)}"
              placeholder="Enter job title"
              ${saveStatus === 'saving' ? 'disabled' : ''}
            />
            <button class="edit-btn" data-field="role" title="Edit">✎</button>
          </div>
          ${confidence.role < LOW_CONFIDENCE_THRESHOLD ? `
            <span class="field-warning">Low confidence - please verify</span>
          ` : ''}
        </div>
        
        <div class="form-group">
          <label for="location-input">Location</label>
          <div class="input-wrapper">
            <input 
              type="text" 
              id="location-input" 
              value="${escapeHtml(data.location || '')}"
              placeholder="Enter location (optional)"
              ${saveStatus === 'saving' ? 'disabled' : ''}
            />
            <button class="edit-btn" data-field="location" title="Edit">✎</button>
          </div>
          ${data.location && confidence.location < LOW_CONFIDENCE_THRESHOLD ? `
            <span class="field-warning">Low confidence - please verify</span>
          ` : ''}
        </div>
        
        <div class="form-group">
          <label>Source URL</label>
          <div class="url-display">
            <a href="${escapeHtml(data.jobDescriptionUrl)}" target="_blank" rel="noopener">
              ${escapeHtml(data.jobDescriptionUrl)}
            </a>
          </div>
        </div>
        
        ${errorMessage ? `
          <div class="error-message">
            <span class="error-icon">❌</span>
            ${escapeHtml(errorMessage)}
          </div>
        ` : ''}
        
        ${saveStatus === 'success' ? `
          <div class="success-message">
            <span class="success-icon">✓</span>
            Job saved successfully!
          </div>
        ` : ''}
        
        <div class="modal-actions">
          <button class="btn btn-secondary cancel-btn" ${saveStatus === 'saving' ? 'disabled' : ''}>
            Cancel
          </button>
          <button class="btn btn-primary save-btn" ${saveStatus === 'saving' || saveStatus === 'success' ? 'disabled' : ''}>
            ${saveStatus === 'saving' ? 'Saving...' : 'Save to Interview-Tracker'}
          </button>
        </div>
      </div>
    </div>
  `;
    // Add event listeners
    const closeBtn = modal.querySelector('.close-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');
    const saveBtn = modal.querySelector('.save-btn');
    closeBtn?.addEventListener('click', onCancel);
    cancelBtn?.addEventListener('click', onCancel);
    saveBtn?.addEventListener('click', () => {
        const company = modal.querySelector('#company-input')?.value.trim();
        const role = modal.querySelector('#role-input')?.value.trim();
        const location = modal.querySelector('#location-input')?.value.trim() || undefined;
        if (!company || !role) {
            // Show validation error - fields are required
            const companyInput = modal.querySelector('#company-input');
            const roleInput = modal.querySelector('#role-input');
            if (!company)
                companyInput?.classList.add('error');
            if (!role)
                roleInput?.classList.add('error');
            return;
        }
        const captureRequest = {
            company,
            role,
            location,
            jobDescriptionUrl: data.jobDescriptionUrl,
            externalJobId: data.externalJobId,
            captureMetadata: {
                confidence,
                extractionMethod: extraction.extractionMethod,
                source: data.source,
                timestamp: extraction.timestamp,
            },
        };
        onSave(captureRequest);
    });
    // Remove error class on input
    const inputs = modal.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('error');
        });
    });
    // Edit buttons focus their respective inputs
    const editBtns = modal.querySelectorAll('.edit-btn');
    editBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const field = btn.getAttribute('data-field');
            const input = modal.querySelector(`#${field}-input`);
            if (input) {
                input.focus();
                input.select();
            }
        });
    });
    return modal;
}
/**
 * Get CSS class based on confidence level
 */
function getConfidenceClass(confidence) {
    if (confidence >= 0.8)
        return 'high';
    if (confidence >= 0.6)
        return 'medium';
    return 'low';
}
/**
 * Get human-readable confidence label
 */
function getConfidenceLabel(confidence) {
    if (confidence >= 0.8)
        return 'High';
    if (confidence >= 0.6)
        return 'Medium';
    return 'Low';
}
/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text)
        return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
export default createJobReviewModal;
//# sourceMappingURL=JobReviewModal.js.map