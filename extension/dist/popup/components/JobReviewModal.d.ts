/**
 * Job Review Modal Component
 * Allows user to review and edit extracted job data before saving
 */
import { ExtractionResult, CaptureRequest } from '../../shared/types';
interface JobReviewModalProps {
    extraction: ExtractionResult;
    onSave: (data: CaptureRequest) => void;
    onCancel: () => void;
    saveStatus: 'idle' | 'saving' | 'success' | 'error';
    errorMessage: string | null;
}
export declare function createJobReviewModal(props: JobReviewModalProps): HTMLElement;
export default createJobReviewModal;
//# sourceMappingURL=JobReviewModal.d.ts.map