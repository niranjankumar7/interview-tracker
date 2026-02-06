# PR Review Context

## PR Title
feat: UI refinements, pipeline enhancements, and new question bank feature

## Commit Message
feat: refine dashboard layout, enhance pipeline UI, and implement add question feature

- Reorder dashboard: Next Interviews and Pipeline first, Offer Comparison above Topic Progress
- Update Topic Progress to "Feature coming soon"
- Pipeline: Add delete confirmation and conditional "Round feedback" visibility
- Pipeline: Update Rejected column placeholder text
- Questions: Implement "Add Question" modal with form validation
- Documentation: Save verification recordings to docs/recordings/

## Detailed Changes

### Dashboard
- **Layout Priority:** Reordered sections to show actionable items first (Interviews and Pipeline).
- **Offer Comparison:** Moved above the Topic Progress chart for better visibility of active offers.
- **Topic Progress:** Switched to a "Feature coming soon" placeholder as the backend integration is pending.

### Application Pipeline
- **Conditional Actions:** The "Round feedback" button is now context-aware, appearing only for applications in the "Interview" stage.
- **Safety Measures:** Added a confirmation dialog to the delete action to prevent accidental removal of applications.
- **UX Polish:** Updated the Rejected column placeholder to "Only rejected applications go here" for better clarity.

### Question Bank
- **Add Question Feature:** Implemented a new modal-based form allowing users to manually add questions.
- **Form Fields:** Includes Question Text (required), Category (DSA, System Design, etc.), Interview Round, and Company selection.
- **Integration:** Connected the form to the Zustand store for persistent local storage.

### Verification & Documentation
- **Recordings:** All manual verification steps and UI walkthroughs have been recorded and saved to `docs/recordings/` within the project repository.
